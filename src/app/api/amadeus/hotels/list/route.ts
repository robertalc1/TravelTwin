import { NextResponse } from 'next/server';
import { amadeusRest } from '@/lib/amadeus-client';
import { getCached, setCache } from '@/lib/cache';

interface HotelLocation {
  hotelId: string;
  name?: string;
  iataCode?: string;
  geoCode?: { latitude: number; longitude: number };
  address?: { countryCode?: string };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityCode = searchParams.get('cityCode')?.toUpperCase();
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');
  const radius = searchParams.get('radius') || '5';

  if (!cityCode && (!latitude || !longitude)) {
    return NextResponse.json(
      { error: 'cityCode OR (latitude+longitude) required' },
      { status: 400 }
    );
  }

  const cacheKey = cityCode
    ? `hotels_list:${cityCode}:${radius}`
    : `hotels_list:${latitude},${longitude}:${radius}`;

  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached.data, source: 'cached' });
  }

  try {
    const path = cityCode
      ? '/v1/reference-data/locations/hotels/by-city'
      : '/v1/reference-data/locations/hotels/by-geocode';

    const params: Record<string, string | number> = cityCode
      ? { cityCode, radius, radiusUnit: 'KM', hotelSource: 'ALL' }
      : { latitude: latitude!, longitude: longitude!, radius, radiusUnit: 'KM' };

    const data = await amadeusRest(path, params);
    const list = ((data as { data?: HotelLocation[] }).data || []).slice(0, 20);

    await setCache(cacheKey, list, 60);
    return NextResponse.json({ data: list, source: 'live' });
  } catch (err) {
    console.error('[Hotels list] error:', (err as Error)?.message);
    return NextResponse.json({ data: [], source: 'error' });
  }
}
