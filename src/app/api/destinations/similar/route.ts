/* GET /api/destinations/similar?iata=JTR&maxBudget=1000&n=6&month=7
   Returns destinations similar to the reference IATA, ranked by tag overlap +
   climate + budget filter + geographic proximity. No external API call — runs
   off the curated DESTINATIONS table in src/lib/destinations.ts. Cheap, fast,
   no quota impact. */

import { NextResponse } from 'next/server';
import { findSimilarDestinations } from '@/lib/destinations';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const iata = searchParams.get('iata')?.toUpperCase();
  if (!iata) {
    return NextResponse.json({ error: 'iata is required' }, { status: 400 });
  }

  const maxBudget = parseFloat(searchParams.get('maxBudget') || '');
  const month = parseInt(searchParams.get('month') || '', 10);
  const n = parseInt(searchParams.get('n') || '6', 10);

  const results = findSimilarDestinations({
    referenceIata: iata,
    maxBudget: Number.isFinite(maxBudget) ? maxBudget : undefined,
    month: Number.isFinite(month) && month >= 1 && month <= 12 ? month : undefined,
    limit: Number.isFinite(n) && n > 0 && n <= 20 ? n : 6,
  });

  return NextResponse.json(
    { reference: iata, count: results.length, results },
    { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate' } },
  );
}
