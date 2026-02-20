import { NextResponse } from 'next/server';
import amadeus from '@/lib/amadeus';
import { getCached, setCache } from '@/lib/cache';
import { canMakeAmadeusCall, recordAmadeusCall } from '@/lib/rateLimiter';
import { getCityFromIata } from '@/lib/iataMapping';
import type { NormalizedFlight } from '@/lib/supabase/types';

function normalizeAmadeusFlight(offer: Record<string, unknown>): NormalizedFlight {
  const itinerary = (offer.itineraries as Record<string, unknown>[])?.[0];
  const segments = (itinerary?.segments as Record<string, unknown>[]) || [];
  const firstSeg = segments[0] || {};
  const lastSeg = segments[segments.length - 1] || firstSeg;
  const price = offer.price as Record<string, unknown>;
  const departure = firstSeg.departure as Record<string, string> | undefined;
  const arrival = lastSeg.arrival as Record<string, string> | undefined;
  const travelerPricings = (offer.travelerPricings as Record<string, unknown>[]) || [];
  const fareDetail = (travelerPricings[0]?.fareDetailsBySegment as Record<string, unknown>[]) || [];

  return {
    id: (offer.id as string) || crypto.randomUUID(),
    origin: departure?.iataCode || '',
    originCity: getCityFromIata(departure?.iataCode || ''),
    destination: arrival?.iataCode || '',
    destinationCity: getCityFromIata(arrival?.iataCode || ''),
    departureDate: departure?.at?.split('T')[0] || '',
    arrivalDate: arrival?.at?.split('T')[0] || '',
    departureTime: departure?.at?.split('T')[1]?.substring(0, 5) || '',
    arrivalTime: arrival?.at?.split('T')[1]?.substring(0, 5) || '',
    duration: (itinerary?.duration as string) || '',
    stops: Math.max(0, segments.length - 1),
    airline: (firstSeg.carrierCode as string) || '',
    airlineName: (firstSeg.carrierCode as string) || '',
    price: parseFloat(price?.total as string) || 0,
    currency: (price?.currency as string) || 'USD',
    travelClass: (fareDetail[0]?.cabin as string) || 'ECONOMY',
    source: 'live',
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin')?.toUpperCase();
    const destination = searchParams.get('destination')?.toUpperCase();
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate');
    const adults = searchParams.get('adults') || '1';
    const travelClass = searchParams.get('travelClass') || 'ECONOMY';

    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        { error: 'Missing required params: origin, destination, departureDate' },
        { status: 400 }
      );
    }

    // 1. Check cache (15 min TTL)
    const cacheKey = `flight:${origin}:${destination}:${departureDate}:${returnDate || ''}:${travelClass}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      const flights = (cached.data as NormalizedFlight[]).map((f) => ({
        ...f,
        source: 'cached' as const,
      }));
      return NextResponse.json({ flights, source: 'cached', count: flights.length });
    }

    // 2. Try Amadeus API
    if (canMakeAmadeusCall()) {
      try {
        recordAmadeusCall();
        const params: Record<string, string> = {
          originLocationCode: origin,
          destinationLocationCode: destination,
          departureDate,
          adults,
          travelClass,
          max: '20',
          currencyCode: 'USD',
        };
        if (returnDate) params.returnDate = returnDate;

        const response = await amadeus.shopping.flightOffersSearch.get(params);
        const flights: NormalizedFlight[] = (
          (response.data || []) as Record<string, unknown>[]
        ).map(normalizeAmadeusFlight);

        if (flights.length > 0) {
          await setCache(cacheKey, flights, 15);
          return NextResponse.json({ flights, source: 'live', count: flights.length });
        }

        // Amadeus returned no results
        return NextResponse.json({
          flights: [],
          source: 'live',
          count: 0,
          warning: `No flights found for ${origin} → ${destination} on ${departureDate}. Try different dates or airports.`,
        });
      } catch (err: unknown) {
        const error = err as { response?: { statusCode?: number }; message?: string };
        console.warn('[Flights] Amadeus error:', error?.response?.statusCode || error?.message);
      }
    }

    // 3. Rate-limited or Amadeus unavailable — friendly error
    return NextResponse.json({
      flights: [],
      source: 'error',
      count: 0,
      warning: 'Unable to fetch live flight prices right now. Please try again in a moment.',
    });
  } catch (error) {
    console.error('[Flights] Unexpected error:', error);
    return NextResponse.json(
      {
        flights: [],
        source: 'error',
        count: 0,
        warning: 'Search failed. Please try again.',
      },
      { status: 200 }
    );
  }
}
