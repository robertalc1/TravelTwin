/* Popular trips list. Tripadvisor16 has no native flight-inspiration
   endpoint, so this route serves results from COMMON_ROUTES via the
   tripadvisor-client wrapper. Zero RapidAPI quota per request. */

import { NextRequest, NextResponse } from 'next/server';
import { searchFlightInspirations } from '@/lib/tripadvisor-client';
import { getCityFromIata } from '@/lib/iataMapping';

interface PopularTrip {
  code: string;
  city: string;
  price: number;
  originalPrice: number;
  departureDate: string;
  returnDate: string;
  days: number;
  airline: string;
  isLive: boolean;
}

export async function GET(req: NextRequest) {
  const origin = (req.nextUrl.searchParams.get('origin') || 'OTP').toUpperCase();
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '6', 10), 12);

  try {
    const inspirations = await searchFlightInspirations(origin);

    const results: PopularTrip[] = inspirations
      .filter((i) => i.price > 0 && i.destination !== origin)
      .slice(0, limit)
      .map((i) => ({
        code: i.destination,
        city: getCityFromIata(i.destination) || i.destinationCity || i.destination,
        price: Math.round(i.price),
        originalPrice: Math.round(i.price * 1.25),
        departureDate: i.departureDate,
        returnDate: i.returnDate,
        days: i.duration,
        airline: '',
        isLive: false,
      }));

    return NextResponse.json(
      { origin, results },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
    );
  } catch (err) {
    console.error('[popular-trips] error:', (err as Error)?.message);
    return NextResponse.json(
      { origin, results: [], error: 'Popular trips temporarily unavailable.' },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      },
    );
  }
}
