import { NextResponse } from 'next/server';
import amadeus from '@/lib/amadeus';
import { getCached, setCache } from '@/lib/cache';
import { canMakeAmadeusCall, recordAmadeusCall } from '@/lib/rateLimiter';
import { createClient } from '@/lib/supabase/server';
import { getCityFromIata, getIataCode, getCityName, extractStateCode } from '@/lib/iataMapping';
import type { NormalizedFlight, Flight } from '@/lib/supabase/types';

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
    id: offer.id as string || crypto.randomUUID(),
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
    currency: (price?.currency as string) || 'EUR',
    travelClass: (fareDetail[0]?.cabin as string) || 'ECONOMY',
    source: 'live',
    lastUpdated: new Date().toISOString(),
  };
}

function normalizeStaticFlight(flight: Flight): NormalizedFlight {
  const originIata = getIataCode(flight.from) || extractStateCode(flight.from);
  const destIata = getIataCode(flight.to) || extractStateCode(flight.to);
  const classMap: Record<string, string> = {
    economic: 'ECONOMY',
    premium: 'PREMIUM_ECONOMY',
    firstClass: 'FIRST',
  };

  return {
    id: `static-${flight.id}`,
    origin: originIata,
    originCity: getCityName(flight.from),
    destination: destIata,
    destinationCity: getCityName(flight.to),
    departureDate: flight.date || '',
    arrivalDate: flight.date || '',
    departureTime: flight.time || '',
    arrivalTime: '',
    duration: `${flight.distance}km`,
    stops: 0,
    airline: flight.agency,
    airlineName: flight.agency,
    price: flight.price,
    currency: 'BRL',
    travelClass: classMap[flight.flightType] || 'ECONOMY',
    source: 'fallback',
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

    // 1. Check cache
    const cacheKey = `flight:${origin}:${destination}:${departureDate}:${returnDate || ''}:${travelClass}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      const flights = (cached.data as NormalizedFlight[]).map((f) => ({ ...f, source: 'cached' as const }));
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
        const flights: NormalizedFlight[] = ((response.data || []) as Record<string, unknown>[]).map(normalizeAmadeusFlight);

        if (flights.length > 0) {
          // Save to cache (15 min TTL)
          await setCache(cacheKey, flights, 15);
          return NextResponse.json({ flights, source: 'live', count: flights.length });
        }
        // Empty result from Amadeus — fall through to static
      } catch (err: unknown) {
        const error = err as { response?: { statusCode?: number }; message?: string };
        console.warn('[Flights] Amadeus error:', error?.response?.statusCode || error?.message);
        // Fall through to static data
      }
    }

    // 3. Fallback to static Supabase data
    const supabase = await createClient();
    const originCity = getCityFromIata(origin);
    const destCity = getCityFromIata(destination);

    let query = supabase.from('flights').select('*').limit(20);

    if (originCity && originCity !== origin) {
      query = query.eq('from', originCity);
    }
    if (destCity && destCity !== destination) {
      query = query.eq('to', destCity);
    }

    // Map travelClass to static format
    const classMap: Record<string, string> = {
      ECONOMY: 'economic',
      PREMIUM_ECONOMY: 'premium',
      BUSINESS: 'premium',
      FIRST: 'firstClass',
    };
    if (classMap[travelClass]) {
      query = query.eq('flightType', classMap[travelClass]);
    }

    query = query.order('price', { ascending: true });

    const { data: staticFlights } = await query;
    const flights = (staticFlights || []).map((f: Flight) => normalizeStaticFlight(f));

    return NextResponse.json({
      flights,
      source: 'fallback',
      count: flights.length,
      warning: 'Showing reference data. Live pricing temporarily unavailable.',
    });
  } catch (error) {
    console.error('[Flights] Unexpected error:', error);
    return NextResponse.json(
      { flights: [], source: 'fallback', count: 0, error: 'Search failed. Please try again.' },
      { status: 200 } // Return 200 so frontend doesn't break
    );
  }
}
