/* ── Tripadvisor16 RapidAPI Client ─────────────────────────────
   Replaces Amadeus as the primary live-data source for hotels and
   flights. All callers should import from this file, NOT from the
   Tripadvisor REST API directly.

   Free-tier quota: ~500 req/month. Aggressive caching + the
   sliding-window rate limiter in rateLimiter.ts protect the budget.
─────────────────────────────────────────────────────────────── */

import { getCached, setCache } from './cache';
import { getCityFromIata, getCountryFromIata } from './iataMapping';

const HOST = 'tripadvisor16.p.rapidapi.com';
const BASE = `https://${HOST}`;

/* ── Strict response types ───────────────────────────────────── */

export interface TAFlightLeg {
  originStationCode: string;
  destinationStationCode: string;
  departureDateTime: string;
  arrivalDateTime: string;
  durationInMinutes: number;
  marketingCarrier: { code: string; displayName: string };
  operatingCarrier?: { code: string; displayName: string };
  flightNumber?: string;
  isStopover?: boolean;
  stopoverInMinutes?: number;
}

export interface TAFlightSegment {
  legs: TAFlightLeg[];
}

export interface TAPurchaseLink {
  totalPrice?: number;
  totalPricePerPassenger?: number;
  currency?: string;
  partner?: string;
  url?: string;
}

export interface TAFlight {
  segments: TAFlightSegment[];
  purchaseLinks?: TAPurchaseLink[];
  priceForDisplay?: string;
}

export interface TAHotelPhoto {
  sizes?: { urlTemplate?: string };
}

export interface TAHotel {
  id: string;
  title?: string;
  primaryInfo?: string;
  secondaryInfo?: string;
  bubbleRating?: { count?: string; rating?: number };
  priceForDisplay?: string;
  strikethroughPrice?: string;
  priceDetails?: string;
  cardPhotos?: TAHotelPhoto[];
  amenities?: string[];
}

export interface TALocation {
  airportCode?: string;
  airportName?: string;
  cityName?: string;
  countryCode?: string;
  iataCode?: string;
  name?: string;
  title?: string;
  secondaryText?: string;
  geoId?: number | string;
  documentId?: string;
}

export interface TAInspiration {
  origin: string;
  destination: string;
  destinationCity: string;
  destinationCountry: string;
  price: number;
  currency: string;
  departureDate: string;
  returnDate: string;
  duration: number;
}

export interface TACarLocation {
  locationId: string;
  name: string;
  shortName?: string;
  cityName?: string;
  countryName?: string;
  searchHash?: string;
}

export interface TACar {
  id: string;
  vendor: string;
  vendorLogo?: string;
  vehicleType: string;
  transmission: string;
  airConditioning: boolean;
  seatCount: number;
  bagCount: number;
  doorCount: number;
  pictureUrl?: string;
  pricePerDay: number;
  totalPrice: number;
  currency: string;
  pickUpLocationName?: string;
  dropOffLocationName?: string;
  partner?: string;
  bookingUrl?: string;
}

/* ── Search input types ──────────────────────────────────────── */

export interface SearchFlightsParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: string;
  travelClass?: string;
}

export interface SearchHotelsParams {
  cityCode: string;
  checkIn: string;
  checkOut: string;
  adults?: string;
  rooms?: string;
}

/* ── Base fetch helper ───────────────────────────────────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function tripadvisorFetch<T>(
  path: string,
  params: Record<string, string | number>
): Promise<T> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY is not set');

  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': HOST,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Tripadvisor ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as T;
  return json;
}

/* ── Flights ─────────────────────────────────────────────────── */

export async function searchFlights(p: SearchFlightsParams): Promise<TAFlight[]> {
  const itineraryType = p.returnDate ? 'ROUND_TRIP' : 'ONE_WAY';
  const classOfService = (p.travelClass || 'ECONOMY').toUpperCase();

  const params: Record<string, string | number> = {
    sourceAirportCode: p.origin.toUpperCase(),
    destinationAirportCode: p.destination.toUpperCase(),
    date: p.departureDate,
    itineraryType,
    sortOrder: 'ML_BEST_VALUE',
    numAdults: p.adults || '1',
    classOfService,
    pageNumber: 1,
    currencyCode: 'EUR',
  };
  if (p.returnDate) params.returnDate = p.returnDate;

  const raw = await tripadvisorFetch<unknown>('/api/v1/flights/searchFlights', params);
  if (!isRecord(raw)) return [];
  const data = isRecord(raw.data) ? raw.data : raw;
  const flightsRaw = asArray((data as Record<string, unknown>).flights);

  const result: TAFlight[] = [];
  for (const f of flightsRaw) {
    if (!isRecord(f)) continue;
    const segments: TAFlightSegment[] = [];
    for (const s of asArray(f.segments)) {
      if (!isRecord(s)) continue;
      const legs: TAFlightLeg[] = [];
      for (const l of asArray(s.legs)) {
        if (!isRecord(l)) continue;
        const mc = isRecord(l.marketingCarrier) ? l.marketingCarrier : {};
        const oc = isRecord(l.operatingCarrier) ? l.operatingCarrier : undefined;
        legs.push({
          originStationCode: asString(l.originStationCode),
          destinationStationCode: asString(l.destinationStationCode),
          departureDateTime: asString(l.departureDateTime),
          arrivalDateTime: asString(l.arrivalDateTime),
          durationInMinutes: asNumber(l.durationInMinutes),
          marketingCarrier: {
            code: asString(mc.code),
            displayName: asString(mc.displayName),
          },
          operatingCarrier: oc
            ? { code: asString(oc.code), displayName: asString(oc.displayName) }
            : undefined,
          flightNumber: l.flightNumber ? asString(l.flightNumber) : undefined,
          isStopover: typeof l.isStopover === 'boolean' ? l.isStopover : false,
          stopoverInMinutes: asNumber(l.stopoverInMinutes),
        });
      }
      segments.push({ legs });
    }

    const purchaseLinks: TAPurchaseLink[] = [];
    for (const pl of asArray(f.purchaseLinks)) {
      if (!isRecord(pl)) continue;
      purchaseLinks.push({
        totalPrice: typeof pl.totalPrice === 'number' ? pl.totalPrice : asNumber(pl.totalPrice),
        totalPricePerPassenger:
          typeof pl.totalPricePerPassenger === 'number'
            ? pl.totalPricePerPassenger
            : asNumber(pl.totalPricePerPassenger),
        currency: asString(pl.currency),
        partner: asString(pl.partner),
        url: asString(pl.url),
      });
    }

    result.push({
      segments,
      purchaseLinks,
      priceForDisplay: f.priceForDisplay ? asString(f.priceForDisplay) : undefined,
    });
  }
  return result;
}

/**
 * Extract a usable price + booking link from a Tripadvisor flight result.
 * Returns null when no valid price is available (strict mode).
 */
export function extractFlightPrice(
  f: TAFlight
): { price: number; currency: string; bookingLink?: string } | null {
  if (f.purchaseLinks && f.purchaseLinks.length > 0) {
    const sorted = [...f.purchaseLinks].sort(
      (a, b) => (a.totalPricePerPassenger ?? a.totalPrice ?? Infinity) -
                 (b.totalPricePerPassenger ?? b.totalPrice ?? Infinity)
    );
    for (const pl of sorted) {
      const price = pl.totalPricePerPassenger ?? pl.totalPrice ?? 0;
      if (price > 0) {
        return {
          price: Math.round(price * 100) / 100,
          currency: pl.currency || 'EUR',
          bookingLink: pl.url || undefined,
        };
      }
    }
  }
  if (f.priceForDisplay) {
    const parsed = parseFloat(f.priceForDisplay.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      return { price: parsed, currency: 'EUR' };
    }
  }
  return null;
}

/* ── Hotels ──────────────────────────────────────────────────── */

/**
 * Resolve an IATA city code (or arbitrary city name) to a Tripadvisor geoId.
 * Caches the result for 30 days in the api_cache table to save quota.
 */
export async function getGeoIdForCity(cityCode: string): Promise<number | null> {
  const code = cityCode.toUpperCase();
  // v2 key: scoped query disambiguates ambiguous names (Sofia BG vs Soria ES,
  // Athens GR vs Athens GA, etc.). Old `geoId:${code}` entries are abandoned.
  const cacheKey = `geoId:v2:${code}`;
  const cached = await getCached(cacheKey);
  if (cached && typeof cached.data === 'number') return cached.data;

  const cityName = getCityFromIata(code) || code;
  const country = getCountryFromIata(code);
  const query = country ? `${cityName}, ${country}` : cityName;

  const raw = await tripadvisorFetch<unknown>('/api/v1/hotels/searchLocation', { query });
  if (!isRecord(raw)) return null;
  const items = asArray((raw as Record<string, unknown>).data).filter(isRecord);

  const countryLower = country.toLowerCase();
  const preferred =
    (countryLower
      ? items.find((it) => asString(it.secondaryText).toLowerCase().includes(countryLower))
      : undefined) || items[0];
  if (!preferred) return null;

  const gid = preferred.geoId;
  const numeric =
    typeof gid === 'number' ? gid : typeof gid === 'string' ? parseInt(gid, 10) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  await setCache(cacheKey, numeric, 60 * 24 * 30); // 30 days
  return numeric;
}

export async function searchHotelsByCity(p: SearchHotelsParams): Promise<TAHotel[]> {
  const geoId = await getGeoIdForCity(p.cityCode);
  if (!geoId) return [];

  const raw = await tripadvisorFetch<unknown>('/api/v1/hotels/searchHotels', {
    geoId,
    checkIn: p.checkIn,
    checkOut: p.checkOut,
    pageNumber: 1,
    adults: p.adults || '1',
    rooms: p.rooms || '1',
    currencyCode: 'EUR',
  });

  if (!isRecord(raw)) return [];
  const data = isRecord(raw.data) ? raw.data : raw;
  const hotelsRaw = asArray((data as Record<string, unknown>).data);

  const result: TAHotel[] = [];
  for (const h of hotelsRaw) {
    if (!isRecord(h)) continue;
    const br = isRecord(h.bubbleRating) ? h.bubbleRating : {};
    const photosRaw = asArray(h.cardPhotos);
    const cardPhotos: TAHotelPhoto[] = [];
    for (const ph of photosRaw) {
      if (!isRecord(ph)) continue;
      const sizes = isRecord(ph.sizes) ? ph.sizes : undefined;
      cardPhotos.push({
        sizes: sizes ? { urlTemplate: asString(sizes.urlTemplate) } : undefined,
      });
    }
    const amenitiesRaw = asArray(h.amenities).filter((a): a is string => typeof a === 'string');

    result.push({
      id: asString(h.id) || crypto.randomUUID(),
      title: asString(h.title),
      primaryInfo: asString(h.primaryInfo),
      secondaryInfo: asString(h.secondaryInfo),
      bubbleRating: {
        count: asString(br.count),
        rating: asNumber(br.rating),
      },
      priceForDisplay: asString(h.priceForDisplay),
      strikethroughPrice: asString(h.strikethroughPrice),
      priceDetails: asString(h.priceDetails),
      cardPhotos,
      amenities: amenitiesRaw,
    });
  }
  return result;
}

/* ── Locations (autocomplete) ────────────────────────────────── */

export async function searchLocations(keyword: string): Promise<TALocation[]> {
  const raw = await tripadvisorFetch<unknown>('/api/v1/flights/searchAirport', {
    query: keyword,
  });

  if (!isRecord(raw)) return [];
  const data = asArray((raw as Record<string, unknown>).data);

  const result: TALocation[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    result.push({
      airportCode: asString(item.airportCode),
      airportName: asString(item.airportName),
      cityName: asString(item.cityName),
      countryCode: asString(item.countryCode),
      documentId: asString(item.documentId),
    });
  }
  return result;
}

/* ── Rental cars ─────────────────────────────────────────────── */

/**
 * Resolve a city/airport keyword (typically IATA code or city name) to a
 * Tripadvisor car-rental pickup location ID. Cached for 30 days.
 */
export async function searchCarLocations(query: string): Promise<TACarLocation[]> {
  // Tripadvisor16 hosts the rental-cars location lookup under /rentals/
  // (NOT /cars/) — verified live in the RapidAPI playground. The old
  // /api/v1/cars/searchRentalCarsLocation guess returned 404.
  const raw = await tripadvisorFetch<unknown>('/api/v1/rentals/searchLocation', { query });
  if (!isRecord(raw)) return [];
  const data = asArray((raw as Record<string, unknown>).data);

  const result: TACarLocation[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const id =
      asString(item.locationId) ||
      asString(item.id) ||
      asString(item.searchHash) ||
      asString(item.documentId);
    if (!id) continue;
    result.push({
      locationId: id,
      name: asString(item.name) || asString(item.shortName) || id,
      shortName: asString(item.shortName),
      cityName: asString(item.cityName),
      countryName: asString(item.countryName),
      searchHash: asString(item.searchHash),
    });
  }
  return result;
}

export async function getCarLocationId(cityCode: string): Promise<string | null> {
  const code = cityCode.toUpperCase();
  // v3 key: bumped after switching the upstream endpoint from
  // /api/v1/cars/searchRentalCarsLocation (404) to /api/v1/rentals/searchLocation.
  const cacheKey = `carLocId:v3:${code}`;
  const cached = await getCached(cacheKey);
  if (cached && typeof cached.data === 'string') return cached.data;

  const cityName = getCityFromIata(code) || code;
  const country = getCountryFromIata(code);

  // Try IATA first (airport-specific, unambiguous); fall back to country-scoped city
  let results = await searchCarLocations(code);
  if (results.length === 0) {
    const q = country ? `${cityName}, ${country}` : cityName;
    results = await searchCarLocations(q);
  }

  const countryLower = country.toLowerCase();
  const preferred =
    (countryLower
      ? results.find((r) => (r.countryName || '').toLowerCase().includes(countryLower))
      : undefined) || results[0];
  if (!preferred) return null;

  await setCache(cacheKey, preferred.locationId, 60 * 24 * 30);
  return preferred.locationId;
}

export interface SearchCarsParams {
  pickUpLocationId: string;
  dropOffLocationId?: string;
  pickUpDate: string;
  dropOffDate: string;
  pickUpTime?: string;
  dropOffTime?: string;
  driverAge?: number;
}

export async function searchCars(p: SearchCarsParams): Promise<TACar[]> {
  const params: Record<string, string | number> = {
    pickUpLocationId: p.pickUpLocationId,
    dropOffLocationId: p.dropOffLocationId || p.pickUpLocationId,
    pickUpDate: p.pickUpDate,
    dropOffDate: p.dropOffDate,
    pickUpTime: p.pickUpTime || '10:00',
    dropOffTime: p.dropOffTime || '10:00',
    driverAge: p.driverAge ?? 25,
    currencyCode: 'EUR',
  };

  const path =
    p.dropOffLocationId && p.dropOffLocationId !== p.pickUpLocationId
      ? '/api/v1/cars/searchCarsDifferentDropOff'
      : '/api/v1/cars/searchCarsSameDropOff';

  const raw = await tripadvisorFetch<unknown>(path, params);
  if (!isRecord(raw)) return [];
  const data = isRecord(raw.data) ? raw.data : raw;
  const carsArr = asArray((data as Record<string, unknown>).products || (data as Record<string, unknown>).cars || (data as Record<string, unknown>).data);

  const result: TACar[] = [];
  for (const c of carsArr) {
    if (!isRecord(c)) continue;
    const vendor = isRecord(c.vendor) ? c.vendor : isRecord(c.partnerSupplier) ? c.partnerSupplier : {};
    const vehicle = isRecord(c.vehicle) ? c.vehicle : isRecord(c.vehicleInfo) ? c.vehicleInfo : c;
    const totalAmount = isRecord(c.estimatedTotalAmount) ? c.estimatedTotalAmount : isRecord(c.totalPrice) ? c.totalPrice : isRecord(c.price) ? c.price : {};
    const dailyAmount = isRecord(c.estimatedDailyAmount) ? c.estimatedDailyAmount : isRecord(c.dailyPrice) ? c.dailyPrice : {};

    const totalPrice = asNumber(totalAmount.value ?? totalAmount.amount ?? totalAmount.total ?? c.totalPrice);
    if (totalPrice <= 0) continue;

    const dailyPrice = asNumber(dailyAmount.value ?? dailyAmount.amount ?? dailyAmount.daily);
    const currency = asString(totalAmount.currency) || asString(dailyAmount.currency) || 'EUR';

    result.push({
      id:
        asString(c.productCode) ||
        asString(c.id) ||
        asString(c.searchHash) ||
        crypto.randomUUID(),
      vendor: asString(vendor.name) || asString(vendor.displayName) || 'Car Rental',
      vendorLogo: asString(vendor.logoUrl) || asString(vendor.logo),
      vehicleType:
        asString(vehicle.typeName) ||
        asString(vehicle.category) ||
        asString(vehicle.name) ||
        'Standard',
      transmission: asString(vehicle.transmission) || 'Automatic',
      airConditioning: vehicle.airConditioning === true || vehicle.airConditioning === 'true',
      seatCount: asNumber(vehicle.seatCount ?? vehicle.passengers ?? vehicle.seats) || 4,
      bagCount: asNumber(vehicle.bagCount ?? vehicle.baggage ?? vehicle.bags) || 2,
      doorCount: asNumber(vehicle.doorCount ?? vehicle.doors) || 4,
      pictureUrl: asString(vehicle.pictureUrl) || asString(vehicle.imageUrl) || asString(c.imageUrl),
      pricePerDay: dailyPrice > 0 ? dailyPrice : 0,
      totalPrice,
      currency,
      pickUpLocationName: isRecord(c.pickUpLocation) ? asString(c.pickUpLocation.name) : undefined,
      dropOffLocationName: isRecord(c.dropOffLocation) ? asString(c.dropOffLocation.name) : undefined,
      partner: asString(c.partner) || asString(vendor.name),
      bookingUrl: asString(c.deeplink) || asString(c.bookingUrl) || asString(c.url),
    });
  }
  return result;
}

/* ── Hotel details ───────────────────────────────────────────── */

export interface TAReview {
  id?: string;
  title?: string;
  text?: string;
  rating?: number;
  publishedDate?: string;
  authorName?: string;
}

export interface TAHotelDetail {
  id: string;
  name: string;
  about?: string;
  photos: string[];
  reviews: TAReview[];
  amenities: string[];
  rating?: number;
  numReviews?: number;
  stars?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  priceRange?: string;
  rankingString?: string;
}

/**
 * Expand a Tripadvisor photo `urlTemplate` like
 * `https://media-cdn.tripadvisor.com/.../{width}x{height}/photo0.jpg`
 * into a usable image URL.
 */
function expandPhotoUrl(template: string | undefined, w = 1200, h = 800): string | null {
  if (!template) return null;
  return template.replace('{width}', String(w)).replace('{height}', String(h));
}

/**
 * Hit /api/v1/hotels/getHotelDetails for the given hotel id. Caches the
 * normalized result for 24h in api_cache. Returns null when the upstream
 * call fails — caller decides how to surface the failure.
 */
export async function getHotelDetails(
  id: string,
  checkIn?: string,
  checkOut?: string,
): Promise<TAHotelDetail | null> {
  const cacheKey = `hotelDetail:${id}`;
  const cached = await getCached(cacheKey);
  if (cached && isRecord(cached.data)) return cached.data as unknown as TAHotelDetail;

  const params: Record<string, string | number> = {
    id,
    currencyCode: 'EUR',
  };
  if (checkIn) params.checkIn = checkIn;
  if (checkOut) params.checkOut = checkOut;

  const raw = await tripadvisorFetch<unknown>('/api/v1/hotels/getHotelDetails', params);
  if (!isRecord(raw)) return null;
  const data = isRecord(raw.data) ? (raw.data as Record<string, unknown>) : raw;

  // Photos: Tripadvisor may expose them at `photos`, `images`, or
  // `media.photos`, each as an array of objects with `sizes.urlTemplate`
  // or `urls` arrays. Pull from whichever shape exists.
  const photoSrc =
    asArray(data.photos) ||
    asArray(data.images) ||
    (isRecord(data.media) ? asArray((data.media as Record<string, unknown>).photos) : []);
  const photos: string[] = [];
  for (const p of photoSrc) {
    if (!isRecord(p)) continue;
    const sizes = isRecord(p.sizes) ? p.sizes : undefined;
    const url =
      expandPhotoUrl(asString(p.urlTemplate)) ||
      expandPhotoUrl(asString(sizes?.urlTemplate)) ||
      asString(p.url) ||
      asString(p.large) ||
      asString(p.original);
    if (url) photos.push(url);
  }

  // Tripadvisor16 has shifted the reviews payload between releases — fall
  // through several candidate fields, then log the raw keys in dev when we
  // come up empty so we can adapt the parser quickly.
  function pickReviews(): unknown[] {
    const candidates: unknown[] = [
      data.reviews,
      data.userReviews,
      data.reviewListings,
      isRecord(data.reviewSummary) ? (data.reviewSummary as Record<string, unknown>).reviews : null,
      isRecord(data.reviewSummary) ? (data.reviewSummary as Record<string, unknown>).reviewsListing : null,
      isRecord(data.reviewSummary) ? (data.reviewSummary as Record<string, unknown>).highlights : null,
    ];
    for (const c of candidates) {
      const arr = asArray(c);
      if (arr.length > 0) return arr;
    }
    return [];
  }
  const reviewsRaw = pickReviews();
  if (reviewsRaw.length === 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[getHotelDetails] no reviews extracted — raw keys:',
      Object.keys(data).slice(0, 30),
    );
  }
  const reviews: TAReview[] = [];
  for (const r of reviewsRaw.slice(0, 6)) {
    if (!isRecord(r)) continue;
    const user = isRecord(r.user) ? (r.user as Record<string, unknown>) : {};
    reviews.push({
      id: asString(r.id),
      title: asString(r.title),
      text: asString(r.text) || asString(r.content) || asString(r.body),
      rating: asNumber(r.rating) || asNumber(r.score) || asNumber(r.bubbleRating),
      publishedDate:
        asString(r.publishedDate) || asString(r.createdAt) || asString(r.publishedOn),
      authorName:
        asString(user.username) ||
        asString(user.displayName) ||
        asString(r.authorName) ||
        asString(r.username),
    });
  }

  const amenitiesRaw =
    asArray(data.amenities).filter((a): a is string => typeof a === 'string') ||
    asArray(data.amenitiesScreen).filter((a): a is string => typeof a === 'string');

  const ratingObj = isRecord(data.rating) ? (data.rating as Record<string, unknown>) : {};
  const locationObj = isRecord(data.location) ? (data.location as Record<string, unknown>) : {};

  const detail: TAHotelDetail = {
    id,
    // Strip Tripadvisor's leading list-rank prefix ("15. ") — it confuses
    // downstream Google Maps geocoding and adds nothing for the user.
    name: (asString(data.title) || asString(data.name) || 'Hotel')
      .replace(/^\d+\.\s+/, '')
      .trim(),
    about: asString(data.about) || asString(data.description),
    photos,
    reviews,
    amenities: amenitiesRaw,
    rating: asNumber(ratingObj.value) || asNumber(data.bubbleRating) || asNumber(data.rating),
    numReviews: asNumber(ratingObj.count) || asNumber(data.numReviews),
    stars:
      asNumber(data.hotelClass) ||
      asNumber(data.stars) ||
      asNumber((isRecord(data.starRating) ? data.starRating.value : 0)),
    address: asString(locationObj.address) || asString(data.address),
    latitude: asNumber(locationObj.latitude) || asNumber(data.latitude),
    longitude: asNumber(locationObj.longitude) || asNumber(data.longitude),
    priceRange: asString(data.priceRange),
    rankingString: asString(data.rankingString),
  };

  await setCache(cacheKey, detail, 60 * 24);
  return detail;
}

/* ── Restaurants ─────────────────────────────────────────────── */

export interface TARestaurant {
  id: string;
  name: string;
  cuisine?: string;
  priceRange?: string;
  rating?: number;
  reviewCount?: number;
  thumbnail?: string;
  description?: string;
  rankingString?: string;
}

export async function searchRestaurantLocationId(query: string): Promise<string | null> {
  const cacheKey = `restaurantLocId:${query.toLowerCase()}`;
  const cached = await getCached(cacheKey);
  if (cached && typeof cached.data === 'string') return cached.data;

  const raw = await tripadvisorFetch<unknown>('/api/v1/restaurant/searchLocation', { query });
  if (!isRecord(raw)) return null;
  const data = asArray((raw as Record<string, unknown>).data);

  for (const item of data) {
    if (!isRecord(item)) continue;
    const id =
      asString(item.locationId) ||
      asString(item.documentId) ||
      asString(item.geoId) ||
      asString(item.id);
    if (id) {
      await setCache(cacheKey, id, 60 * 24 * 30);
      return id;
    }
  }
  return null;
}

export async function searchRestaurants(locationId: string): Promise<TARestaurant[]> {
  const raw = await tripadvisorFetch<unknown>('/api/v1/restaurant/searchRestaurants', {
    locationId,
  });
  if (!isRecord(raw)) return [];
  const data = isRecord(raw.data) ? raw.data : raw;
  const list = asArray(
    (data as Record<string, unknown>).data ||
      (data as Record<string, unknown>).restaurants ||
      data,
  );

  const result: TARestaurant[] = [];
  for (const r of list) {
    if (!isRecord(r)) continue;
    const establishmentTypeRaw = asArray(r.establishmentTypeAndCuisineTags).filter(
      (t): t is string => typeof t === 'string',
    );
    const photo = isRecord(r.thumbnail) ? (r.thumbnail as Record<string, unknown>) : {};
    const photoSizes = isRecord(photo.photoSizeDynamic) ? photo.photoSizeDynamic : {};
    const thumbnail =
      expandPhotoUrl(asString(photoSizes.urlTemplate), 600, 400) ||
      asString(photo.url) ||
      asString(r.thumbnailUrl);
    result.push({
      id: asString(r.locationId) || asString(r.id) || asString(r.restaurantId) || crypto.randomUUID(),
      name: asString(r.name) || asString(r.title) || 'Restaurant',
      cuisine: establishmentTypeRaw.join(', ') || asString(r.cuisine),
      priceRange: asString(r.priceTag) || asString(r.priceRange),
      rating: asNumber(r.averageRating) || asNumber(r.rating),
      reviewCount: asNumber(r.userReviewCount) || asNumber(r.numReviews),
      thumbnail: thumbnail || undefined,
      description: asString(r.primaryInfo) || asString(r.description),
      rankingString: asString(r.rankingString),
    });
  }
  return result;
}

/* ── Flight inspiration (no live call — uses COMMON_ROUTES) ─── */

/**
 * Tripadvisor16 does not expose a flight-inspiration endpoint, so this
 * function builds a list of cheap destinations from the precomputed
 * COMMON_ROUTES table + the pricing estimator. Zero RapidAPI quota usage.
 */
export async function searchFlightInspirations(origin: string): Promise<TAInspiration[]> {
  const { COMMON_ROUTES } = await import('./commonRoutes');

  const today = new Date();
  const departure = new Date(today);
  departure.setDate(today.getDate() + 30);
  const ret = new Date(departure);
  ret.setDate(departure.getDate() + 7);
  const fmt = (d: Date): string => d.toISOString().split('T')[0];

  const out: TAInspiration[] = [];
  for (const r of COMMON_ROUTES) {
    if (r.from !== origin.toUpperCase()) continue;
    out.push({
      origin: r.from,
      destination: r.to,
      destinationCity: getCityFromIata(r.to),
      destinationCountry: getCountryFromIata(r.to),
      price: r.avgPrice,
      currency: r.currency,
      departureDate: fmt(departure),
      returnDate: fmt(ret),
      duration: 7,
    });
  }
  out.sort((a, b) => a.price - b.price);
  return out;
}

