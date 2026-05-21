import { NextResponse } from 'next/server';
import { searchFlights, type TAFlight } from '@/lib/tripadvisor-client';
import { normalizeFlight } from '@/lib/tripadvisor-normalize';
import { getCached, setCache } from '@/lib/cache';
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

/** Keep only the outbound segment — used when we issued a synthetic ROUND_TRIP
 *  call to dodge Tripadvisor16's empty-on-one-way quirk but the user actually
 *  wanted a one-way result. */
function trimToOutbound(flights: TAFlight[]): TAFlight[] {
  return flights.map((f) => ({
    ...f,
    segments: f.segments.length > 0 ? [f.segments[0]] : [],
  }));
}

interface AttemptResult {
  flights: NormalizedFlight[];
  rawCount: number;
  actualDate: string;
  trimmed: boolean;
}

/** Issue a single Tripadvisor search + normalize round for the given outbound
 *  date. Always ROUND_TRIP-shaped — we synthesize a +7d return when the user
 *  didn't supply one because the round-trip pipeline returns reliable
 *  purchaseLinks while the one-way pipeline often comes back empty for the
 *  same OD pair. */
async function attemptSearch(
  origin: string,
  destination: string,
  outboundDate: string,
  travelClass: string,
  adults: string,
  userReturnDate: string | undefined,
): Promise<AttemptResult> {
  const wantsRoundTripOutput = !!userReturnDate;
  const effectiveReturn = userReturnDate ?? addDays(outboundDate, 7);

  const rawRoundTrip = await searchFlights({
    origin,
    destination,
    departureDate: outboundDate,
    returnDate: effectiveReturn,
    adults,
    travelClass,
  });

  const rawFlights = wantsRoundTripOutput
    ? rawRoundTrip
    : trimToOutbound(rawRoundTrip);

  const flights = rawFlights
    .map((f) => normalizeFlight(f, origin, destination, travelClass))
    .filter((f): f is NormalizedFlight => f !== null);

  return {
    flights,
    rawCount: rawRoundTrip.length,
    actualDate: outboundDate,
    trimmed: !wantsRoundTripOutput,
  };
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
    const bypassCache = searchParams.get('nocache') === '1';
    console.log(`[Flights] Search: ${origin} → ${destination} on ${departureDate}${returnDate ? ` (return ${returnDate})` : ''} class=${travelClass}${bypassCache ? ' (cache bypassed)' : ''}`);

    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        { error: 'Missing required params: origin, destination, departureDate' },
        { status: 400 }
      );
    }

    const cacheKey = `flight:${origin}:${destination}:${departureDate}:${returnDate || ''}:${travelClass}`;
    if (!bypassCache) {
      const cached = await getCached(cacheKey);
      if (cached) {
        const flights = (cached.data as NormalizedFlight[]).map((f) => ({
          ...f,
          source: 'cached' as const,
        }));
        console.log(`[Flights] Cache hit: ${flights.length} flights`);
        return NextResponse.json({ flights, source: 'cached', count: flights.length });
      }
    }

    let lastError: string | undefined;
    let chosen: AttemptResult | null = null;
    let usedDateExpansion = false;
    let cumulativeRawCount = 0;

    // Try the requested date first, then ±1, ±2 day expansions in case
    // Tripadvisor genuinely has no inventory on the exact date. We stop the
    // moment any attempt yields normalized flights. Max 5 serial attempts
    // x ~3s typical = well under Vercel's 60s budget.
    const dateOffsets = [0, 1, -1, 2, -2];
    for (const offset of dateOffsets) {
      const tryDate = offset === 0 ? departureDate : addDays(departureDate, offset);
      try {
        const result = await attemptSearch(
          origin, destination, tryDate, travelClass, adults, returnDate,
        );
        cumulativeRawCount += result.rawCount;
        console.log(
          `[Flights] offset=${offset} date=${tryDate} raw=${result.rawCount} normalized=${result.flights.length}`,
        );
        if (result.flights.length > 0) {
          chosen = result;
          usedDateExpansion = offset !== 0;
          break;
        }
      } catch (err: unknown) {
        lastError = (err as Error)?.message ?? 'unknown error';
        console.warn(`[Flights] offset=${offset} attempt failed: ${lastError}`);
        // Quota-hit / network error — abort the expansion chain so we don't
        // burn through quota when the upstream is unavailable.
        if (lastError.includes('Rate limit') || lastError.includes('timed out')) {
          break;
        }
      }
    }

    if (chosen && chosen.flights.length > 0) {
      chosen.flights.sort((a, b) => a.price - b.price);
      await setCache(cacheKey, chosen.flights, 30);
      return NextResponse.json({
        flights: chosen.flights,
        source: 'live',
        count: chosen.flights.length,
        actualDate: chosen.actualDate,
        requestedDate: departureDate,
        usedDateExpansion,
        usedRoundTripTrim: chosen.trimmed,
      });
    }

    let warning: string;
    if (!process.env.RAPIDAPI_KEY) {
      warning = `RAPIDAPI_KEY is not configured in this environment. Live flight search is unavailable.`;
    } else if (lastError) {
      warning = `Tripadvisor request failed: ${lastError}`;
    } else if (cumulativeRawCount === 0) {
      warning = `Tripadvisor has no flights for ${origin} → ${destination} on ${departureDate} (or ±2 days). The route may be served only by airlines outside Tripadvisor's index. Try a different OD pair.`;
    } else {
      warning = `${cumulativeRawCount} flights came back across attempts but none had a usable price. Tripadvisor's purchase links are missing for this route. Try a different date.`;
    }

    return NextResponse.json({
      flights: [],
      source: 'empty',
      count: 0,
      rawCount: cumulativeRawCount,
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
