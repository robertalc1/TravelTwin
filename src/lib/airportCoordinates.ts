export interface AirportCoord {
  lat: number;
  lng: number;
  name: string;
  city: string;
}

export const AIRPORT_COORDINATES: Record<string, AirportCoord> = {
  OTP: { lat: 44.5711, lng: 26.0850, name: 'Henri Coandă International', city: 'Bucharest' },
  CLJ: { lat: 46.7852, lng: 23.6862, name: 'Avram Iancu Cluj', city: 'Cluj-Napoca' },
  TSR: { lat: 45.8099, lng: 21.3379, name: 'Traian Vuia Timișoara', city: 'Timișoara' },
  IAS: { lat: 47.1786, lng: 27.6206, name: 'Iași International', city: 'Iași' },
  SBZ: { lat: 45.7856, lng: 24.0913, name: 'Sibiu International', city: 'Sibiu' },
  IST: { lat: 41.2753, lng: 28.7519, name: 'Istanbul Airport', city: 'Istanbul' },
  SAW: { lat: 40.8985, lng: 29.3090, name: 'Sabiha Gökçen', city: 'Istanbul' },
  CDG: { lat: 49.0097, lng: 2.5479, name: 'Charles de Gaulle', city: 'Paris' },
  ORY: { lat: 48.7233, lng: 2.3794, name: 'Paris Orly', city: 'Paris' },
  LHR: { lat: 51.4700, lng: -0.4543, name: 'Heathrow', city: 'London' },
  LGW: { lat: 51.1537, lng: -0.1821, name: 'Gatwick', city: 'London' },
  STN: { lat: 51.8860, lng: 0.2389, name: 'Stansted', city: 'London' },
  FCO: { lat: 41.8045, lng: 12.2508, name: 'Fiumicino', city: 'Rome' },
  CIA: { lat: 41.7994, lng: 12.5949, name: 'Ciampino', city: 'Rome' },
  BCN: { lat: 41.2974, lng: 2.0833, name: 'El Prat', city: 'Barcelona' },
  AMS: { lat: 52.3105, lng: 4.7683, name: 'Schiphol', city: 'Amsterdam' },
  FRA: { lat: 50.0379, lng: 8.5622, name: 'Frankfurt Main', city: 'Frankfurt' },
  MAD: { lat: 40.4983, lng: -3.5676, name: 'Barajas', city: 'Madrid' },
  ATH: { lat: 37.9364, lng: 23.9445, name: 'Eleftherios Venizelos', city: 'Athens' },
  DXB: { lat: 25.2532, lng: 55.3657, name: 'Dubai International', city: 'Dubai' },
  JFK: { lat: 40.6413, lng: -73.7781, name: 'JFK International', city: 'New York' },
  LIS: { lat: 38.7813, lng: -9.1359, name: 'Humberto Delgado', city: 'Lisbon' },
  PRG: { lat: 50.1008, lng: 14.2632, name: 'Václav Havel', city: 'Prague' },
  VIE: { lat: 48.1103, lng: 16.5697, name: 'Vienna International', city: 'Vienna' },
  BUD: { lat: 47.4369, lng: 19.2556, name: 'Ferenc Liszt', city: 'Budapest' },
  WAW: { lat: 52.1657, lng: 20.9671, name: 'Chopin Warsaw', city: 'Warsaw' },
  BER: { lat: 52.3667, lng: 13.5033, name: 'Berlin Brandenburg', city: 'Berlin' },
  CPH: { lat: 55.6181, lng: 12.6561, name: 'Copenhagen', city: 'Copenhagen' },
  MXP: { lat: 45.6306, lng: 8.7281, name: 'Milan Malpensa', city: 'Milan' },
  NRT: { lat: 35.7720, lng: 140.3929, name: 'Narita', city: 'Tokyo' },
};

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  IST: { lat: 41.0082, lng: 28.9784 },
  PAR: { lat: 48.8566, lng: 2.3522 },
  LON: { lat: 51.5074, lng: -0.1278 },
  ROM: { lat: 41.9028, lng: 12.4964 },
  BCN: { lat: 41.3851, lng: 2.1734 },
  AMS: { lat: 52.3676, lng: 4.9041 },
  MAD: { lat: 40.4168, lng: -3.7038 },
  ATH: { lat: 37.9838, lng: 23.7275 },
  BUH: { lat: 44.4268, lng: 26.1025 },
  DXB: { lat: 25.2048, lng: 55.2708 },
  LIS: { lat: 38.7223, lng: -9.1393 },
  PRG: { lat: 50.0755, lng: 14.4378 },
  VIE: { lat: 48.2082, lng: 16.3738 },
  BUD: { lat: 47.4979, lng: 19.0402 },
  WAW: { lat: 52.2297, lng: 21.0122 },
  BER: { lat: 52.5200, lng: 13.4050 },
  CPH: { lat: 55.6761, lng: 12.5683 },
  MIL: { lat: 45.4642, lng: 9.1900 },
  NYC: { lat: 40.7128, lng: -74.0060 },
  TYO: { lat: 35.6762, lng: 139.6503 },
};

export function getAirportCoord(iata: string): AirportCoord | undefined {
  return AIRPORT_COORDINATES[iata.toUpperCase()];
}

// Airport IATA → city IATA (Amadeus-style 3-letter city code).
// Most airports double as the city code (BCN, AMS, ATH, IST...) — only multi-airport
// metros need an entry here.
export const IATA_TO_CITY_CODE: Record<string, string> = {
  // Paris
  CDG: 'PAR', ORY: 'PAR', BVA: 'PAR', LBG: 'PAR',
  // London
  LHR: 'LON', LGW: 'LON', STN: 'LON', LTN: 'LON', LCY: 'LON', SEN: 'LON',
  // Rome
  FCO: 'ROM', CIA: 'ROM',
  // Milan
  MXP: 'MIL', LIN: 'MIL', BGY: 'MIL',
  // Istanbul
  IST: 'IST', SAW: 'IST',
  // Tokyo
  NRT: 'TYO', HND: 'TYO',
  // New York
  JFK: 'NYC', LGA: 'NYC', EWR: 'NYC',
  // Stockholm
  ARN: 'STO', BMA: 'STO', NYO: 'STO',
  // Bucharest
  OTP: 'BUH', BBU: 'BUH',
  // Moscow
  SVO: 'MOW', DME: 'MOW', VKO: 'MOW',
  // Washington
  IAD: 'WAS', DCA: 'WAS', BWI: 'WAS',
  // Berlin
  BER: 'BER', SXF: 'BER', TXL: 'BER',
};

/**
 * Resolve an airport IATA into a city IATA (Amadeus city code).
 * Returns the input unchanged when no mapping is known — works correctly
 * for cities whose airport and city codes coincide (BCN, ATH, MAD, etc.).
 */
export function iataToCityCode(iata: string | undefined | null): string {
  if (!iata) return '';
  const upper = iata.toUpperCase();
  return IATA_TO_CITY_CODE[upper] ?? upper;
}

/**
 * Haversine distance (km) between two lat/lng points.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
