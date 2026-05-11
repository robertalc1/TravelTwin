/* Diagnostic endpoint: verifies RAPIDAPI_KEY is configured and that
   Tripadvisor16 is reachable. Hit GET /api/debug/rapidapi to check. */

import { NextResponse } from 'next/server';
import { searchLocations } from '@/lib/tripadvisor-client';

export async function GET() {
  const apiKeyPresent = !!process.env.RAPIDAPI_KEY;
  if (!apiKeyPresent) {
    return NextResponse.json(
      { status: 'error', message: 'RAPIDAPI_KEY is not set', apiKeyPresent: false },
      { status: 500 },
    );
  }

  try {
    const sample = await searchLocations('Paris');
    return NextResponse.json({
      status: 'ok',
      apiKeyPresent: true,
      sampleCount: sample.length,
      sample: sample.slice(0, 2),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { status: 'error', message, apiKeyPresent: true },
      { status: 500 },
    );
  }
}
