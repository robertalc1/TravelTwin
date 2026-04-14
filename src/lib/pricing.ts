/* ── Realistic Travel Pricing Estimator ────────────────────────
   Used when live APIs (Amadeus) return null, sandbox stubs, or
   unrealistic values. Everything is calculated from real-world
   geography so the UI never shows "Bali 2h30m direct 261€" again.
─────────────────────────────────────────────────────────────── */

/** Airport coordinates for all destinations used in the app */
const AIRPORT_COORDS: Record<string, { lat: number; lon: number }> = {
    // Romania
    OTP: { lat: 44.5711, lon: 26.085 },
    CLJ: { lat: 46.7852, lon: 23.6862 },
    TSR: { lat: 45.8099, lon: 21.3379 },
    IAS: { lat: 47.1785, lon: 27.6206 },
    SBZ: { lat: 45.7856, lon: 24.0914 },
    CND: { lat: 44.3622, lon: 28.4883 },
    // Europe
    LHR: { lat: 51.47, lon: -0.4543 },
    LGW: { lat: 51.1481, lon: -0.1903 },
    STN: { lat: 51.885, lon: 0.235 },
    CDG: { lat: 49.0097, lon: 2.5479 },
    ORY: { lat: 48.7233, lon: 2.3794 },
    FCO: { lat: 41.8003, lon: 12.2389 },
    MXP: { lat: 45.6306, lon: 8.7281 },
    BCN: { lat: 41.2974, lon: 2.0833 },
    MAD: { lat: 40.4983, lon: -3.5676 },
    AMS: { lat: 52.3105, lon: 4.7683 },
    BER: { lat: 52.3667, lon: 13.5033 },
    FRA: { lat: 50.0379, lon: 8.5622 },
    MUC: { lat: 48.3538, lon: 11.7861 },
    VIE: { lat: 48.1103, lon: 16.5697 },
    PRG: { lat: 50.1008, lon: 14.26 },
    BUD: { lat: 47.4369, lon: 19.2556 },
    WAW: { lat: 52.1657, lon: 20.9671 },
    KRK: { lat: 50.0777, lon: 19.7848 },
    LIS: { lat: 38.7742, lon: -9.1342 },
    OPO: { lat: 41.2481, lon: -8.6814 },
    DUB: { lat: 53.4213, lon: -6.2701 },
    CPH: { lat: 55.6181, lon: 12.6561 },
    ARN: { lat: 59.6519, lon: 17.9186 },
    OSL: { lat: 60.1975, lon: 11.1004 },
    HEL: { lat: 60.3172, lon: 24.9633 },
    ZRH: { lat: 47.4647, lon: 8.5492 },
    BRU: { lat: 50.9014, lon: 4.4844 },
    ATH: { lat: 37.9364, lon: 23.9475 },
    JTR: { lat: 36.3992, lon: 25.4793 },
    HER: { lat: 35.3397, lon: 25.1803 },
    SOF: { lat: 42.6952, lon: 23.4114 },
    BEG: { lat: 44.8184, lon: 20.3091 },
    SPU: { lat: 43.5389, lon: 16.298 },
    DBV: { lat: 42.5614, lon: 18.2683 },
    TFS: { lat: 28.0444, lon: -16.5725 },
    AGP: { lat: 36.675, lon: -4.4992 },
    // Turkey / Middle East
    IST: { lat: 41.2753, lon: 28.7519 },
    SAW: { lat: 40.8986, lon: 29.3092 },
    AYT: { lat: 36.8987, lon: 30.8005 },
    DXB: { lat: 25.2528, lon: 55.3644 },
    AUH: { lat: 24.4331, lon: 54.6511 },
    // Africa
    RAK: { lat: 31.6069, lon: -8.0363 },
    CAI: { lat: 30.1114, lon: 31.4139 },
    // Asia
    BKK: { lat: 13.69, lon: 100.7501 },
    DPS: { lat: -8.7482, lon: 115.1675 }, // Bali
    NRT: { lat: 35.7647, lon: 140.3864 },
    HND: { lat: 35.5494, lon: 139.7798 },
    SIN: { lat: 1.3644, lon: 103.9915 },
    HKG: { lat: 22.308, lon: 113.9185 },
    // Americas
    JFK: { lat: 40.6413, lon: -73.7781 },
    EWR: { lat: 40.6895, lon: -74.1745 },
    LAX: { lat: 33.9416, lon: -118.4085 },
    MIA: { lat: 25.7959, lon: -80.287 },
    YYZ: { lat: 43.6777, lon: -79.6248 },
};

export function getAirportCoords(iata: string): { lat: number; lon: number } | null {
    return AIRPORT_COORDS[iata?.toUpperCase()] || null;
}

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

/** Distance between two airports by IATA */
export function distanceBetweenIata(fromIata: string, toIata: string): number | null {
    const a = getAirportCoords(fromIata);
    const b = getAirportCoords(toIata);
    if (!a || !b) return null;
    return haversineKm(a.lat, a.lon, b.lat, b.lon);
}

/** Realistic round-trip flight price per person, in EUR, based on distance */
export function estimateFlightPrice(distanceKm: number): number {
    if (distanceKm <= 0) return 0;
    // Short haul (<500 km) — regional routes
    if (distanceKm < 500) return Math.round(60 + distanceKm * 0.08);
    // Short-medium (500–1500 km) — budget airlines zone
    if (distanceKm < 1500) return Math.round(90 + distanceKm * 0.09);
    // Medium haul (1500–3500 km) — typical European long
    if (distanceKm < 3500) return Math.round(180 + distanceKm * 0.11);
    // Long haul (3500–7000 km) — transatlantic / Middle East
    if (distanceKm < 7000) return Math.round(420 + distanceKm * 0.09);
    // Ultra long haul (>7000 km) — Asia / Oceania
    return Math.round(700 + distanceKm * 0.09);
}

/** Realistic flight duration in hours, approximate */
export function estimateFlightDuration(distanceKm: number): { hours: number; minutes: number; iso: string } {
    const hours = distanceKm / 800 + 0.5; // 800 km/h cruise + 30 min ground
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return { hours: h, minutes: m, iso: `PT${h}H${m}M` };
}

/** Number of realistic stops for a route */
export function estimateStops(distanceKm: number): number {
    if (distanceKm < 3500) return 0;   // direct
    if (distanceKm < 7000) return 1;   // usually 1 stop
    return 1;                            // 1-2 stops; we'll say 1 to be optimistic
}

/** Realistic per-night hotel cost per destination, in EUR */
const HOTEL_NIGHTLY_EUR: Record<string, number> = {
    // Cheap
    IST: 45, SOF: 40, BEG: 40, BUD: 55, PRG: 60, KRK: 50, WAW: 55,
    ATH: 55, BKK: 35, RAK: 40, CAI: 35, AYT: 50, DPS: 40,
    SAW: 45,
    // Mid
    LIS: 65, OPO: 60, BCN: 75, MAD: 70, FCO: 75, MXP: 70, VIE: 75,
    BER: 65, JTR: 95, HER: 65, DBV: 80, SPU: 70, TFS: 70, AGP: 65,
    // Higher
    AMS: 95, CDG: 100, ORY: 95, LHR: 110, LGW: 100, STN: 85,
    FRA: 90, MUC: 95, BRU: 85, DUB: 90,
    // Expensive
    CPH: 105, ARN: 95, OSL: 110, HEL: 95, ZRH: 130, GVA: 125,
    DXB: 115, AUH: 110,
    // Very expensive
    JFK: 165, EWR: 145, LAX: 155, MIA: 135, YYZ: 130,
    NRT: 95, HND: 100, SIN: 125, HKG: 115,
};

/** Round-trip flight + multi-night hotel estimate from A to B */
export interface PriceEstimate {
    distanceKm: number;
    flightRoundTrip: number;
    hotelPerNight: number;
    hotelTotal: number;
    activitiesBudget: number;
    total: number;
    durationISO: string;
    durationHours: number;
    durationMinutes: number;
    stops: number;
    withinBudget: boolean;
}

export function estimateTripPrice(
    fromIata: string,
    toIata: string,
    nights: number,
    budget: number
): PriceEstimate | null {
    const distance = distanceBetweenIata(fromIata, toIata);
    if (distance === null || distance < 50) return null;

    const flightRoundTrip = estimateFlightPrice(distance);
    const hotelPerNight = HOTEL_NIGHTLY_EUR[toIata.toUpperCase()] || 70;
    const hotelTotal = hotelPerNight * nights;
    const activitiesBudget = Math.round(25 * nights); // modest daily activities
    const total = flightRoundTrip + hotelTotal + activitiesBudget;
    const duration = estimateFlightDuration(distance);
    const stops = estimateStops(distance);

    return {
        distanceKm: Math.round(distance),
        flightRoundTrip,
        hotelPerNight,
        hotelTotal,
        activitiesBudget,
        total,
        durationISO: duration.iso,
        durationHours: duration.hours,
        durationMinutes: duration.minutes,
        stops,
        withinBudget: total <= budget,
    };
}

/** Typical airline that serves a route — heuristic for presentation only */
export function pickAirlineForRoute(fromIata: string, toIata: string, distanceKm: number): string {
    // Romanian origins: Wizz for short/medium, Tarom for medium, turkish/lufthansa for connections
    const roOrigins = ['OTP', 'CLJ', 'TSR', 'IAS', 'SBZ', 'CND', 'BBU'];
    const isRomanian = roOrigins.includes(fromIata.toUpperCase());
    if (isRomanian) {
        if (distanceKm < 2500) return 'W6'; // Wizz Air
        if (distanceKm < 4500) return 'TK'; // Turkish Airlines (via IST)
        if (distanceKm < 8000) return 'LH'; // Lufthansa
        return 'QR'; // Qatar / long haul
    }
    if (distanceKm < 2000) return 'FR'; // Ryanair
    if (distanceKm < 5000) return 'LH';
    return 'EK'; // Emirates
}
