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
import { generateFallbackContent as sharedFallback } from '@/lib/fallbackContent';

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
    // Diagnostic — never logs the key value, only whether one exists. When
    // this prints `false` in Vercel logs you know every package will fall
    // back to deterministic content.
    console.log('[plan-trip] ANTHROPIC_API_KEY configured:', !!process.env.ANTHROPIC_API_KEY);

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
      concurrency: 4,
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

    // Hard budget filter with a +20% safety margin so a destination doesn't
    // get dropped over €10 of price jitter. Packages above `budget × 1.2` are
    // never shown. The badge on cards in this band reads "+€X over budget".
    const HARD_CAP_MULTIPLIER = 1.2;
    const MIN_RESULTS = 6;
    const MAX_RESULTS = 18;
    const hardMax = budgetEur * HARD_CAP_MULTIPLIER;

    let pool = packages.filter((p) => p.totalPrice <= hardMax);
    let relaxed = false;
    let inBudgetCount = packages.filter((p) => !p.isOverBudget).length;

    // Relax: if too few destinations fit (including the +20% band), backfill
    // with the cheapest over-cap options so the user always sees at least
    // MIN_RESULTS cards instead of an almost-empty grid.
    if (pool.length < MIN_RESULTS) {
      const overflow = packages
        .filter((p) => p.totalPrice > hardMax)
        .sort((a, b) => a.totalPrice - b.totalPrice)
        .slice(0, MIN_RESULTS - pool.length);
      if (overflow.length > 0) {
        pool = [...pool, ...overflow];
        relaxed = true;
      }
    }

    // Sort: budget-fitting first (by cheapest), then over-budget (also by cheapest).
    pool.sort((a, b) => {
      if (!!a.isOverBudget !== !!b.isOverBudget) return a.isOverBudget ? 1 : -1;
      if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice;
      return b.score - a.score;
    });

    // Cap at MAX_RESULTS — diversifyPackages prevents 18 cards din aceeași țară.
    const topPackages = diversifyPackages(pool, MAX_RESULTS);
    const overflowCount = topPackages.filter((p) => p.isOverBudget).length;
    inBudgetCount = topPackages.filter((p) => !p.isOverBudget).length;

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

          // Abort the Anthropic call at 25s so a single hung request can't
          // ride the full Vercel 60s budget and force a "An error occurred…"
          // gateway page on the client.
          const aiAbort = new AbortController();
          const aiTimeout = setTimeout(() => aiAbort.abort(), 25_000);
          let aiRes: Response;
          try {
            aiRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 2500,
                messages: [{ role: 'user', content: prompt }],
              }),
              signal: aiAbort.signal,
            });
          } finally {
            clearTimeout(aiTimeout);
          }

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const text = aiData.content?.[0]?.text || '';
            pkg.aiContent = JSON.parse(text);
          } else {
            console.error(
              `[plan-trip] Claude non-OK for ${pkg.destination.iata}: status=${aiRes.status}`,
            );
            pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles, locale);
          }
        } catch (e) {
          const err = e as Error;
          console.error(
            `[plan-trip] Claude failed for ${pkg.destination.iata}:`,
            err.message,
            err.name,
          );
          pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles, locale);
        }
      }));
    } else {
      if (!apiKey) {
        console.warn('[plan-trip] ANTHROPIC_API_KEY missing — all packages will use locale-aware fallback content');
      }
      needAi.forEach(pkg => { pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles, locale); });
    }
    useFallback.forEach(pkg => { pkg.aiContent = generateFallbackContent(pkg.destination, nights, travelStyles, locale); });

    const response = {
      packages: topPackages,
      total: topPackages.length,
      budget: budgetEur,
      inBudgetCount,
      overflowCount,
      relaxed,
    };
    // Cache for 6h — same (origin, dates, budget, prefs) returns instantly.
    await setCache(cacheKey, response, 60 * 6);
    return NextResponse.json(response);
  } catch (e: unknown) {
    console.error('[plan-trip] Error:', e);
    const message = e instanceof Error ? e.message : 'Failed to plan trip';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


/** Thin wrapper preserving the existing call signature; routes the call to
 *  the shared fallback in `@/lib/fallbackContent` which is also used by the
 *  road-trip planner. Keeps mode='flight' so Day 1 still says "airport
 *  arrival & hotel check-in" exactly as before. */
function generateFallbackContent(
  dest: DestinationProfile,
  nights: number,
  styles: string[],
  locale: 'en' | 'ro' = 'en',
) {
  return sharedFallback({
    destination: { city: dest.city, country: dest.country, iata: dest.iata },
    nights,
    styles,
    locale,
    mode: 'flight',
  });
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
    console.warn('[plan-trip:variant] ANTHROPIC_API_KEY missing — using locale-aware fallback');
    packages.forEach((pkg) => {
      pkg.aiContent = generateFallbackContent(pkg.destination, ctx.nights, ctx.travelStyles, ctx.locale);
    });
    return;
  }

  await Promise.all(
    packages.map(async (pkg) => {
      const spec = VARIANT_SPECS.find((v) => v.tier === pkg.variant);
      if (!spec) {
        pkg.aiContent = generateFallbackContent(pkg.destination, ctx.nights, ctx.travelStyles, ctx.locale);
        return;
      }
      const activityBudget = Math.max(0, Math.round(ctx.budgetEur - pkg.totalPrice));
      const prompt = buildVariantPrompt(pkg, spec, ctx, activityBudget);

      try {
        const aiAbort = new AbortController();
        const aiTimeout = setTimeout(() => aiAbort.abort(), 25_000);
        let aiRes: Response;
        try {
          aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 2500,
              messages: [{ role: 'user', content: prompt }],
            }),
            signal: aiAbort.signal,
          });
        } finally {
          clearTimeout(aiTimeout);
        }
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.content?.[0]?.text || '';
          pkg.aiContent = JSON.parse(text);
        } else {
          console.error(
            `[plan-trip:variant] Claude non-OK for ${pkg.destination.iata} (${pkg.variant}): status=${aiRes.status}`,
          );
          pkg.aiContent = generateFallbackContent(pkg.destination, ctx.nights, ctx.travelStyles, ctx.locale);
        }
      } catch (e) {
        const err = e as Error;
        console.error(
          `[plan-trip:variant] Claude failed for ${pkg.destination.iata} (${pkg.variant}):`,
          err.message,
        );
        pkg.aiContent = generateFallbackContent(pkg.destination, ctx.nights, ctx.travelStyles, ctx.locale);
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
