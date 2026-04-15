/* GET /api/deals/from/[iata] — cheapest packages from origin, returned as TripPackage[] */

import { NextResponse } from 'next/server';
import { searchFlightInspirations } from '@/lib/amadeus-client';
import { diversifyPackages } from '@/lib/diversify';
import { COMMON_ROUTES } from '@/lib/commonRoutes';
import { getCityFromIata, getCountryFromIata } from '@/lib/iataMapping';
import { getCityImageByIata } from '@/lib/cityImages';
import { estimateTripPrice, pickAirlineForRoute, getAirportCoords } from '@/lib/pricing';
import { DESTINATIONS } from '@/lib/destinations';
import type { DestinationProfile } from '@/lib/destinations';
import type { TripPackage } from '@/app/api/ai/plan-trip/route';

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
    _req: Request,
    { params }: { params: Promise<{ iata: string }> }
) {
    const { iata } = await params;
    const origin = (iata || '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(origin)) {
        return NextResponse.json({ error: 'Invalid IATA code' }, { status: 400 });
    }

    const originCity = getCityFromIata(origin) || origin;
    const nights = DEFAULT_NIGHTS;
    const { departureDate, returnDate } = futureDates(21, nights);
    const currency = 'EUR';
    let packages: TripPackage[] = [];

    try {
        const inspirations = await searchFlightInspirations(origin);
        if (Array.isArray(inspirations) && inspirations.length > 0) {
            for (const insp of inspirations.slice(0, 20)) {
                if (!insp || typeof insp !== 'object') continue;
                const dest = (insp.destination as string) || '';
                if (!/^[A-Z]{3}$/.test(dest)) continue;

                const priceObj = insp.price as Record<string, unknown> | undefined;
                const amadeusFlightPrice = Math.round(parseFloat((priceObj?.total as string) || '0'));
                const estimate = estimateTripPrice(origin, dest, nights, 999999);

                // Use Amadeus departure date if available
                const inspDepDate = (insp.departureDate as string) || departureDate;
                const inspRetDate = new Date(inspDepDate);
                inspRetDate.setDate(inspRetDate.getDate() + nights);
                const inspRetDateStr = inspRetDate.toISOString().split('T')[0];

                const pkg = buildPackageForRoute(origin, dest, nights, inspDepDate, inspRetDateStr, currency);
                if (!pkg) continue;

                // Override with Amadeus price if it looks realistic (not a sandbox stub)
                if (estimate && amadeusFlightPrice > 0 && amadeusFlightPrice >= estimate.flightRoundTrip * 0.4) {
                    pkg.flight!.price = amadeusFlightPrice;
                    pkg.totalPrice = Math.round(amadeusFlightPrice + estimate.hotelTotal + estimate.activitiesBudget);
                }

                packages.push(pkg);
            }
        }
    } catch (e) {
        console.warn('[deals] Inspiration API failed:', (e as Error).message);
    }

    // Always supplement with COMMON_ROUTES fallbacks to ensure variety
    {
        const seen = new Set(packages.map(p => p.destination.iata));
        const fallbacks = COMMON_ROUTES
            .filter(r => r.from === origin && !seen.has(r.to))
            .map(r => buildPackageForRoute(origin, r.to, nights, departureDate, returnDate, r.currency || currency))
            .filter((p): p is TripPackage => p !== null);
        packages = [...packages, ...fallbacks];
    }

    if (packages.length === 0 && origin !== 'OTP') {
        packages = COMMON_ROUTES
            .filter(r => r.from === 'OTP')
            .map(r => buildPackageForRoute(origin, r.to, nights, departureDate, returnDate, r.currency || currency))
            .filter((p): p is TripPackage => p !== null);
    }

    packages.sort((a, b) => a.totalPrice - b.totalPrice);
    // Diversify so user doesn't see 18 destinations from the same region
    const top = diversifyPackages(packages, 18); // up to 18 diverse deals (safety cap: 30)

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

    return NextResponse.json({
        origin,
        originCity,
        count: top.length,
        packages: top,
    });
}
