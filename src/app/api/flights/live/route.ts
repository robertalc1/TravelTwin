import { NextResponse } from 'next/server';
import { searchFlights, type TAFlight } from '@/lib/tripadvisor-client';
import { normalizeFlight } from '@/lib/tripadvisor-normalize';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';
import type { NormalizedFlight } from '@/lib/supabase/types';

// Never edge-cache — flight prices change minute-to-minute upstream.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Add N days to a YYYY-MM-DD string. */
function addDays(yyyyMmDd: string, days: number): string {
  const d = new Date(yyyyMmDd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/** Keep only the outbound segment — for round-trip fallback when user wanted one-way. */
function trimToOutbound(flights: TAFlight[]): TAFlight[] {
  return flights.map((f) => ({
    ...f,
    segments: f.segments.length > 0 ? [f.segments[0]] : [],
  }));
}

export async function GET(request: Request) {
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
    let usedFallback = false;

    if (!canMakeRapidApiCall()) {
      console.warn('[Flights] Rate limiter is blocking — RAPIDAPI_KEY missing or daily cap reached');
      lastError = 'Rate limiter blocked the call (no key configured or daily cap hit).';
    } else {
      recordRapidApiCall();
      try {
        // ── First attempt: honor the user's itinerary type as-is.
        let rawFlights = await searchFlights({
          origin,
          destination,
          departureDate,
          returnDate,
          adults,
          travelClass,
        });
        rawCount = rawFlights.length;
        console.log(`[Flights] Tripadvisor returned ${rawCount} raw flights`);

        // ── Tripadvisor16 quirk: many OD pairs return ZERO results for
        //     ONE_WAY but plenty for ROUND_TRIP. When the user didn't pick a
        //     return date and we got nothing, retry as round-trip with a
        //     synthetic +7-day return and keep only the outbound segment.
        if (rawCount === 0 && !returnDate) {
          const syntheticReturn = addDays(departureDate, 7);
          console.log(`[Flights] ONE_WAY empty — retrying as ROUND_TRIP with return=${syntheticReturn}`);
          recordRapidApiCall();
          try {
            const rt = await searchFlights({
              origin,
              destination,
              departureDate,
              returnDate: syntheticReturn,
              adults,
              travelClass,
            });
            if (rt.length > 0) {
              rawFlights = trimToOutbound(rt);
              rawCount = rawFlights.length;
              usedFallback = true;
              console.log(`[Flights] Round-trip fallback returned ${rawCount} flights — using outbound segment only`);
            }
          } catch (err: unknown) {
            console.warn('[Flights] Round-trip fallback also failed:', (err as Error)?.message);
          }
        }

        flights = rawFlights
          .map((f) => normalizeFlight(f, origin, destination, travelClass))
          .filter((f): f is NormalizedFlight => f !== null);
        console.log(`[Flights] After normalize: ${flights.length} flights with usable price (fallback=${usedFallback})`);
      } catch (err: unknown) {
        lastError = (err as Error)?.message ?? 'unknown error';
        console.error('[Flights] Tripadvisor search failed:', lastError);
      }
    }

    flights.sort((a, b) => a.price - b.price);

    if (flights.length > 0) {
      await setCache(cacheKey, flights, 30);
      return NextResponse.json({
        flights,
        source: 'live',
        count: flights.length,
        usedRoundTripFallback: usedFallback,
      });
    }

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
