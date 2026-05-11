/* Diagnostic endpoint for the Tripadvisor16 cars API.
   GET /api/debug/cars?city=LHR&pickUp=2026-05-20&dropOff=2026-05-23
   Returns the RAW Tripadvisor response so we can see what fields it
   actually uses (locationId vs searchHash, data nesting, etc.). */

import { NextResponse } from 'next/server';
import { tripadvisorFetch } from '@/lib/tripadvisor-client';
import { getCityFromIata } from '@/lib/iataMapping';

export async function GET(req: Request) {
  if (!process.env.RAPIDAPI_KEY) {
    return NextResponse.json(
      { status: 'error', message: 'RAPIDAPI_KEY missing' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const city = (searchParams.get('city') || 'LHR').toUpperCase();
  const pickUp = searchParams.get('pickUp') || nDaysFromNow(7);
  const dropOff = searchParams.get('dropOff') || nDaysFromNow(10);

  const out: Record<string, unknown> = {
    inputs: { city, cityName: getCityFromIata(city), pickUp, dropOff },
  };

  // Step 1: searchLocation by IATA
  try {
    const byIata = await tripadvisorFetch<unknown>('/api/v1/cars/searchLocation', {
      query: city,
    });
    out.searchLocationByIata = byIata;
  } catch (err: unknown) {
    out.searchLocationByIataError = err instanceof Error ? err.message : String(err);
  }

  // Step 2: searchLocation by city name
  try {
    const byName = await tripadvisorFetch<unknown>('/api/v1/cars/searchLocation', {
      query: getCityFromIata(city) || city,
    });
    out.searchLocationByName = byName;
  } catch (err: unknown) {
    out.searchLocationByNameError = err instanceof Error ? err.message : String(err);
  }

  // Step 3: pick an ID from whichever response succeeded and try searchCars
  const candidateId = extractAnyId(out.searchLocationByName) || extractAnyId(out.searchLocationByIata);
  if (candidateId) {
    out.usedLocationId = candidateId;
    try {
      const cars = await tripadvisorFetch<unknown>('/api/v1/cars/searchCarsSameDropOff', {
        pickUpLocationId: candidateId,
        dropOffLocationId: candidateId,
        pickUpDate: pickUp,
        dropOffDate: dropOff,
        pickUpTime: '10:00',
        dropOffTime: '10:00',
        driverAge: 25,
        currencyCode: 'EUR',
      });
      out.searchCarsSameDropOff = cars;
    } catch (err: unknown) {
      out.searchCarsError = err instanceof Error ? err.message : String(err);
    }
  } else {
    out.warning = 'No candidate location ID could be extracted from either searchLocation response.';
  }

  return NextResponse.json(out, {
    headers: { 'Cache-Control': 'no-store' },
  });
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
      str(it.documentId);
    if (id) return id;
  }
  return null;
}

function str(v: unknown): string {
  if (typeof v === 'string' && v.length > 0) return v;
  if (typeof v === 'number') return String(v);
  return '';
}
