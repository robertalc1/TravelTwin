/* Diagnostic endpoint for Tripadvisor16 flight search.

   Performs a fresh, uncached search against Tripadvisor RapidAPI directly
   (NOT via our cached searchFlights helper) so we can see exactly what
   the upstream returns: HTTP status, raw body shape, status codes, and
   what the normalize step does with it.

   Auth-gated to logged-in users. */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchFlights, extractFlightPrice } from '@/lib/tripadvisor-client';
import { normalizeFlight } from '@/lib/tripadvisor-normalize';

// Never edge-cache this — diagnostic must always reflect live upstream state.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TA_HOST = 'tripadvisor16.p.rapidapi.com';

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
      verdict: 'RAPIDAPI_KEY is NOT set in this Vercel environment. Add it under Project Settings → Environment Variables and redeploy.',
    });
  }

  // Allow ?origin=OTP&destination=LHR&date=2026-06-10 from the URL so the
  // user can test any route. Defaults to OTP → LHR 14 days from today.
  const { searchParams } = new URL(request.url);
  const today = new Date();
  const defaultDep = new Date(today);
  defaultDep.setDate(today.getDate() + 14);
  const origin = (searchParams.get('origin') || 'OTP').toUpperCase();
  const destination = (searchParams.get('destination') || 'LHR').toUpperCase();
  const date = searchParams.get('date') || defaultDep.toISOString().split('T')[0];

  // ── Step 1: RAW call to Tripadvisor16 — bypass our wrapper so we see
  //             exactly what the upstream returns.
  const url = new URL(`https://${TA_HOST}/api/v1/flights/searchFlights`);
  url.searchParams.set('sourceAirportCode', origin);
  url.searchParams.set('destinationAirportCode', destination);
  url.searchParams.set('date', date);
  url.searchParams.set('itineraryType', 'ONE_WAY');
  url.searchParams.set('sortOrder', 'ML_BEST_VALUE');
  url.searchParams.set('numAdults', '1');
  url.searchParams.set('numSeniors', '0');
  url.searchParams.set('classOfService', 'ECONOMY');
  url.searchParams.set('pageNumber', '1');
  url.searchParams.set('nearby', 'no');
  url.searchParams.set('nonstop', 'no');
  url.searchParams.set('currencyCode', 'EUR');

  let rawStatus = 0;
  let rawBody: unknown = null;
  let rawBodyPreview = '';
  let rawError: string | null = null;

  try {
    const res = await fetch(url.toString(), {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': TA_HOST },
      cache: 'no-store',
    });
    rawStatus = res.status;
    const bodyText = await res.text();
    rawBodyPreview = bodyText.slice(0, 600);
    try {
      rawBody = JSON.parse(bodyText);
    } catch {
      rawBody = null;
    }
  } catch (e) {
    rawError = (e as Error).message;
  }

  // Extract counts from the raw body so we don't need to dump the whole tree
  let rawFlightsCount = 0;
  let firstFlightHasPurchaseLinks = false;
  let firstFlightPurchaseSample: unknown = null;
  if (rawBody && typeof rawBody === 'object' && rawBody !== null) {
    const obj = rawBody as Record<string, unknown>;
    const data = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Record<string, unknown>;
    const flights = Array.isArray(data.flights) ? data.flights : [];
    rawFlightsCount = flights.length;
    if (flights[0] && typeof flights[0] === 'object' && flights[0] !== null) {
      const f0 = flights[0] as Record<string, unknown>;
      const pl = Array.isArray(f0.purchaseLinks) ? f0.purchaseLinks : [];
      firstFlightHasPurchaseLinks = pl.length > 0;
      firstFlightPurchaseSample = pl[0] ?? null;
    }
  }

  // ── Step 2: Same call through our wrapper to verify normalize works
  let normalizedCount = 0;
  let normalizeSample: unknown = null;
  let wrapperError: string | null = null;
  try {
    const wrapped = await searchFlights({
      origin, destination, departureDate: date, adults: '1', travelClass: 'ECONOMY',
    });
    if (wrapped[0]) {
      normalizeSample = extractFlightPrice(wrapped[0]);
    }
    const normalized = wrapped
      .map((f) => normalizeFlight(f, origin, destination, 'ECONOMY'))
      .filter((f) => f !== null);
    normalizedCount = normalized.length;
  } catch (e) {
    wrapperError = (e as Error).message;
  }

  let verdict: string;
  if (rawError) {
    verdict = `Couldn't reach Tripadvisor at all: ${rawError}`;
  } else if (rawStatus === 401) {
    verdict = 'Tripadvisor 401 — RAPIDAPI_KEY in Vercel is INVALID. Copy a fresh key from rapidapi.com → Tripadvisor → API Marketplace → top-right key panel, paste it in Vercel env vars, redeploy.';
  } else if (rawStatus === 403) {
    verdict = 'Tripadvisor 403 — your RapidAPI Pro subscription is not active or the API key is from a different account. Re-subscribe or check rapidapi.com dashboard.';
  } else if (rawStatus === 429) {
    verdict = 'Tripadvisor 429 — monthly quota hit on your Pro plan.';
  } else if (rawStatus !== 200) {
    verdict = `Tripadvisor returned HTTP ${rawStatus}. Check rawBodyPreview below.`;
  } else if (rawFlightsCount === 0) {
    verdict = `Tripadvisor returned 200 OK but ZERO flights for ${origin} → ${destination} on ${date}. Check rawBodyPreview — Tripadvisor may have replied with a 'no results' shape or moved the data under a different key.`;
  } else if (!firstFlightHasPurchaseLinks) {
    verdict = `Tripadvisor returned ${rawFlightsCount} flights, but the first one has NO purchaseLinks. Our normalize step requires a price from purchaseLinks → it filters everything out. Tripadvisor may have changed their response shape — see firstFlightPurchaseSample below.`;
  } else if (normalizedCount === 0) {
    verdict = `Tripadvisor returned ${rawFlightsCount} flights with purchase links, but normalize produced 0 — possibly a parsing bug on our side. See normalizeSample.`;
  } else {
    verdict = `✓ OK — Tripadvisor returned ${rawFlightsCount} raw, normalized to ${normalizedCount}. Live flight search is WORKING. If the UI still shows empty, refresh and try again.`;
  }

  return NextResponse.json({
    keyConfigured: true,
    testRoute: `${origin} → ${destination}`,
    testDate: date,
    rawStatus,
    rawFlightsCount,
    firstFlightHasPurchaseLinks,
    firstFlightPurchaseSample,
    normalizedCount,
    normalizeSample,
    wrapperError,
    rawError,
    rawBodyPreview,
    verdict,
  });
}
