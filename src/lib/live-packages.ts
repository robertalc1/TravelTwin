/* ── Live package builder (real Tripadvisor flights + hotels) ──
   Given a list of candidate destination IATAs, this helper queries the
   cheapest live flight + the cheapest live hotel from Tripadvisor for each
   one, in capped-concurrency batches. Per-leg results are cached so the
   same (origin, destination, dates) tuple is never queried twice while the
   cache is warm. Destinations that fail (no flight OR no hotel) are
   dropped — callers can fall back to deterministic estimates for those.

   Used by /api/deals/from/[iata] and /api/ai/plan-trip to replace the
   hardcoded COMMON_ROUTES + estimateTripPrice path with real bookable
   prices from the Tripadvisor16 RapidAPI Pro tier.
─────────────────────────────────────────────────────────────── */

import { getCached, setCache } from './cache';
import { searchFlights, searchHotelsByCity } from './tripadvisor-client';
import { normalizeFlight, normalizeHotel } from './tripadvisor-normalize';
import type { NormalizedFlight, NormalizedHotel } from './supabase/types';

export interface LivePackageResult {
  destinationIata: string;
  flight: NormalizedFlight;
  hotel: NormalizedHotel;
}

export interface FetchLivePackagesOpts {
  origin: string;
  destinations: string[];
  departureDate: string;
  returnDate: string;
  /** Max parallel destinations queried at once (default 6). */
  concurrency?: number;
}

async function fetchCheapestFlight(
  origin: string,
  dest: string,
  departureDate: string,
  returnDate: string,
): Promise<NormalizedFlight | null> {
  const cacheKey = `live-flight:${origin}:${dest}:${departureDate}:${returnDate}`;
  try {
    const cached = await getCached(cacheKey);
    if (cached?.data) return cached.data as NormalizedFlight;
  } catch { /* cache miss is fine */ }

  try {
    const raw = await searchFlights({
      origin,
      destination: dest,
      departureDate,
      returnDate,
      adults: '1',
      travelClass: 'ECONOMY',
    });
    const normalized = raw
      .map((f) => normalizeFlight(f, origin, dest, 'ECONOMY'))
      .filter((f): f is NormalizedFlight => f !== null)
      .sort((a, b) => a.price - b.price);
    const cheapest = normalized[0] ?? null;
    if (cheapest) {
      try { await setCache(cacheKey, cheapest, 60); } catch { /* ignore */ }
    }
    return cheapest;
  } catch (e) {
    console.warn(`[livePkg] flight ${origin}->${dest} failed:`, (e as Error).message);
    return null;
  }
}

async function fetchCheapestHotel(
  dest: string,
  checkIn: string,
  checkOut: string,
): Promise<NormalizedHotel | null> {
  const cacheKey = `live-hotel:${dest}:${checkIn}:${checkOut}`;
  try {
    const cached = await getCached(cacheKey);
    if (cached?.data) return cached.data as NormalizedHotel;
  } catch { /* cache miss is fine */ }

  try {
    const raw = await searchHotelsByCity({
      cityCode: dest,
      checkIn,
      checkOut,
      adults: '1',
      rooms: '1',
    });
    const normalized = raw
      .map((h) => normalizeHotel(h, dest, checkIn, checkOut))
      .filter((h) => h.pricePerNight > 0)
      .sort((a, b) => a.pricePerNight - b.pricePerNight);
    const cheapest = normalized[0] ?? null;
    if (cheapest) {
      try { await setCache(cacheKey, cheapest, 60); } catch { /* ignore */ }
    }
    return cheapest;
  } catch (e) {
    console.warn(`[livePkg] hotel ${dest} failed:`, (e as Error).message);
    return null;
  }
}

export async function fetchLivePackagesForDestinations(
  opts: FetchLivePackagesOpts,
): Promise<LivePackageResult[]> {
  const { destinations, departureDate, returnDate } = opts;
  const origin = opts.origin.toUpperCase();
  const concurrency = Math.max(1, opts.concurrency ?? 6);

  const out: LivePackageResult[] = [];
  for (let i = 0; i < destinations.length; i += concurrency) {
    const batch = destinations.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (rawDest) => {
        const dest = rawDest.toUpperCase();
        const [flight, hotel] = await Promise.all([
          fetchCheapestFlight(origin, dest, departureDate, returnDate),
          fetchCheapestHotel(dest, departureDate, returnDate),
        ]);
        if (!flight || !hotel) return null;
        return { destinationIata: dest, flight, hotel };
      }),
    );
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) out.push(r.value);
    }
  }
  return out;
}
