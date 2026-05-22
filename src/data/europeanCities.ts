/**
 * Curated list of major European cities used by the road-trip map picker.
 * `popular: true` cities render as larger emerald pins; the rest are smaller
 * secondary pins. `iata` is populated where there's a primary commercial
 * airport — the road-trip planner uses it to deep-link to /hotels/search
 * (Tripadvisor cityCode path) without an extra resolver round-trip.
 */

export interface EuropeanCity {
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  iata?: string;
  popular: boolean;
}

export const EUROPEAN_CITIES: EuropeanCity[] = [
  // ── Romania (origin home market) ────────────────────────────────────
  { name: 'Bucharest',    country: 'Romania',         countryCode: 'RO', lat: 44.4268, lng: 26.1025, iata: 'OTP', popular: true },
  { name: 'Cluj-Napoca',  country: 'Romania',         countryCode: 'RO', lat: 46.7712, lng: 23.6236, iata: 'CLJ', popular: true },
  { name: 'Timișoara',    country: 'Romania',         countryCode: 'RO', lat: 45.7489, lng: 21.2087, iata: 'TSR', popular: false },
  { name: 'Iași',         country: 'Romania',         countryCode: 'RO', lat: 47.1585, lng: 27.6014, iata: 'IAS', popular: false },
  { name: 'Brașov',       country: 'Romania',         countryCode: 'RO', lat: 45.6427, lng: 25.5887, popular: false },
  { name: 'Sibiu',        country: 'Romania',         countryCode: 'RO', lat: 45.7983, lng: 24.1256, iata: 'SBZ', popular: false },
  { name: 'Constanța',    country: 'Romania',         countryCode: 'RO', lat: 44.1598, lng: 28.6348, popular: false },

  // ── Balkans / Eastern Europe ────────────────────────────────────────
  { name: 'Sofia',        country: 'Bulgaria',        countryCode: 'BG', lat: 42.6977, lng: 23.3219, iata: 'SOF', popular: true },
  { name: 'Plovdiv',      country: 'Bulgaria',        countryCode: 'BG', lat: 42.1354, lng: 24.7453, popular: false },
  { name: 'Varna',        country: 'Bulgaria',        countryCode: 'BG', lat: 43.2141, lng: 27.9147, iata: 'VAR', popular: false },
  { name: 'Belgrade',     country: 'Serbia',          countryCode: 'RS', lat: 44.7866, lng: 20.4489, iata: 'BEG', popular: true },
  { name: 'Novi Sad',     country: 'Serbia',          countryCode: 'RS', lat: 45.2671, lng: 19.8335, popular: false },
  { name: 'Sarajevo',     country: 'Bosnia and Herzegovina', countryCode: 'BA', lat: 43.8563, lng: 18.4131, iata: 'SJJ', popular: false },
  { name: 'Skopje',       country: 'North Macedonia', countryCode: 'MK', lat: 41.9981, lng: 21.4254, iata: 'SKP', popular: false },
  { name: 'Tirana',       country: 'Albania',         countryCode: 'AL', lat: 41.3275, lng: 19.8187, iata: 'TIA', popular: false },
  { name: 'Podgorica',    country: 'Montenegro',      countryCode: 'ME', lat: 42.4304, lng: 19.2594, popular: false },
  { name: 'Pristina',     country: 'Kosovo',          countryCode: 'XK', lat: 42.6629, lng: 21.1655, iata: 'PRN', popular: false },

  // ── Greece ──────────────────────────────────────────────────────────
  { name: 'Athens',       country: 'Greece',          countryCode: 'GR', lat: 37.9838, lng: 23.7275, iata: 'ATH', popular: true },
  { name: 'Thessaloniki', country: 'Greece',          countryCode: 'GR', lat: 40.6401, lng: 22.9444, iata: 'SKG', popular: true },

  // ── Turkey ──────────────────────────────────────────────────────────
  { name: 'Istanbul',     country: 'Turkey',          countryCode: 'TR', lat: 41.0082, lng: 28.9784, iata: 'IST', popular: true },
  { name: 'Ankara',       country: 'Turkey',          countryCode: 'TR', lat: 39.9334, lng: 32.8597, iata: 'ESB', popular: false },

  // ── Central Europe ──────────────────────────────────────────────────
  { name: 'Budapest',     country: 'Hungary',         countryCode: 'HU', lat: 47.4979, lng: 19.0402, iata: 'BUD', popular: true },
  { name: 'Vienna',       country: 'Austria',         countryCode: 'AT', lat: 48.2082, lng: 16.3738, iata: 'VIE', popular: true },
  { name: 'Salzburg',     country: 'Austria',         countryCode: 'AT', lat: 47.8095, lng: 13.0550, popular: false },
  { name: 'Innsbruck',    country: 'Austria',         countryCode: 'AT', lat: 47.2692, lng: 11.4041, popular: false },
  { name: 'Bratislava',   country: 'Slovakia',        countryCode: 'SK', lat: 48.1486, lng: 17.1077, iata: 'BTS', popular: false },
  { name: 'Prague',       country: 'Czech Republic',  countryCode: 'CZ', lat: 50.0755, lng: 14.4378, iata: 'PRG', popular: true },
  { name: 'Brno',         country: 'Czech Republic',  countryCode: 'CZ', lat: 49.1951, lng: 16.6068, popular: false },
  { name: 'Warsaw',       country: 'Poland',          countryCode: 'PL', lat: 52.2297, lng: 21.0122, iata: 'WAW', popular: true },
  { name: 'Krakow',       country: 'Poland',          countryCode: 'PL', lat: 50.0647, lng: 19.9450, iata: 'KRK', popular: true },
  { name: 'Gdańsk',       country: 'Poland',          countryCode: 'PL', lat: 54.3520, lng: 18.6466, iata: 'GDN', popular: false },
  { name: 'Wrocław',      country: 'Poland',          countryCode: 'PL', lat: 51.1079, lng: 17.0385, iata: 'WRO', popular: false },

  // ── DACH ────────────────────────────────────────────────────────────
  { name: 'Berlin',       country: 'Germany',         countryCode: 'DE', lat: 52.5200, lng: 13.4050, iata: 'BER', popular: true },
  { name: 'Munich',       country: 'Germany',         countryCode: 'DE', lat: 48.1351, lng: 11.5820, iata: 'MUC', popular: true },
  { name: 'Frankfurt',    country: 'Germany',         countryCode: 'DE', lat: 50.1109, lng: 8.6821,  iata: 'FRA', popular: true },
  { name: 'Hamburg',      country: 'Germany',         countryCode: 'DE', lat: 53.5511, lng: 9.9937,  iata: 'HAM', popular: false },
  { name: 'Cologne',      country: 'Germany',         countryCode: 'DE', lat: 50.9375, lng: 6.9603,  iata: 'CGN', popular: false },
  { name: 'Stuttgart',    country: 'Germany',         countryCode: 'DE', lat: 48.7758, lng: 9.1829,  iata: 'STR', popular: false },
  { name: 'Dresden',      country: 'Germany',         countryCode: 'DE', lat: 51.0504, lng: 13.7373, popular: false },
  { name: 'Zurich',       country: 'Switzerland',     countryCode: 'CH', lat: 47.3769, lng: 8.5417,  iata: 'ZRH', popular: true },
  { name: 'Geneva',       country: 'Switzerland',     countryCode: 'CH', lat: 46.2044, lng: 6.1432,  iata: 'GVA', popular: false },
  { name: 'Bern',         country: 'Switzerland',     countryCode: 'CH', lat: 46.9480, lng: 7.4474,  popular: false },

  // ── Italy ───────────────────────────────────────────────────────────
  { name: 'Rome',         country: 'Italy',           countryCode: 'IT', lat: 41.9028, lng: 12.4964, iata: 'FCO', popular: true },
  { name: 'Milan',        country: 'Italy',           countryCode: 'IT', lat: 45.4642, lng: 9.1900,  iata: 'MXP', popular: true },
  { name: 'Venice',       country: 'Italy',           countryCode: 'IT', lat: 45.4408, lng: 12.3155, iata: 'VCE', popular: true },
  { name: 'Florence',     country: 'Italy',           countryCode: 'IT', lat: 43.7696, lng: 11.2558, iata: 'FLR', popular: true },
  { name: 'Naples',       country: 'Italy',           countryCode: 'IT', lat: 40.8518, lng: 14.2681, iata: 'NAP', popular: false },
  { name: 'Bologna',      country: 'Italy',           countryCode: 'IT', lat: 44.4949, lng: 11.3426, iata: 'BLQ', popular: false },
  { name: 'Verona',       country: 'Italy',           countryCode: 'IT', lat: 45.4384, lng: 10.9916, popular: false },
  { name: 'Turin',        country: 'Italy',           countryCode: 'IT', lat: 45.0703, lng: 7.6869,  iata: 'TRN', popular: false },

  // ── Iberia ──────────────────────────────────────────────────────────
  { name: 'Madrid',       country: 'Spain',           countryCode: 'ES', lat: 40.4168, lng: -3.7038, iata: 'MAD', popular: true },
  { name: 'Barcelona',    country: 'Spain',           countryCode: 'ES', lat: 41.3851, lng: 2.1734,  iata: 'BCN', popular: true },
  { name: 'Seville',      country: 'Spain',           countryCode: 'ES', lat: 37.3891, lng: -5.9845, iata: 'SVQ', popular: false },
  { name: 'Valencia',     country: 'Spain',           countryCode: 'ES', lat: 39.4699, lng: -0.3763, iata: 'VLC', popular: false },
  { name: 'Bilbao',       country: 'Spain',           countryCode: 'ES', lat: 43.2630, lng: -2.9350, iata: 'BIO', popular: false },
  { name: 'Lisbon',       country: 'Portugal',        countryCode: 'PT', lat: 38.7223, lng: -9.1393, iata: 'LIS', popular: true },
  { name: 'Porto',        country: 'Portugal',        countryCode: 'PT', lat: 41.1579, lng: -8.6291, iata: 'OPO', popular: false },

  // ── France & Benelux ────────────────────────────────────────────────
  { name: 'Paris',        country: 'France',          countryCode: 'FR', lat: 48.8566, lng: 2.3522,  iata: 'CDG', popular: true },
  { name: 'Lyon',         country: 'France',          countryCode: 'FR', lat: 45.7640, lng: 4.8357,  iata: 'LYS', popular: false },
  { name: 'Marseille',    country: 'France',          countryCode: 'FR', lat: 43.2965, lng: 5.3698,  iata: 'MRS', popular: false },
  { name: 'Nice',         country: 'France',          countryCode: 'FR', lat: 43.7102, lng: 7.2620,  iata: 'NCE', popular: false },
  { name: 'Bordeaux',     country: 'France',          countryCode: 'FR', lat: 44.8378, lng: -0.5792, iata: 'BOD', popular: false },
  { name: 'Strasbourg',   country: 'France',          countryCode: 'FR', lat: 48.5734, lng: 7.7521,  popular: false },
  { name: 'Brussels',     country: 'Belgium',         countryCode: 'BE', lat: 50.8503, lng: 4.3517,  iata: 'BRU', popular: true },
  { name: 'Antwerp',      country: 'Belgium',         countryCode: 'BE', lat: 51.2194, lng: 4.4025,  popular: false },
  { name: 'Amsterdam',    country: 'Netherlands',     countryCode: 'NL', lat: 52.3676, lng: 4.9041,  iata: 'AMS', popular: true },
  { name: 'Rotterdam',    country: 'Netherlands',     countryCode: 'NL', lat: 51.9244, lng: 4.4777,  popular: false },
  { name: 'Luxembourg',   country: 'Luxembourg',      countryCode: 'LU', lat: 49.6116, lng: 6.1319,  iata: 'LUX', popular: false },

  // ── British Isles ───────────────────────────────────────────────────
  { name: 'London',       country: 'United Kingdom', countryCode: 'GB', lat: 51.5074, lng: -0.1278, iata: 'LHR', popular: true },
  { name: 'Manchester',   country: 'United Kingdom', countryCode: 'GB', lat: 53.4808, lng: -2.2426, iata: 'MAN', popular: false },
  { name: 'Edinburgh',    country: 'United Kingdom', countryCode: 'GB', lat: 55.9533, lng: -3.1883, iata: 'EDI', popular: false },
  { name: 'Dublin',       country: 'Ireland',         countryCode: 'IE', lat: 53.3498, lng: -6.2603, iata: 'DUB', popular: true },

  // ── Nordics ─────────────────────────────────────────────────────────
  { name: 'Copenhagen',   country: 'Denmark',         countryCode: 'DK', lat: 55.6761, lng: 12.5683, iata: 'CPH', popular: true },
  { name: 'Stockholm',    country: 'Sweden',          countryCode: 'SE', lat: 59.3293, lng: 18.0686, iata: 'ARN', popular: true },
  { name: 'Gothenburg',   country: 'Sweden',          countryCode: 'SE', lat: 57.7089, lng: 11.9746, iata: 'GOT', popular: false },
  { name: 'Oslo',         country: 'Norway',          countryCode: 'NO', lat: 59.9139, lng: 10.7522, iata: 'OSL', popular: true },
  { name: 'Bergen',       country: 'Norway',          countryCode: 'NO', lat: 60.3913, lng: 5.3221,  iata: 'BGO', popular: false },
  { name: 'Helsinki',     country: 'Finland',         countryCode: 'FI', lat: 60.1699, lng: 24.9384, iata: 'HEL', popular: true },
  { name: 'Reykjavik',    country: 'Iceland',         countryCode: 'IS', lat: 64.1466, lng: -21.9426, iata: 'KEF', popular: false },

  // ── Croatia / Slovenia ──────────────────────────────────────────────
  { name: 'Zagreb',       country: 'Croatia',         countryCode: 'HR', lat: 45.8150, lng: 15.9819, iata: 'ZAG', popular: true },
  { name: 'Split',        country: 'Croatia',         countryCode: 'HR', lat: 43.5081, lng: 16.4402, iata: 'SPU', popular: true },
  { name: 'Dubrovnik',    country: 'Croatia',         countryCode: 'HR', lat: 42.6507, lng: 18.0944, iata: 'DBV', popular: true },
  { name: 'Rijeka',       country: 'Croatia',         countryCode: 'HR', lat: 45.3271, lng: 14.4422, popular: false },
  { name: 'Ljubljana',    country: 'Slovenia',        countryCode: 'SI', lat: 46.0569, lng: 14.5058, iata: 'LJU', popular: false },

  // ── Baltics ─────────────────────────────────────────────────────────
  { name: 'Tallinn',      country: 'Estonia',         countryCode: 'EE', lat: 59.4370, lng: 24.7536, iata: 'TLL', popular: false },
  { name: 'Riga',         country: 'Latvia',          countryCode: 'LV', lat: 56.9496, lng: 24.1052, iata: 'RIX', popular: false },
  { name: 'Vilnius',      country: 'Lithuania',       countryCode: 'LT', lat: 54.6872, lng: 25.2797, iata: 'VNO', popular: false },
];

export function findCityByName(name: string): EuropeanCity | undefined {
  const lower = name.trim().toLowerCase();
  return EUROPEAN_CITIES.find((c) => c.name.toLowerCase() === lower);
}
