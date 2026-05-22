/* GET /api/attractions/search?city=Sofia&country=Bulgaria
   Tripadvisor-backed attractions list for the road-trip + flight map
   sidebars. Resolves a location id (cached 30d), fetches the top
   attractions for it (cached 24h), and gates both calls through the
   global RapidAPI rate limiter. Falls back to empty list when quota
   exhausted — callers should degrade to AI/CITY_DATA content. */

import { NextResponse } from 'next/server';
import {
  searchAttractionLocationId,
  searchAttractions,
} from '@/lib/tripadvisor-client';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = (searchParams.get('city') || '').trim();
  const country = (searchParams.get('country') || '').trim();

  if (!city) {
    return NextResponse.json({ error: 'city is required' }, { status: 400 });
  }

  const query = country ? `${city}, ${country}` : city;
  const cacheKey = `attractionsList:${query.toLowerCase()}`;

  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({
      attractions: cached.data,
      source: 'cached',
      count: Array.isArray(cached.data) ? cached.data.length : 0,
    });
  }

  if (!canMakeRapidApiCall()) {
    return NextResponse.json(
      {
        attractions: [],
        source: 'fallback',
        count: 0,
        warning: 'Daily attractions quota reached.',
      },
      { status: 503 },
    );
  }

  try {
    recordRapidApiCall();
    const locationId = await searchAttractionLocationId(query);
    if (!locationId) {
      return NextResponse.json({
        attractions: [],
        source: 'live',
        count: 0,
        warning: `No Tripadvisor attractions found for ${query}.`,
      });
    }

    const attractions = await searchAttractions(locationId);
    if (attractions.length === 0) {
      return NextResponse.json({
        attractions: [],
        source: 'live',
        count: 0,
        warning: `Tripadvisor returned no attractions for ${query}.`,
      });
    }

    await setCache(cacheKey, attractions, 60 * 24);
    return NextResponse.json({
      attractions,
      source: 'live',
      count: attractions.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[attractions/search] failed:', message);
    return NextResponse.json(
      {
        attractions: [],
        source: 'error',
        count: 0,
        warning: `Unable to fetch attractions: ${message}`,
      },
      { status: 500 },
    );
  }
}
