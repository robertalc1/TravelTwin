import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/cache';
import { findNearestAirport } from '@/lib/geolocation';

interface IpApiResponse {
  status: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

interface IpapiCoResponse {
  ip: string;
  city: string;
  country_name: string;
  latitude: number;
  longitude: number;
  error?: boolean;
  reason?: string;
}

export interface GeoResponse {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  iataCode: string;
  airportCity: string;
  distanceKm: number;
  source: 'ip' | 'fallback' | 'cached';
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('10.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

const FALLBACK_COORDS = { lat: 44.4268, lon: 26.1025, city: 'Bucharest', country: 'Romania' };

function buildFallback(): GeoResponse {
  const ap = findNearestAirport(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon);
  return {
    latitude: FALLBACK_COORDS.lat,
    longitude: FALLBACK_COORDS.lon,
    city: FALLBACK_COORDS.city,
    country: FALLBACK_COORDS.country,
    iataCode: ap.iataCode,
    airportCity: ap.cityName,
    distanceKm: Math.round(ap.distanceKm),
    source: 'fallback',
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<GeoResponse>> {
  // Extract client IP from Vercel / reverse-proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = (forwarded?.split(',')[0]?.trim() ?? realIp ?? '').trim();

  // Private / local IP → instant fallback (dev environment)
  if (!ip || isPrivateIp(ip)) {
    return NextResponse.json(buildFallback());
  }

  // Server-side cache (60 min TTL via Supabase)
  const cacheKey = `geo_ip_v1_${ip}`;
  try {
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ ...(cached.data as GeoResponse), source: 'cached' });
    }
  } catch { /* cache miss is fine */ }

  let lat: number | null = null;
  let lon: number | null = null;
  let city = '';
  let country = '';

  // ── Primary: ip-api.com (45 req/min, HTTP only — OK for server-side) ──
  try {
    const res = await fetchWithTimeout(
      `http://ip-api.com/json/${ip}?fields=status,city,country,lat,lon`,
      3000
    );
    if (res.ok) {
      const data: IpApiResponse = await res.json();
      if (data.status === 'success' && typeof data.lat === 'number') {
        lat = data.lat;
        lon = data.lon;
        city = data.city ?? '';
        country = data.country ?? '';
      }
    }
  } catch { /* timeout or network error — try backup */ }

  // ── Backup: ipapi.co (1000 req/day, HTTPS) ──
  if (lat === null) {
    try {
      const res = await fetchWithTimeout(
        `https://ipapi.co/${ip}/json/`,
        3000
      );
      if (res.ok) {
        const data: IpapiCoResponse = await res.json();
        if (!data.error && typeof data.latitude === 'number') {
          lat = data.latitude;
          lon = data.longitude;
          city = data.city ?? '';
          country = data.country_name ?? '';
        }
      }
    } catch { /* both failed */ }
  }

  // ── All providers failed → static fallback ──
  if (lat === null || lon === null) {
    return NextResponse.json(buildFallback());
  }

  const ap = findNearestAirport(lat, lon);
  const result: GeoResponse = {
    latitude: lat,
    longitude: lon,
    city,
    country,
    iataCode: ap.iataCode,
    airportCity: ap.cityName,
    distanceKm: Math.round(ap.distanceKm),
    source: 'ip',
  };

  // Persist in server cache (no raw IP stored — key only, GDPR compliant)
  try {
    await setCache(cacheKey, result, 60);
  } catch { /* non-critical */ }

  return NextResponse.json(result);
}
