import { NextResponse } from 'next/server';
import { searchFlights, getFlightFilters, type TAFlight } from '@/lib/tripadvisor-client';
import { normalizeFlight } from '@/lib/tripadvisor-normalize';
import { getCached, setCache } from '@/lib/cache';
import { COMMON_ROUTES } from '@/lib/commonRoutes';
import { getCityFromIata } from '@/lib/iataMapping';
import type { NormalizedFlight } from '@/lib/supabase/types';

interface Suggestion {
  origin: string;
  destination: string;
  destinationCity: string;
  price: number;
  currency: string;
  airline: string;
  airlineName: string;
}

/** Probe up to 6 common destinations from `origin` for live inventory and
 *  return the cheapest viable flight per destination, sorted by price.
 *  Used as the fallback "rute disponibile din X" UI bucket. */
async function probeSuggestions(
  origin: string,
  exclude: string,
  departureDate: string,
  travelClass: string,
  adults: string,
  returnDate: string | undefined,
): Promise<Suggestion[]> {
  const seedDestinations = COMMON_ROUTES
    .filter((r) => r.from === origin && r.to !== exclude)
    .slice(0, 6)
    .map((r) => r.to);
  if (seedDestinations.length === 0) return [];
  console.log(`[Flights] Probing ${seedDestinations.length} suggestion candidates from ${origin}`);

  const probes = await Promise.allSettled(
    seedDestinations.map(async (dest) => {
      const result = await attemptSearch(
        origin, dest, departureDate, travelClass, adults, returnDate,
      );
      return result.flights[0] ?? null;
    }),
  );
  const out: Suggestion[] = [];
  for (const p of probes) {
    if (p.status === 'fulfilled' && p.value) {
      out.push({
        origin: p.value.origin,
        destination: p.value.destination,
        destinationCity: getCityFromIata(p.value.destination) || p.value.destination,
        price: p.value.price,
        currency: p.value.currency,
        airline: p.value.airline,
        airlineName: p.value.airlineName,
      });
    }
  }
  out.sort((a, b) => a.price - b.price);
  console.log(`[Flights] Found ${out.length} viable suggestions from ${origin}`);
  return out;
}

/** Format an OD pair as user-facing city names, with the IATA codes only as
 *  fallback when we don't have a city mapping. */
function fmtCity(iata: string): string {
  const city = getCityFromIata(iata);
  return city && city !== iata ? city : iata;
}

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
 *  date. Honors the user's intent: ONE_WAY when they didn't pick a return,
 *  ROUND_TRIP when they did. If a ONE_WAY call returns 0 we transparently
 *  retry as ROUND_TRIP with a synthetic +7d return and trim the outbound
 *  segment back to a one-way result — covers Tripadvisor's documented quirk
 *  of returning 0 on ONE_WAY for some OD pairs even though ROUND_TRIP works.
 */
async function attemptSearch(
  origin: string,
  destination: string,
  outboundDate: string,
  travelClass: string,
  adults: string,
  userReturnDate: string | undefined,
): Promise<AttemptResult> {
  // Honor user's choice first.
  const primaryRaw = await searchFlights({
    origin,
    destination,
    departureDate: outboundDate,
    returnDate: userReturnDate,
    adults,
    travelClass,
  });

  let rawFlights = primaryRaw;
  let trimmed = false;
  let rawCount = primaryRaw.length;

  // ONE_WAY-empty fallback: if user asked for one-way and got 0, retry
  // as round-trip and trim to outbound. Don't do this when the user
  // explicitly picked a return date — that's a true round-trip search.
  if (rawCount === 0 && !userReturnDate) {
    const syntheticReturn = addDays(outboundDate, 7);
    try {
      const rt = await searchFlights({
        origin,
        destination,
        departureDate: outboundDate,
        returnDate: syntheticReturn,
        adults,
        travelClass,
      });
      if (rt.length > 0) {
        rawFlights = trimToOutbound(rt);
        rawCount = rt.length;
        trimmed = true;
        console.log(`[Flights] ONE_WAY empty for ${origin}->${destination} ${outboundDate}, ROUND_TRIP fallback returned ${rt.length} (trimmed to outbound)`);
      }
    } catch (err: unknown) {
      console.warn(`[Flights] ROUND_TRIP fallback failed for ${origin}->${destination}:`, (err as Error)?.message);
    }
  }

  const flights = rawFlights
    .map((f) => normalizeFlight(f, origin, destination, travelClass))
    .filter((f): f is NormalizedFlight => f !== null);

  return {
    flights,
    rawCount,
    actualDate: outboundDate,
    trimmed,
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

    // ── Pre-flight: ask Tripadvisor what airlines/stops serve this OD pair
    //    (~2-3s, 1 quota slot). When `hasResults=false`, the route isn't in
    //    their index at all — skip the date-expansion loop (which would
    //    otherwise burn up to 5 × 15s timeouts on a hopeless lookup) and
    //    return a clean "route not served" payload with suggestions instead.
    try {
      const filters = await getFlightFilters({ origin, destination });
      console.log(
        `[Flights] getFilters ${origin}->${destination}: airlines=${filters.airlines.length} stops=${filters.stops.length} hasResults=${filters.hasResults}`,
      );
      if (!filters.hasResults) {
        const suggestions = await probeSuggestions(
          origin, destination, departureDate, travelClass, adults, returnDate,
        );
        return NextResponse.json({
          flights: [],
          source: 'route_not_indexed',
          count: 0,
          rawCount: 0,
          warning: `${fmtCity(origin)} → ${fmtCity(destination)} is not indexed by Tripadvisor — the route may not have scheduled commercial service. See available routes from ${fmtCity(origin)} below.`,
          suggestions,
        });
      }
    } catch (err: unknown) {
      // getFilters itself failed — proceed with normal search path. We don't
      // want a transient failure of the pre-flight gate to block real searches.
      console.warn('[Flights] getFilters pre-flight failed, proceeding to searchFlights:', (err as Error)?.message);
    }

    // Try the requested date, then progressively wider ±N day expansions.
    // Stop the moment any attempt yields normalized flights. Each attempt is
    // ~3-5s typical; we cap by aborting the chain on the first timeout /
    // rate-limit error so we stay under Vercel's 60s budget even in the
    // worst case (we'd hit at most ~3-4 timeouts before the abort triggers).
    const dateOffsets = [0, 1, -1, 2, -2, 3, -3, 5, -5, 7];
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
      warning = `Tripadvisor has no flights for ${fmtCity(origin)} → ${fmtCity(destination)} on ${departureDate} (or ±2 days). The route may not have commercial service. See available routes from ${fmtCity(origin)} below.`;
    } else {
      warning = `${cumulativeRawCount} flights came back across attempts but none had a usable price. Tripadvisor's purchase links are missing for this route. Try a different date.`;
    }

    // Empty-state suggestions — same logic as the route_not_indexed branch,
    // shared via the probeSuggestions helper.
    const suggestions =
      cumulativeRawCount === 0 && !lastError
        ? await probeSuggestions(origin, destination, departureDate, travelClass, adults, returnDate)
        : [];

    return NextResponse.json({
      flights: [],
      source: 'empty',
      count: 0,
      rawCount: cumulativeRawCount,
      warning,
      suggestions,
    });
  } catch (error) {
    console.error('[Flights] Unexpected error:', error);
    return NextResponse.json(
      { flights: [], source: 'error', count: 0, warning: 'Search failed. Please try again.' },
      { status: 200 }
    );
  }
}
