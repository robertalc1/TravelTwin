/* Legacy Amadeus-shaped itinerary endpoint. Stubbed during the Tripadvisor
   migration — frontend consumers should switch to /api/ai/plan-trip for
   AI-curated packages. Returns an empty result so the existing UI shows
   its graceful empty state instead of a 500 error. */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    packages: [],
    source: 'fallback',
    warning:
      'This legacy endpoint is no longer served. Use /api/ai/plan-trip via the /plan page for AI-curated trip packages.',
  });
}
