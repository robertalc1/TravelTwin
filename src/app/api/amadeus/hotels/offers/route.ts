import { NextResponse } from 'next/server';
import { searchHotelOffers } from '@/lib/amadeus-client';
import { getCached, setCache } from '@/lib/cache';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hotelIdsParam = searchParams.get('hotelIds');
  const checkInDate = searchParams.get('checkInDate');
  const checkOutDate = searchParams.get('checkOutDate');
  const adults = searchParams.get('adults') || '1';

  if (!hotelIdsParam || !checkInDate || !checkOutDate) {
    return NextResponse.json(
      { error: 'hotelIds, checkInDate, checkOutDate required' },
      { status: 400 }
    );
  }

  const hotelIds = hotelIdsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);

  const cacheKey = `hotels_offers:${hotelIds.join(',')}:${checkInDate}:${checkOutDate}:${adults}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached.data, source: 'cached' });
  }

  try {
    const offers = await searchHotelOffers(hotelIds, checkInDate, checkOutDate, adults);
    if (offers.length > 0) {
      await setCache(cacheKey, offers, 30);
    }
    return NextResponse.json({ data: offers, source: 'live' });
  } catch (err) {
    console.error('[Hotels offers] error:', (err as Error)?.message);
    return NextResponse.json({ data: [], source: 'error' });
  }
}
