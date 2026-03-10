import { NextResponse } from 'next/server';
import amadeus from '@/lib/amadeus';
import { getCached, setCache } from '@/lib/cache';
import { canMakeAmadeusCall, recordAmadeusCall } from '@/lib/rateLimiter';
import { parseFlightOffer, parseHotelOffer } from '@/lib/amadeus/helpers';
import { generatePackagesWithinBudget } from '@/lib/itinerary/budgetAllocator';
import type { PointOfInterest } from '@/types/itinerary';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            origin,
            destination,
            departureDate,
            returnDate,
            adults = 1,
            children = 0,
            budget = 1500,
            currency = 'EUR',
            preferences = [],
        } = body;

        if (!origin || !destination || !departureDate || !returnDate) {
            return NextResponse.json(
                { error: 'Missing required fields: origin, destination, departureDate, returnDate' },
                { status: 400 }
            );
        }

        // Check cache
        const cacheKey = `itinerary:${origin}:${destination}:${departureDate}:${returnDate}:${adults}:${children}:${budget}`;
        const cached = await getCached(cacheKey);
        if (cached) {
            return NextResponse.json({ ...(cached.data as Record<string, unknown>), source: 'cached' });
        }

        if (!canMakeAmadeusCall()) {
            return NextResponse.json({
                packages: [],
                warning: 'Rate limited. Please try again shortly.',
            });
        }

        // Fetch flights + hotels in parallel
        const totalTravelers = adults + children;

        const flightParams: Record<string, string> = {
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate,
            adults: String(adults),
            travelClass: 'ECONOMY',
            max: '15',
            currencyCode: currency,
        };
        if (returnDate) flightParams.returnDate = returnDate;
        if (children > 0) flightParams.children = String(children);

        let flights: ReturnType<typeof parseFlightOffer>[] = [];
        let hotels: ReturnType<typeof parseHotelOffer>[] = [];
        let activities: PointOfInterest[] = [];

        try {
            recordAmadeusCall();
            const [flightsRes, hotelsListRes] = await Promise.all([
                amadeus.shopping.flightOffersSearch.get(flightParams),
                amadeus.referenceData.locations.hotels.byCity.get({
                    cityCode: destination,
                    ratings: '3,4,5',
                    radius: 10,
                    radiusUnit: 'KM',
                }),
            ]);

            flights = ((flightsRes.data || []) as Record<string, unknown>[]).map(parseFlightOffer);

            // Get hotel offers
            const hotelIds = ((hotelsListRes.data || []) as Record<string, unknown>[])
                .slice(0, 15)
                .map((h) => h.hotelId as string)
                .filter(Boolean);

            if (hotelIds.length > 0) {
                recordAmadeusCall();
                const offersRes = await amadeus.shopping.hotelOffersSearch.get({
                    hotelIds: hotelIds.join(','),
                    checkInDate: departureDate,
                    checkOutDate: returnDate,
                    adults: String(adults),
                    roomQuantity: '1',
                    currency,
                });
                hotels = ((offersRes.data || []) as Record<string, unknown>[]).map(parseHotelOffer);
            }

            // Try to get POIs (non-critical) - use fetch to our own API route
            try {
                const poiRes = await fetch(
                    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/poi?latitude=51.5074&longitude=-0.1278&radius=5`
                );
                const poiData = await poiRes.json();
                activities = (poiData.pois || []) as PointOfInterest[];
            } catch {
                // POI fetch is non-critical
            }
        } catch (err: unknown) {
            const error = err as { message?: string };
            console.error('[Itinerary] Amadeus error:', error?.message);
            return NextResponse.json({
                packages: [],
                flights: [],
                hotels: [],
                warning: 'Unable to fetch travel data. Please try again.',
            });
        }

        // Generate budget-optimized packages
        const packages = generatePackagesWithinBudget(
            flights,
            hotels,
            activities,
            budget,
            totalTravelers,
            departureDate,
            returnDate
        );

        const totalFlightCost = flights.length > 0 ? flights[0].price.total : 0;
        const totalHotelCost = hotels.length > 0 ? (hotels[0].offers[0]?.price.total || 0) : 0;

        const result = {
            packages: packages.slice(0, 10),
            flights: flights.slice(0, 20),
            hotels: hotels.slice(0, 10),
            activities,
            totalOptions: packages.length,
            priceBreakdown: {
                flights: totalFlightCost,
                hotel: totalHotelCost,
                activities: 0,
            },
            searchParams: {
                origin,
                destination,
                departureDate,
                returnDate,
                adults,
                children,
                budget,
                currency,
                preferences,
            },
        };

        // Cache for 30 minutes
        await setCache(cacheKey, result, 30);

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Itinerary] Unexpected error:', error);
        return NextResponse.json(
            { packages: [], warning: 'Search failed.' },
            { status: 200 }
        );
    }
}
