import { NextResponse } from 'next/server';
import amadeus from '@/lib/amadeus';
import { getCached, setCache } from '@/lib/cache';
import { canMakeAmadeusCall, recordAmadeusCall } from '@/lib/rateLimiter';
import { CITY_TO_IATA, getCityName } from '@/lib/iataMapping';
import type { LocationResult } from '@/lib/supabase/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword')?.trim();

    if (!keyword || keyword.length < 2) {
      return NextResponse.json({ locations: [] });
    }

    // 1. Check cache (24h TTL for locations)
    const cacheKey = `location:${keyword.toLowerCase()}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ locations: cached.data, source: 'cached' });
    }

    // 2. Try Amadeus API
    if (canMakeAmadeusCall()) {
      try {
        recordAmadeusCall();
        const response = await amadeus.referenceData.locations.get({
          keyword,
          subType: 'CITY,AIRPORT',
          'page[limit]': '10',
        });

        const locations: LocationResult[] = ((response.data || []) as Record<string, unknown>[]).map(
          (loc) => {
            const address = loc.address as Record<string, string> | undefined;
            return {
              iataCode: loc.iataCode as string,
              name: loc.name as string,
              cityName: address?.cityName || (loc.name as string),
              countryName: address?.countryName || '',
              type: (loc.subType as 'AIRPORT' | 'CITY') || 'CITY',
            };
          }
        );

        if (locations.length > 0) {
          await setCache(cacheKey, locations, 1440); // 24 hours
          return NextResponse.json({ locations, source: 'live' });
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.warn('[Locations] Amadeus error:', error?.message);
      }
    }

    // 3. Fallback to local IATA mapping
    const lower = keyword.toLowerCase();
    const locations: LocationResult[] = Object.entries(CITY_TO_IATA)
      .filter(
        ([city, iata]) =>
          city.toLowerCase().includes(lower) ||
          getCityName(city).toLowerCase().includes(lower) ||
          iata.toLowerCase().includes(lower)
      )
      .map(([city, iata]) => ({
        iataCode: iata,
        name: getCityName(city),
        cityName: getCityName(city),
        countryName: 'Brazil',
        type: 'CITY' as const,
      }));

    return NextResponse.json({ locations, source: 'fallback' });
  } catch (error) {
    console.error('[Locations] Unexpected error:', error);
    return NextResponse.json({ locations: [], source: 'fallback' });
  }
}
