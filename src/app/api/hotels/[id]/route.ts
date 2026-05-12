/* GET /api/hotels/[id] — Tripadvisor Hotel Details for the /hotels/[id] page.
   Wraps getHotelDetails() + a 24h api_cache layer so a viewed hotel only
   burns RapidAPI quota once a day, and gated by the global sliding-window
   rate limiter so spurious traffic can't exhaust the daily budget. */

import { NextResponse } from 'next/server';
import { getHotelDetails } from '@/lib/tripadvisor-client';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing hotel id' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const checkIn = searchParams.get('checkIn') || undefined;
  const checkOut = searchParams.get('checkOut') || undefined;

  if (!canMakeRapidApiCall()) {
    return NextResponse.json(
      {
        hotel: null,
        source: 'fallback',
        warning: 'Daily hotel-detail quota reached. Try again later.',
      },
      { status: 503 },
    );
  }

  try {
    recordRapidApiCall();
    const detail = await getHotelDetails(id, checkIn, checkOut);
    if (!detail) {
      return NextResponse.json(
        { hotel: null, source: 'live', warning: 'Hotel not found.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ hotel: detail, source: 'live' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[hotels/[id]] failed:', message);
    return NextResponse.json(
      {
        hotel: null,
        source: 'error',
        warning: `Unable to load hotel details: ${message}`,
      },
      { status: 500 },
    );
  }
}
