/* GET /api/deals/from/[iata] — 6 cheapest packages from origin */

import { NextResponse } from 'next/server';
import { searchFlightInspirations } from '@/lib/amadeus-client';
import { COMMON_ROUTES } from '@/lib/commonRoutes';
import { getCityFromIata, getCountryFromIata } from '@/lib/iataMapping';
import { getCityImageByIata } from '@/lib/cityImages';

const HOTEL_ESTIMATE_EUR: Record<string, number> = {
    LHR: 90, LGW: 85, STN: 75, LTN: 75, LCY: 95,
    CDG: 95, ORY: 90, FCO: 75, MXP: 70, BCN: 70,
    AMS: 95, BER: 65, MAD: 70, LIS: 65, ATH: 55,
    IST: 45, DXB: 110, VIE: 75, PRG: 55, BUD: 50,
    WAW: 50, CPH: 105, DUB: 85, FRA: 90, MUC: 95,
    ZRH: 120, GVA: 115, BRU: 80, SOF: 45, BEG: 45,
};

const DEFAULT_HOTEL_NIGHT = 65;
const DEFAULT_NIGHTS = 4;
const DEFAULT_ACTIVITY_BUDGET = 80;

function estimateHotel(iata: string, nights: number): number {
    return (HOTEL_ESTIMATE_EUR[iata] || DEFAULT_HOTEL_NIGHT) * nights;
}

function buildMiniItinerary(city: string, nights: number) {
    const templates = [
        { title: `Arrival in ${city}`, description: `Check in, explore the city center and enjoy your first local dinner.` },
        { title: `Top landmarks of ${city}`, description: `Visit the most iconic sights and museums.` },
        { title: `Neighborhoods & food`, description: `Discover hidden gems, markets, and traditional cuisine.` },
        { title: `Day trip`, description: `Excursion to a nearby attraction or nature spot.` },
        { title: `Leisure & shopping`, description: `Relaxed morning, souvenir shopping, local café stops.` },
        { title: `Departure`, description: `Final breakfast, pack up and head to the airport.` },
    ];
    return Array.from({ length: Math.max(2, nights) }, (_, i) => ({
        day: i + 1,
        ...templates[Math.min(i, templates.length - 1)],
    }));
}

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

interface DealCard {
    id: string;
    origin: string;
    originCity: string;
    destination: string;
    destinationCity: string;
    destinationCountry: string;
    imageUrl: string;
    flightPrice: number;
    hotelPrice: number;
    totalPrice: number;
    originalPrice: number;
    currency: string;
    nights: number;
    departureDate: string;
    returnDate: string;
    isDirect: boolean;
    itinerary: { day: number; title: string; description: string }[];
    source: 'live' | 'reference';
}

function buildCardFromInspiration(
    origin: string,
    originCity: string,
    insp: Record<string, unknown>,
    nights: number
): DealCard {
    const dest = (insp.destination as string) || '';
    const destCity = getCityFromIata(dest) || dest;
    const priceObj = insp.price as Record<string, unknown> | undefined;
    const flightPrice = Math.round(parseFloat((priceObj?.total as string) || '0'));
    const hotelPrice = estimateHotel(dest, nights);
    const total = flightPrice + hotelPrice + Math.round(DEFAULT_ACTIVITY_BUDGET * (nights / DEFAULT_NIGHTS));
    const departureDate = ((insp.departureDate as string) || futureDates().departureDate) as string;
    const returnDate = ((insp.returnDate as string) || futureDates(21, nights).returnDate) as string;

    return {
        id: `deal-${origin}-${dest}-${Date.now()}`,
        origin,
        originCity,
        destination: dest,
        destinationCity: destCity,
        destinationCountry: getCountryFromIata(dest) || '',
        imageUrl: getCityImageByIata(dest),
        flightPrice,
        hotelPrice,
        totalPrice: total,
        originalPrice: Math.round(total * 1.25),
        currency: 'EUR',
        nights,
        departureDate,
        returnDate,
        isDirect: true,
        itinerary: buildMiniItinerary(destCity, nights),
        source: 'live',
    };
}

function buildCardFromCommonRoute(
    origin: string,
    originCity: string,
    route: { from: string; to: string; avgPrice: number; currency: string },
    nights: number
): DealCard {
    const destCity = getCityFromIata(route.to) || route.to;
    const flightPrice = route.avgPrice * 2;
    const hotelPrice = estimateHotel(route.to, nights);
    const total = flightPrice + hotelPrice + DEFAULT_ACTIVITY_BUDGET;
    const { departureDate, returnDate } = futureDates(21, nights);

    return {
        id: `deal-${origin}-${route.to}-${Date.now()}`,
        origin,
        originCity,
        destination: route.to,
        destinationCity: destCity,
        destinationCountry: getCountryFromIata(route.to) || '',
        imageUrl: getCityImageByIata(route.to),
        flightPrice,
        hotelPrice,
        totalPrice: total,
        originalPrice: Math.round(total * 1.25),
        currency: route.currency,
        nights,
        departureDate,
        returnDate,
        isDirect: true,
        itinerary: buildMiniItinerary(destCity, nights),
        source: 'reference',
    };
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
    let deals: DealCard[] = [];

    try {
        const inspirations = await searchFlightInspirations(origin);
        if (Array.isArray(inspirations) && inspirations.length > 0) {
            deals = inspirations
                .filter((i) => i && typeof i === 'object')
                .slice(0, 20)
                .map((i) => buildCardFromInspiration(origin, originCity, i as Record<string, unknown>, nights));
        }
    } catch (e) {
        console.warn('[deals] Inspiration API failed:', (e as Error).message);
    }

    if (deals.length < 6) {
        const seen = new Set(deals.map((d) => d.destination));
        const fallbacks = COMMON_ROUTES
            .filter((r) => r.from === origin && !seen.has(r.to))
            .map((r) => buildCardFromCommonRoute(origin, originCity, r, nights));
        deals = [...deals, ...fallbacks];
    }

    if (deals.length === 0 && origin !== 'OTP') {
        const fallbacks = COMMON_ROUTES
            .filter((r) => r.from === 'OTP')
            .map((r) =>
                buildCardFromCommonRoute(
                    origin,
                    originCity,
                    { ...r, avgPrice: r.avgPrice + 30 },
                    nights
                )
            );
        deals = fallbacks;
    }

    deals.sort((a, b) => a.totalPrice - b.totalPrice);
    const top = deals.slice(0, 6);

    return NextResponse.json({
        origin,
        originCity,
        count: top.length,
        deals: top,
        source: top[0]?.source === 'live' ? 'live' : 'reference',
    });
}
