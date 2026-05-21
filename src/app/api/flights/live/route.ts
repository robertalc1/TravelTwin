import { NextResponse } from 'next/server';
import { searchFlights } from '@/lib/tripadvisor-client';
import { normalizeFlight } from '@/lib/tripadvisor-normalize';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';
import type { NormalizedFlight } from '@/lib/supabase/types';

export async function GET(request: Request) {
  // Diagnostic — boots show whether the key is configured + which route is
  // being queried. Never logs the key itself.
  console.log('[Flights] RAPIDAPI_KEY configured:', !!process.env.RAPIDAPI_KEY);
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin')?.toUpperCase();
    const destination = searchParams.get('destination')?.toUpperCase();
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate') || undefined;
    const adults = searchParams.get('adults') || '1';
    const travelClass = searchParams.get('travelClass') || 'ECONOMY';
    console.log(`[Flights] Search: ${origin} → ${destination} on ${departureDate}${returnDate ? ` (return ${returnDate})` : ''} class=${travelClass}`);

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
      console.log(`[Flights] Cache hit: ${flights.length} flights`);
      return NextResponse.json({ flights, source: 'cached', count: flights.length });
    }

    let flights: NormalizedFlight[] = [];
    let rawCount = 0;
    let lastError: string | undefined;

    // 2. Tripadvisor RapidAPI — sole live source
    if (!canMakeRapidApiCall()) {
      console.warn('[Flights] Rate limiter is blocking — RAPIDAPI_KEY missing or daily cap reached');
      lastError = 'Rate limiter blocked the call (no key configured or daily cap hit).';
    } else {
      recordRapidApiCall();
      try {
        const rawFlights = await searchFlights({
          origin,
          destination,
          departureDate,
          returnDate,
          adults,
          travelClass,
        });
        rawCount = rawFlights.length;
        console.log(`[Flights] Tripadvisor returned ${rawCount} raw flights`);
        flights = rawFlights
          .map((f) => normalizeFlight(f, origin, destination, travelClass))
          .filter((f): f is NormalizedFlight => f !== null);
        console.log(`[Flights] After normalize: ${flights.length} flights with usable price`);
      } catch (err: unknown) {
        lastError = (err as Error)?.message ?? 'unknown error';
        console.error('[Flights] Tripadvisor search failed:', lastError);
      }
    }

    flights.sort((a, b) => a.price - b.price);

    if (flights.length > 0) {
      await setCache(cacheKey, flights, 30);
      return NextResponse.json({ flights, source: 'live', count: flights.length });
    }

    // Empty result with a precise warning so the UI can tell the user why.
    let warning: string;
    if (!process.env.RAPIDAPI_KEY) {
      warning = `RAPIDAPI_KEY is not configured in this environment. Live flight search is unavailable.`;
    } else if (lastError) {
      warning = `Tripadvisor request failed: ${lastError}`;
    } else if (rawCount === 0) {
      warning = `Tripadvisor returned 0 flights for ${origin} → ${destination} on ${departureDate}. Try a different date or route — Tripadvisor sometimes has gaps on certain combos.`;
    } else {
      warning = `${rawCount} flights came back but none had a usable price — Tripadvisor's purchase links are missing for this route. Try a different date.`;
    }

    return NextResponse.json({
      flights: [],
      source: 'empty',
      count: 0,
      rawCount,
      warning,
    });
  } catch (error) {
    console.error('[Flights] Unexpected error:', error);
    return NextResponse.json(
      { flights: [], source: 'error', count: 0, warning: 'Search failed. Please try again.' },
      { status: 200 }
    );
  }
}
