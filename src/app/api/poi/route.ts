/* Points-of-interest endpoint. Tripadvisor16 doesn't expose a POI feed via
   coordinates on the free tier; this route is now a stub. The TripDetail
   "Things to do" tab generates content from the AI itinerary instead. */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    pois: [],
    source: 'fallback',
    warning: 'POI API is no longer served. Attractions are sourced from /api/ai/plan-trip aiContent.',
  });
}
