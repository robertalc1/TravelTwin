import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { matchDestinations, DestinationProfile, DESTINATIONS } from '@/lib/destinations';
import { diversifyPackages } from '@/lib/diversify';
import type { NormalizedFlight } from '@/lib/supabase/types';
import { estimateTripPrice, pickAirlineForRoute, getAirportCoords } from '@/lib/pricing';
import { convertAmount, FALLBACK_RATES } from '@/lib/currencyService';
import { COMMON_ROUTES } from '@/lib/commonRoutes';
import { getCityFromIata, getCountryFromIata } from '@/lib/iataMapping';
import { getCityImageByIata } from '@/lib/cityImages';
import { getCached, setCache } from '@/lib/cache';
import { VARIANT_SPECS, type VariantSpec, type VariantTier } from '@/lib/variants';
import { fetchLivePackagesForDestinations } from '@/lib/live-packages';

// Live mode fans out ~25 destinations × 2 Tripadvisor calls (flight + hotel)
// in parallel; cache hits return instantly but cache misses can take 10-20s.
export const maxDuration = 60;

/** Build a DestinationProfile from an IATA code — uses DESTINATIONS row when
 *  available, falls back to iata-derived metadata so any airport works. */
function destinationForIata(iata: string): DestinationProfile | null {
  const known = DESTINATIONS.find((d) => d.iata === iata);
  if (known) return known;
  const city = getCityFromIata(iata);
  if (!city || city === iata) return null;
  const coords = getAirportCoords(iata);
  return {
    city,
    country: getCountryFromIata(iata) || '',
    iata,
    tags: [],
    climate: 'varied',
    budgetLevel: 'budget',
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    imageId: getCityImageByIata(iata).split('photo-')[1]?.split('?')[0] || '',
    latitude: coords?.lat || 0,
    longitude: coords?.lon || 0,
  };
}

function dedupeByIata(list: DestinationProfile[]): DestinationProfile[] {
  const seen = new Set<string>();
  const out: DestinationProfile[] = [];
  for (const d of list) {
    if (seen.has(d.iata)) continue;
    seen.add(d.iata);
    out.push(d);
  }
  return out;
}

export interface TripPackage {
  id: string;
  destination: DestinationProfile;
  flight: {
    outbound: NormalizedFlight | null;
    inbound?: NormalizedFlight | null;
    price: number;
    currency: string;
    airline: string;
    airlineCode: string;
    duration: string;
    stops: number;
    departureTime: string;
    arrivalTime: string;
  } | null;
  hotel: {
    id: string;
    name: string;
    stars: number;
    price: number;
    pricePerNight: number;
    currency: string;
    checkIn: string;
    checkOut: string;
    amenities: string[];
  } | null;
  totalPrice: number;
  currency: string;
  nights: number;
  aiContent: {
    description: string;
    whyThisTrip: string;
    dayByDay: Array<{
      day: number;
      title: string;
      morning: { activity: string; description: string; type: string };
      afternoon: { activity: string; description: string; type: string };
      evening: { activity: string; description: string; type: string };
    }>;
    topAttractions: Array<{
      name: string;
      description: string;
      category: 'museum' | 'landmark' | 'park' | 'other';
    }>;
    topRestaurants: Array<{
      name: string;
      cuisine: string;
      priceRange: '€' | '€€' | '€€€';
      description: string;
    }>;
    topCafes: Array<{
      name: string;
      specialty: string;
      description: string;
    }>;
    localTips: string[];
    estimatedDailyExpenses: { food: number; transport: number; activities: number };
  } | null;
  score: number;
  isEstimated?: boolean;
  /** True when totalPrice exceeds the user's submitted budget. Frontend
   *  renders a subtle "Over budget" badge — package is still shown. */
  isOverBudget?: boolean;
  /** Only set in "single-destination" mode (user picked a specific city in the
   *  wizard). Three packages are returned, one per tier. */
  variant?: VariantTier;
  /** Romanian badge label paired with `variant`. */
  variantLabel?: 'Buget' | 'Standard' | 'Premium';
  /** Romanian theme line ("Relax & Plajă", "Cultură & Gastronomie", "Romantic & Lux"). */
  variantTheme?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth gate — only authenticated users can generate AI trip plans.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      origin,
      budget,
      currency = 'EUR',
      departureDate,
      returnDate,
      adults = 2,
      children = 0,
      travelStyles = [],
      climate = 'no-preference',
      priorities = [],
      destinationIata,
      destinationName,
      excludeIatas = [],
      locale: rawLocale,
    } = body as {
      origin?: string;
      budget?: number;
      currency?: string;
      departureDate?: string;
      returnDate?: string;
      adults?: number;
      children?: number;
      travelStyles?: string[];
      climate?: string;
      priorities?: string[];
      destinationIata?: string;
      destinationName?: string;
      excludeIatas?: string[];
      locale?: string;
    };

    const excludeSet = new Set((excludeIatas || []).map((c) => c.toUpperCase()));

    const locale: 'en' | 'ro' = rawLocale === 'ro' ? 'ro' : 'en';

    if (!origin || !budget || !departureDate || !returnDate) {
      return NextResponse.json({ error: 'Missing required fields: origin, budget, departureDate, returnDate' }, { status: 400 });
    }

    const depDate = new Date(departureDate);
    const retDate = new Date(returnDate);
    const nights = Math.round((retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
    const month = depDate.getMonth() + 1;
    const totalAdults = adults + children;

    // Tripadvisor + estimator both work in EUR, so convert the user's budget
    // (which may be in RON/USD/GBP/...) before doing any comparisons. The
    // package totals are also returned in EUR so the frontend can convert
    // back to the user's display currency with live rates.
    const budgetEur = convertAmount(budget, currency, 'EUR', FALLBACK_RATES);

    // Response cache — same search returns instantly from Supabase api_cache.
    // Skips quota burn for repeated runs of the same wizard config.
    const sortedStyles = [...travelStyles].sort().join(',');
    const destSegment = destinationIata ? destinationIata.toUpperCase() : 'any';
    const excludeKey = [...excludeSet].sort().join(',');
    const cacheKey = `planTrip:${locale}:${origin}:${destSegment}:${departureDate}:${returnDate}:${Math.round(budgetEur)}:${totalAdults}:${sortedStyles}:${climate}:${excludeKey}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      const cachedData = cached.data as { packages: TripPackage[]; total: number; mode?: string };
      return NextResponse.json({ ...cachedData, source: 'cached' });
    }

    // Single-destination mode — user picked a specific city in the wizard,
    // so return 3 budget/standard/premium variants for THAT city instead of
    // the standard discovery output.
    if (destinationIata) {
      return await buildSingleDestinationVariants({
        origin,
        destinationIata: destinationIata.toUpperCase(),
        destinationName,
        nights,
        totalAdults,
        adults,
        children,
        budgetEur,
        departureDate,
        returnDate,
        travelStyles,
        cacheKey,
        locale,
      });
    }

    // 1. Candidate destinations — combine 3 sources to guarantee 20+ candidates,
    //    even from low-volume origins like CND (which has only 2 COMMON_ROUTES).
    const matched = matchDestinations(travelStyles, climate, budget, month, 20);
    const commonFromOrigin = COMMON_ROUTES
      .filter((r) => r.from === origin && r.to !== origin)
      .map((r) => destinationForIata(r.to))
      .filter((d): d is DestinationProfile => d !== null);
    const otpFallback = COMMON_ROUTES
      .filter((r) => r.from === 'OTP' && r.to !== origin)
      .map((r) => destinationForIata(r.to))
      .filter((d): d is DestinationProfile => d !== null);
    let candidates = dedupeByIata([...matched, ...commonFromOrigin, ...otpFallback]).slice(0, 25);
    // Exclude destinations the user has already seen on the homepage (deals grid)
    // so the AI planner surfaces fresh options. If exclusion would empty the
    // pool, fall back to the full set rather than returning no results.
    if (excludeSet.size > 0) {
      const filtered = candidates.filter((c) => !excludeSet.has(c.iata.toUpperCase()));
      if (filtered.length >= 3) candidates = filtered;
    }

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No candidate destinations available' }, { status: 400 });
    }

    // 2. Build packages: LIVE Tripadvisor flights + hotels for every candidate.
    //    Estimator stays as per-destination fallback only — if Tripadvisor
    //    returns nothing for a specific IATA, we still surface the card with
    //    a deterministic price + isEstimated badge.
    console.log(`[plan-trip] Fetching live Tripadvisor data for ${candidates.length} candidates from ${origin}`);
    const liveResults = await fetchLivePackagesForDestinations({
      origin,
      destinations: candidates.map((c) => c.iata),
      departureDate,
      returnDate,
      concurrency: 6,
    }).catch((e) => {
      console.warn('[plan-trip] live batch failed:', (e as Error).message);
      return [];
    });
    const liveByIata = new Map(liveResults.map((r) => [r.destinationIata, r]));
    console.log(`[plan-trip] Live results: ${liveResults.length}/${candidates.length} returned valid data`);

    const packages: TripPackage[] = [];

    for (const dest of candidates) {
      const live = liveByIata.get(dest.iata.toUpperCase());

      let flightPrice: number;
      let hotelPrice: number;
      let isEstimated = false;
      let flight: TripPackage['flight'];
      let hotel: TripPackage['hotel'];

      if (live) {
        // Real live Tripadvisor data — for-1-adult prices scaled to group size
        flightPrice = Math.round(live.flight.price * totalAdults);
        hotelPrice = Math.round(live.hotel.totalPrice);
        flight = {
          outbound: live.flight,
          price: flightPrice,
          currency: live.flight.currency,
          airline: live.flight.airline,
          airlineCode: live.flight.airline,
          duration: live.flight.duration,
          stops: live.flight.stops,
          departureTime: `${live.flight.departureDate}T${live.flight.departureTime || '08:00'}:00`,
          arrivalTime: `${live.flight.arrivalDate}T${live.flight.arrivalTime || '12:00'}:00`,
        };
        hotel = {
          id: live.hotel.id,
          name: live.hotel.name,
          stars: live.hotel.rating,
          price: hotelPrice,
          pricePerNight: Math.round(live.hotel.pricePerNight),
          currency: live.hotel.currency,
          checkIn: departureDate,
          checkOut: returnDate,
          amenities: live.hotel.amenities,
        };
      } else {
        // Fallback estimator (Tripadvisor returned nothing for this IATA)
        const estimate = estimateTripPrice(origin, dest.iata, nights, budgetEur);
        if (!estimate) continue;
        flightPrice = Math.round(estimate.flightRoundTrip * totalAdults);
        hotelPrice = Math.round(estimate.hotelTotal);
        const airlineCode = pickAirlineForRoute(origin, dest.iata, estimate.distanceKm);
        flight = {
          outbound: null,
          price: flightPrice,
          currency: 'EUR',
          airline: airlineCode,
          airlineCode,
          duration: estimate.durationISO,
          stops: estimate.stops,
          departureTime: '',
          arrivalTime: '',
        };
        hotel = {
          id: `est-${dest.iata}`,
          name: `${dest.city} City Hotel`,
          stars: 3,
          price: hotelPrice,
          pricePerNight: Math.round(hotelPrice / Math.max(1, nights)),
          currency: 'EUR',
          checkIn: departureDate,
          checkOut: returnDate,
          amenities: ['Free WiFi', 'Air Conditioning', 'Breakfast available'],
        };
        isEstimated = true;
      }

      const totalPrice = flightPrice + hotelPrice;
      const isOverBudget = totalPrice > budgetEur;

      // Score packages — preferences applied as boost (not as filter)
      let score = 0;
      if (totalPrice <= budgetEur * 0.6) score += 40;
      else if (totalPrice <= budgetEur * 0.8) score += 25;
      else if (totalPrice <= budgetEur) score += 10;
      else score -= 100;
      if (flight.stops === 0) score += 15;
      score += dest.tags.filter((t: string) => travelStyles.includes(t)).length * 10;
      if (climate !== 'no-preference' && dest.climate === climate) score += 15;
      // Boost real live packages so they sort above fallbacks at equal price
      if (!isEstimated) score += 5;

      packages.push({
        id: `${dest.iata}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        destination: dest,
        flight,
        hotel,
        totalPrice: Math.round(totalPrice),
        currency: 'EUR',
        nights,
        aiContent: null,
        score,
        isEstimated,
        isOverBudget,
      });
    }

    // Sort: budget-fitting first (by cheapest), then over-budget (also by cheapest).
    // Matches /deals UX while letting the user still see expensive options.
    packages.sort((a, b) => {
      if (!!a.isOverBudget !== !!b.isOverBudget) return a.isOverBudget ? 1 : -1;
      if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
      return b.score - a.score;
    });

    // Cap at 18 like /deals — diversifyPackages prevents 18 carduri din aceeași țară.
    const topPackages = diversifyPackages(packages, 18);

    // With no hard budget filter this is rare — only fires when no airport
    // distance estimate could be computed (unknown IATA airports).
    if (topPackages.length === 0) {
      return NextResponse.json({
        packages: [],
        total: 0,
        warning: `No destinations could be priced from ${origin}. Try a different origin airport.`,
      });
    }

    // 4. Generate AI content — top 6 only (cost optimization), rest use fallback
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const needAi = topPackages.slice(0, 6);
    const useFallback = topPackages.slice(6);

    if (apiKey && needAi.length > 0) {
      await Promise.all(needAi.map(async (pkg) => {
        try {
          const activityBudget = Math.round(budgetEur - pkg.totalPrice);
          const languageInstruction = locale === 'ro'
            ? `LANGUAGE: Reply entirely in Romanian (limba română). All description text, day titles, activity descriptions, restaurant/cafe descriptions and localTips must be in Romanian. Keep proper place names (e.g. "Sagrada Familia") in their original form.`
            : `LANGUAGE: Reply entirely in English.`;

          // Anchor Claude on the REAL hotel + flight Tripadvisor returned so the
          // itinerary references the actual property the user will book, not a
          // generic "City Hotel" placeholder.
          const livePriceLine = pkg.isEstimated
            ? `Pricing source: deterministic estimate (Tripadvisor did not return live data for this route).`
            : `Pricing source: LIVE Tripadvisor — flight €${pkg.flight?.price}, hotel "${pkg.hotel?.name}" (${pkg.hotel?.stars}★) at €${pkg.hotel?.pricePerNight}/night.`;
          const hotelContext = pkg.hotel
            ? `Booked hotel: ${pkg.hotel.name} (${pkg.hotel.stars}★). Mention this hotel by NAME at least once in the description and on day 1.`
            : '';

          const prompt = `You are a travel expert. Generate a trip itinerary for this trip:

Destination: ${pkg.destination.city}, ${pkg.destination.country}
Dates: ${departureDate} to ${returnDate} (${nights} nights)
Budget remaining for activities: €${activityBudget}
Travel styles: ${travelStyles.join(', ')}
Group: ${adults} adults, ${children} children
${livePriceLine}
${hotelContext}

${languageInstruction}

IMPORTANT: Use REAL, specific place names that actually exist in ${pkg.destination.city}. Do NOT use generic names like "Local Museum", "City Center Restaurant", or "Artisan Café". Use actual well-known restaurants, cafes, and attractions that a local or travel guide would recommend.

Return ONLY valid JSON (no markdown, no backticks):
{
  "description": "2-3 sentence compelling trip description",
  "whyThisTrip": "1 sentence explaining why this matches their preferences",
  "dayByDay": [
    {
      "day": 1,
      "title": "Arrival & First Impressions",
      "morning": { "activity": "specific activity name", "description": "details", "type": "transport" },
      "afternoon": { "activity": "specific attraction name", "description": "details", "type": "sightseeing" },
      "evening": { "activity": "specific restaurant or bar name", "description": "details", "type": "dining" }
    }
  ],
  "topAttractions": [
    { "name": "Specific real attraction name", "description": "One sentence about this attraction", "category": "museum|landmark|park|other" },
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." }
  ],
  "topRestaurants": [
    { "name": "Real restaurant name", "cuisine": "...", "priceRange": "€|€€|€€€", "description": "One sentence recommendation" },
    { "name": "...", "cuisine": "...", "priceRange": "€€", "description": "..." },
    { "name": "...", "cuisine": "...", "priceRange": "€€€", "description": "..." }
  ],
  "topCafes": [
    { "name": "Real cafe name", "specialty": "...", "description": "One sentence about the vibe" },
    { "name": "...", "specialty": "...", "description": "..." },
    { "name": "...", "specialty": "...", "description": "..." }
  ],
  "localTips": ["Specific actionable tip 1", "Tip 2", "Tip 3"],
  "estimatedDailyExpenses": { "food": 40, "transport": 15, "activities": 25 }
}`;

          const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2500,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const text = aiData.content?.[0]?.text || '';
            pkg.aiContent = JSON.parse(text);
          }
        } catch (e) {
          console.warn('[plan-trip] AI generation failed for', pkg.destination.iata, e);
          pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles);
        }
      }));
    } else {
      needAi.forEach(pkg => { pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles); });
    }
    useFallback.forEach(pkg => { pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles); });

    const response = { packages: topPackages, total: topPackages.length };
    // Cache for 6h — same (origin, dates, budget, prefs) returns instantly.
    await setCache(cacheKey, response, 60 * 6);
    return NextResponse.json(response);
  } catch (e: unknown) {
    console.error('[plan-trip] Error:', e);
    const message = e instanceof Error ? e.message : 'Failed to plan trip';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


function generateFallbackContent(dest: DestinationProfile, nights: number, styles: string[]) {
  const styleText = styles.slice(0, 2).join(" and ") || "adventure";
  const city = dest.city;
  const country = dest.country;

  type CityData = {
    attractions: Array<{ name: string; description: string; category: "museum" | "landmark" | "park" | "other" }>;
    restaurants: Array<{ name: string; cuisine: string; priceRange: "€" | "€€" | "€€€"; description: string }>;
    cafes: Array<{ name: string; specialty: string; description: string }>;
  };

  const CITY_DATA: Record<string, CityData> = {
    "Paris": {
      attractions: [
        { name: "Eiffel Tower", description: "Iconic iron lattice tower on the Champ de Mars", category: "landmark" },
        { name: "Louvre Museum", description: "Worlds largest art museum and home of the Mona Lisa", category: "museum" },
        { name: "Notre-Dame Cathedral", description: "Gothic cathedral masterpiece on the Ile de la Cite", category: "landmark" }
      ],
      restaurants: [
        { name: "Le Comptoir du Relais", cuisine: "French bistro", priceRange: "€€", description: "Classic Parisian bistro in Saint-Germain" },
        { name: "LAs du Fallafel", cuisine: "Middle Eastern", priceRange: "€", description: "Legendary falafel spot in the Marais district" },
        { name: "Septime", cuisine: "Modern French", priceRange: "€€€", description: "Award-winning neo-bistro in Bastille" }
      ],
      cafes: [
        { name: "Cafe de Flore", specialty: "Historic cafe and croissants", description: "Legendary Saint-Germain cafe since 1887" },
        { name: "Angelina", specialty: "Hot chocolate and pastries", description: "Belle Epoque tearoom near the Tuileries" },
        { name: "Telescope", specialty: "Specialty coffee", description: "Pioneering third-wave coffee bar in the 1st arrondissement" }
      ]
    },
    "London": {
      attractions: [
        { name: "Tower of London", description: "Historic castle and home of the Crown Jewels", category: "landmark" },
        { name: "British Museum", description: "World-class museum with artifacts from across human history", category: "museum" },
        { name: "Buckingham Palace", description: "Official residence of the British monarch", category: "landmark" }
      ],
      restaurants: [
        { name: "Dishoom", cuisine: "Indian", priceRange: "€€", description: "Beloved Bombay-style cafe with legendary black daal" },
        { name: "Borough Market", cuisine: "Various street food", priceRange: "€", description: "Historic food market with the best street food in London" },
        { name: "Sketch", cuisine: "Modern European", priceRange: "€€€", description: "Iconic restaurant and art gallery in Mayfair" }
      ],
      cafes: [
        { name: "Monmouth Coffee", specialty: "Specialty coffee", description: "One of the finest independent coffee roasters in London" },
        { name: "Bageriet", specialty: "Swedish pastries", description: "Cozy Swedish bakery in Covent Garden" },
        { name: "Flat White", specialty: "Flat white coffee", description: "Soho cafe that introduced flat white to London" }
      ]
    },
    "Rome": {
      attractions: [
        { name: "Colosseum", description: "Ancient amphitheatre and iconic symbol of Rome", category: "landmark" },
        { name: "Vatican Museums", description: "Vast collection of art and the Sistine Chapel", category: "museum" },
        { name: "Trevi Fountain", description: "Baroque masterpiece and the largest fountain in Rome", category: "landmark" }
      ],
      restaurants: [
        { name: "Da Enzo al 29", cuisine: "Roman", priceRange: "€€", description: "Authentic Roman trattoria in Trastevere" },
        { name: "Suppli Roma", cuisine: "Street food", priceRange: "€", description: "Famous for the best suppli in the city" },
        { name: "La Pergola", cuisine: "Fine dining Italian", priceRange: "€€€", description: "Only three-Michelin-star restaurant in Rome" }
      ],
      cafes: [
        { name: "Sant Eustachio il Caffe", specialty: "Traditional espresso", description: "Legendary Roman cafe serving since 1938" },
        { name: "Bar San Calisto", specialty: "Cheap espresso and hot chocolate", description: "Classic Trastevere bar loved by locals" },
        { name: "Caffe Greco", specialty: "Historic cafe", description: "One of the oldest cafes in the world, open since 1760" }
      ]
    },
    "Barcelona": {
      attractions: [
        { name: "Sagrada Familia", description: "Gaudi masterpiece basilica still under construction", category: "landmark" },
        { name: "Park Guell", description: "Colorful mosaic park with panoramic city views", category: "park" },
        { name: "Gothic Quarter", description: "Medieval neighborhood with narrow streets and history", category: "landmark" }
      ],
      restaurants: [
        { name: "Bar Central La Boqueria", cuisine: "Spanish tapas", priceRange: "€€", description: "Fresh seafood and tapas inside La Boqueria market" },
        { name: "El Xampanyet", cuisine: "Catalan", priceRange: "€", description: "Classic cava bar in the Born neighborhood" },
        { name: "Disfrutar", cuisine: "Modern Catalan", priceRange: "€€€", description: "World top-10 restaurant with avant-garde cuisine" }
      ],
      cafes: [
        { name: "Federal Cafe", specialty: "Brunch and specialty coffee", description: "Australian-style cafe in Sant Antoni" },
        { name: "Nomad Coffee", specialty: "Single-origin espresso", description: "Barcelonas best specialty coffee roaster" },
        { name: "El Magnifico", specialty: "Coffee and chocolate", description: "Historic coffee shop in El Born since 1919" }
      ]
    },
    "Amsterdam": {
      attractions: [
        { name: "Rijksmuseum", description: "Dutch national museum with Rembrandt and Vermeer", category: "museum" },
        { name: "Anne Frank House", description: "Historic house where Anne Frank hid during WWII", category: "landmark" },
        { name: "Van Gogh Museum", description: "Worlds largest collection of Van Gogh works", category: "museum" }
      ],
      restaurants: [
        { name: "Restaurant Breda", cuisine: "Modern European", priceRange: "€€€", description: "Elegant dining in a historic canal house" },
        { name: "Pllek", cuisine: "International", priceRange: "€€", description: "Trendy restaurant and beach bar in Amsterdam Noord" },
        { name: "Stroopwafel and Co", cuisine: "Dutch street food", priceRange: "€", description: "Fresh stroopwafels made in front of you" }
      ],
      cafes: [
        { name: "Lot Sixty One", specialty: "Specialty coffee", description: "Amsterdams most celebrated specialty coffee bar" },
        { name: "Cafe Papeneiland", specialty: "Dutch brown cafe", description: "Traditional brown cafe since 1642 in the Jordaan" },
        { name: "Back to Black", specialty: "Third wave coffee", description: "Hipster coffee bar in the Utrechtsestraat area" }
      ]
    },
    "Istanbul": {
      attractions: [
        { name: "Hagia Sophia", description: "Former cathedral and mosque, now a stunning museum", category: "landmark" },
        { name: "Grand Bazaar", description: "One of the worlds oldest and largest covered markets", category: "landmark" },
        { name: "Topkapi Palace", description: "Opulent palace of the Ottoman sultans", category: "museum" }
      ],
      restaurants: [
        { name: "Karakoy Lokantasi", cuisine: "Modern Turkish", priceRange: "€€", description: "Contemporary take on classic Turkish cuisine" },
        { name: "Ciya Sofrasi", cuisine: "Anatolian", priceRange: "€", description: "Authentic Anatolian home cooking in Kadikoy" },
        { name: "Mikla", cuisine: "New Nordic-Turkish", priceRange: "€€€", description: "Rooftop fine dining with Bosphorus views" }
      ],
      cafes: [
        { name: "Mandabatmaz", specialty: "Turkish coffee", description: "Tiny legendary cafe serving the best Turkish coffee in Istanbul" },
        { name: "Kronotrop", specialty: "Specialty coffee", description: "Pioneer of third-wave coffee culture in Turkey" },
        { name: "Karabatak", specialty: "Coffee and brunch", description: "Trendy cafe in Cihangir neighborhood" }
      ]
    },
    "Dubai": {
      attractions: [
        { name: "Burj Khalifa", description: "Worlds tallest building with observation deck on floor 124", category: "landmark" },
        { name: "Dubai Mall", description: "One of the largest malls in the world with an aquarium", category: "landmark" },
        { name: "Palm Jumeirah", description: "Iconic artificial island with luxury hotels and beaches", category: "landmark" }
      ],
      restaurants: [
        { name: "Al Ustad Special Kabab", cuisine: "Persian", priceRange: "€", description: "Legendary kebab restaurant open since 1978" },
        { name: "Nobu Dubai", cuisine: "Japanese-Peruvian", priceRange: "€€€", description: "World-famous chef Nobus Dubai outpost" },
        { name: "Bu Qtair", cuisine: "Fresh seafood", priceRange: "€", description: "No-frills seaside shack with the freshest fish in Dubai" }
      ],
      cafes: [
        { name: "Nightjar Coffee", specialty: "Specialty coffee", description: "Dubais favorite specialty coffee roaster" },
        { name: "Tom and Serg", specialty: "Brunch and coffee", description: "Popular Australian-style cafe in Al Quoz" },
        { name: "Arrows and Sparrows", specialty: "Artisan coffee", description: "Hidden gem cafe in Al Serkal Avenue" }
      ]
    },
    "Prague": {
      attractions: [
        { name: "Prague Castle", description: "Largest ancient castle complex in the world", category: "landmark" },
        { name: "Charles Bridge", description: "Medieval stone bridge with Baroque statues", category: "landmark" },
        { name: "Old Town Square", description: "Historic square with the famous Astronomical Clock", category: "landmark" }
      ],
      restaurants: [
        { name: "Lokal", cuisine: "Czech", priceRange: "€", description: "Classic Czech pub with perfectly poured Pilsner Urquell" },
        { name: "La Degustation Boheme Bourgeoise", cuisine: "Modern Czech", priceRange: "€€€", description: "Michelin-starred Czech tasting menu experience" },
        { name: "Manifesto Market", cuisine: "Street food", priceRange: "€", description: "Container market with diverse street food options" }
      ],
      cafes: [
        { name: "EMA Espresso Bar", specialty: "Specialty coffee", description: "Pragues best flat white in a minimalist setting" },
        { name: "Cafe Louvre", specialty: "Historic cafe", description: "Grand cafe open since 1902 frequented by Kafka and Einstein" },
        { name: "Kavarna Obecni Dum", specialty: "Art Nouveau cafe", description: "Stunning Art Nouveau cafe inside the Municipal House" }
      ]
    },
    "Vienna": {
      attractions: [
        { name: "Schonbrunn Palace", description: "Imperial palace with 1,441 rooms and stunning gardens", category: "landmark" },
        { name: "Belvedere Museum", description: "Baroque palace housing Klimts The Kiss", category: "museum" },
        { name: "St. Stephens Cathedral", description: "Gothic cathedral and symbol of Vienna", category: "landmark" }
      ],
      restaurants: [
        { name: "Figlmuller Wollzeile", cuisine: "Austrian", priceRange: "€€", description: "Famous for the biggest Wiener Schnitzel in Vienna" },
        { name: "Zum Wohl", cuisine: "Wine bar", priceRange: "€€", description: "Natural wine bar with excellent Austrian small plates" },
        { name: "Steirereck", cuisine: "Modern Austrian", priceRange: "€€€", description: "One of the 50 best restaurants in the world" }
      ],
      cafes: [
        { name: "Cafe Central", specialty: "Viennese coffeehouse", description: "Grand historic cafe in a Gothic palace since 1876" },
        { name: "Cafe Hawelka", specialty: "Traditional coffee", description: "Legendary bohemian cafe run by the same family for 80 years" },
        { name: "Meinl am Graben", specialty: "Luxury coffee and pastries", description: "Vienna finest delicatessen and coffeehouse on the Graben" }
      ]
    },
    "Lisbon": {
      attractions: [
        { name: "Belem Tower", description: "16th century fortress and UNESCO World Heritage Site", category: "landmark" },
        { name: "Jeronimos Monastery", description: "Magnificent example of Portuguese Late Gothic architecture", category: "landmark" },
        { name: "Alfama District", description: "Oldest neighborhood with Moorish roots and Fado music", category: "landmark" }
      ],
      restaurants: [
        { name: "Time Out Market", cuisine: "Various Portuguese", priceRange: "€€", description: "The best of Lisbon cuisine under one roof" },
        { name: "A Cevicheria", cuisine: "Peruvian-Portuguese", priceRange: "€€€", description: "Creative fusion restaurant by chef Kiko Martins" },
        { name: "Solar dos Presuntos", cuisine: "Traditional Portuguese", priceRange: "€€", description: "Classic Lisbon restaurant famous for cured hams" }
      ],
      cafes: [
        { name: "Pasteis de Belem", specialty: "Original pasteis de nata", description: "The legendary original home of Portuguese custard tarts since 1837" },
        { name: "Copenhagen Coffee Lab", specialty: "Scandinavian specialty coffee", description: "Danish-inspired specialty coffee in Principe Real" },
        { name: "Cafe A Brasileira", specialty: "Historic cafe", description: "Famous Art Deco cafe in Chiado open since 1905" }
      ]
    },
    "Berlin": {
      attractions: [
        { name: "Brandenburg Gate", description: "Neoclassical triumphal arch and symbol of German unity", category: "landmark" },
        { name: "Berlin Wall Memorial", description: "Historic site commemorating the divided city", category: "landmark" },
        { name: "Museum Island", description: "UNESCO World Heritage site with five world-class museums", category: "museum" }
      ],
      restaurants: [
        { name: "Mustafas Gemuse Kebap", cuisine: "Turkish", priceRange: "€", description: "The most famous kebab stand in Berlin with legendary queues" },
        { name: "Nobelhart und Schmutzig", cuisine: "Modern German", priceRange: "€€€", description: "Brutally local fine dining championing regional ingredients" },
        { name: "Markthalle Neun", cuisine: "Street food market", priceRange: "€", description: "Historic market hall with street food Thursdays" }
      ],
      cafes: [
        { name: "The Barn", specialty: "Specialty coffee", description: "Berlins most celebrated coffee roaster with multiple locations" },
        { name: "Cafe Einstein Stammhaus", specialty: "Viennese coffeehouse", description: "Classic Viennese-style grand cafe in a beautiful villa" },
        { name: "Five Elephant", specialty: "Coffee and cheesecake", description: "Famous for specialty coffee and the best cheesecake in Berlin" }
      ]
    },
    "Madrid": {
      attractions: [
        { name: "Prado Museum", description: "One of the worlds finest art museums with Velazquez and Goya", category: "museum" },
        { name: "Royal Palace", description: "Official residence of the Spanish Royal Family", category: "landmark" },
        { name: "Retiro Park", description: "Stunning 350-acre park in the heart of the city", category: "park" }
      ],
      restaurants: [
        { name: "Sobrino de Botin", cuisine: "Traditional Spanish", priceRange: "€€", description: "Worlds oldest restaurant, open since 1725" },
        { name: "Mercado de San Miguel", cuisine: "Spanish tapas", priceRange: "€€", description: "Beautiful iron market with gourmet tapas and wine" },
        { name: "DiverXO", cuisine: "Avant-garde", priceRange: "€€€", description: "Three-Michelin-star restaurant by David Munoz" }
      ],
      cafes: [
        { name: "Cafeteria Comercial", specialty: "Traditional Spanish cafe", description: "Iconic historic cafe open since 1887" },
        { name: "Toma Cafe", specialty: "Specialty coffee", description: "Pioneer of the specialty coffee movement in Madrid" },
        { name: "Cafe del Circulo de Bellas Artes", specialty: "Grand cafe", description: "Elegant rooftop terrace cafe with city views" }
      ]
    },
    "Athens": {
      attractions: [
        { name: "Acropolis", description: "Ancient citadel with the Parthenon, symbol of Western civilization", category: "landmark" },
        { name: "National Archaeological Museum", description: "Worlds finest collection of ancient Greek artifacts", category: "museum" },
        { name: "Plaka District", description: "Charming old neighborhood at the foot of the Acropolis", category: "landmark" }
      ],
      restaurants: [
        { name: "Diporto Agoras", cuisine: "Greek taverna", priceRange: "€", description: "Hidden basement taverna in the central market, cash only" },
        { name: "Varoulko Seaside", cuisine: "Modern Greek seafood", priceRange: "€€€", description: "Michelin-starred seafood with Acropolis views" },
        { name: "Tzitzikas kai Mermigas", cuisine: "Modern Greek", priceRange: "€€", description: "Creative Greek cuisine in a charming setting" }
      ],
      cafes: [
        { name: "Mokka", specialty: "Greek coffee", description: "Old-school Athenian coffee house serving thick Greek coffee" },
        { name: "The Underdog", specialty: "Specialty coffee", description: "Athens leading specialty coffee roaster" },
        { name: "Tailor Made", specialty: "Coffee and cocktails", description: "Hip cafe-bar in Monastiraki that turns into a bar at night" }
      ]
    },
    "Budapest": {
      attractions: [
        { name: "Hungarian Parliament Building", description: "Neo-Gothic masterpiece on the Danube, one of Europes largest", category: "landmark" },
        { name: "Buda Castle", description: "Historic castle complex overlooking the city from Castle Hill", category: "landmark" },
        { name: "Szechenyi Baths", description: "Grand neo-baroque thermal bath complex open since 1913", category: "landmark" }
      ],
      restaurants: [
        { name: "Costes", cuisine: "Modern European", priceRange: "€€€", description: "First Michelin-starred restaurant in Budapest" },
        { name: "Menza", cuisine: "Hungarian", priceRange: "€€", description: "Modern take on Hungarian classics in a retro setting" },
        { name: "Hungarikum Bistro", cuisine: "Traditional Hungarian", priceRange: "€€", description: "Authentic Hungarian flavors with a contemporary presentation" }
      ],
      cafes: [
        { name: "Gerbeaud", specialty: "Historic pastry cafe", description: "Legendary pastry shop on Vorosmarty Square since 1858" },
        { name: "New York Cafe", specialty: "Grand historic cafe", description: "The most beautiful cafe in the world inside the New York Palace" },
        { name: "My Little Melbourne", specialty: "Australian specialty coffee", description: "Budapests best flat white in the Jewish Quarter" }
      ]
    },
    "Bucharest": {
      attractions: [
        { name: "Palace of Parliament", description: "The second largest administrative building in the world", category: "landmark" },
        { name: "Romanian Athenaeum", description: "Stunning concert hall and symbol of Romanian culture", category: "landmark" },
        { name: "Village Museum", description: "Open-air museum with authentic Romanian rural architecture", category: "museum" }
      ],
      restaurants: [
        { name: "Lacrimi si Sfinti", cuisine: "Modern Romanian", priceRange: "€€€", description: "Creative Romanian fine dining by chef Joseph Hadad" },
        { name: "Caru cu Bere", cuisine: "Traditional Romanian", priceRange: "€€", description: "Iconic historic restaurant in a stunning Gothic Revival building" },
        { name: "Vatra", cuisine: "Traditional Romanian", priceRange: "€€", description: "Authentic Romanian home cooking in a cozy setting" }
      ],
      cafes: [
        { name: "Origo", specialty: "Specialty coffee", description: "Bucharests leading specialty coffee roaster" },
        { name: "Bob Coffee Lab", specialty: "Third wave coffee", description: "Excellent single-origin coffees in the Old Town area" },
        { name: "Coffee2Go", specialty: "Quick espresso", description: "Popular local chain with quality espresso at fair prices" }
      ]
    },
    "Bali": {
      attractions: [
        { name: "Tanah Lot Temple", description: "Iconic sea temple perched on a rocky outcrop at sunset", category: "landmark" },
        { name: "Ubud Monkey Forest", description: "Sacred nature sanctuary home to over 700 Balinese macaques", category: "park" },
        { name: "Tegallalang Rice Terraces", description: "Stunning UNESCO-listed terraced rice fields north of Ubud", category: "landmark" }
      ],
      restaurants: [
        { name: "Locavore", cuisine: "Modern Indonesian", priceRange: "€€€", description: "Balis finest restaurant using only local Indonesian ingredients" },
        { name: "Naughty Nuris Warung", cuisine: "Balinese BBQ", priceRange: "€", description: "Legendary ribs and martinis, a Bali institution since 1995" },
        { name: "Warung Babi Guling Ibu Oka", cuisine: "Balinese", priceRange: "€", description: "Famous suckling pig warung recommended by Anthony Bourdain" }
      ],
      cafes: [
        { name: "Seniman Coffee Studio", specialty: "Specialty Balinese coffee", description: "Showcasing the best of Indonesian single-origin coffees" },
        { name: "Revolver Espresso", specialty: "Australian coffee culture", description: "Tiny alley espresso bar that changed Balis coffee scene" },
        { name: "Anomali Coffee", specialty: "Indonesian single-origin", description: "Local chain celebrating the diversity of Indonesian coffee" }
      ]
    }
  };

  const cityData: CityData = CITY_DATA[city] || {
    attractions: [
      { name: city + " Historic Center", description: "Explore the historic heart of " + city, category: "landmark" },
      { name: city + " National Museum", description: "Discover the culture and history of " + country, category: "museum" },
      { name: city + " Central Park", description: "Green oasis in the heart of the city", category: "park" }
    ],
    restaurants: [
      { name: "Local Kitchen", cuisine: "Traditional " + country, priceRange: "€€", description: "Authentic local cuisine in a welcoming atmosphere" },
      { name: "Central Bistro", cuisine: "International", priceRange: "€€", description: "Popular restaurant in the city center" },
      { name: "Street Food Market", cuisine: "Street food", priceRange: "€", description: "Local street food and market stalls" }
    ],
    cafes: [
      { name: "Morning Brew", specialty: "Coffee and pastries", description: "Popular local cafe for breakfast and coffee" },
      { name: city + " Coffee House", specialty: "Local coffee blends", description: "Cozy spot for coffee and conversation" },
      { name: "The Corner Cafe", specialty: "Specialty coffee", description: "Third-wave coffee in a relaxed setting" }
    ]
  };

  return {
    description: "Discover the magic of " + city + " on this perfectly curated " + nights + "-night journey. From iconic landmarks to hidden local gems, this trip combines the best of " + country + " culture and beauty.",
    whyThisTrip: "This trip is perfect for " + styleText + " lovers looking for an unforgettable experience in " + city + ".",
    dayByDay: Array.from({ length: Math.min(nights, 5) }, (_, i) => ({
      day: i + 1,
      title: i === 0 ? "Arrival in " + city : i === nights - 1 ? "Final Day & Departure" : "Explore " + city + " - Day " + (i + 1),
      morning: {
        activity: i === 0 ? "Airport arrival & hotel check-in" : "Breakfast at a local cafe",
        description: i === 0 ? "Settle in and get oriented in " + city : "Start your day with local flavors",
        type: i === 0 ? "transport" : "dining"
      },
      afternoon: {
        activity: "Explore " + city + " highlights",
        description: "Visit the top sights and local neighborhoods",
        type: "sightseeing"
      },
      evening: {
        activity: "Dinner at a local restaurant",
        description: "Enjoy the best of " + country + " cuisine",
        type: "dining"
      }
    })),
    topAttractions: cityData.attractions,
    topRestaurants: cityData.restaurants,
    topCafes: cityData.cafes,
    localTips: [
      "Book popular restaurants and attractions in advance",
      "Use local public transport to save money and see more",
      "Visit popular attractions early morning to avoid crowds"
    ],
    estimatedDailyExpenses: { food: 35, transport: 15, activities: 25 }
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// Single-destination mode — returns 3 budget/standard/premium variants for
// a specific city instead of the discovery output.
// ─────────────────────────────────────────────────────────────────────────────

interface BuildVariantsInput {
  origin: string;
  destinationIata: string;
  destinationName: string | undefined;
  nights: number;
  totalAdults: number;
  adults: number;
  children: number;
  budgetEur: number;
  departureDate: string;
  returnDate: string;
  travelStyles: string[];
  cacheKey: string;
  locale: 'en' | 'ro';
}

async function buildSingleDestinationVariants(input: BuildVariantsInput): Promise<Response> {
  const {
    origin, destinationIata, destinationName,
    nights, totalAdults, adults, children,
    budgetEur, departureDate, returnDate, travelStyles, cacheKey, locale,
  } = input;

  if (origin === destinationIata) {
    return NextResponse.json(
      { error: 'Originea și destinația sunt identice. Alege un alt oraș destinație.' },
      { status: 400 },
    );
  }

  const dest = destinationForIata(destinationIata);
  if (!dest) {
    return NextResponse.json(
      { error: `Destinație necunoscută (${destinationIata}). Încearcă alt oraș.` },
      { status: 400 },
    );
  }

  // Try live Tripadvisor first — gives us real flight + real hotel as the
  // baseline. Fall back to the deterministic estimator if live returns nothing.
  console.log(`[plan-trip variants] Fetching live data for ${destinationIata}`);
  const liveSingle = await fetchLivePackagesForDestinations({
    origin,
    destinations: [destinationIata],
    departureDate,
    returnDate,
    concurrency: 1,
  }).catch(() => []);
  const live = liveSingle[0];

  const estimate = estimateTripPrice(origin, destinationIata, nights, budgetEur);
  if (!estimate && !live) {
    return NextResponse.json(
      { error: `Nu putem estima prețul pentru ${dest.city}. Încearcă altă origine sau destinație.` },
      { status: 400 },
    );
  }

  const airlineCode = live?.flight.airline
    || (estimate ? pickAirlineForRoute(origin, destinationIata, estimate.distanceKm) : 'AF');
  const baseFlightPerPax = live ? live.flight.price : estimate!.flightRoundTrip;
  const baseHotelPerNight = live
    ? Math.max(1, Math.round(live.hotel.pricePerNight))
    : Math.max(1, Math.round(estimate!.hotelTotal / Math.max(1, nights)));
  const baseStops = live ? live.flight.stops : estimate!.stops;
  const baseDurationISO = live?.flight.duration ?? estimate!.durationISO;
  const liveHotelName = live?.hotel.name;
  const liveHotelStars = live?.hotel.rating;

  const packages: TripPackage[] = VARIANT_SPECS.map((spec) => {
    const hotelPricePerNight = Math.max(20, Math.round(baseHotelPerNight * spec.priceMultiplier));
    const hotelPrice = hotelPricePerNight * nights;

    let flightMultiplier = 1.0;
    let flightStops = baseStops;
    if (spec.flightPref === 'direct') {
      flightStops = 0;
      flightMultiplier = 1.18;
    } else if (spec.flightPref === 'cheapest') {
      flightStops = baseStops > 0 ? Math.max(1, baseStops) : 0;
      flightMultiplier = 0.92;
    }

    const flightPrice = Math.round(baseFlightPerPax * totalAdults * flightMultiplier);
    const totalPrice = flightPrice + hotelPrice;

    const flight: TripPackage['flight'] = {
      outbound: live?.flight ?? null,
      price: flightPrice,
      currency: 'EUR',
      airline: airlineCode,
      airlineCode,
      duration: baseDurationISO,
      stops: flightStops,
      departureTime: live ? `${live.flight.departureDate}T${live.flight.departureTime || '08:00'}:00` : '',
      arrivalTime: live ? `${live.flight.arrivalDate}T${live.flight.arrivalTime || '12:00'}:00` : '',
    };

    // Use live hotel name only for the standard tier (matches the real bookable
    // baseline). Budget / premium are scaled variants of that price, so they keep
    // the "{city} {zoneLabel} Hotel" placeholder to indicate the scaling.
    const useLiveHotelExactly = !!live && spec.tier === 'standard';
    const hotel: TripPackage['hotel'] = {
      id: useLiveHotelExactly ? live.hotel.id : `var-${destinationIata}-${spec.tier}`,
      name: useLiveHotelExactly ? liveHotelName! : `${dest.city} ${spec.zoneLabel} Hotel`,
      stars: useLiveHotelExactly ? liveHotelStars! : spec.targetStars,
      price: hotelPrice,
      pricePerNight: hotelPricePerNight,
      currency: 'EUR',
      checkIn: departureDate,
      checkOut: returnDate,
      amenities: useLiveHotelExactly && live.hotel.amenities.length > 0 ? live.hotel.amenities : spec.amenities,
    };

    return {
      id: `${destinationIata}-${spec.tier}-${departureDate}`,
      destination: dest,
      flight,
      hotel,
      totalPrice,
      currency: 'EUR',
      nights,
      aiContent: null,
      score: spec.tier === 'standard' ? 100 : spec.tier === 'premium' ? 90 : 80,
      isEstimated: !live,
      isOverBudget: totalPrice > budgetEur,
      variant: spec.tier,
      variantLabel: spec.label,
      variantTheme: spec.theme,
    };
  });

  await generateVariantAiContent(packages, { adults, children, nights, departureDate, returnDate, budgetEur, travelStyles, locale });

  const response = {
    packages,
    total: packages.length,
    mode: 'specific' as const,
    destinationIata,
    destinationName: destinationName || `${dest.city} (${destinationIata})`,
  };
  await setCache(cacheKey, response, 60 * 6);
  return NextResponse.json(response);
}

interface AiContentContext {
  adults: number;
  children: number;
  nights: number;
  departureDate: string;
  returnDate: string;
  budgetEur: number;
  travelStyles: string[];
  locale: 'en' | 'ro';
}

async function generateVariantAiContent(packages: TripPackage[], ctx: AiContentContext): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    packages.forEach((pkg) => {
      pkg.aiContent = generateFallbackContent(pkg.destination, ctx.nights, ctx.travelStyles);
    });
    return;
  }

  await Promise.all(
    packages.map(async (pkg) => {
      const spec = VARIANT_SPECS.find((v) => v.tier === pkg.variant);
      if (!spec) {
        pkg.aiContent = generateFallbackContent(pkg.destination, ctx.nights, ctx.travelStyles);
        return;
      }
      const activityBudget = Math.max(0, Math.round(ctx.budgetEur - pkg.totalPrice));
      const prompt = buildVariantPrompt(pkg, spec, ctx, activityBudget);

      try {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2500,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.content?.[0]?.text || '';
          pkg.aiContent = JSON.parse(text);
        } else {
          pkg.aiContent = generateFallbackContent(pkg.destination, ctx.nights, ctx.travelStyles);
        }
      } catch (e) {
        console.warn('[plan-trip:variant] AI generation failed for', pkg.destination.iata, pkg.variant, e);
        pkg.aiContent = generateFallbackContent(pkg.destination, ctx.nights, ctx.travelStyles);
      }
    }),
  );
}

function buildVariantPrompt(pkg: TripPackage, spec: VariantSpec, ctx: AiContentContext, activityBudget: number): string {
  const priceTierHint = spec.tier === 'budget'
    ? 'street food and casual € restaurants, free attractions, public transport'
    : spec.tier === 'standard'
      ? 'classic €€ restaurants, mid-range museums, mix of transport modes'
      : 'fine dining €€€, rooftop bars, romantic viewpoints, taxis or private transfers';

  const languageInstruction = ctx.locale === 'ro'
    ? `LANGUAGE: Reply entirely in Romanian (limba română).
- All free-text fields (description, whyThisTrip, day titles, all activity descriptions, restaurant/cafe descriptions, localTips) must be written in Romanian.
- Keep proper place names (e.g. "Sagrada Familia", "Louvre", "Trevi Fountain") in their original form, but write surrounding sentences in Romanian.
- Categories must use these exact Romanian translations:
  type: "transport" | "sightseeing" | "dining" | "shopping" | "culture" → keep as English codes for the API contract.
  category: write "muzeu", "reper", "parc", "altele" instead of museum/landmark/park/other.`
    : `LANGUAGE: Reply entirely in English.`;

  return `You are a travel expert. Generate a trip itinerary tailored to a specific traveler tier:

Destination: ${pkg.destination.city}, ${pkg.destination.country}
Dates: ${ctx.departureDate} to ${ctx.returnDate} (${ctx.nights} nights)
Budget remaining for activities: €${activityBudget}
Travel styles: ${ctx.travelStyles.join(', ') || 'general'}
Group: ${ctx.adults} adults, ${ctx.children} children

VARIANT FOCUS: ${spec.themeEN} (${spec.tier} tier).
- dayByDay activities should heavily lean toward "${spec.themeEN}"
- topRestaurants should reflect price tier: ${priceTierHint}
- localTips should suit a ${spec.tier} traveler
- Recommend a ${spec.targetStars}-star style hotel area: ${spec.zoneHint}

${languageInstruction}

IMPORTANT: Use REAL, specific place names that actually exist in ${pkg.destination.city}. Do NOT use generic names like "Local Museum" or "City Center Restaurant".

Return ONLY valid JSON (no markdown, no backticks):
{
  "description": "2-3 sentence compelling trip description that hints at the ${spec.themeEN} theme",
  "whyThisTrip": "1 sentence explaining why this ${spec.tier} variant fits the traveler",
  "dayByDay": [
    {
      "day": 1,
      "title": "Arrival & First Impressions",
      "morning": { "activity": "specific activity name", "description": "details", "type": "transport" },
      "afternoon": { "activity": "specific attraction name", "description": "details", "type": "sightseeing" },
      "evening": { "activity": "specific restaurant or bar name", "description": "details", "type": "dining" }
    }
  ],
  "topAttractions": [
    { "name": "Specific real attraction name", "description": "One sentence about this attraction", "category": "museum|landmark|park|other" },
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." },
    { "name": "...", "description": "...", "category": "..." }
  ],
  "topRestaurants": [
    { "name": "Real restaurant name matching the ${spec.tier} tier", "cuisine": "...", "priceRange": "€|€€|€€€", "description": "One sentence recommendation" },
    { "name": "...", "cuisine": "...", "priceRange": "€€", "description": "..." },
    { "name": "...", "cuisine": "...", "priceRange": "€€€", "description": "..." }
  ],
  "topCafes": [
    { "name": "Real cafe name", "specialty": "...", "description": "One sentence about the vibe" },
    { "name": "...", "specialty": "...", "description": "..." },
    { "name": "...", "specialty": "...", "description": "..." }
  ],
  "localTips": ["Specific actionable tip 1 suited for a ${spec.tier} traveler", "Tip 2", "Tip 3"],
  "estimatedDailyExpenses": { "food": ${spec.tier === 'budget' ? 25 : spec.tier === 'standard' ? 45 : 90}, "transport": ${spec.tier === 'budget' ? 10 : spec.tier === 'standard' ? 18 : 35}, "activities": ${spec.tier === 'budget' ? 15 : spec.tier === 'standard' ? 30 : 60} }
}`;
}
