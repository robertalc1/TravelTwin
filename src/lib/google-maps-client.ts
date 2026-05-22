import { getCached, setCache } from '@/lib/cache';

const TIMEOUT_MS = 10_000;
const DRIVE_CACHE_TTL_MIN = 60 * 24;
const GEOCODE_CACHE_TTL_MIN = 60 * 24 * 30;

export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted: string;
  placeId: string;
}

export interface DriveQuote {
  originFormatted: string;
  destinationFormatted: string;
  distanceMeters: number;
  durationSeconds: number;
  durationInTrafficSeconds?: number;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_MAPS_SERVER_API_KEY is not configured');
  }
  return key;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(t);
  }
}

export async function geocodeCity(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cacheKey = `gmaps:geocode:v1:${trimmed.toLowerCase()}`;
  const cached = await getCached(cacheKey);
  if (cached && typeof cached.data === 'object' && cached.data !== null) {
    return cached.data as GeocodeResult;
  }

  const key = getApiKey();
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', trimmed);
  url.searchParams.set('key', key);

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) {
    throw new Error(`Google Geocoding HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{
      formatted_address: string;
      place_id: string;
      geometry?: { location?: { lat: number; lng: number } };
    }>;
  };

  if (body.status === 'ZERO_RESULTS') return null;
  if (body.status !== 'OK') {
    throw new Error(`Google Geocoding error: ${body.status} ${body.error_message || ''}`.trim());
  }
  const first = body.results?.[0];
  const loc = first?.geometry?.location;
  if (!first || !loc) return null;

  const out: GeocodeResult = {
    lat: loc.lat,
    lng: loc.lng,
    formatted: first.formatted_address,
    placeId: first.place_id,
  };
  await setCache(cacheKey, out, GEOCODE_CACHE_TTL_MIN);
  return out;
}

export async function getDriveQuote(
  origin: GeocodeResult,
  destination: GeocodeResult,
  mode: 'driving' | 'transit' = 'driving',
): Promise<DriveQuote> {
  const cacheKey = `gmaps:matrix:v1:${mode}:${origin.placeId}:${destination.placeId}`;
  const cached = await getCached(cacheKey);
  if (cached && typeof cached.data === 'object' && cached.data !== null) {
    return cached.data as DriveQuote;
  }

  const key = getApiKey();
  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', `place_id:${origin.placeId}`);
  url.searchParams.set('destinations', `place_id:${destination.placeId}`);
  url.searchParams.set('mode', mode);
  url.searchParams.set('units', 'metric');
  if (mode === 'driving') {
    url.searchParams.set('departure_time', 'now');
  }
  url.searchParams.set('key', key);

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) {
    throw new Error(`Google Distance Matrix HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    status: string;
    error_message?: string;
    origin_addresses?: string[];
    destination_addresses?: string[];
    rows?: Array<{
      elements: Array<{
        status: string;
        distance?: { value: number };
        duration?: { value: number };
        duration_in_traffic?: { value: number };
      }>;
    }>;
  };

  if (body.status !== 'OK') {
    throw new Error(`Google Distance Matrix error: ${body.status} ${body.error_message || ''}`.trim());
  }
  const element = body.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK' || !element.distance || !element.duration) {
    throw new Error(
      `No ${mode} route between ${origin.formatted} and ${destination.formatted} (status: ${element?.status ?? 'missing'})`,
    );
  }

  const out: DriveQuote = {
    originFormatted: body.origin_addresses?.[0] || origin.formatted,
    destinationFormatted: body.destination_addresses?.[0] || destination.formatted,
    distanceMeters: element.distance.value,
    durationSeconds: element.duration.value,
    durationInTrafficSeconds: element.duration_in_traffic?.value,
  };
  await setCache(cacheKey, out, DRIVE_CACHE_TTL_MIN);
  return out;
}

export interface ReverseGeocodeResult {
  name: string;
  country?: string;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  const cacheKey = `gmaps:reverse:v2:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  const cached = await getCached(cacheKey);
  if (cached && typeof cached.data === 'object' && cached.data !== null) {
    return cached.data as ReverseGeocodeResult;
  }

  const key = getApiKey();
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('result_type', 'locality|administrative_area_level_1');
  url.searchParams.set('key', key);

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) return null;
  const body = (await res.json()) as {
    status: string;
    results?: Array<{
      formatted_address: string;
      address_components?: Array<{ long_name: string; types: string[] }>;
    }>;
  };
  if (body.status !== 'OK') return null;
  const first = body.results?.[0];
  if (!first) return null;
  const locality = first.address_components?.find((c) => c.types.includes('locality'))?.long_name;
  const country = first.address_components?.find((c) => c.types.includes('country'))?.long_name;
  const name = locality || first.formatted_address.split(',')[0]?.trim();
  if (!name) return null;
  const result: ReverseGeocodeResult = country ? { name, country } : { name };
  await setCache(cacheKey, result, GEOCODE_CACHE_TTL_MIN);
  return result;
}

/**
 * Find the most "city-like" populated place near a coordinate pair. Used by
 * the road-trip planner to pick a real overnight-stop city instead of an
 * administrative area returned by raw reverse-geocoding ("Gorj County").
 *
 * Strategy:
 *  1. Places Nearby Search filtered by type=locality
 *  2. Among the results, pick the one with the most user ratings (proxy for
 *     "biggest city in the area")
 *  3. Fall back to reverseGeocode (administrative_area_level_1) if Places
 *     returns nothing or fails
 *
 * Requires "Places API" enabled on GOOGLE_MAPS_SERVER_API_KEY.
 */
export async function findNearbyCity(
  lat: number,
  lng: number,
  radiusMeters = 50_000,
): Promise<ReverseGeocodeResult | null> {
  const cacheKey = `gmaps:nearbyCity:v2:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = await getCached(cacheKey);
  if (cached && typeof cached.data === 'object' && cached.data !== null) {
    return cached.data as ReverseGeocodeResult;
  }

  let key: string;
  try {
    key = getApiKey();
  } catch {
    return reverseGeocode(lat, lng);
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', String(radiusMeters));
    url.searchParams.set('type', 'locality');
    url.searchParams.set('key', key);

    const res = await fetchWithTimeout(url.toString());
    if (res.ok) {
      const body = (await res.json()) as {
        status: string;
        results?: Array<{
          name?: string;
          user_ratings_total?: number;
          types?: string[];
        }>;
      };
      if (body.status === 'OK' || body.status === 'ZERO_RESULTS') {
        const sorted = (body.results || [])
          .filter((r) => r.name && (r.types || []).includes('locality'))
          .sort((a, b) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0));
        const picked = sorted[0]?.name;
        if (picked) {
          // Places nearbysearch doesn't carry country — enrich via a single
          // reverseGeocode call so downstream consumers can build a fully
          // qualified "City, Country" query for Tripadvisor and friends.
          const enriched = await reverseGeocode(lat, lng).catch(() => null);
          const result: ReverseGeocodeResult = enriched?.country
            ? { name: picked, country: enriched.country }
            : { name: picked };
          await setCache(cacheKey, result, GEOCODE_CACHE_TTL_MIN);
          return result;
        }
      }
    }
  } catch {
    /* Places API may not be enabled — fall through to reverseGeocode */
  }

  const fallback = await reverseGeocode(lat, lng);
  if (fallback) await setCache(cacheKey, fallback, GEOCODE_CACHE_TTL_MIN);
  return fallback;
}

export function midpoint(a: GeocodeResult, b: GeocodeResult): { lat: number; lng: number } {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}
