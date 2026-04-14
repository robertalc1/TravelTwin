'use client';

import { useState, useEffect } from 'react';
import {
    detectUserLocation,
    findNearestAirport,
    type UserLocation,
    type NearestAirport,
} from '@/lib/geolocation';

const CACHE_KEY = 'traveltwin_user_location_v1';
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedLocation {
    location: UserLocation;
    airport: NearestAirport;
    timestamp: number;
}

interface UseUserLocationResult {
    location: UserLocation | null;
    airport: NearestAirport | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useUserLocation(): UseUserLocationResult {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [airport, setAirport] = useState<NearestAirport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setLoading(true);
            setError(null);

            try {
                const raw = sessionStorage.getItem(CACHE_KEY);
                if (raw) {
                    const cached: CachedLocation = JSON.parse(raw);
                    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
                        if (!cancelled) {
                            setLocation(cached.location);
                            setAirport(cached.airport);
                            setLoading(false);
                        }
                        return;
                    }
                }
            } catch { /* ignore */ }

            try {
                const loc = await detectUserLocation();
                const ap = findNearestAirport(loc.latitude, loc.longitude);
                if (cancelled) return;
                setLocation(loc);
                setAirport(ap);
                try {
                    sessionStorage.setItem(
                        CACHE_KEY,
                        JSON.stringify({ location: loc, airport: ap, timestamp: Date.now() })
                    );
                } catch { /* ignore */ }
            } catch (e) {
                if (!cancelled) setError((e as Error).message || 'Location detection failed');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [tick]);

    return {
        location,
        airport,
        loading,
        error,
        refresh: () => {
            try {
                sessionStorage.removeItem(CACHE_KEY);
            } catch { /* ignore */ }
            setTick((t) => t + 1);
        },
    };
}
