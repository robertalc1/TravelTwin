/* Diagnostic endpoint for the Tripadvisor16 cars API.
   GET /api/debug/cars?city=LHR&pickUp=YYYY-MM-DD&dropOff=YYYY-MM-DD
   Tries multiple known endpoint path variants and reports which one
   returns 200 vs 404. Use the working path to update tripadvisor-client. */

import { NextResponse } from 'next/server';
import { getCityFromIata } from '@/lib/iataMapping';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || !adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}

const HOST = 'tripadvisor16.p.rapidapi.com';
const BASE = `https://${HOST}`;

const LOCATION_PATH_VARIANTS = [
  '/api/v1/rentals/searchLocation', // the live, working path (Tripadvisor groups car locations under /rentals)
  '/api/v1/cars/searchLocation',
  '/api/v1/cars/searchRentalCarsLocation',
  '/api/v1/cars/getRentalCarsLocation',
  '/api/v1/cars/searchAirport',
  '/api/v1/cars/locations/search',
  '/api/v1/cars/location/search',
  '/api/v1/rentalCars/searchLocation',
  '/api/v1/rentalCars/locations',
  '/api/v1/cars/searchCarsLocation',
];

const SEARCH_PATH_VARIANTS = [
  '/api/v1/cars/searchCarsSameDropOff',
  '/api/v1/cars/searchCarsDropOffSameLocation',
  '/api/v1/cars/searchSameDropOff',
  '/api/v1/cars/searchCars',
  '/api/v1/rentalCars/searchSameDropOff',
];

interface ProbeResult {
  path: string;
  status: number;
  ok: boolean;
  bodyPreview?: string;
  parsed?: unknown;
  error?: string;
}

async function probe(path: string, params: Record<string, string | number>): Promise<ProbeResult> {
  const key = process.env.RAPIDAPI_KEY!;
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  try {
    const res = await fetch(url.toString(), {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': HOST },
      cache: 'no-store',
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
    return {
      path,
      status: res.status,
      ok: res.ok,
      bodyPreview: text.slice(0, 400),
      parsed: res.ok ? parsed : undefined,
    };
  } catch (err: unknown) {
    return {
      path,
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!process.env.RAPIDAPI_KEY) {
    return NextResponse.json(
      { status: 'error', message: 'RAPIDAPI_KEY missing' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const city = (searchParams.get('city') || 'LHR').toUpperCase();
  const cityName = getCityFromIata(city) || city;
  const pickUp = searchParams.get('pickUp') || nDaysFromNow(7);
  const dropOff = searchParams.get('dropOff') || nDaysFromNow(10);

  // Phase 1: probe location-search endpoints with the city NAME (more permissive than IATA)
  const locationProbes = await Promise.all(
    LOCATION_PATH_VARIANTS.map((p) => probe(p, { query: cityName })),
  );

  // Phase 2: from the first successful location probe, try to extract a location id
  const okLocation = locationProbes.find((p) => p.ok);
  let candidateId: string | null = null;
  if (okLocation?.parsed) {
    candidateId = extractAnyId(okLocation.parsed);
  }

  // Phase 3: probe car-search endpoints with that id
  const searchProbes: ProbeResult[] = [];
  if (candidateId) {
    for (const p of SEARCH_PATH_VARIANTS) {
      const variants: Record<string, string | number>[] = [
        { pickUpLocationId: candidateId, dropOffLocationId: candidateId },
        { pickUpLocation: candidateId, dropOffLocation: candidateId },
        { locationId: candidateId },
      ];
      for (const v of variants) {
        const res = await probe(p, {
          ...v,
          pickUpDate: pickUp,
          dropOffDate: dropOff,
          pickUpTime: '10:00',
          dropOffTime: '10:00',
          driverAge: 25,
          currencyCode: 'EUR',
        });
        searchProbes.push({ ...res, path: `${p} (${Object.keys(v).join(',')})` });
        if (res.ok) break;
      }
    }
  }

  return NextResponse.json(
    {
      inputs: { city, cityName, pickUp, dropOff },
      locationProbes: locationProbes.map(condense),
      workingLocationPath: okLocation?.path || null,
      extractedLocationId: candidateId,
      searchProbes: searchProbes.map(condense),
      workingSearchPath: searchProbes.find((p) => p.ok)?.path || null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

function condense(p: ProbeResult): Record<string, unknown> {
  return {
    path: p.path,
    status: p.status,
    ok: p.ok,
    bodyPreview: p.bodyPreview?.slice(0, 200),
    error: p.error,
  };
}

function nDaysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function extractAnyId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const data = Array.isArray(p.data) ? p.data : Array.isArray(p) ? p : [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const it = item as Record<string, unknown>;
    const id =
      str(it.locationId) ||
      str(it.id) ||
      str(it.searchHash) ||
      str(it.documentId) ||
      str(it.airportCode) ||
      str(it.code);
    if (id) return id;
  }
  return null;
}

function str(v: unknown): string {
  if (typeof v === 'string' && v.length > 0) return v;
  if (typeof v === 'number') return String(v);
  return '';
}
