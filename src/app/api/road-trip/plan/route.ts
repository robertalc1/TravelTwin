import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  geocodeCity,
  getDriveQuote,
  reverseGeocode,
  type GeocodeResult,
  type DriveQuote,
} from '@/lib/google-maps-client';
import {
  getGeoIdByQuery,
  searchHotelsByGeoId,
  type TAHotel,
} from '@/lib/tripadvisor-client';
import {
  buildRoadTripPrompt,
  parseRoadTripAiJson,
  type RoadTripAiContent,
} from '@/lib/road-trip-prompt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

interface RequestBody {
  originQuery?: string;
  destinationQuery?: string;
  departureDate?: string;
  returnDate?: string;
  mode?: 'car' | 'bus';
  adults?: number;
  fuelPricePerLitre?: number;
  consumption?: number;
  locale?: string;
}

interface Stopover {
  city: string;
  lat: number;
  lng: number;
  order: number;
  arrivalHourFromStart: number;
  hotel: TAHotel | null;
}

interface RoadTripResponse {
  id: string;
  origin: { query: string; formatted: string; lat: number; lng: number };
  destination: { query: string; formatted: string; lat: number; lng: number };
  destinationCity: string;
  destinationCountry: string;
  mode: 'car' | 'bus';
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
    total: number;
    currency: 'EUR';
  };
  stopovers: Stopover[];
  hotelDestination: TAHotel | null;
  externalLinks: { googleMaps: string; flixbus?: string };
  aiContent: RoadTripAiContent | null;
  warnings: string[];
}

const FUEL_DEFAULT_EUR_PER_L = 1.6;
const CONSUMPTION_DEFAULT_L_PER_100KM = 7;
const TOLL_PER_KM_EUR = 0.05;
const BUS_FARE_PER_KM_EUR = 0.05;
const STOPOVER_THRESHOLD_HOURS = 14;
const HOURS_PER_STOPOVER = 12;
const CLAUDE_TIMEOUT_MS = 45_000;

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';
  const anthropicPreview = anthropicKey
    ? `${anthropicKey.slice(0, 7)}...${anthropicKey.slice(-4)}`
    : '(empty)';
  console.log(
    `[road-trip] ANTHROPIC_API_KEY configured: ${!!anthropicKey} preview=${anthropicPreview}`,
  );
  console.log(
    '[road-trip] GOOGLE_MAPS_SERVER_API_KEY configured:',
    !!process.env.GOOGLE_MAPS_SERVER_API_KEY,
  );
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
    const mode: 'car' | 'bus' = body.mode === 'bus' ? 'bus' : 'car';
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

    let quote: DriveQuote;
    try {
      quote = await getDriveQuote(origin, destination, mode === 'bus' ? 'transit' : 'driving');
    } catch (e) {
      const msg = (e as Error).message;
      if (mode === 'bus') {
        try {
          quote = await getDriveQuote(origin, destination, 'driving');
          warnings.push(
            'Transit routing unavailable for this pair — using road distance as a fallback for travel time and fare estimation.',
          );
        } catch (e2) {
          return NextResponse.json({ error: (e2 as Error).message }, { status: 502 });
        }
      } else {
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }

    const distanceKm = Math.round(quote.distanceMeters / 1000);
    const durationHours = quote.durationSeconds / 3600;
    const durationInTrafficHours = quote.durationInTrafficSeconds
      ? quote.durationInTrafficSeconds / 3600
      : undefined;

    const fuel =
      mode === 'car' ? Math.round((distanceKm * consumption * fuelPrice) / 100) : 0;
    const tolls = mode === 'car' ? Math.round(distanceKm * TOLL_PER_KM_EUR) : 0;
    const busFarePerPerson = mode === 'bus' ? Math.round(distanceKm * BUS_FARE_PER_KM_EUR) : 0;
    const total = fuel + tolls + busFarePerPerson * adults;

    const stopovers = await computeStopovers(durationHours, origin, destination, warnings);

    const checkInDates = computeCheckInDates(departureDate, stopovers.length, returnDate);

    // Build the queries we'll send to Tripadvisor. Prefer the user's typed
    // value (Latin alphabet, simple) over Google's formatted name which can
    // include non-Latin characters like "İstanbul, Türkiye" that don't match
    // Tripadvisor's index cleanly.
    const destShortName = shortCityName(destination);
    const hotelPromises: Array<Promise<TAHotel | null>> = stopovers.map((s, i) =>
      fetchFirstHotel(
        s.city,
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
    const hotelResults = await Promise.all(hotelPromises);
    const stopoverHotels = hotelResults.slice(0, stopovers.length);
    const hotelDestination = hotelResults[hotelResults.length - 1];
    stopovers.forEach((s, i) => {
      s.hotel = stopoverHotels[i];
    });

    const destinationCity = shortCityName(destination);
    const destinationCountry = extractCountry(destination.formatted);

    let aiContent: RoadTripAiContent | null = null;
    if (process.env.ANTHROPIC_API_KEY) {
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
        const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
        try {
          const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 3500,
              messages: [{ role: 'user', content: prompt }],
            }),
            signal: controller.signal,
          });
          if (aiRes.ok) {
            const aiData = (await aiRes.json()) as { content?: Array<{ text?: string }> };
            const text = aiData.content?.[0]?.text || '';
            aiContent = parseRoadTripAiJson(text);
            if (!aiContent) {
              warnings.push('Claude returned unparseable JSON — itinerary skipped.');
            }
          } else {
            const errText = await aiRes.text().catch(() => '');
            warnings.push(
              `Claude returned HTTP ${aiRes.status}: ${errText.slice(0, 200)}`,
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
    } else {
      warnings.push(
        'AI itinerary unavailable — Anthropic key not configured on this deploy. The route, distance and hotels still work; only the day-by-day suggestions are missing.',
      );
    }

    const id = `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const googleMapsLink = buildGoogleMapsLink(origin, destination, stopovers, mode);
    const flixbusLink =
      mode === 'bus'
        ? `https://www.flixbus.com/search?from=${encodeURIComponent(shortCityName(origin))}&to=${encodeURIComponent(destinationCity)}&departureDate=${departureDate}`
        : undefined;

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
      cost: { fuel, tolls, busFarePerPerson, total, currency: 'EUR' },
      stopovers,
      hotelDestination: hotelDestination ?? null,
      externalLinks: { googleMaps: googleMapsLink, flixbus: flixbusLink },
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
  warnings: string[],
): Promise<Stopover[]> {
  if (durationHours < STOPOVER_THRESHOLD_HOURS) return [];
  const count = Math.min(3, Math.floor(durationHours / HOURS_PER_STOPOVER));
  const stops: Stopover[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const lat = origin.lat + t * (destination.lat - origin.lat);
    const lng = origin.lng + t * (destination.lng - origin.lng);
    const city = await reverseGeocode(lat, lng).catch(() => null);
    if (city) {
      stops.push({
        city,
        lat,
        lng,
        order: i,
        arrivalHourFromStart: Number((durationHours * t).toFixed(1)),
        hotel: null,
      });
    } else {
      warnings.push(
        `Could not reverse-geocode midpoint ${i} — skipping that stopover.`,
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

function buildGoogleMapsLink(
  origin: GeocodeResult,
  destination: GeocodeResult,
  stopovers: Stopover[],
  mode: 'car' | 'bus',
): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: mode === 'bus' ? 'transit' : 'driving',
  });
  if (stopovers.length > 0) {
    params.set('waypoints', stopovers.map((s) => `${s.lat},${s.lng}`).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
