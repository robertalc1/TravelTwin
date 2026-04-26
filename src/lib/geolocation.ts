/* ── Nearest Airport Mapping (server-side only, no browser APIs) ── */

export interface NearestAirport {
    iataCode: string;
    cityName: string;
    countryName: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
}

/** Major airports with coordinates — Romania complete + Europe + global hubs */
export const MAJOR_AIRPORTS: Omit<NearestAirport, 'distanceKm'>[] = [
    // ── Romania (all airports) ──
    { iataCode: 'OTP', cityName: 'Bucharest', countryName: 'Romania', latitude: 44.5711, longitude: 26.0850 },
    { iataCode: 'CLJ', cityName: 'Cluj-Napoca', countryName: 'Romania', latitude: 46.7852, longitude: 23.6862 },
    { iataCode: 'TSR', cityName: 'Timișoara', countryName: 'Romania', latitude: 45.8098, longitude: 21.3379 },
    { iataCode: 'IAS', cityName: 'Iași', countryName: 'Romania', latitude: 47.1785, longitude: 27.6205 },
    { iataCode: 'SBZ', cityName: 'Sibiu', countryName: 'Romania', latitude: 45.7856, longitude: 24.0913 },
    { iataCode: 'CND', cityName: 'Constanța', countryName: 'Romania', latitude: 44.3622, longitude: 28.4883 },
    { iataCode: 'CRA', cityName: 'Craiova', countryName: 'Romania', latitude: 44.3181, longitude: 23.8886 },
    { iataCode: 'BCM', cityName: 'Bacău', countryName: 'Romania', latitude: 46.5219, longitude: 26.9103 },
    { iataCode: 'SCV', cityName: 'Suceava', countryName: 'Romania', latitude: 47.6876, longitude: 26.3540 },
    { iataCode: 'OMR', cityName: 'Oradea', countryName: 'Romania', latitude: 47.0253, longitude: 21.9025 },
    { iataCode: 'TGM', cityName: 'Târgu Mureș', countryName: 'Romania', latitude: 46.4677, longitude: 24.4125 },
    // ── Balkan neighbors ──
    { iataCode: 'SOF', cityName: 'Sofia', countryName: 'Bulgaria', latitude: 42.6952, longitude: 23.4114 },
    { iataCode: 'BUD', cityName: 'Budapest', countryName: 'Hungary', latitude: 47.4369, longitude: 19.2556 },
    { iataCode: 'KIV', cityName: 'Chișinău', countryName: 'Moldova', latitude: 46.9277, longitude: 28.9309 },
    { iataCode: 'BEG', cityName: 'Belgrade', countryName: 'Serbia', latitude: 44.8184, longitude: 20.3091 },
    { iataCode: 'ATH', cityName: 'Athens', countryName: 'Greece', latitude: 37.9364, longitude: 23.9445 },
    { iataCode: 'IST', cityName: 'Istanbul', countryName: 'Turkey', latitude: 41.2753, longitude: 28.7519 },
    { iataCode: 'PRG', cityName: 'Prague', countryName: 'Czech Republic', latitude: 50.1008, longitude: 14.2600 },
    { iataCode: 'WAW', cityName: 'Warsaw', countryName: 'Poland', latitude: 52.1657, longitude: 20.9671 },
    { iataCode: 'KRK', cityName: 'Krakow', countryName: 'Poland', latitude: 50.0777, longitude: 19.7848 },
    { iataCode: 'VIE', cityName: 'Vienna', countryName: 'Austria', latitude: 48.1103, longitude: 16.5697 },
    // ── Western Europe hubs ──
    { iataCode: 'LHR', cityName: 'London', countryName: 'United Kingdom', latitude: 51.4775, longitude: -0.4614 },
    { iataCode: 'CDG', cityName: 'Paris', countryName: 'France', latitude: 49.0097, longitude: 2.5479 },
    { iataCode: 'FRA', cityName: 'Frankfurt', countryName: 'Germany', latitude: 50.0379, longitude: 8.5622 },
    { iataCode: 'BER', cityName: 'Berlin', countryName: 'Germany', latitude: 52.3667, longitude: 13.5033 },
    { iataCode: 'MUC', cityName: 'Munich', countryName: 'Germany', latitude: 48.3538, longitude: 11.7861 },
    { iataCode: 'AMS', cityName: 'Amsterdam', countryName: 'Netherlands', latitude: 52.3105, longitude: 4.7683 },
    { iataCode: 'MAD', cityName: 'Madrid', countryName: 'Spain', latitude: 40.4983, longitude: -3.5676 },
    { iataCode: 'BCN', cityName: 'Barcelona', countryName: 'Spain', latitude: 41.2974, longitude: 2.0833 },
    { iataCode: 'FCO', cityName: 'Rome', countryName: 'Italy', latitude: 41.8003, longitude: 12.2389 },
    { iataCode: 'MXP', cityName: 'Milan', countryName: 'Italy', latitude: 45.6306, longitude: 8.7281 },
    { iataCode: 'BRU', cityName: 'Brussels', countryName: 'Belgium', latitude: 50.9010, longitude: 4.4844 },
    { iataCode: 'ZRH', cityName: 'Zurich', countryName: 'Switzerland', latitude: 47.4647, longitude: 8.5492 },
    { iataCode: 'LIS', cityName: 'Lisbon', countryName: 'Portugal', latitude: 38.7742, longitude: -9.1342 },
    { iataCode: 'CPH', cityName: 'Copenhagen', countryName: 'Denmark', latitude: 55.6180, longitude: 12.6560 },
    { iataCode: 'ARN', cityName: 'Stockholm', countryName: 'Sweden', latitude: 59.6519, longitude: 17.9186 },
    { iataCode: 'OSL', cityName: 'Oslo', countryName: 'Norway', latitude: 60.1939, longitude: 11.1004 },
    { iataCode: 'HEL', cityName: 'Helsinki', countryName: 'Finland', latitude: 60.3172, longitude: 24.9633 },
    { iataCode: 'DUB', cityName: 'Dublin', countryName: 'Ireland', latitude: 53.4213, longitude: -6.2701 },
    // ── Global hubs ──
    { iataCode: 'DXB', cityName: 'Dubai', countryName: 'UAE', latitude: 25.2528, longitude: 55.3644 },
    { iataCode: 'JFK', cityName: 'New York', countryName: 'USA', latitude: 40.6413, longitude: -73.7781 },
    { iataCode: 'LAX', cityName: 'Los Angeles', countryName: 'USA', latitude: 33.9425, longitude: -118.4081 },
    { iataCode: 'BKK', cityName: 'Bangkok', countryName: 'Thailand', latitude: 13.6811, longitude: 100.7472 },
    { iataCode: 'SIN', cityName: 'Singapore', countryName: 'Singapore', latitude: 1.3644, longitude: 103.9915 },
    { iataCode: 'NRT', cityName: 'Tokyo', countryName: 'Japan', latitude: 35.7720, longitude: 140.3929 },
    { iataCode: 'HKG', cityName: 'Hong Kong', countryName: 'Hong Kong', latitude: 22.3080, longitude: 113.9185 },
];

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
