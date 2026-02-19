// Maps Brazilian city names from static data to IATA codes
export const CITY_TO_IATA: Record<string, string> = {
  'Sao Paulo (SP)': 'GRU',
  'Rio de Janeiro (RJ)': 'GIG',
  'Salvador (BH)': 'SSA',
  'Recife (PE)': 'REC',
  'Florianopolis (SC)': 'FLN',
  'Brasilia (DF)': 'BSB',
  'Natal (RN)': 'NAT',
  'Aracaju (SE)': 'AJU',
  'Campo Grande (MS)': 'CGR',
};

export const IATA_TO_CITY: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_TO_IATA).map(([city, iata]) => [iata, city])
);

// Extract just the city name (before parenthetical state code)
export function getCityName(fullName: string): string {
  return fullName.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// Get IATA code for a city name (tries exact match then fuzzy)
export function getIataCode(cityName: string): string | null {
  if (CITY_TO_IATA[cityName]) return CITY_TO_IATA[cityName];

  // Try matching by city name prefix
  const lower = cityName.toLowerCase();
  for (const [key, iata] of Object.entries(CITY_TO_IATA)) {
    if (key.toLowerCase().startsWith(lower) || lower.startsWith(getCityName(key).toLowerCase())) {
      return iata;
    }
  }
  return null;
}

// Get display city name from IATA code
export function getCityFromIata(iataCode: string): string {
  return IATA_TO_CITY[iataCode] || iataCode;
}

// Extract code like "SP" from "Sao Paulo (SP)"
export function extractStateCode(cityName: string): string {
  const match = cityName.match(/\(([^)]+)\)/);
  return match ? match[1] : cityName.substring(0, 3).toUpperCase();
}
