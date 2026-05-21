/* Diagnostic endpoint for Tripadvisor16 flight search.

   Runs TWO probes in parallel — ONE_WAY and ROUND_TRIP (synthetic +7d
   return) — so we can see whether the Tripadvisor16 quirk (one-way
   returns empty for many OD pairs while round-trip works) is what's
   killing the user's /flights search.

   Auth-gated to logged-in users only. */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TA_HOST = 'tripadvisor16.p.rapidapi.com';

interface ProbeResult {
  itineraryType: 'ONE_WAY' | 'ROUND_TRIP';
  requestUrl: string;
  httpStatus: number;
  flightsCount: number;
  firstFlightHasPurchaseLinks: boolean;
  firstFlightPurchaseSample: unknown;
  bodyPreview: string;
  responseKeys: string[];
  error: string | null;
}

async function probe(
  origin: string,
  destination: string,
  date: string,
  returnDate: string | null,
  key: string,
): Promise<ProbeResult> {
  const itineraryType: 'ONE_WAY' | 'ROUND_TRIP' = returnDate ? 'ROUND_TRIP' : 'ONE_WAY';
  const url = new URL(`https://${TA_HOST}/api/v1/flights/searchFlights`);
  url.searchParams.set('sourceAirportCode', origin);
  url.searchParams.set('destinationAirportCode', destination);
  url.searchParams.set('date', date);
  if (returnDate) url.searchParams.set('returnDate', returnDate);
  url.searchParams.set('itineraryType', itineraryType);
  url.searchParams.set('sortOrder', 'ML_BEST_VALUE');
  url.searchParams.set('numAdults', '1');
  url.searchParams.set('numSeniors', '0');
  url.searchParams.set('classOfService', 'ECONOMY');
  url.searchParams.set('pageNumber', '1');
  // Match production param shape exactly so the debug endpoint reproduces
  // real searchFlights behavior. See src/lib/tripadvisor-client.ts.
  url.searchParams.set('nearby', 'yes');
  url.searchParams.set('nonstop', 'yes');
  url.searchParams.set('currencyCode', 'EUR');
  // region intentionally omitted — production wrapper also omits it

  const out: ProbeResult = {
    itineraryType,
    requestUrl: url.toString(),
    httpStatus: 0,
    flightsCount: 0,
    firstFlightHasPurchaseLinks: false,
    firstFlightPurchaseSample: null,
    bodyPreview: '',
    responseKeys: [],
    error: null,
  };

  try {
    const res = await fetch(url.toString(), {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': TA_HOST },
      cache: 'no-store',
    });
    out.httpStatus = res.status;
    const bodyText = await res.text();
    out.bodyPreview = bodyText.slice(0, 800);

    let parsed: unknown = null;
    try { parsed = JSON.parse(bodyText); } catch { /* keep null */ }

    if (parsed && typeof parsed === 'object') {
      const root = parsed as Record<string, unknown>;
      out.responseKeys = Object.keys(root).slice(0, 30);
      const data =
        root.data && typeof root.data === 'object'
          ? (root.data as Record<string, unknown>)
          : root;
      // Also include nested data keys, so we can see what's INSIDE `data`.
      if (isRecord(root.data)) {
        const dataKeys = Object.keys(root.data as Record<string, unknown>)
          .slice(0, 30)
          .map((k) => `data.${k}`);
        out.responseKeys = [...out.responseKeys, ...dataKeys];
      }
      const flights = Array.isArray(data.flights) ? data.flights : [];
      out.flightsCount = flights.length;
      if (flights[0] && typeof flights[0] === 'object') {
        const f0 = flights[0] as Record<string, unknown>;
        const pl = Array.isArray(f0.purchaseLinks) ? f0.purchaseLinks : [];
        out.firstFlightHasPurchaseLinks = pl.length > 0;
        out.firstFlightPurchaseSample = pl[0] ?? null;
      }
    }
  } catch (e) {
    out.error = (e as Error).message;
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return NextResponse.json({
      keyConfigured: false,
      verdict: 'RAPIDAPI_KEY is NOT set in this Vercel environment.',
    });
  }

  const { searchParams } = new URL(request.url);
  const today = new Date();
  const defaultDep = new Date(today);
  defaultDep.setDate(today.getDate() + 14);
  const origin = (searchParams.get('origin') || 'OTP').toUpperCase();
  const destination = (searchParams.get('destination') || 'LHR').toUpperCase();
  const date = searchParams.get('date') || defaultDep.toISOString().split('T')[0];

  // Default behavior changed: dual probe is now the DEFAULT (2 quota slots
  // per hit) because the production wrapper always uses ROUND_TRIP — we need
  // to see both shapes to debug effectively. Opt out with ?probeBoth=0 if
  // you need to save a quota slot.
  const probeBoth = searchParams.get('probeBoth') !== '0';

  const returnDate = new Date(date + 'T00:00:00Z');
  returnDate.setUTCDate(returnDate.getUTCDate() + 7);
  const returnDateStr = returnDate.toISOString().split('T')[0];

  const oneWay = await probe(origin, destination, date, null, key);
  const roundTrip = probeBoth
    ? await probe(origin, destination, date, returnDateStr, key)
    : null;

  let verdict: string;
  if (oneWay.httpStatus === 401 || roundTrip?.httpStatus === 401) {
    verdict = 'Tripadvisor 401 — RAPIDAPI_KEY is INVALID. Copy a fresh key from rapidapi.com and update Vercel env vars.';
  } else if (oneWay.httpStatus === 403 || roundTrip?.httpStatus === 403) {
    verdict = 'Tripadvisor 403 — RapidAPI Pro subscription not active or wrong account.';
  } else if (oneWay.httpStatus === 429 || roundTrip?.httpStatus === 429) {
    verdict = 'Tripadvisor 429 — quota exceeded on RapidAPI Pro plan.';
  } else if (roundTrip && oneWay.flightsCount === 0 && roundTrip.flightsCount > 0) {
    verdict = `CONFIRMED: Tripadvisor16 ONE_WAY quirk. ${origin} → ${destination} returns 0 for ONE_WAY but ${roundTrip.flightsCount} for ROUND_TRIP on the same date. The /api/flights/live fallback (auto-retry as round-trip when one-way is empty) should fix this end-to-end.`;
  } else if (oneWay.flightsCount === 0 && roundTrip && roundTrip.flightsCount === 0) {
    verdict = `Both ONE_WAY and ROUND_TRIP returned 0 for ${origin} → ${destination} on ${date}. Either Tripadvisor truly has no inventory for this combo, or the request shape is wrong. Inspect bodyPreview below.`;
  } else if (oneWay.flightsCount === 0) {
    verdict = `ONE_WAY returned 0 for ${origin} → ${destination}. Add ?probeBoth=1 to also probe ROUND_TRIP and confirm whether it's the Tripadvisor16 one-way quirk.`;
  } else if (oneWay.flightsCount > 0 && !oneWay.firstFlightHasPurchaseLinks) {
    verdict = `Tripadvisor returned ${oneWay.flightsCount} flights but no purchaseLinks — response shape may have drifted. See firstFlightPurchaseSample.`;
  } else {
    verdict = `✓ OK — ONE_WAY=${oneWay.flightsCount}${roundTrip ? `, ROUND_TRIP=${roundTrip.flightsCount}` : ''}. Live flight search should work.`;
  }

  return NextResponse.json({
    keyConfigured: true,
    testRoute: `${origin} → ${destination}`,
    testDate: date,
    syntheticReturnDate: returnDateStr,
    probeBoth,
    oneWay,
    roundTrip,
    verdict,
  });
}
