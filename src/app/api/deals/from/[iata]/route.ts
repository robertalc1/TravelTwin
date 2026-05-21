/* GET /api/deals/from/[iata] — cheapest packages from origin, returned as TripPackage[].

   Cached for 60 minutes per origin in Supabase api_cache. On every hit the
   server returns a fresh Fisher-Yates shuffle of the cached array so the
   homepage looks alive without burning extra RapidAPI / Anthropic quota. */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { diversifyPackages } from '@/lib/diversify';
import { COMMON_ROUTES } from '@/lib/commonRoutes';
import { getCityFromIata, getCountryFromIata } from '@/lib/iataMapping';
import { getCityImageByIata } from '@/lib/cityImages';
import { estimateTripPrice, pickAirlineForRoute, getAirportCoords } from '@/lib/pricing';
import { DESTINATIONS } from '@/lib/destinations';
import type { DestinationProfile } from '@/lib/destinations';
import type { TripPackage } from '@/app/api/ai/plan-trip/route';
import { getCached, setCache } from '@/lib/cache';
import { fetchLivePackagesForDestinations, type LivePackageResult } from '@/lib/live-packages';

// Live mode fans out ~30 destinations × 2 Tripadvisor calls (flight + hotel)
// in parallel; cache hits return instantly but cache misses can take 10-20s.
// Default Vercel function timeout is 10s — bump to the Hobby plan max so the
// batch finishes on a cold cache.
export const maxDuration = 60;

/** Fisher-Yates shuffle that returns a fresh array — leaves the cached
 *  source array untouched so the next call still has all 18 packages. */
function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const DEFAULT_NIGHTS = 4;

function futureDates(daysAhead = 21, nights = DEFAULT_NIGHTS) {
    const dep = new Date();
    dep.setDate(dep.getDate() + daysAhead);
    const ret = new Date(dep);
    ret.setDate(ret.getDate() + nights);
    return {
        departureDate: dep.toISOString().split('T')[0],
        returnDate: ret.toISOString().split('T')[0],
    };
}

function buildFallbackAiContent(pkg: TripPackage) {
    const city = pkg.destination.city;
    const country = pkg.destination.country;
    const nights = pkg.nights;
    return {
        description: `Discover the magic of ${city} on this perfectly curated ${nights}-night journey. From iconic landmarks to hidden local gems, this trip combines the best of ${country} culture and beauty.`,
        whyThisTrip: `This trip is perfect for travelers looking for an unforgettable experience in ${city} at a great price.`,
        dayByDay: Array.from({ length: Math.min(nights, 5) }, (_, i) => ({
            day: i + 1,
            title: i === 0
                ? `Arrival in ${city}`
                : i === nights - 1
                    ? 'Final Day & Departure'
                    : `Explore ${city} - Day ${i + 1}`,
            morning: {
                activity: i === 0 ? 'Airport arrival & hotel check-in' : 'Breakfast at a local café',
                description: i === 0 ? `Settle in and get oriented in ${city}` : 'Start your day with local flavors',
                type: i === 0 ? 'transport' : 'dining',
            },
            afternoon: {
                activity: `Explore ${city} highlights`,
                description: `Visit the top sights and local neighborhoods of ${city}`,
                type: 'sightseeing',
            },
            evening: {
                activity: 'Dinner at a local restaurant',
                description: `Enjoy the best of ${country} cuisine`,
                type: 'dining',
            },
        })),
        topAttractions: [
            { name: `${city} Historic Center`, description: `Explore the historic heart of ${city}`, category: 'landmark' as const },
            { name: `${city} National Museum`, description: `Discover the culture and history of ${country}`, category: 'museum' as const },
            { name: `${city} Central Park`, description: 'Green oasis in the heart of the city', category: 'park' as const },
            { name: 'Local Market', description: `Browse local produce and crafts in ${city}`, category: 'other' as const },
            { name: 'Scenic Viewpoint', description: `Panoramic views over ${city}`, category: 'landmark' as const },
        ],
        topRestaurants: [
            { name: 'Local Kitchen', cuisine: `Traditional ${country}`, priceRange: '€€' as const, description: 'Authentic local cuisine in a welcoming atmosphere' },
            { name: 'Central Bistro', cuisine: 'International', priceRange: '€€' as const, description: 'Popular restaurant in the city center' },
            { name: 'Street Food Market', cuisine: 'Street food', priceRange: '€' as const, description: 'Local street food and market stalls' },
        ],
        topCafes: [
            { name: 'Morning Brew', specialty: 'Coffee and pastries', description: 'Popular local café for breakfast and coffee' },
            { name: `${city} Coffee House`, specialty: 'Local coffee blends', description: 'Cozy spot for coffee and conversation' },
            { name: 'The Corner Café', specialty: 'Specialty coffee', description: 'Third-wave coffee in a relaxed setting' },
        ],
        localTips: [
            'Book popular restaurants and attractions in advance',
            'Use local public transport to save money and see more',
            'Visit popular attractions early morning to avoid crowds',
        ],
        estimatedDailyExpenses: { food: 35, transport: 12, activities: 20 },
    };
}

function buildPackageForRoute(
    origin: string,
    toIata: string,
    nights: number,
    departureDate: string,
    returnDate: string,
    currency: string
): TripPackage | null {
    const estimate = estimateTripPrice(origin, toIata, nights, 999999);
    if (!estimate) return null;

    let dest: DestinationProfile | undefined = DESTINATIONS.find(d => d.iata === toIata);
    if (!dest) {
        const city = getCityFromIata(toIata) || toIata;
        const country = getCountryFromIata(toIata) || '';
        const coords = getAirportCoords(toIata);
        dest = {
            city,
            country,
            iata: toIata,
            tags: [],
            climate: 'varied',
            budgetLevel: 'budget',
            bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            imageId: getCityImageByIata(toIata).split('photo-')[1]?.split('?')[0] || '',
            latitude: coords?.lat || 0,
            longitude: coords?.lon || 0,
        };
    }

    const airlineCode = pickAirlineForRoute(origin, toIata, estimate.distanceKm);
    const flightTotal = estimate.flightRoundTrip;
    const hotelTotal = estimate.hotelTotal;
    const totalPrice = flightTotal + hotelTotal + estimate.activitiesBudget;

    // Calculate arrival time (handles hour overflow within 24h)
    const depTotalMin = 8 * 60 + 30 + estimate.durationHours * 60 + estimate.durationMinutes;
    const arrHour = Math.floor(depTotalMin / 60) % 24;
    const arrMin = depTotalMin % 60;

    const pkg: TripPackage = {
        id: `deal-${origin}-${toIata}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        destination: dest,
        flight: {
            outbound: null,
            price: flightTotal,
            currency,
            airline: airlineCode,
            airlineCode,
            duration: estimate.durationISO,
            stops: estimate.stops,
            departureTime: `${departureDate}T08:30:00`,
            arrivalTime: `${departureDate}T${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}:00`,
        },
        hotel: {
            id: `est-${toIata}`,
            name: `${dest.city} City Hotel`,
            stars: 3,
            price: hotelTotal,
            pricePerNight: Math.round(hotelTotal / nights),
            currency,
            checkIn: departureDate,
            checkOut: returnDate,
            amenities: ['Free WiFi', 'Air Conditioning', 'Breakfast available', '24h Reception'],
        },
        totalPrice: Math.round(totalPrice),
        currency,
        nights,
        aiContent: null,
        score: 0,
    };

    return pkg;
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ iata: string }> }
) {
    // Auth gate — deals are an authenticated-only feature.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { iata } = await params;
    const origin = (iata || '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(origin)) {
        return NextResponse.json({ error: 'Invalid IATA code' }, { status: 400 });
    }

    const originCity = getCityFromIata(origin) || origin;

    // Optional ?departureDate= and ?returnDate= overrides — used by /flights
    // when the user picked an origin + date but no destination. When supplied
    // we DON'T use the per-origin cache because dates change the result.
    const { searchParams } = new URL(req.url);
    const dateOverride = searchParams.get('departureDate');
    const returnOverride = searchParams.get('returnDate');

    // Per-origin 60min cache. On every hit we re-shuffle so the UI looks
    // fresh while package content (id, price, AI text) stays stable —
    // sessionStorage lookups via `trip_${id}` keep working across reloads.
    const cacheKey = dateOverride
        ? `deals:${origin}:${dateOverride}:${returnOverride || ''}`
        : `deals:${origin}`;
    const cached = await getCached(cacheKey);
    if (cached?.data) {
        const arr = cached.data as TripPackage[];
        return NextResponse.json({
            origin,
            originCity,
            count: arr.length,
            packages: shuffleArray(arr),
            source: 'cached',
        });
    }

    const nights = DEFAULT_NIGHTS;
    const generated = futureDates(7, nights);
    const departureDate = dateOverride || generated.departureDate;
    const returnDate = returnOverride || (
        dateOverride
            ? (() => {
                const d = new Date(dateOverride + 'T00:00:00Z');
                d.setUTCDate(d.getUTCDate() + nights);
                return d.toISOString().split('T')[0];
              })()
            : generated.returnDate
    );
    const currency = 'EUR';

    // 1. Build the CANDIDATE POOL (just IATA codes — no prices yet).
    //    COMMON_ROUTES + DESTINATIONS are now used ONLY as a "popular destinations
    //    from this origin" seed list. Prices come from Tripadvisor live.
    const seenCand = new Set<string>();
    const candidates: string[] = [];
    const pushCand = (iata: string) => {
        const code = (iata || '').toUpperCase();
        if (!/^[A-Z]{3}$/.test(code)) return;
        if (code === origin) return;
        if (seenCand.has(code)) return;
        seenCand.add(code);
        candidates.push(code);
    };
    COMMON_ROUTES.filter((r) => r.from === origin).forEach((r) => pushCand(r.to));
    if (candidates.length < 8) {
        // Exotic origin → seed with OTP's popular destinations
        COMMON_ROUTES.filter((r) => r.from === 'OTP').forEach((r) => pushCand(r.to));
    }
    // Final supplement from DESTINATIONS so we hit 30+ candidates even for low-volume origins
    DESTINATIONS.forEach((d) => pushCand(d.iata));
    // Cap the candidate pool — 18 destinations × (1 flight + 1 hotel) ≈ 36 RapidAPI
    // calls per cache miss. At concurrency=4 with a 10s wrapper timeout, worst
    // case is ~50s — leaving headroom under Vercel's 60s maxDuration.
    const candidatePool = candidates.slice(0, 18);

    // 2. Fetch LIVE flight + hotel for each candidate in parallel batches.
    console.log(`[deals] Fetching live Tripadvisor data for ${candidatePool.length} candidates from ${origin}`);
    let liveResults: LivePackageResult[] = [];
    try {
        liveResults = await fetchLivePackagesForDestinations({
            origin,
            destinations: candidatePool,
            departureDate,
            returnDate,
            concurrency: 4,
        });
        console.log(`[deals] Live results: ${liveResults.length}/${candidatePool.length} destinations returned valid data`);
    } catch (e) {
        console.warn('[deals] Live package batch failed entirely:', (e as Error).message);
    }

    // 3. Build TripPackage objects from live data.
    let packages: TripPackage[] = liveResults.map((live) => {
        const dest = live.destinationIata;
        let destProfile: DestinationProfile | undefined = DESTINATIONS.find((d) => d.iata === dest);
        if (!destProfile) {
            const city = getCityFromIata(dest) || dest;
            const country = getCountryFromIata(dest) || '';
            const coords = getAirportCoords(dest);
            destProfile = {
                city,
                country,
                iata: dest,
                tags: [],
                climate: 'varied',
                budgetLevel: 'budget',
                bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                imageId: getCityImageByIata(dest).split('photo-')[1]?.split('?')[0] || '',
                latitude: coords?.lat || 0,
                longitude: coords?.lon || 0,
            };
        }

        const flightPrice = Math.round(live.flight.price);
        const hotelTotal = Math.round(live.hotel.totalPrice);
        const totalPrice = flightPrice + hotelTotal;

        const pkg: TripPackage = {
            id: `deal-${origin}-${dest}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            destination: destProfile,
            flight: {
                outbound: live.flight,
                price: flightPrice,
                currency: live.flight.currency,
                airline: live.flight.airline,
                airlineCode: live.flight.airline,
                duration: live.flight.duration,
                stops: live.flight.stops,
                departureTime: `${live.flight.departureDate}T${live.flight.departureTime || '08:00'}:00`,
                arrivalTime: `${live.flight.arrivalDate}T${live.flight.arrivalTime || '12:00'}:00`,
            },
            hotel: {
                id: live.hotel.id,
                name: live.hotel.name,
                stars: live.hotel.rating,
                price: hotelTotal,
                pricePerNight: Math.round(live.hotel.pricePerNight),
                currency: live.hotel.currency,
                checkIn: departureDate,
                checkOut: returnDate,
                amenities: live.hotel.amenities,
            },
            totalPrice,
            currency,
            nights,
            aiContent: null,
            score: 0,
        };
        return pkg;
    });

    // 4. Per-destination fallback: any candidate that didn't come back from
    //    Tripadvisor falls back to estimator so we still surface the card.
    const liveSet = new Set(liveResults.map((r) => r.destinationIata));
    const missing = candidatePool.filter((c) => !liveSet.has(c));
    if (missing.length > 0) {
        console.log(`[deals] Falling back to estimator for ${missing.length} destinations: ${missing.join(', ')}`);
        const fallbacks = missing
            .map((dest) => buildPackageForRoute(origin, dest, nights, departureDate, returnDate, currency))
            .filter((p): p is TripPackage => p !== null)
            .map((p) => ({ ...p, isEstimated: true }));
        packages = [...packages, ...fallbacks];
    }

    // 5. Sort + diversify. Cheapest wins, regional diversity prevents 30 cards
    //    from the same region.
    packages.sort((a, b) => a.totalPrice - b.totalPrice);
    const top = diversifyPackages(packages, 30);

    // Generate AI content — top 3 get real AI, rest use fallback (cost optimization)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const needAi = top.slice(0, 3);
    const useFallback = top.slice(3);

    if (apiKey && needAi.length > 0) {
        await Promise.all(needAi.map(async (pkg) => {
            try {
                const activityBudget = pkg.nights * 25;
                const prompt = `You are a travel expert. Generate a trip itinerary for this trip:

Destination: ${pkg.destination.city}, ${pkg.destination.country}
Dates: ${pkg.hotel?.checkIn} to ${pkg.hotel?.checkOut} (${pkg.nights} nights)
Budget remaining for activities: €${activityBudget}
Travel styles: leisure, culture
Group: 1 adult

IMPORTANT: Use REAL, specific place names that actually exist in ${pkg.destination.city}. Do NOT use generic names like "Local Museum" or "City Center Restaurant".

Return ONLY valid JSON (no markdown, no backticks):
{
  "description": "2-3 sentence compelling trip description",
  "whyThisTrip": "1 sentence explaining why this is a great deal",
  "dayByDay": [
    {
      "day": 1,
      "title": "Arrival & First Impressions",
      "morning": { "activity": "specific activity name", "description": "details", "type": "transport" },
      "afternoon": { "activity": "specific attraction name", "description": "details", "type": "sightseeing" },
      "evening": { "activity": "specific restaurant name", "description": "details", "type": "dining" }
    }
  ],
  "topAttractions": [
    { "name": "Real attraction name", "description": "One sentence about this attraction", "category": "museum|landmark|park|other" },
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
  "estimatedDailyExpenses": { "food": 35, "transport": 12, "activities": 20 }
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
                } else {
                    pkg.aiContent = buildFallbackAiContent(pkg);
                }
            } catch (e) {
                console.warn('[deals] AI gen failed for', pkg.destination.iata, e);
                pkg.aiContent = buildFallbackAiContent(pkg);
            }
        }));
    } else {
        needAi.forEach(pkg => { pkg.aiContent = buildFallbackAiContent(pkg); });
    }
    useFallback.forEach(pkg => { pkg.aiContent = buildFallbackAiContent(pkg); });

    // Persist the un-shuffled array so we can re-shuffle on every cache hit.
    await setCache(cacheKey, top, 60);

    return NextResponse.json({
        origin,
        originCity,
        count: top.length,
        packages: shuffleArray(top),
        source: 'live',
    });
}
