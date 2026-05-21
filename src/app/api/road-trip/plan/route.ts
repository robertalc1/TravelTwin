import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  geocodeCity,
  getDriveQuote,
  reverseGeocode,
  midpoint,
  type GeocodeResult,
  type DriveQuote,
} from '@/lib/google-maps-client';
import {
  getGeoIdByQuery,
  searchHotelsByGeoId,
  type TAHotel,
} from '@/lib/tripadvisor-client';
import { buildRoadTripPrompt, type RoadTripAiContent } from '@/lib/road-trip-prompt';

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

interface RoadTripResponse {
  id: string;
  origin: { query: string; formatted: string; lat: number; lng: number };
  destination: { query: string; formatted: string; lat: number; lng: number };
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
  stopover?: { city: string; reason: string };
  hotelDestination: TAHotel | null;
  hotelStopover: TAHotel | null;
  externalLinks: {
    googleMaps: string;
    flixbus?: string;
  };
  aiContent: RoadTripAiContent | null;
  warnings: string[];
}

const FUEL_DEFAULT_EUR_PER_L = 1.6;
const CONSUMPTION_DEFAULT_L_PER_100KM = 7;
const TOLL_PER_KM_EUR = 0.05;
const BUS_FARE_PER_KM_EUR = 0.05;
const STOPOVER_THRESHOLD_HOURS = 14;

export async function POST(req: NextRequest) {
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
      mode === 'car'
        ? Math.round((distanceKm * consumption * fuelPrice) / 100)
        : 0;
    const tolls = mode === 'car' ? Math.round(distanceKm * TOLL_PER_KM_EUR) : 0;
    const busFarePerPerson =
      mode === 'bus' ? Math.round(distanceKm * BUS_FARE_PER_KM_EUR) : 0;
    const total = fuel + tolls + busFarePerPerson * adults;

    let stopover: { city: string; reason: string } | undefined;
    if (durationHours > STOPOVER_THRESHOLD_HOURS) {
      const mid = midpoint(origin, destination);
      const midCityName = await reverseGeocode(mid.lat, mid.lng).catch(() => null);
      if (midCityName) {
        stopover = {
          city: midCityName,
          reason: `${durationHours.toFixed(1)}h is too long for a single day — overnight in ${midCityName} (geographic midpoint).`,
        };
      } else {
        warnings.push(
          `Trip is ${durationHours.toFixed(1)}h long but we couldn't auto-pick a midpoint city — plan an overnight stop manually.`,
        );
      }
    }

    let hotelDestination: TAHotel | null = null;
    let hotelStopover: TAHotel | null = null;
    const checkIn = stopover
      ? new Date(new Date(departureDate).getTime() + 86400000).toISOString().split('T')[0]
      : departureDate;
    const checkOut = returnDate || addDays(checkIn, 2);

    try {
      const destGeo = await getGeoIdByQuery(destination.formatted);
      if (destGeo) {
        const hotels = await searchHotelsByGeoId({
          geoId: destGeo,
          checkIn,
          checkOut,
          adults: String(adults),
        });
        hotelDestination = hotels[0] ?? null;
      }
    } catch (e) {
      warnings.push(`Could not load destination hotels: ${(e as Error).message}`);
    }

    if (stopover) {
      try {
        const stopGeo = await getGeoIdByQuery(stopover.city);
        if (stopGeo) {
          const stopHotels = await searchHotelsByGeoId({
            geoId: stopGeo,
            checkIn: departureDate,
            checkOut: addDays(departureDate, 1),
            adults: String(adults),
          });
          hotelStopover = stopHotels[0] ?? null;
        }
      } catch (e) {
        warnings.push(`Could not load stopover hotel: ${(e as Error).message}`);
      }
    }

    let aiContent: RoadTripAiContent | null = null;
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const prompt = buildRoadTripPrompt({
          originCity: shortCityName(origin),
          destinationCity: shortCityName(destination),
          mode,
          distanceKm,
          durationHours,
          departureDate,
          returnDate,
          adults,
          stopoverCity: stopover?.city,
          destinationHotelName: hotelDestination?.title,
          locale,
        });
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2500,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        if (aiRes.ok) {
          const aiData = (await aiRes.json()) as { content?: Array<{ text?: string }> };
          const text = aiData.content?.[0]?.text || '';
          aiContent = parseAiJson(text);
        } else {
          warnings.push(`Claude returned HTTP ${aiRes.status}`);
        }
      } catch (e) {
        warnings.push(`AI itinerary generation failed: ${(e as Error).message}`);
      }
    } else {
      warnings.push('ANTHROPIC_API_KEY missing — AI itinerary not generated.');
    }

    const id = `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const googleMapsLink = `https://www.google.com/maps/dir/?api=1&origin=place_id:${origin.placeId}&destination=place_id:${destination.placeId}&travelmode=${mode === 'bus' ? 'transit' : 'driving'}`;
    const flixbusLink =
      mode === 'bus'
        ? `https://www.flixbus.com/search?from=${encodeURIComponent(shortCityName(origin))}&to=${encodeURIComponent(shortCityName(destination))}&departureDate=${departureDate}`
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
        total,
        currency: 'EUR',
      },
      stopover,
      hotelDestination,
      hotelStopover,
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

function shortCityName(geo: GeocodeResult): string {
  return geo.formatted.split(',')[0]?.trim() || geo.formatted;
}

function addDays(date: string, n: number): string {
  return new Date(new Date(date).getTime() + n * 86400000).toISOString().split('T')[0];
}

function parseAiJson(text: string): RoadTripAiContent | null {
  if (!text) return null;
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first < 0 || last < 0) return null;
  const slice = text.slice(first, last + 1);
  try {
    const parsed = JSON.parse(slice) as RoadTripAiContent;
    if (!parsed.dayByDay || !Array.isArray(parsed.dayByDay)) return null;
    return parsed;
  } catch {
    return null;
  }
}
