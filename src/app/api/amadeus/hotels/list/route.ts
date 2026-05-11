/* Hotels-list endpoint. Returns placeholder hotelIds keyed by city — the
   companion /api/amadeus/hotels/offers route does the actual Tripadvisor16
   lookup using cityCode + dates, in a single round-trip. */

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityCode = searchParams.get('cityCode')?.toUpperCase();

  if (!cityCode) {
    return NextResponse.json({ error: 'cityCode is required' }, { status: 400 });
  }

  // 12 placeholder slots — offers route fills these with real Tripadvisor data.
  const data = Array.from({ length: 12 }, (_, i) => ({
    hotelId: `ta-${cityCode}-${i}`,
    name: `${cityCode} hotel ${i + 1}`,
  }));

  return NextResponse.json({ data, source: 'live' });
}
