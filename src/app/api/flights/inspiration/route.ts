import { NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/cache';
import { getCityFromIata } from '@/lib/iataMapping';
import { COMMON_ROUTES } from '@/lib/commonRoutes';
import type { FlightInspiration } from '@/lib/supabase/types';

function buildInspirationFromCommonRoutes(origin: string): FlightInspiration[] {
  const routes = COMMON_ROUTES.filter((r) => r.from === origin);
  const today = new Date();
  const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const returnDate = new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const toISO = (d: Date) => d.toISOString().split('T')[0];

  return routes.map((route) => ({
    destination: route.to,
    destinationCity: getCityFromIata(route.to),
    departureDate: toISO(futureDate),
    returnDate: toISO(returnDate),
    price: route.avgPrice,
    currency: route.currency,
    source: 'reference' as const,
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin')?.toUpperCase();

    if (!origin) {
      return NextResponse.json({ error: 'Missing required param: origin' }, { status: 400 });
    }

    // 1. Cache (24h — inspiration data is static)
    const cacheKey = `inspiration:${origin}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json({
        destinations: (cached.data as FlightInspiration[]).map((d) => ({
          ...d,
          source: 'cached',
        })),
        source: 'cached',
      });
    }

    // 2. Tripadvisor16 has no native flight-inspiration endpoint — build from
    //    pre-priced COMMON_ROUTES table. Zero RapidAPI quota usage.
    const destinations = buildInspirationFromCommonRoutes(origin);
    if (destinations.length > 0) {
      await setCache(cacheKey, destinations, 60 * 24); // 24h
      return NextResponse.json({ destinations, source: 'reference' });
    }

    return NextResponse.json({
      destinations: [],
      source: 'fallback',
      message: 'Flight inspiration is not available right now. Try again later.',
    });
  } catch (error) {
    console.error('[Inspiration] Unexpected error:', error);
    return NextResponse.json({ destinations: [], source: 'fallback' });
  }
}
