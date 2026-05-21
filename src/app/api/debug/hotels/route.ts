/* Diagnostic endpoint for Tripadvisor16 hotel search.

   Performs the same TWO upstream calls our normal hotel-search flow does —
   1. searchLocation (resolve city/IATA to geoId)
   2. searchHotels (list hotels in that geoId for the given dates)
   — but bypasses our wrapper so we see exactly what Tripadvisor returns at
   each step. Lets the user inspect what data is actually available for any
   city / date combo before assuming a bug on our side.

   Auth-gated to logged-in users. */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCityFromIata, getCountryFromIata } from '@/lib/iataMapping';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TA_HOST = 'tripadvisor16.p.rapidapi.com';
const PROBE_TIMEOUT_MS = 15_000;

async function probe(path: string, params: Record<string, string>, key: string) {
  const url = new URL(`https://${TA_HOST}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const result: {
    httpStatus: number;
    bodyPreview: string;
    parsed: unknown;
    error: string | null;
  } = { httpStatus: 0, bodyPreview: '', parsed: null, error: null };

  try {
    const res = await fetch(url.toString(), {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': TA_HOST },
      cache: 'no-store',
      signal: controller.signal,
    });
    result.httpStatus = res.status;
    const text = await res.text();
    result.bodyPreview = text.slice(0, 600);
    try { result.parsed = JSON.parse(text); } catch { /* keep null */ }
  } catch (e) {
    result.error = (e as Error).name === 'AbortError'
      ? `Timed out after ${PROBE_TIMEOUT_MS}ms`
      : (e as Error).message;
  } finally {
    clearTimeout(timer);
  }
  return result;
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
  const cityCode = (searchParams.get('cityCode') || 'CRT').toUpperCase();
  // Accept a free-text city override too — useful when the cityCode lookup
  // misses (e.g. Crete which doesn't have a single canonical IATA airport).
  const cityArg = searchParams.get('city');

  const cityName = cityArg || getCityFromIata(cityCode) || cityCode;
  const country = getCountryFromIata(cityCode);
  const query = country ? `${cityName}, ${country}` : cityName;

  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 14);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 4);
  const checkInStr = searchParams.get('checkIn') || checkIn.toISOString().split('T')[0];
  const checkOutStr = searchParams.get('checkOut') || checkOut.toISOString().split('T')[0];

  // ── Step 1: resolve city to geoId ──────────────────────────────
  const loc = await probe('/api/v1/hotels/searchLocation', { query }, key);

  let geoId: number | null = null;
  let locationsFound: Array<{ geoId: unknown; title: unknown; secondaryText: unknown }> = [];
  if (loc.parsed && typeof loc.parsed === 'object') {
    const root = loc.parsed as Record<string, unknown>;
    const items = Array.isArray(root.data) ? root.data : [];
    locationsFound = items
      .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
      .slice(0, 5)
      .map((it) => ({
        geoId: it.geoId,
        title: it.title,
        secondaryText: it.secondaryText,
      }));
    const first = items[0] as Record<string, unknown> | undefined;
    if (first && (typeof first.geoId === 'number' || typeof first.geoId === 'string')) {
      const n = typeof first.geoId === 'number' ? first.geoId : parseInt(first.geoId, 10);
      if (Number.isFinite(n)) geoId = n;
    }
  }

  // ── Step 2: search hotels with the geoId ───────────────────────
  let hotels: Awaited<ReturnType<typeof probe>> | null = null;
  let hotelsCount = 0;
  let firstHotelSample: unknown = null;
  if (geoId) {
    hotels = await probe('/api/v1/hotels/searchHotels', {
      geoId: String(geoId),
      checkIn: checkInStr,
      checkOut: checkOutStr,
      pageNumber: '1',
      adults: '1',
      rooms: '1',
      currencyCode: 'EUR',
    }, key);

    if (hotels.parsed && typeof hotels.parsed === 'object') {
      const root = hotels.parsed as Record<string, unknown>;
      const data =
        root.data && typeof root.data === 'object'
          ? (root.data as Record<string, unknown>)
          : root;
      const list = Array.isArray(data.data) ? data.data : [];
      hotelsCount = list.length;
      firstHotelSample = list[0] ?? null;
    }
  }

  // ── Verdict ────────────────────────────────────────────────────
  let verdict: string;
  if (loc.httpStatus === 401 || hotels?.httpStatus === 401) {
    verdict = 'Tripadvisor 401 — RAPIDAPI_KEY is INVALID.';
  } else if (loc.httpStatus === 403 || hotels?.httpStatus === 403) {
    verdict = 'Tripadvisor 403 — RapidAPI Pro subscription not active.';
  } else if (loc.httpStatus === 429 || hotels?.httpStatus === 429) {
    verdict = 'Tripadvisor 429 — quota exceeded on RapidAPI Pro plan.';
  } else if (loc.error) {
    verdict = `searchLocation failed: ${loc.error}`;
  } else if (!geoId) {
    verdict = `Tripadvisor could NOT resolve a geoId for "${query}". The city is not in their location index — try a different city name (e.g. "Heraklion" instead of "Crete"), or use ?city=YourCity in the URL to override.`;
  } else if (hotels?.error) {
    verdict = `searchHotels failed for geoId=${geoId}: ${hotels.error}`;
  } else if (hotelsCount === 0) {
    verdict = `Tripadvisor resolved geoId=${geoId} for "${query}" but returned ZERO hotels for ${checkInStr} → ${checkOutStr}. Either no inventory on these dates, or the property list is empty in their index. Try different dates.`;
  } else {
    verdict = `✓ OK — found geoId=${geoId} and ${hotelsCount} hotels for ${checkInStr} → ${checkOutStr}.`;
  }

  return NextResponse.json({
    keyConfigured: true,
    inputCity: cityCode,
    resolvedQuery: query,
    testDates: { checkIn: checkInStr, checkOut: checkOutStr },
    geoId,
    locationsFound,
    hotelsCount,
    firstHotelSample,
    searchLocation: {
      httpStatus: loc.httpStatus,
      bodyPreview: loc.bodyPreview,
      error: loc.error,
    },
    searchHotels: hotels
      ? {
          httpStatus: hotels.httpStatus,
          bodyPreview: hotels.bodyPreview,
          error: hotels.error,
        }
      : null,
    verdict,
  });
}
