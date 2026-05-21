/* Diagnostic endpoint for live flight search.

   Hits Tripadvisor16 RapidAPI directly for OTP → LHR with a default date
   and reports:
   - Whether RAPIDAPI_KEY is set in this env
   - Raw HTTP status from Tripadvisor
   - Raw count of flights in the response
   - How many normalized successfully (have a usable price)
   - Sample of the first flight's shape so we can spot field-name drift

   Auth-gated to logged-in users only so it doesn't leak diagnostic output. */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchFlights, extractFlightPrice } from '@/lib/tripadvisor-client';
import { normalizeFlight } from '@/lib/tripadvisor-normalize';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const keyPresent = !!process.env.RAPIDAPI_KEY;
  if (!keyPresent) {
    return NextResponse.json({
      keyConfigured: false,
      verdict: 'RAPIDAPI_KEY is NOT set in this Vercel environment. Live flight search will return 0 results until you add it under Project Settings → Environment Variables and redeploy.',
    });
  }

  // Test with a route + date that should always have flights on Tripadvisor.
  const today = new Date();
  const dep = new Date(today);
  dep.setDate(today.getDate() + 14);
  const departureDate = dep.toISOString().split('T')[0];

  const origin = 'OTP';
  const destination = 'LHR';

  let rawCount = 0;
  let normalizedCount = 0;
  let sampleShape: unknown = null;
  let priceExtractionSample: unknown = null;
  let errorMessage: string | null = null;

  try {
    const rawFlights = await searchFlights({
      origin,
      destination,
      departureDate,
      adults: '1',
      travelClass: 'ECONOMY',
    });
    rawCount = rawFlights.length;

    if (rawFlights[0]) {
      // Strip massive nested arrays so the response stays readable
      const f = rawFlights[0];
      sampleShape = {
        segmentsCount: f.segments?.length ?? 0,
        firstSegmentLegsCount: f.segments?.[0]?.legs?.length ?? 0,
        purchaseLinksCount: f.purchaseLinks?.length ?? 0,
        purchaseLinksSample: f.purchaseLinks?.slice(0, 2),
        priceForDisplay: f.priceForDisplay,
      };
      priceExtractionSample = extractFlightPrice(f);
    }

    const normalized = rawFlights
      .map((f) => normalizeFlight(f, origin, destination, 'ECONOMY'))
      .filter((f) => f !== null);
    normalizedCount = normalized.length;
  } catch (e) {
    errorMessage = (e as Error).message;
  }

  let verdict = 'unknown';
  if (errorMessage) {
    if (errorMessage.includes('403')) {
      verdict = 'Tripadvisor returned 403 — your RapidAPI Pro subscription may not be active for tripadvisor16 endpoints. Check the RapidAPI dashboard.';
    } else if (errorMessage.includes('429')) {
      verdict = 'Tripadvisor returned 429 — monthly quota hit on your RapidAPI plan.';
    } else if (errorMessage.includes('401')) {
      verdict = 'Tripadvisor returned 401 — RAPIDAPI_KEY is invalid. Recopy from rapidapi.com and update in Vercel.';
    } else {
      verdict = `Tripadvisor request errored: ${errorMessage}`;
    }
  } else if (rawCount === 0) {
    verdict = 'Tripadvisor accepted the request but returned ZERO flights. This is unusual for OTP → LHR — check the RapidAPI dashboard to see if Tripadvisor16 endpoints are responding for paid users today.';
  } else if (normalizedCount === 0) {
    verdict = `Tripadvisor returned ${rawCount} raw flights but none had a usable price (purchaseLinks missing or zero). Check sampleShape.purchaseLinks below — Tripadvisor may have changed their response shape.`;
  } else {
    verdict = `OK — live flight search is working. Tripadvisor returned ${rawCount} raw flights; ${normalizedCount} had usable prices.`;
  }

  return NextResponse.json({
    keyConfigured: true,
    testRoute: `${origin} → ${destination}`,
    testDate: departureDate,
    rawCount,
    normalizedCount,
    sampleShape,
    priceExtractionSample,
    errorMessage,
    verdict,
  });
}
