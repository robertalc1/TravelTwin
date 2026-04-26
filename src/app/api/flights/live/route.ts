import { NextResponse } from 'next/server';
import { searchFlights } from '@/lib/amadeus-client';
import { getCached, setCache } from '@/lib/cache';
import { canMakeAmadeusCall, recordAmadeusCall, canMakeAviationstackCall, recordAviationstackCall } from '@/lib/rateLimiter';
import { getCityFromIata } from '@/lib/iataMapping';
import { fetchAviationstackFlights, normalizeAviationstackFlight } from '@/lib/aviationstack';
import {
  COMMON_ROUTES, AIRLINE_NAMES, DEPARTURE_SLOTS,
  getRouteDuration, formatDurationMinutes, findCommonRoute,
} from '@/lib/commonRoutes';
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
    currency: (price?.currency as string) || 'EUR',
    travelClass: (fareDetail[0]?.cabin as string) || 'ECONOMY',
    source: 'live',
    lastUpdated: new Date().toISOString(),
  };
}

function generateReferenceFlights(
  origin: string,
  destination: string,
  departureDate: string
): NormalizedFlight[] {
  const route = COMMON_ROUTES.find((r) => r.from === origin && r.to === destination)
    || COMMON_ROUTES.find((r) => r.from === destination && r.to === origin && r.from !== origin);

  if (!route) return [];

  const durationMin = getRouteDuration(origin, destination);
  const durationStr = formatDurationMinutes(durationMin);

  return route.airlines.slice(0, 3).map((airlineCode, i) => {
    const slot = DEPARTURE_SLOTS[i % DEPARTURE_SLOTS.length];
    const depHour = parseInt(slot.hour);
    const arrMinutes = depHour * 60 + parseInt(slot.minute) + durationMin;
    const arrHour = Math.floor(arrMinutes / 60) % 24;
    const arrMin = arrMinutes % 60;

    // ±20% price variance seeded by airline code
    const variance = 0.85 + (airlineCode.charCodeAt(0) % 7) * 0.05;
    const price = Math.round(route.avgPrice * variance);

    return {
      id: `ref-${airlineCode}-${origin}-${destination}-${i}`,
      origin,
      originCity: getCityFromIata(origin),
      destination,
      destinationCity: getCityFromIata(destination),
      departureDate,
      arrivalDate: departureDate,
      departureTime: `${slot.hour}:${slot.minute}`,
      arrivalTime: `${arrHour.toString().padStart(2, '0')}:${arrMin.toString().padStart(2, '0')}`,
      duration: durationStr,
      stops: 0,
      airline: airlineCode,
      airlineName: AIRLINE_NAMES[airlineCode] || airlineCode,
      price,
      currency: 'EUR',
      travelClass: 'ECONOMY',
      source: 'reference',
      lastUpdated: new Date().toISOString(),
    };
  });
}

function deduplicateFlights(flights: NormalizedFlight[]): NormalizedFlight[] {
  const seen = new Set<string>();
  return flights.filter((f) => {
    const key = `${f.airline}-${f.departureTime}-${f.origin}-${f.destination}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

    let flights: NormalizedFlight[] = [];
    let primarySource: string = 'live';

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
          currencyCode: 'EUR',
        };
        if (returnDate) params.returnDate = returnDate;

        const rawFlights = await searchFlights(params);
        flights = (rawFlights as Record<string, unknown>[]).map(normalizeAmadeusFlight);
      } catch (err: unknown) {
        console.error('[Flights] Amadeus search failed:', (err as Error)?.message);
      }
    }

    // 3. If Amadeus returned < 5 results, supplement with AviationStack
    if (flights.length < 5 && canMakeAviationstackCall()) {
      try {
        recordAviationstackCall();
        const asFlights = await fetchAviationstackFlights(origin, destination);
        const normalized = asFlights.map((f) => normalizeAviationstackFlight(f, departureDate));
        flights = deduplicateFlights([...flights, ...normalized]);
        if (normalized.length > 0 && flights.length <= normalized.length) {
          primarySource = 'aviationstack';
        }
      } catch (err: unknown) {
        console.warn('[Flights] AviationStack failed:', (err as Error)?.message);
      }
    }

    // 4. If still < 3 results, add reference flights from common routes
    if (flights.length < 3) {
      const refFlights = generateReferenceFlights(origin, destination, departureDate);
      flights = deduplicateFlights([...flights, ...refFlights]);
      if (flights.length > 0 && flights.every((f) => f.source === 'reference')) {
        primarySource = 'reference';
      }
    }

    // 5. Sort by price
    flights.sort((a, b) => a.price - b.price);

    if (flights.length > 0) {
      await setCache(cacheKey, flights, 30);
      return NextResponse.json({ flights, source: primarySource, count: flights.length });
    }

    return NextResponse.json({
      flights: [],
      source: 'live',
      count: 0,
      warning: `No flights found for ${origin} → ${destination} on ${departureDate}. Try different dates or airports.`,
    });
  } catch (error) {
    console.error('[Flights] Unexpected error:', error);
    return NextResponse.json(
      { flights: [], source: 'error', count: 0, warning: 'Search failed. Please try again.' },
      { status: 200 }
    );
  }
}
