/* ── Tripadvisor → app normalizers ─────────────────────────────
   Pure functions that convert Tripadvisor16 response shapes into
   the app's NormalizedFlight / NormalizedHotel / LocationResult
   types. Network-free, easy to unit test.
─────────────────────────────────────────────────────────────── */

import type { TAFlight, TAHotel, TALocation } from './tripadvisor-client';
import { extractFlightPrice } from './tripadvisor-client';
import { getCityFromIata, getCountryFromIata } from './iataMapping';
import { AIRLINE_NAMES } from './commonRoutes';
import { convertAmount, FALLBACK_RATES } from './currencyService';
import type {
  NormalizedFlight,
  NormalizedHotel,
  LocationResult,
} from './supabase/types';

/**
 * Convert any amount in any supported currency to EUR using the static
 * fallback rate snapshot. Server-side conversion is intentionally coarse —
 * the frontend re-converts to the user's display currency with live rates.
 */
function toEur(amount: number, fromCurrency: string): number {
  if (!amount || fromCurrency === 'EUR') return amount;
  return convertAmount(amount, fromCurrency, 'EUR', FALLBACK_RATES);
}

/** Convert minutes → ISO 8601 duration string compatible with formatDuration */
export function minutesToISO8601(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return 'PT0H0M';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `PT${h}H${m.toString().padStart(2, '0')}M`;
}

/** Parse "$1,245" / "€245" / "245 EUR" → 245. Returns 0 when no number. */
export function parsePriceForDisplay(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function detectCurrency(s: string): string {
  if (!s) return 'EUR';
  if (s.includes('€')) return 'EUR';
  if (s.includes('$')) return 'USD';
  if (s.includes('£')) return 'GBP';
  if (/eur/i.test(s)) return 'EUR';
  if (/usd/i.test(s)) return 'USD';
  if (/gbp/i.test(s)) return 'GBP';
  return 'EUR';
}

/**
 * Convert a Tripadvisor flight to NormalizedFlight.
 * Returns null when no usable price exists (strict mode — per project decision).
 */
export function normalizeFlight(
  f: TAFlight,
  origin: string,
  destination: string,
  travelClass: string,
): NormalizedFlight | null {
  const pricing = extractFlightPrice(f);
  if (!pricing) return null;

  const segments = f.segments || [];
  const allLegs = segments.flatMap((s) => s.legs);
  if (allLegs.length === 0) return null;

  const first = allLegs[0];
  const last = allLegs[allLegs.length - 1];

  const totalMinutes = allLegs.reduce(
    (acc, l) => acc + (l.durationInMinutes || 0) + (l.stopoverInMinutes || 0),
    0,
  );

  const stops = Math.max(0, allLegs.length - 1);
  const airlineCode = first.marketingCarrier?.code || '';
  const airlineName =
    AIRLINE_NAMES[airlineCode] ||
    first.marketingCarrier?.displayName ||
    airlineCode;

  const departureDate = (first.departureDateTime || '').split('T')[0] || '';
  const arrivalDate = (last.arrivalDateTime || '').split('T')[0] || '';
  const departureTime =
    (first.departureDateTime || '').split('T')[1]?.substring(0, 5) || '';
  const arrivalTime =
    (last.arrivalDateTime || '').split('T')[1]?.substring(0, 5) || '';

  // Always normalize to EUR so downstream consumers don't have to track
  // per-record currency — frontend re-converts to user's display currency.
  const priceEur = Math.round(toEur(pricing.price, pricing.currency) * 100) / 100;

  return {
    id: `ta-${airlineCode}-${origin}-${destination}-${departureDate}-${departureTime}`,
    origin: origin.toUpperCase(),
    originCity: getCityFromIata(origin),
    destination: destination.toUpperCase(),
    destinationCity: getCityFromIata(destination),
    departureDate,
    arrivalDate,
    departureTime,
    arrivalTime,
    duration: minutesToISO8601(totalMinutes),
    stops,
    airline: airlineCode,
    airlineName,
    price: priceEur,
    currency: 'EUR',
    travelClass: (travelClass || 'ECONOMY').toUpperCase(),
    source: 'live',
    lastUpdated: new Date().toISOString(),
    bookingLink: pricing.bookingLink,
  };
}

/**
 * Convert a Tripadvisor hotel result to NormalizedHotel.
 * Always returns a hotel (with sensible defaults) — caller can filter by price.
 */
export function normalizeHotel(
  h: TAHotel,
  cityCode: string,
  checkIn: string,
  checkOut: string,
): NormalizedHotel {
  const priceStr = h.priceForDisplay || h.strikethroughPrice || '';
  const totalOrNightly = parsePriceForDisplay(priceStr);
  const sourceCurrency = detectCurrency(priceStr);

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
    ),
  );

  const detailsLower = (h.priceDetails || '').toLowerCase();
  const isPerNight = detailsLower.includes('per night') || detailsLower.includes('/ night');
  // Convert from whatever currency Tripadvisor returned (often USD for non-EU
  // properties despite our currencyCode=EUR request) into EUR.
  const totalOrNightlyEur = toEur(totalOrNightly, sourceCurrency);
  const pricePerNight = isPerNight
    ? Math.round(totalOrNightlyEur * 100) / 100
    : Math.round((totalOrNightlyEur / nights) * 100) / 100;
  const totalPrice = Math.round(pricePerNight * nights * 100) / 100;

  const ratingFloat = h.bubbleRating?.rating ?? 0;
  const stars = Math.max(1, Math.min(5, Math.round(ratingFloat)));

  const address = h.secondaryInfo || h.primaryInfo || '';
  const amenities = (h.amenities || []).slice(0, 6);

  return {
    id: h.id || crypto.randomUUID(),
    name: h.title || 'Hotel',
    cityCode: cityCode.toUpperCase(),
    cityName: getCityFromIata(cityCode),
    address,
    rating: stars,
    pricePerNight,
    totalPrice,
    currency: 'EUR',
    roomType: 'Standard Room',
    amenities,
    cancellationPolicy: 'Check provider for cancellation terms',
    source: 'live',
    lastUpdated: new Date().toISOString(),
  };
}

/** Convert a Tripadvisor airport result to LocationResult */
export function normalizeLocation(l: TALocation): LocationResult {
  const iata = l.airportCode || l.iataCode || '';
  const name = l.airportName || l.name || l.cityName || iata;
  const cityName = l.cityName || l.title || name;
  const countryName = getCountryFromIata(iata) || l.secondaryText || '';

  return {
    iataCode: iata,
    name,
    cityName,
    countryName,
    type: 'AIRPORT',
  };
}
