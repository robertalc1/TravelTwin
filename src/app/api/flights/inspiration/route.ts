import { NextResponse } from 'next/server';
import amadeus from '@/lib/amadeus';
import { getCached, setCache } from '@/lib/cache';
import { canMakeAmadeusCall, recordAmadeusCall } from '@/lib/rateLimiter';
import { getCityFromIata } from '@/lib/iataMapping';
import type { FlightInspiration } from '@/lib/supabase/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin')?.toUpperCase();

    if (!origin) {
      return NextResponse.json({ error: 'Missing required param: origin' }, { status: 400 });
    }

    // 1. Check cache (15 min for inspirations)
    const cacheKey = `inspiration:${origin}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json({
        destinations: (cached.data as FlightInspiration[]).map((d) => ({ ...d, source: 'cached' })),
        source: 'cached',
      });
    }

    // 2. Try Amadeus API
    if (canMakeAmadeusCall()) {
      try {
        recordAmadeusCall();
        const response = await amadeus.shopping.flightDestinations.get({
          origin,
          maxPrice: '500',
        });

        const destinations: FlightInspiration[] = ((response.data || []) as Record<string, unknown>[]).map(
          (d) => {
            const price = d.price as Record<string, string> | undefined;
            const links = d.links as Record<string, string> | undefined;
            return {
              destination: d.destination as string,
              destinationCity: getCityFromIata(d.destination as string),
              departureDate: d.departureDate as string,
              returnDate: d.returnDate as string,
              price: parseFloat(price?.total || '0'),
              currency: 'EUR',
              source: 'live' as const,
            };
          }
        );

        if (destinations.length > 0) {
          await setCache(cacheKey, destinations, 15);
          return NextResponse.json({ destinations, source: 'live' });
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.warn('[Inspiration] Amadeus error:', error?.message);
      }
    }

    // 3. No fallback for inspiration — return empty with message
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
