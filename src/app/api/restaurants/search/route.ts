/* GET /api/restaurants/search?city=Berlin&country=Germany
   Tripadvisor-backed restaurant list for the "Plan Your Day" map sidebar.
   Resolves a location id (cached 30d), fetches the top restaurants for it
   (cached 24h), and gates both calls through the global RapidAPI rate
   limiter. The map view falls back to AI-generated places when this 503s
   or returns empty. */

import { NextResponse } from 'next/server';
import {
  searchRestaurantLocationId,
  searchRestaurants,
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
  const cacheKey = `restaurantsList:${query.toLowerCase()}`;

  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({
      restaurants: cached.data,
      source: 'cached',
      count: Array.isArray(cached.data) ? cached.data.length : 0,
    });
  }

  if (!canMakeRapidApiCall()) {
    return NextResponse.json(
      {
        restaurants: [],
        source: 'fallback',
        count: 0,
        warning: 'Daily restaurant quota reached.',
      },
      { status: 503 },
    );
  }

  try {
    recordRapidApiCall();
    const locationId = await searchRestaurantLocationId(query);
    if (!locationId) {
      return NextResponse.json({
        restaurants: [],
        source: 'live',
        count: 0,
        warning: `No Tripadvisor restaurants found for ${query}.`,
      });
    }

    recordRapidApiCall();
    const restaurants = (await searchRestaurants(locationId)).slice(0, 8);

    if (restaurants.length === 0) {
      return NextResponse.json({
        restaurants: [],
        source: 'live',
        count: 0,
        warning: `No restaurants returned for ${query}.`,
      });
    }

    await setCache(cacheKey, restaurants, 60 * 24);
    return NextResponse.json({
      restaurants,
      source: 'live',
      count: restaurants.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[restaurants/search] failed:', message);
    return NextResponse.json(
      {
        restaurants: [],
        source: 'error',
        count: 0,
        warning: `Unable to fetch restaurants: ${message}`,
      },
      { status: 500 },
    );
  }
}
