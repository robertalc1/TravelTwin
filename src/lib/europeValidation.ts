/**
 * ISO 3166-1 alpha-2 country codes considered "European" for the road-trip
 * planner. Includes EU, Schengen, UK, Balkans, Turkey, Russia and Ukraine —
 * anywhere a continental road/rail/bus route is conceivable. Used as a
 * safety net after Google geocoding to reject impossible trips
 * (e.g. Bucharest → New York) before we waste a Directions API call.
 */

export const EUROPEAN_COUNTRY_CODES = new Set<string>([
  'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE',
  'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU',
  'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM',
  'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR', 'UA', 'GB', 'VA', 'XK',
]);

export function isEuropean(countryCode: string | undefined | null): boolean {
  if (!countryCode) return false;
  return EUROPEAN_COUNTRY_CODES.has(countryCode.toUpperCase());
}
