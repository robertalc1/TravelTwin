import { NextResponse } from 'next/server';
import { fetchAviationstackFlights, normalizeAviationstackFlight } from '@/lib/aviationstack';
import { getCached, setCache } from '@/lib/cache';
import type { NormalizedFlight } from '@/lib/supabase/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin')?.toUpperCase();
    const destination = searchParams.get('destination')?.toUpperCase();
    const departureDate = searchParams.get('departureDate') || new Date().toISOString().split('T')[0];

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Missing required params: origin, destination' },
        { status: 400 }
      );
    }

    // Cache AviationStack results for 24h (conserve monthly quota)
    const cacheKey = `aviationstack:${origin}:${destination}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      const flights = (cached.data as NormalizedFlight[]).map((f) => ({
        ...f,
        source: 'cached' as const,
      }));
      return NextResponse.json({ flights, source: 'cached', count: flights.length });
    }

    const rawFlights = await fetchAviationstackFlights(origin, destination);
    const flights: NormalizedFlight[] = rawFlights.map((f) =>
      normalizeAviationstackFlight(f, departureDate)
    );

    if (flights.length > 0) {
      await setCache(cacheKey, flights, 60 * 24); // 24h TTL
      return NextResponse.json({ flights, source: 'aviationstack', count: flights.length });
    }

    return NextResponse.json({
      flights: [],
      source: 'aviationstack',
      count: 0,
      warning: `No AviationStack flights found for ${origin} → ${destination}.`,
    });
  } catch (error) {
    console.error('[AviationStack Route] Error:', error);
    return NextResponse.json(
      { flights: [], source: 'error', count: 0 },
      { status: 200 }
    );
  }
}
