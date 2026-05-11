import { NextResponse } from 'next/server';
import { searchHotelsByCity } from '@/lib/tripadvisor-client';
import { normalizeHotel } from '@/lib/tripadvisor-normalize';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';
import type { NormalizedHotel } from '@/lib/supabase/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get('cityCode')?.toUpperCase();
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const adults = searchParams.get('adults') || '1';
    const rooms = searchParams.get('rooms') || '1';

    if (!cityCode || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: 'Missing required params: cityCode, checkInDate, checkOutDate' },
        { status: 400 }
      );
    }

    // 1. Check cache (60 min TTL)
    const cacheKey = `hotel:${cityCode}:${checkInDate}:${checkOutDate}:${adults}:${rooms}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      const hotels = (cached.data as NormalizedHotel[]).map((h) => ({
        ...h,
        source: 'cached' as const,
      }));
      return NextResponse.json({ hotels, source: 'cached', count: hotels.length });
    }

    // 2. Try Tripadvisor RapidAPI — one call resolves geoId (cached internally) + fetches hotels
    if (canMakeRapidApiCall()) {
      try {
        recordRapidApiCall();
        const rawHotels = await searchHotelsByCity({
          cityCode,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          adults,
          rooms,
        });

        const hotels: NormalizedHotel[] = rawHotels.map((h) =>
          normalizeHotel(h, cityCode, checkInDate, checkOutDate)
        );

        if (hotels.length > 0) {
          await setCache(cacheKey, hotels, 60);
          return NextResponse.json({ hotels, source: 'live', count: hotels.length });
        }

        return NextResponse.json({
          hotels: [],
          source: 'live',
          count: 0,
          warning: `No hotels found in ${cityCode} for the selected dates. Try different dates.`,
        });
      } catch (err: unknown) {
        console.error('[Hotels] Tripadvisor search failed:', (err as Error)?.message);
      }
    }

    return NextResponse.json({
      hotels: [],
      source: 'error',
      count: 0,
      warning: 'Unable to fetch live hotel prices right now. Please try again in a moment.',
    });
  } catch (error) {
    console.error('[Hotels] Unexpected error:', error);
    return NextResponse.json(
      { hotels: [], source: 'error', count: 0, warning: 'Search failed. Please try again.' },
      { status: 200 }
    );
  }
}
