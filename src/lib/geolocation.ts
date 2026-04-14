/* ── User Location Detection + Nearest Airport Mapping ── */

export interface UserLocation {
    latitude: number;
    longitude: number;
    source: 'geolocation' | 'ip' | 'fallback';
    city?: string;
    country?: string;
}

export interface NearestAirport {
    iataCode: string;
    cityName: string;
    countryName: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
}

/** Major European airports with coordinates (priority: RO first, then neighbors) */
export const MAJOR_AIRPORTS: Omit<NearestAirport, 'distanceKm'>[] = [
    // Romania
    { iataCode: 'OTP', cityName: 'Bucharest', countryName: 'Romania', latitude: 44.5711, longitude: 26.085 },
    { iataCode: 'CLJ', cityName: 'Cluj-Napoca', countryName: 'Romania', latitude: 46.7852, longitude: 23.6862 },
    { iataCode: 'TSR', cityName: 'Timișoara', countryName: 'Romania', latitude: 45.8099, longitude: 21.3379 },
    { iataCode: 'IAS', cityName: 'Iași', countryName: 'Romania', latitude: 47.1785, longitude: 27.6206 },
    { iataCode: 'SBZ', cityName: 'Sibiu', countryName: 'Romania', latitude: 45.7856, longitude: 24.0914 },
    { iataCode: 'CND', cityName: 'Constanța', countryName: 'Romania', latitude: 44.3622, longitude: 28.4883 },
    { iataCode: 'CRA', cityName: 'Craiova', countryName: 'Romania', latitude: 44.3181, longitude: 23.8886 },
    { iataCode: 'BCM', cityName: 'Bacău', countryName: 'Romania', latitude: 46.5219, longitude: 26.9103 },
    { iataCode: 'SCV', cityName: 'Suceava', countryName: 'Romania', latitude: 47.6875, longitude: 26.3541 },
    { iataCode: 'OMR', cityName: 'Oradea', countryName: 'Romania', latitude: 47.0253, longitude: 21.9025 },
    // Neighbors
    { iataCode: 'SOF', cityName: 'Sofia', countryName: 'Bulgaria', latitude: 42.6952, longitude: 23.4114 },
    { iataCode: 'BUD', cityName: 'Budapest', countryName: 'Hungary', latitude: 47.4369, longitude: 19.2556 },
    { iataCode: 'KIV', cityName: 'Chișinău', countryName: 'Moldova', latitude: 46.9277, longitude: 28.9309 },
    { iataCode: 'BEG', cityName: 'Belgrade', countryName: 'Serbia', latitude: 44.8184, longitude: 20.3091 },
    // Major EU hubs
    { iataCode: 'LHR', cityName: 'London', countryName: 'United Kingdom', latitude: 51.47, longitude: -0.4543 },
    { iataCode: 'CDG', cityName: 'Paris', countryName: 'France', latitude: 49.0097, longitude: 2.5479 },
    { iataCode: 'FRA', cityName: 'Frankfurt', countryName: 'Germany', latitude: 50.0379, longitude: 8.5622 },
    { iataCode: 'AMS', cityName: 'Amsterdam', countryName: 'Netherlands', latitude: 52.3105, longitude: 4.7683 },
    { iataCode: 'MAD', cityName: 'Madrid', countryName: 'Spain', latitude: 40.4983, longitude: -3.5676 },
    { iataCode: 'FCO', cityName: 'Rome', countryName: 'Italy', latitude: 41.8003, longitude: 12.2389 },
    { iataCode: 'VIE', cityName: 'Vienna', countryName: 'Austria', latitude: 48.1103, longitude: 16.5697 },
    { iataCode: 'WAW', cityName: 'Warsaw', countryName: 'Poland', latitude: 52.1657, longitude: 20.9671 },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestAirport(latitude: number, longitude: number): NearestAirport {
    let best: NearestAirport = {
        ...MAJOR_AIRPORTS[0],
        distanceKm: haversineKm(latitude, longitude, MAJOR_AIRPORTS[0].latitude, MAJOR_AIRPORTS[0].longitude),
    };
    for (const ap of MAJOR_AIRPORTS) {
        const d = haversineKm(latitude, longitude, ap.latitude, ap.longitude);
        if (d < best.distanceKm) best = { ...ap, distanceKm: d };
    }
    return best;
}

export function getBrowserGeolocation(timeoutMs = 6000): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocation not available'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    source: 'geolocation',
                });
            },
            (err) => reject(err),
            { timeout: timeoutMs, enableHighAccuracy: false, maximumAge: 10 * 60 * 1000 }
        );
    });
}

export async function getIpGeolocation(): Promise<UserLocation> {
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('IP lookup failed');
        const data = await res.json();
        if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
            throw new Error('IP lookup returned invalid coordinates');
        }
        return {
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city,
            country: data.country_name,
            source: 'ip',
        };
    } catch {
        try {
            const res2 = await fetch('https://ipwho.is/');
            const d2 = await res2.json();
            if (d2?.success && typeof d2.latitude === 'number') {
                return {
                    latitude: d2.latitude,
                    longitude: d2.longitude,
                    city: d2.city,
                    country: d2.country,
                    source: 'ip',
                };
            }
        } catch { /* ignore */ }
        throw new Error('All IP lookups failed');
    }
}

export async function detectUserLocation(): Promise<UserLocation> {
    try {
        return await getBrowserGeolocation();
    } catch {
        try {
            return await getIpGeolocation();
        } catch {
            return {
                latitude: 44.4268,
                longitude: 26.1025,
                city: 'Bucharest',
                country: 'Romania',
                source: 'fallback',
            };
        }
    }
}
