import { NextResponse } from 'next/server';
import { searchLocations } from '@/lib/tripadvisor-client';
import { normalizeLocation } from '@/lib/tripadvisor-normalize';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';
import {
  CITY_TO_IATA,
  getCityName,
  getCountryFromIata,
} from '@/lib/iataMapping';
import type { LocationResult } from '@/lib/supabase/types';

function localMatches(keyword: string): LocationResult[] {
  const lower = keyword.toLowerCase();
  return Object.entries(CITY_TO_IATA)
    .filter(([city, iata]) => {
      const c = city.toLowerCase();
      const n = getCityName(city).toLowerCase();
      return c.includes(lower) || n.includes(lower) || iata.toLowerCase() === lower;
    })
    .map(([city, iata]) => ({
      iataCode: iata,
      name: getCityName(city),
      cityName: getCityName(city),
      countryName: getCountryFromIata(iata),
      type: 'CITY' as const,
    }));
}

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

    // 2. Local IATA mapping FIRST — saves RapidAPI quota on common queries
    const local = localMatches(keyword);
    if (local.length >= 2) {
      await setCache(cacheKey, local, 1440);
      return NextResponse.json({ locations: local, source: 'fallback' });
    }

    // 3. Only ping Tripadvisor when local lookup returned 0–1 hits
    if (canMakeRapidApiCall()) {
      try {
        recordRapidApiCall();
        const raw = await searchLocations(keyword);
        const remote = raw.map(normalizeLocation).filter((l) => l.iataCode);

        // Merge local + remote, dedup by IATA
        const seen = new Set<string>();
        const merged: LocationResult[] = [];
        for (const l of [...local, ...remote]) {
          if (seen.has(l.iataCode)) continue;
          seen.add(l.iataCode);
          merged.push(l);
        }

        if (merged.length > 0) {
          await setCache(cacheKey, merged, 1440);
          return NextResponse.json({
            locations: merged,
            source: remote.length > 0 ? 'live' : 'fallback',
          });
        }
      } catch (err: unknown) {
        console.warn('[Locations] Tripadvisor search failed:', (err as Error)?.message);
      }
    }

    // 4. Final fallback — just whatever local found (possibly empty)
    return NextResponse.json({ locations: local, source: 'fallback' });
  } catch (error) {
    console.error('[Locations] Unexpected error:', error);
    return NextResponse.json({ locations: [], source: 'fallback' });
  }
}
