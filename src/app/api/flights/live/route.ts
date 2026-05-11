import { NextResponse } from 'next/server';
import { searchFlights } from '@/lib/tripadvisor-client';
import { normalizeFlight } from '@/lib/tripadvisor-normalize';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';
import type { NormalizedFlight } from '@/lib/supabase/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin')?.toUpperCase();
    const destination = searchParams.get('destination')?.toUpperCase();
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate') || undefined;
    const adults = searchParams.get('adults') || '1';
    const travelClass = searchParams.get('travelClass') || 'ECONOMY';

    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        { error: 'Missing required params: origin, destination, departureDate' },
        { status: 400 }
      );
    }

    // 1. Check cache (30 min TTL)
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

    // 2. Tripadvisor RapidAPI — sole live source
    if (canMakeRapidApiCall()) {
      try {
        recordRapidApiCall();
        const rawFlights = await searchFlights({
          origin,
          destination,
          departureDate,
          returnDate,
          adults,
          travelClass,
        });
        flights = rawFlights
          .map((f) => normalizeFlight(f, origin, destination, travelClass))
          .filter((f): f is NormalizedFlight => f !== null);
      } catch (err: unknown) {
        console.error('[Flights] Tripadvisor search failed:', (err as Error)?.message);
      }
    }

    flights.sort((a, b) => a.price - b.price);

    if (flights.length > 0) {
      await setCache(cacheKey, flights, 30);
      return NextResponse.json({ flights, source: 'tripadvisor', count: flights.length });
    }

    // Strict mode: no fallback. Empty result = empty result.
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
