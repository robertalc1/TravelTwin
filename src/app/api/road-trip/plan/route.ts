import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  geocodeCity,
  getDriveQuote,
  findNearbyCity,
  type GeocodeResult,
  type DriveQuote,
} from '@/lib/google-maps-client';
import {
  getGeoIdByQuery,
  searchHotelsByGeoId,
  searchLocations,
  searchRestaurantLocationId,
  searchRestaurants,
  type TAHotel,
  type TARestaurant,
} from '@/lib/tripadvisor-client';
import {
  buildRoadTripPrompt,
  parseRoadTripAiJson,
  type RoadTripAiContent,
} from '@/lib/road-trip-prompt';
import { generateFallbackContent } from '@/lib/fallbackContent';
import { CITY_TO_IATA } from '@/lib/iataMapping';
import { getCached, setCache } from '@/lib/cache';
import { isEuropean } from '@/lib/europeValidation';
import { fetchForecast, type DailyForecast } from '@/lib/weatherService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

interface RequestBody {
  originQuery?: string;
  destinationQuery?: string;
  departureDate?: string;
  returnDate?: string;
  mode?: 'car' | 'bus' | 'train';
  adults?: number;
  fuelPricePerLitre?: number;
  consumption?: number;
  locale?: string;
}

interface Stopover {
  city: string;
  country?: string;
  iata?: string;
  lat: number;
  lng: number;
  order: number;
  arrivalHourFromStart: number;
  hotel: TAHotel | null;
  weather?: DailyForecast | null;
  restaurants?: TARestaurant[];
}

/**
 * Resolve a free-form city name to an IATA airport code so the road-trip
 * flow can navigate to /hotels/search?cityCode=IATA — the exact same URL
 * shape the flight side uses. Two hops: static CITY_TO_IATA table first
 * (covers ~80 major European cities like Istanbul=IST, Madrid=MAD), then
 * Tripadvisor's flight-search airport autocomplete as a network fallback.
 * Caches the (cityName → iata) mapping for 30 days so the second trip on
 * the same route is instant.
 */
async function resolveCityToIata(cityName: string): Promise<string | null> {
  const trimmed = (cityName || '').trim();
  if (!trimmed) return null;
  const cacheKey = `roadTripIata:v1:${trimmed.toLowerCase()}`;
  const cached = await getCached(cacheKey);
  if (cached && typeof cached.data === 'string') {
    return cached.data || null;
  }

  const targetLower = trimmed.toLowerCase();
  for (const [key, iata] of Object.entries(CITY_TO_IATA)) {
    if (key.toLowerCase() === targetLower) {
      await setCache(cacheKey, iata, 60 * 24 * 30);
      return iata;
    }
  }

  try {
    const locations = await searchLocations(trimmed);
    const exact = locations.find(
      (loc) => (loc.cityName || '').trim().toLowerCase() === targetLower && loc.airportCode,
    );
    const picked = exact?.airportCode
      || locations.find((loc) => loc.airportCode)?.airportCode
      || null;
    if (picked) {
      const code = picked.toUpperCase();
      await setCache(cacheKey, code, 60 * 24 * 30);
      return code;
    }
  } catch {
    /* network failure — just skip the IATA and keep cityQuery path */
  }
  return null;
}

interface RoadTripResponse {
  id: string;
  origin: { query: string; formatted: string; lat: number; lng: number };
  destination: { query: string; formatted: string; lat: number; lng: number };
  destinationCity: string;
  destinationCountry: string;
  destinationIata?: string;
  mode: 'car' | 'bus' | 'train';
  departureDate: string;
  returnDate?: string;
  adults: number;
  drive: {
    distanceKm: number;
    durationHours: number;
    durationInTrafficHours?: number;
  };
  cost: {
    fuel: number;
    tolls: number;
    busFarePerPerson: number;
    trainFarePerPerson: number;
    ferry: number;
    total: number;
    currency: 'EUR';
  };
  ferry?: {
    segments: Array<{
      distanceKm: number;
      durationHours: number;
      fromName?: string;
      toName?: string;
    }>;
    totalDurationHours: number;
    estimatedCost: number;
  };
  stopovers: Stopover[];
  hotelDestination: TAHotel | null;
  externalLinks: { googleMaps: string; flixbus?: string; trainline?: string };
  aiContent: RoadTripAiContent | null;
  warnings: string[];
}

const FUEL_DEFAULT_EUR_PER_L = 1.6;
const CONSUMPTION_DEFAULT_L_PER_100KM = 7;
const TOLL_PER_KM_EUR = 0.05;
const BUS_FARE_PER_KM_EUR = 0.05;
const STOPOVER_THRESHOLD_HOURS = 14;
const HOURS_PER_STOPOVER = 12;
const GROQ_TIMEOUT_MS = 45_000;

export async function POST(req: NextRequest) {
  const groqKey = process.env.GROQ_API_KEY ?? '';
  const groqPreview = groqKey
    ? `${groqKey.slice(0, 7)}...${groqKey.slice(-4)}`
    : '(empty)';
  console.log('[road-trip] env diagnostic:', {
    hasGroq: !!groqKey,
    groqPreview,
    hasGoogleMaps: !!process.env.GOOGLE_MAPS_SERVER_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await req.json()) as RequestBody;
    const originQuery = body.originQuery?.trim();
    const destinationQuery = body.destinationQuery?.trim();
    const departureDate = body.departureDate;
    const returnDate = body.returnDate;
    const mode: 'car' | 'bus' | 'train' =
      body.mode === 'bus' ? 'bus' : body.mode === 'train' ? 'train' : 'car';
    const adults = Math.max(1, Math.min(8, body.adults ?? 2));
    const fuelPrice = body.fuelPricePerLitre ?? FUEL_DEFAULT_EUR_PER_L;
    const consumption = body.consumption ?? CONSUMPTION_DEFAULT_L_PER_100KM;
    const locale: 'ro' | 'en' = body.locale === 'en' ? 'en' : 'ro';

    if (!originQuery || !destinationQuery || !departureDate) {
      return NextResponse.json(
        { error: 'Missing required fields: originQuery, destinationQuery, departureDate' },
        { status: 400 },
      );
    }

    if (!process.env.GOOGLE_MAPS_SERVER_API_KEY) {
      return NextResponse.json(
        {
          error:
            'Google Maps server key not configured. Set GOOGLE_MAPS_SERVER_API_KEY in environment variables.',
        },
        { status: 503 },
      );
    }

    const warnings: string[] = [];

    const [origin, destination] = await Promise.all([
      geocodeCity(originQuery),
      geocodeCity(destinationQuery),
    ]);
    if (!origin) {
      return NextResponse.json(
        { error: `Could not locate origin: "${originQuery}".` },
        { status: 400 },
      );
    }
    if (!destination) {
      return NextResponse.json(
        { error: `Could not locate destination: "${destinationQuery}".` },
        { status: 400 },
      );
    }

    // Europe-only safety net: even though the wizard's map picker only shows
    // European cities, someone could POST directly to this endpoint with a
    // transatlantic destination ("New York"). Reject early with the same
    // friendly flight-CTA path used for NO_LAND_ROUTE — the wizard already
    // knows how to render it.
    if (!isEuropean(origin.countryCode) || !isEuropean(destination.countryCode)) {
      return NextResponse.json(
        {
          error:
            'Road trips are only available within Europe. Try our flight planner for intercontinental travel.',
          suggestion: 'flight',
          flightSearchUrl: `/plan?from=${encodeURIComponent(originQuery)}&to=${encodeURIComponent(destinationQuery)}`,
          origin: originQuery,
          destination: destinationQuery,
        },
        { status: 422 },
      );
    }

    let quote: DriveQuote;
    // Train mode borrows the driving distance as a proxy (rail distance on
    // major European corridors is within ~10% of road distance), but the
    // duration and fare come from a heuristic — see `applyTrainHeuristic`
    // below. Bus stays on transit; car stays on driving.
    const directionsMode: 'driving' | 'transit' =
      mode === 'bus' ? 'transit' : 'driving';
    try {
      quote = await getDriveQuote(origin, destination, directionsMode);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'NO_LAND_ROUTE') {
        return NextResponse.json(
          {
            error:
              'No drivable route — the destination is across water or otherwise unreachable by car.',
            suggestion: 'flight',
            flightSearchUrl: `/plan?from=${encodeURIComponent(originQuery)}&to=${encodeURIComponent(destinationQuery)}`,
            origin: originQuery,
            destination: destinationQuery,
          },
          { status: 422 },
        );
      }
      if (mode === 'bus') {
        try {
          quote = await getDriveQuote(origin, destination, 'driving');
          warnings.push(
            'Transit routing unavailable for this pair — using road distance as a fallback for travel time and fare estimation.',
          );
        } catch (e2) {
          const m2 = (e2 as Error).message;
          if (m2 === 'NO_LAND_ROUTE') {
            return NextResponse.json(
              {
                error:
                  'No drivable route — the destination is across water or otherwise unreachable by car or bus.',
                suggestion: 'flight',
                flightSearchUrl: `/plan?from=${encodeURIComponent(originQuery)}&to=${encodeURIComponent(destinationQuery)}`,
                origin: originQuery,
                destination: destinationQuery,
              },
              { status: 422 },
            );
          }
          return NextResponse.json({ error: m2 }, { status: 502 });
        }
      } else {
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }

    const distanceKm = Math.round(quote.distanceMeters / 1000);
    // Train heuristic: weighted-average European speed (TGV/ICE corridors plus
    // regional segments) ≈ 110 km/h. Override Google's driving duration so
    // the UI shows a realistic rail travel time, not an 8h drive.
    const TRAIN_AVG_SPEED_KMH = 110;
    const TRAIN_FARE_PER_KM_EUR = 0.12;
    const durationHours =
      mode === 'train' ? distanceKm / TRAIN_AVG_SPEED_KMH : quote.durationSeconds / 3600;
    const durationInTrafficHours =
      mode === 'train' || !quote.durationInTrafficSeconds
        ? undefined
        : quote.durationInTrafficSeconds / 3600;

    // Ferry estimate: per-km fee scaled by ferry distance + per-passenger fee.
    // Calibrated on real European crossings (Dover-Calais ~€80, Patras-Bari
    // ~€200 with car). Conservative so we never under-quote the user.
    const FERRY_BASE_PER_KM_EUR = 0.35;
    const FERRY_PASSENGER_FEE_EUR = 25;
    const ferryDistanceKm = quote.ferrySegments.reduce(
      (sum, s) => sum + s.distanceMeters / 1000,
      0,
    );
    const ferryCost = quote.hasFerry
      ? mode === 'car'
        ? Math.round(ferryDistanceKm * FERRY_BASE_PER_KM_EUR + adults * FERRY_PASSENGER_FEE_EUR)
        : Math.round(adults * FERRY_PASSENGER_FEE_EUR)
      : 0;

    const fuel =
      mode === 'car' ? Math.round((distanceKm * consumption * fuelPrice) / 100) : 0;
    const tolls = mode === 'car' ? Math.round(distanceKm * TOLL_PER_KM_EUR) : 0;
    const busFarePerPerson = mode === 'bus' ? Math.round(distanceKm * BUS_FARE_PER_KM_EUR) : 0;
    const trainFarePerPerson =
      mode === 'train' ? Math.round(distanceKm * TRAIN_FARE_PER_KM_EUR) : 0;
    const total =
      fuel +
      tolls +
      busFarePerPerson * adults +
      trainFarePerPerson * adults +
      ferryCost;

    const stopovers = await computeStopovers(durationHours, origin, destination, mode, warnings);

    const checkInDates = computeCheckInDates(departureDate, stopovers.length, returnDate);

    // Build the queries we'll send to Tripadvisor. Prefer the user's typed
    // value (Latin alphabet, simple) over Google's formatted name which can
    // include non-Latin characters like "İstanbul, Türkiye" that don't match
    // Tripadvisor's index cleanly.
    const destShortName = shortCityName(destination);
    const hotelPromises: Array<Promise<TAHotel | null>> = stopovers.map((s, i) =>
      fetchFirstHotel(
        s.country ? `${s.city}, ${s.country}` : s.city,
        checkInDates.stopoverNights[i],
        checkInDates.stopoverNights[i + 1] || addDays(checkInDates.stopoverNights[i], 1),
        adults,
      ).catch((e) => {
        warnings.push(humanizeHotelError(`stopover in ${s.city}`, e as Error));
        return null;
      }),
    );
    hotelPromises.push(
      fetchFirstHotel(
        destShortName,
        checkInDates.destinationCheckIn,
        checkInDates.destinationCheckOut,
        adults,
      ).catch((e) => {
        warnings.push(humanizeHotelError(`destination ${destShortName}`, e as Error));
        return null;
      }),
    );
    // Enrich each stopover with weather forecast for the arrival date and a
    // small list of restaurants from Tripadvisor. Both calls are best-effort
    // — a failure on either side leaves the field undefined, the UI just
    // hides that strip rather than blocking the trip.
    const weatherPromises = stopovers.map((s) => {
      const arrivalDate = addDays(departureDate, Math.floor(s.arrivalHourFromStart / 24));
      return fetchForecast(s.lat, s.lng, arrivalDate, arrivalDate)
        .then((r) => r?.daily?.[0] ?? null)
        .catch(() => null);
    });
    // Belt-and-braces .catch — loadStopoverRestaurants already swallows its
    // own errors and returns [], but if anything new gets added there in the
    // future we still don't want a single bad call to take down the whole
    // trip request.
    const restaurantPromises = stopovers.map((s) =>
      loadStopoverRestaurants(s).catch(() => [] as TARestaurant[]),
    );

    const [hotelResults, weatherResults, restaurantResults] = await Promise.all([
      Promise.all(hotelPromises),
      Promise.all(weatherPromises),
      Promise.all(restaurantPromises),
    ]);
    const stopoverHotels = hotelResults.slice(0, stopovers.length);
    const hotelDestination = hotelResults[hotelResults.length - 1];
    stopovers.forEach((s, i) => {
      s.hotel = stopoverHotels[i];
      s.weather = weatherResults[i];
      s.restaurants = restaurantResults[i];
    });

    const destinationCity = shortCityName(destination);
    const destinationCountry = extractCountry(destination.formatted);

    let aiContent: RoadTripAiContent | null = null;
    if (process.env.GROQ_API_KEY) {
      try {
        const prompt = buildRoadTripPrompt({
          originCity: shortCityName(origin),
          destinationCity,
          destinationCountry,
          mode,
          distanceKm,
          durationHours,
          departureDate,
          returnDate,
          adults,
          stopovers: stopovers.map((s) => ({ city: s.city })),
          destinationHotelName: hotelDestination?.title,
          locale,
        });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
        try {
          const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              max_tokens: 3500,
              temperature: 0.7,
              response_format: { type: 'json_object' },
              messages: [{ role: 'user', content: prompt }],
            }),
            signal: controller.signal,
          });
          if (aiRes.ok) {
            const aiData = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
            const text = aiData.choices?.[0]?.message?.content || '';
            aiContent = parseRoadTripAiJson(text);
            if (!aiContent) {
              warnings.push('Groq returned unparseable JSON — itinerary skipped.');
            }
          } else {
            const errText = await aiRes.text().catch(() => '');
            warnings.push(
              `Groq returned HTTP ${aiRes.status}: ${errText.slice(0, 200)}`,
            );
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === 'AbortError') {
          warnings.push('AI itinerary generation timed out (>45s).');
        } else {
          warnings.push(`AI itinerary generation failed: ${err.message}`);
        }
      }
    }

    // ── Fallback path ────────────────────────────────────────────────
    // Whenever the AI is unavailable, returns nonsense, or the key is
    // missing entirely, we fall back to the SAME locale-aware knowledge
    // base used by the flight planner. Attractions, restaurants and cafes
    // are always present — the page never shows an empty body.
    if (!aiContent) {
      const fallbackNights = returnDate
        ? Math.max(
            1,
            Math.round(
              (new Date(returnDate).getTime() - new Date(departureDate).getTime()) /
                86_400_000,
            ),
          )
        : 3;
      aiContent = generateFallbackContent({
        destination: { city: destinationCity, country: destinationCountry },
        nights: fallbackNights,
        locale,
        mode,
        durationHours,
        stopoverCity: stopovers[0]?.city,
        originCity: shortCityName(origin),
      }) as RoadTripAiContent;
      // No user-facing warning when the AI key is missing — the local
      // fallback content is good enough, and the deploy-config detail
      // is internal noise from the user's perspective.
    }

    const id = `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const googleMapsLink = buildGoogleMapsLink(origin, destination, stopovers, mode);
    // Deep-linked search URLs were unreliable (Flixbus rejected unknown city
    // pairs, Trainline 404'd on minor routes). Homepage redirects are safer.
    const flixbusLink = mode === 'bus' ? 'https://www.flixbus.com/' : undefined;
    const trainlineLink = mode === 'train' ? buildTrainlineLink() : undefined;

    // Pre-resolve destination IATA so RoadTripDetailView can navigate to
    // /hotels/search?cityCode=IATA (the proven flight-side URL) instead of
    // the free-text cityQuery path which Tripadvisor's geo search sometimes
    // rejects for major cities like Istanbul, Türkiye.
    const destinationIata = await resolveCityToIata(destinationCity).catch(() => null);

    const response: RoadTripResponse = {
      id,
      origin: {
        query: originQuery,
        formatted: origin.formatted,
        lat: origin.lat,
        lng: origin.lng,
      },
      destination: {
        query: destinationQuery,
        formatted: destination.formatted,
        lat: destination.lat,
        lng: destination.lng,
      },
      destinationCity,
      destinationCountry,
      destinationIata: destinationIata || undefined,
      mode,
      departureDate,
      returnDate,
      adults,
      drive: {
        distanceKm,
        durationHours: Number(durationHours.toFixed(2)),
        durationInTrafficHours: durationInTrafficHours
          ? Number(durationInTrafficHours.toFixed(2))
          : undefined,
      },
      cost: {
        fuel,
        tolls,
        busFarePerPerson,
        trainFarePerPerson,
        ferry: ferryCost,
        total,
        currency: 'EUR',
      },
      ferry: quote.hasFerry
        ? {
            segments: quote.ferrySegments.map((s) => ({
              distanceKm: Math.round(s.distanceMeters / 1000),
              durationHours: Number((s.durationSeconds / 3600).toFixed(2)),
              fromName: s.fromName,
              toName: s.toName,
            })),
            totalDurationHours: Number(
              (quote.ferrySegments.reduce((sum, s) => sum + s.durationSeconds, 0) / 3600).toFixed(2),
            ),
            estimatedCost: ferryCost,
          }
        : undefined,
      stopovers,
      hotelDestination: hotelDestination ?? null,
      externalLinks: {
        googleMaps: googleMapsLink,
        flixbus: flixbusLink,
        trainline: trainlineLink,
      },
      aiContent,
      warnings,
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error('[road-trip] Unexpected error:', e);
    return NextResponse.json(
      { error: (e as Error).message || 'Unexpected error' },
      { status: 500 },
    );
  }
}

async function computeStopovers(
  durationHours: number,
  origin: GeocodeResult,
  destination: GeocodeResult,
  mode: 'car' | 'bus' | 'train',
  warnings: string[],
): Promise<Stopover[]> {
  // Bus passengers don't drive — long-distance buses run continuously through
  // the night. No overnight stopovers needed even for 16h+ routes. Train rides
  // are similarly point-to-point — high-speed rail covers transcontinental
  // distance in a single day with onboard food/rest.
  if (mode === 'bus' || mode === 'train') return [];
  // Self-drive: a single driver can't safely cover >14h in one day.
  if (durationHours < STOPOVER_THRESHOLD_HOURS) return [];
  const count = Math.min(3, Math.floor(durationHours / HOURS_PER_STOPOVER));
  const stops: Stopover[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const lat = origin.lat + t * (destination.lat - origin.lat);
    const lng = origin.lng + t * (destination.lng - origin.lng);
    // findNearbyCity prefers Google Places "locality" matches (real cities)
    // over administrative areas like "Gorj County". Falls back to reverse
    // geocode if Places API is unavailable. Returns {name, country} so
    // downstream consumers can build "City, Country" queries that disambiguate
    // names Tripadvisor's geo search can't resolve from the bare city alone
    // (e.g. "Split" → "Split, Croatia").
    const result = await findNearbyCity(lat, lng).catch(() => null);
    if (result?.name) {
      const iata = await resolveCityToIata(result.name).catch(() => null);
      stops.push({
        city: result.name,
        country: result.country,
        iata: iata || undefined,
        lat,
        lng,
        order: i,
        arrivalHourFromStart: Number((durationHours * t).toFixed(1)),
        hotel: null,
      });
    } else {
      warnings.push(
        `Could not resolve a stopover city near midpoint ${i} — plan an overnight stop manually.`,
      );
    }
  }
  return stops;
}

function computeCheckInDates(
  departureDate: string,
  stopoverCount: number,
  returnDate: string | undefined,
): { stopoverNights: string[]; destinationCheckIn: string; destinationCheckOut: string } {
  const stopoverNights: string[] = [];
  for (let i = 0; i < stopoverCount; i++) {
    stopoverNights.push(addDays(departureDate, i));
  }
  const destinationCheckIn = addDays(departureDate, stopoverCount);
  const destinationCheckOut = returnDate || addDays(destinationCheckIn, 2);
  return { stopoverNights, destinationCheckIn, destinationCheckOut };
}

async function fetchFirstHotel(
  cityQuery: string,
  checkIn: string,
  checkOut: string,
  adults: number,
): Promise<TAHotel | null> {
  const geoId = await getGeoIdByQuery(cityQuery);
  if (!geoId) return null;
  const hotels = await searchHotelsByGeoId({
    geoId,
    checkIn,
    checkOut,
    adults: String(adults),
  });
  return hotels[0] ?? null;
}

function shortCityName(geo: GeocodeResult): string {
  return geo.formatted.split(',')[0]?.trim() || geo.formatted;
}

function extractCountry(formatted: string): string {
  const parts = formatted.split(',').map((p) => p.trim());
  return parts[parts.length - 1] || '';
}

function addDays(date: string, n: number): string {
  return new Date(new Date(date).getTime() + n * 86400000).toISOString().split('T')[0];
}

function humanizeHotelError(context: string, err: Error): string {
  const msg = err.message || '';
  if (/timed out|timeout/i.test(msg)) {
    return `Could not load ${context} hotel — Tripadvisor was slow to respond. Try again in a moment.`;
  }
  if (/429|rate limit|quota/i.test(msg)) {
    return `Could not load ${context} hotel — Tripadvisor rate-limit reached for today.`;
  }
  if (/401|403|invalid/i.test(msg)) {
    return `Could not load ${context} hotel — Tripadvisor authentication failed.`;
  }
  return `Could not load ${context} hotel: ${msg.slice(0, 120)}`;
}

/**
 * Best-effort top-3 restaurants for a stopover city. Cached for 24h on
 * (city, country) so repeated planning of the same route is instant. Returns
 * an empty array on any failure — the UI hides the strip gracefully.
 */
async function loadStopoverRestaurants(stop: Stopover): Promise<TARestaurant[]> {
  // Entire function wrapped in a single try/catch — getCached / setCache go
  // through Supabase and can throw on transient network issues. Restaurants
  // are non-essential, so any error path returns [] and the UI quietly
  // hides the strip.
  try {
    const queryKey = `${stop.city}${stop.country ? `, ${stop.country}` : ''}`.toLowerCase();
    const cacheKey = `roadTripStopRest:v1:${queryKey}`;
    const cached = await getCached(cacheKey).catch(() => null);
    if (cached && Array.isArray(cached.data)) {
      return cached.data as TARestaurant[];
    }

    const locId = await searchRestaurantLocationId(
      stop.country ? `${stop.city}, ${stop.country}` : stop.city,
    );
    if (!locId) {
      await setCache(cacheKey, [], 60 * 6).catch(() => undefined);
      return [];
    }
    const list = (await searchRestaurants(locId)).slice(0, 3);
    await setCache(cacheKey, list, 60 * 24).catch(() => undefined);
    return list;
  } catch {
    return [];
  }
}

function buildGoogleMapsLink(
  origin: GeocodeResult,
  destination: GeocodeResult,
  stopovers: Stopover[],
  mode: 'car' | 'bus' | 'train',
): string {
  // Google Maps doesn't have a dedicated 'rail' travel mode — transit covers
  // both bus and train. Cars get 'driving'.
  const travelmode = mode === 'car' ? 'driving' : 'transit';
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode,
  });
  if (stopovers.length > 0) {
    params.set('waypoints', stopovers.map((s) => `${s.lat},${s.lng}`).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Trainline homepage. Earlier versions deep-linked into
 * `/en/train-times/{origin}-to-{destination}` but that path 404s for less
 * popular city pairs — the homepage is a safer destination and lets users
 * search from there.
 */
function buildTrainlineLink(): string {
  return 'https://www.thetrainline.com/en-us';
}
