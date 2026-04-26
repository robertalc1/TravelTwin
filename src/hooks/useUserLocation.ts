'use client';

import { useState, useEffect } from 'react';
import type { GeoResponse } from '@/app/api/geolocation/route';

const CACHE_KEY = 'traveltwin_geo_v2';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min client-side

interface CachedEntry {
  data: GeoResponse;
  timestamp: number;
}

export interface UserLocationResult {
  latitude: number | null;
  longitude: number | null;
  city: string;
  country: string;
  iataCode: string;
  airportCity: string;
  distanceKm: number;
  source: 'ip' | 'fallback' | 'cached';
  isLoading: boolean;
  /** Backward-compat shape for consumers that use airport.iataCode */
  airport: { iataCode: string; cityName: string; countryName: string; distanceKm: number } | null;
  /** Alias for isLoading (backward compat) */
  loading: boolean;
}

const FALLBACK_DATA: GeoResponse = {
  latitude: 44.4268,
  longitude: 26.1025,
  city: 'Bucharest',
  country: 'Romania',
  iataCode: 'OTP',
  airportCity: 'Bucharest',
  distanceKm: 0,
  source: 'fallback',
};

export function useUserLocation(): UserLocationResult {
  const [data, setData] = useState<GeoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function detect() {
      // 1. Check client-side sessionStorage cache (30 min TTL)
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const entry: CachedEntry = JSON.parse(raw);
          if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
            const cached = { ...entry.data, source: 'cached' as const };
            setData(cached);
            setIsLoading(false);
            console.log(
              `[Location] Cached: ${cached.city}, ${cached.country} → ${cached.iataCode}`
            );
            return;
          }
        }
      } catch { /* sessionStorage unavailable */ }

      // 2. Fetch from server-side IP detection endpoint
      try {
        const res = await fetch('/api/geolocation', { signal: controller.signal });
        if (!res.ok) throw new Error(`Geolocation API ${res.status}`);
        const json: GeoResponse = await res.json();
        setData(json);
        console.log(
          `[Location] IP: ${json.city}, ${json.country} → ${json.iataCode} (${json.distanceKm} km)`
        );
        // Persist for subsequent page visits
        try {
          const entry: CachedEntry = { data: json, timestamp: Date.now() };
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
        } catch { /* ignore write errors */ }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        // Network failure → static fallback
        console.warn('[Location] Falling back to OTP/Bucharest');
        setData(FALLBACK_DATA);
      } finally {
        setIsLoading(false);
      }
    }

    detect();
    return () => controller.abort();
  }, []);

  const resolved = data ?? FALLBACK_DATA;

  return {
    latitude: data?.latitude ?? null,
    longitude: data?.longitude ?? null,
    city: resolved.city,
    country: resolved.country,
    iataCode: resolved.iataCode,
    airportCity: resolved.airportCity,
    distanceKm: resolved.distanceKm,
    source: resolved.source,
    isLoading,
    airport: {
      iataCode: resolved.iataCode,
      cityName: resolved.airportCity,
      countryName: resolved.country,
      distanceKm: resolved.distanceKm,
    },
    loading: isLoading,
  };
}
