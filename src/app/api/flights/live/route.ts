import { NextResponse } from 'next/server';
import { searchFlights } from '@/lib/tripadvisor-client';
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

/** Format an OD pair as user-facing city names, with IATA fallback. */
function fmtCity(iata: string): string {
  const city = getCityFromIata(iata);
  return city && city !== iata ? city : iata;
}

// Never edge-cache — flight prices change minute-to-minute upstream.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Probe up to 6 known destinations from `origin` for inventory on the same
 *  outbound date. Each probe returns the cheapest viable normalized flight.
 *  Used to populate the "other routes from your origin" UI bucket when the
 *  exact OD pair the user asked for came back empty. */
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

  const probes = await Promise.allSettled(
    seedDestinations.map(async (dest) => {
      const raw = await searchFlights({
        origin, destination: dest, departureDate, returnDate, adults, travelClass,
      });
      const normalized = raw
        .map((f) => normalizeFlight(f, origin, dest, travelClass))
        .filter((f): f is NormalizedFlight => f !== null)
        .sort((a, b) => a.price - b.price);
      return normalized[0] ?? null;
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
  return out;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin')?.toUpperCase();
    const destination = searchParams.get('destination')?.toUpperCase();
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate') || undefined;
    const adults = searchParams.get('adults') || '1';
    const travelClass = searchParams.get('travelClass') || 'ECONOMY';
    const bypassCache = searchParams.get('nocache') === '1';

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
        return NextResponse.json({ flights, source: 'cached', count: flights.length });
      }
    }

    // ── Single straight-through search with exactly the params the user
    //    picked. No pre-flight gate, no date expansion, no itinerary
    //    auto-flip. Whatever Tripadvisor returns is what we show.
    let flights: NormalizedFlight[] = [];
    let rawCount = 0;
    let lastError: string | undefined;
    try {
      const raw = await searchFlights({
        origin,
        destination,
        departureDate,
        returnDate,
        adults,
        travelClass,
      });
      rawCount = raw.length;
      flights = raw
        .map((f) => normalizeFlight(f, origin, destination, travelClass))
        .filter((f): f is NormalizedFlight => f !== null);
    } catch (err: unknown) {
      lastError = (err as Error)?.message ?? 'unknown error';
      console.error('[Flights] searchFlights failed:', lastError);
    }

    if (flights.length > 0) {
      flights.sort((a, b) => a.price - b.price);
      await setCache(cacheKey, flights, 30);
      return NextResponse.json({
        flights,
        source: 'live',
        count: flights.length,
      });
    }

    let warning: string;
    if (!process.env.RAPIDAPI_KEY) {
      warning = `RAPIDAPI_KEY is not configured in this environment. Live flight search is unavailable.`;
    } else if (lastError) {
      warning = `Tripadvisor request failed: ${lastError}`;
    } else if (rawCount === 0) {
      warning = `Tripadvisor has no flights for ${fmtCity(origin)} → ${fmtCity(destination)} on ${departureDate}. Try a different date or see available routes from ${fmtCity(origin)} below.`;
    } else {
      warning = `${rawCount} flights came back but none had a usable price. Tripadvisor's purchase links are missing for this route. Try a different date.`;
    }

    // Helpful (non-mandatory) suggestion bucket — only when the upstream
    // call succeeded with 0 results. We don't probe alternatives on errors
    // since they'd likely fail too.
    const suggestions =
      rawCount === 0 && !lastError
        ? await probeSuggestions(origin, destination, departureDate, travelClass, adults, returnDate)
        : [];

    return NextResponse.json({
      flights: [],
      source: 'empty',
      count: 0,
      rawCount,
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
