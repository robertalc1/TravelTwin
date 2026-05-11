/* ── Tripadvisor16 RapidAPI Client ─────────────────────────────
   Replaces Amadeus as the primary live-data source for hotels and
   flights. All callers should import from this file, NOT from the
   Tripadvisor REST API directly.

   Free-tier quota: ~500 req/month. Aggressive caching + the
   sliding-window rate limiter in rateLimiter.ts protect the budget.
─────────────────────────────────────────────────────────────── */

import { getCached, setCache } from './cache';
import { getCityFromIata } from './iataMapping';

const HOST = 'tripadvisor16.p.rapidapi.com';
const BASE = `https://${HOST}`;

/* ── Strict response types ───────────────────────────────────── */

export interface TAFlightLeg {
  originStationCode: string;
  destinationStationCode: string;
  departureDateTime: string;
  arrivalDateTime: string;
  durationInMinutes: number;
  marketingCarrier: { code: string; displayName: string };
  operatingCarrier?: { code: string; displayName: string };
  flightNumber?: string;
  isStopover?: boolean;
  stopoverInMinutes?: number;
}

export interface TAFlightSegment {
  legs: TAFlightLeg[];
}

export interface TAPurchaseLink {
  totalPrice?: number;
  totalPricePerPassenger?: number;
  currency?: string;
  partner?: string;
  url?: string;
}

export interface TAFlight {
  segments: TAFlightSegment[];
  purchaseLinks?: TAPurchaseLink[];
  priceForDisplay?: string;
}

export interface TAHotelPhoto {
  sizes?: { urlTemplate?: string };
}

export interface TAHotel {
  id: string;
  title?: string;
  primaryInfo?: string;
  secondaryInfo?: string;
  bubbleRating?: { count?: string; rating?: number };
  priceForDisplay?: string;
  strikethroughPrice?: string;
  priceDetails?: string;
  cardPhotos?: TAHotelPhoto[];
  amenities?: string[];
}

export interface TALocation {
  airportCode?: string;
  airportName?: string;
  cityName?: string;
  countryCode?: string;
  iataCode?: string;
  name?: string;
  title?: string;
  secondaryText?: string;
  geoId?: number | string;
  documentId?: string;
}

export interface TAInspiration {
  origin: string;
  destination: string;
  destinationCity: string;
  destinationCountry: string;
  price: number;
  currency: string;
  departureDate: string;
  returnDate: string;
  duration: number;
}

/* ── Search input types ──────────────────────────────────────── */

export interface SearchFlightsParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: string;
  travelClass?: string;
}

export interface SearchHotelsParams {
  cityCode: string;
  checkIn: string;
  checkOut: string;
  adults?: string;
  rooms?: string;
}

/* ── Base fetch helper ───────────────────────────────────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function tripadvisorFetch<T>(
  path: string,
  params: Record<string, string | number>
): Promise<T> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY is not set');

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': HOST,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Tripadvisor ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as T;
  return json;
}

/* ── Flights ─────────────────────────────────────────────────── */

export async function searchFlights(p: SearchFlightsParams): Promise<TAFlight[]> {
  const itineraryType = p.returnDate ? 'ROUND_TRIP' : 'ONE_WAY';
  const classOfService = (p.travelClass || 'ECONOMY').toUpperCase();

  const params: Record<string, string | number> = {
    sourceAirportCode: p.origin.toUpperCase(),
    destinationAirportCode: p.destination.toUpperCase(),
    date: p.departureDate,
    itineraryType,
    sortOrder: 'ML_BEST_VALUE',
    numAdults: p.adults || '1',
    classOfService,
    pageNumber: 1,
    currencyCode: 'EUR',
  };
  if (p.returnDate) params.returnDate = p.returnDate;

  const raw = await tripadvisorFetch<unknown>('/api/v1/flights/searchFlights', params);
  if (!isRecord(raw)) return [];
  const data = isRecord(raw.data) ? raw.data : raw;
  const flightsRaw = asArray((data as Record<string, unknown>).flights);

  const result: TAFlight[] = [];
  for (const f of flightsRaw) {
    if (!isRecord(f)) continue;
    const segments: TAFlightSegment[] = [];
    for (const s of asArray(f.segments)) {
      if (!isRecord(s)) continue;
      const legs: TAFlightLeg[] = [];
      for (const l of asArray(s.legs)) {
        if (!isRecord(l)) continue;
        const mc = isRecord(l.marketingCarrier) ? l.marketingCarrier : {};
        const oc = isRecord(l.operatingCarrier) ? l.operatingCarrier : undefined;
        legs.push({
          originStationCode: asString(l.originStationCode),
          destinationStationCode: asString(l.destinationStationCode),
          departureDateTime: asString(l.departureDateTime),
          arrivalDateTime: asString(l.arrivalDateTime),
          durationInMinutes: asNumber(l.durationInMinutes),
          marketingCarrier: {
            code: asString(mc.code),
            displayName: asString(mc.displayName),
          },
          operatingCarrier: oc
            ? { code: asString(oc.code), displayName: asString(oc.displayName) }
            : undefined,
          flightNumber: l.flightNumber ? asString(l.flightNumber) : undefined,
          isStopover: typeof l.isStopover === 'boolean' ? l.isStopover : false,
          stopoverInMinutes: asNumber(l.stopoverInMinutes),
        });
      }
      segments.push({ legs });
    }

    const purchaseLinks: TAPurchaseLink[] = [];
    for (const pl of asArray(f.purchaseLinks)) {
      if (!isRecord(pl)) continue;
      purchaseLinks.push({
        totalPrice: typeof pl.totalPrice === 'number' ? pl.totalPrice : asNumber(pl.totalPrice),
        totalPricePerPassenger:
          typeof pl.totalPricePerPassenger === 'number'
            ? pl.totalPricePerPassenger
            : asNumber(pl.totalPricePerPassenger),
        currency: asString(pl.currency),
        partner: asString(pl.partner),
        url: asString(pl.url),
      });
    }

    result.push({
      segments,
      purchaseLinks,
      priceForDisplay: f.priceForDisplay ? asString(f.priceForDisplay) : undefined,
    });
  }
  return result;
}

/**
 * Extract a usable price + booking link from a Tripadvisor flight result.
 * Returns null when no valid price is available (strict mode).
 */
export function extractFlightPrice(
  f: TAFlight
): { price: number; currency: string; bookingLink?: string } | null {
  if (f.purchaseLinks && f.purchaseLinks.length > 0) {
    const sorted = [...f.purchaseLinks].sort(
      (a, b) => (a.totalPricePerPassenger ?? a.totalPrice ?? Infinity) -
                 (b.totalPricePerPassenger ?? b.totalPrice ?? Infinity)
    );
    for (const pl of sorted) {
      const price = pl.totalPricePerPassenger ?? pl.totalPrice ?? 0;
      if (price > 0) {
        return {
          price: Math.round(price * 100) / 100,
          currency: pl.currency || 'EUR',
          bookingLink: pl.url || undefined,
        };
      }
    }
  }
  if (f.priceForDisplay) {
    const parsed = parseFloat(f.priceForDisplay.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      return { price: parsed, currency: 'EUR' };
    }
  }
  return null;
}

/* ── Hotels ──────────────────────────────────────────────────── */

/**
 * Resolve an IATA city code (or arbitrary city name) to a Tripadvisor geoId.
 * Caches the result for 30 days in the api_cache table to save quota.
 */
export async function getGeoIdForCity(cityCode: string): Promise<number | null> {
  const code = cityCode.toUpperCase();
  const cacheKey = `geoId:${code}`;
  const cached = await getCached(cacheKey);
  if (cached && typeof cached.data === 'number') return cached.data;

  const cityName = getCityFromIata(code) || code;
  const raw = await tripadvisorFetch<unknown>('/api/v1/hotels/searchLocation', {
    query: cityName,
  });

  if (!isRecord(raw)) return null;
  const data = asArray((raw as Record<string, unknown>).data);
  for (const item of data) {
    if (!isRecord(item)) continue;
    const gid = item.geoId;
    const numeric =
      typeof gid === 'number' ? gid : typeof gid === 'string' ? parseInt(gid, 10) : NaN;
    if (Number.isFinite(numeric) && numeric > 0) {
      await setCache(cacheKey, numeric, 60 * 24 * 30); // 30 days
      return numeric;
    }
  }
  return null;
}

export async function searchHotelsByCity(p: SearchHotelsParams): Promise<TAHotel[]> {
  const geoId = await getGeoIdForCity(p.cityCode);
  if (!geoId) return [];

  const raw = await tripadvisorFetch<unknown>('/api/v1/hotels/searchHotels', {
    geoId,
    checkIn: p.checkIn,
    checkOut: p.checkOut,
    pageNumber: 1,
    adults: p.adults || '1',
    rooms: p.rooms || '1',
    currencyCode: 'EUR',
  });

  if (!isRecord(raw)) return [];
  const data = isRecord(raw.data) ? raw.data : raw;
  const hotelsRaw = asArray((data as Record<string, unknown>).data);

  const result: TAHotel[] = [];
  for (const h of hotelsRaw) {
    if (!isRecord(h)) continue;
    const br = isRecord(h.bubbleRating) ? h.bubbleRating : {};
    const photosRaw = asArray(h.cardPhotos);
    const cardPhotos: TAHotelPhoto[] = [];
    for (const ph of photosRaw) {
      if (!isRecord(ph)) continue;
      const sizes = isRecord(ph.sizes) ? ph.sizes : undefined;
      cardPhotos.push({
        sizes: sizes ? { urlTemplate: asString(sizes.urlTemplate) } : undefined,
      });
    }
    const amenitiesRaw = asArray(h.amenities).filter((a): a is string => typeof a === 'string');

    result.push({
      id: asString(h.id) || crypto.randomUUID(),
      title: asString(h.title),
      primaryInfo: asString(h.primaryInfo),
      secondaryInfo: asString(h.secondaryInfo),
      bubbleRating: {
        count: asString(br.count),
        rating: asNumber(br.rating),
      },
      priceForDisplay: asString(h.priceForDisplay),
      strikethroughPrice: asString(h.strikethroughPrice),
      priceDetails: asString(h.priceDetails),
      cardPhotos,
      amenities: amenitiesRaw,
    });
  }
  return result;
}

/* ── Locations (autocomplete) ────────────────────────────────── */

export async function searchLocations(keyword: string): Promise<TALocation[]> {
  const raw = await tripadvisorFetch<unknown>('/api/v1/flights/searchAirport', {
    query: keyword,
  });

  if (!isRecord(raw)) return [];
  const data = asArray((raw as Record<string, unknown>).data);

  const result: TALocation[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    result.push({
      airportCode: asString(item.airportCode),
      airportName: asString(item.airportName),
      cityName: asString(item.cityName),
      countryCode: asString(item.countryCode),
      documentId: asString(item.documentId),
    });
  }
  return result;
}

/* ── Flight inspiration (no live call — uses COMMON_ROUTES) ─── */

/**
 * Tripadvisor16 does not expose a flight-inspiration endpoint, so this
 * function builds a list of cheap destinations from the precomputed
 * COMMON_ROUTES table + the pricing estimator. Zero RapidAPI quota usage.
 */
export async function searchFlightInspirations(origin: string): Promise<TAInspiration[]> {
  const { COMMON_ROUTES } = await import('./commonRoutes');
  const { getCountryFromIata } = await import('./iataMapping');

  const today = new Date();
  const departure = new Date(today);
  departure.setDate(today.getDate() + 30);
  const ret = new Date(departure);
  ret.setDate(departure.getDate() + 7);
  const fmt = (d: Date): string => d.toISOString().split('T')[0];

  const out: TAInspiration[] = [];
  for (const r of COMMON_ROUTES) {
    if (r.from !== origin.toUpperCase()) continue;
    out.push({
      origin: r.from,
      destination: r.to,
      destinationCity: getCityFromIata(r.to),
      destinationCountry: getCountryFromIata(r.to),
      price: r.avgPrice,
      currency: r.currency,
      departureDate: fmt(departure),
      returnDate: fmt(ret),
      duration: 7,
    });
  }
  out.sort((a, b) => a.price - b.price);
  return out;
}
