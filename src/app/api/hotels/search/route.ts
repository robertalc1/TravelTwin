/* GET /api/hotels/search — Tripadvisor-backed hotel search returning
   HotelOfferData[] for the TripDetail Hotels tab.

   Replaces the legacy /api/amadeus/hotels/{list,offers} pair: one fetch
   resolves geoId (cached 30d) + lists hotels with prices, photos, and
   amenities in the shape HotelCard already understands. 24h response
   cache per (cityCode, checkIn, checkOut, adults).
*/

import { NextResponse } from 'next/server';
import {
  searchHotelsByCity,
  searchHotelsByGeoId,
  searchLocations,
  getGeoIdByQuery,
  type TAHotel,
} from '@/lib/tripadvisor-client';
import { normalizeHotel } from '@/lib/tripadvisor-normalize';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';
import { getCityFromIata, CITY_TO_IATA } from '@/lib/iataMapping';

interface HotelOfferData {
  hotel: {
    hotelId: string;
    name: string;
    rating?: string;
    cityCode: string;
    address?: { lines?: string[]; cityName?: string };
    amenities?: string[];
    media?: { uri: string }[];
  };
  offers: {
    id?: string;
    price: { currency: string; total: string; base?: string };
    checkInDate: string;
    checkOutDate: string;
    policies?: { cancellations?: { amount?: string; deadline?: string }[] };
  }[];
}

interface PricingNote {
  sampledCheckIn: string;
  sampledCheckOut: string;
  userCheckIn: string;
  userCheckOut: string;
}

function expandPhotoUrl(template: string | undefined, w = 800, h = 500): string {
  if (!template) return '';
  return template.replace('{width}', String(w)).replace('{height}', String(h));
}

// Tripadvisor returns sorted search results with a leading list-rank prefix
// like "15. Howard Johnson by Wyndham Athens". The prefix breaks Google Maps
// geocoding (the embed silently fails on the leading "15."), so strip it at
// the source before the name flows into HotelOfferData.
function cleanHotelName(title: string | undefined): string {
  return (title || 'Hotel').replace(/^\d+\.\s+/, '').trim();
}

// Case-insensitive lookup over the static CITY_TO_IATA table. Returns the
// first IATA whose city key matches the query exactly. Used to short-circuit
// free-text city queries (e.g. "Thessaloniki" → "SKG") into the flight side's
// proven searchHotelsByCity path.
function resolveStaticIata(cityName: string): string | null {
  if (!cityName) return null;
  const target = cityName.trim().toLowerCase();
  for (const [key, iata] of Object.entries(CITY_TO_IATA)) {
    if (key.toLowerCase() === target) return iata;
  }
  return null;
}

// Last-resort IATA resolution via Tripadvisor's flight autocomplete. This
// endpoint indexes airports + cities globally, so it covers cities the static
// map omits. We accept the first item whose cityName matches the query and
// carries either an airportCode or a documentId that looks like an IATA.
async function resolveIataViaSearch(cityName: string): Promise<string | null> {
  if (!cityName) return null;
  try {
    const locations = await searchLocations(cityName);
    const target = cityName.trim().toLowerCase();
    const exact = locations.find(
      (loc) => (loc.cityName || '').trim().toLowerCase() === target && loc.airportCode,
    );
    if (exact?.airportCode) return exact.airportCode.toUpperCase();
    const partial = locations.find(
      (loc) => (loc.cityName || '').toLowerCase().includes(target) && loc.airportCode,
    );
    return partial?.airportCode ? partial.airportCode.toUpperCase() : null;
  } catch {
    return null;
  }
}

function addDaysIso(date: string, days: number): string {
  return new Date(new Date(date).getTime() + days * 86_400_000)
    .toISOString()
    .split('T')[0];
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000),
  );
}

function nextFriday(): string {
  const today = new Date();
  // Day-of-week index for Friday is 5. Add at least 1 day so "today is Friday"
  // still produces *next* Friday, not today.
  const delta = ((5 - today.getDay() + 7) % 7) || 7;
  return addDaysIso(today.toISOString().split('T')[0], delta);
}

interface SampledWindow {
  checkIn: string;
  checkOut: string;
}

// Try the user's exact dates first, then a sequence of shorter sample windows
// when Tripadvisor returns zero hotels. Tripadvisor16 silently drops listings
// for stays longer than a handful of nights or for date ranges deep in the
// future — without this, the listing page is empty even for huge cities like
// Istanbul. Returns the first non-empty result and the window that produced it
// (null when the user's exact dates worked).
async function searchHotelsWithWindowFallback(opts: {
  mode: 'cityCode' | 'geoId';
  cityCode?: string;
  geoId?: number;
  checkIn: string;
  checkOut: string;
  adults: string;
}): Promise<{ hotels: TAHotel[]; sampledWindow: SampledWindow | null }> {
  const userNights = nightsBetween(opts.checkIn, opts.checkOut);
  const attempts: SampledWindow[] = [{ checkIn: opts.checkIn, checkOut: opts.checkOut }];

  if (userNights > 7) {
    attempts.push({ checkIn: opts.checkIn, checkOut: addDaysIso(opts.checkIn, 4) });
    attempts.push({ checkIn: opts.checkIn, checkOut: addDaysIso(opts.checkIn, 2) });
  } else if (userNights > 4) {
    attempts.push({ checkIn: opts.checkIn, checkOut: addDaysIso(opts.checkIn, 4) });
  } else if (userNights > 2) {
    attempts.push({ checkIn: opts.checkIn, checkOut: addDaysIso(opts.checkIn, 2) });
  }

  const nf = nextFriday();
  attempts.push({ checkIn: nf, checkOut: addDaysIso(nf, 2) });

  for (let i = 0; i < attempts.length; i++) {
    const w = attempts[i];
    const hotels = opts.mode === 'cityCode' && opts.cityCode
      ? await searchHotelsByCity({
          cityCode: opts.cityCode,
          checkIn: w.checkIn,
          checkOut: w.checkOut,
          adults: opts.adults,
          rooms: '1',
        })
      : opts.geoId
        ? await searchHotelsByGeoId({
            geoId: opts.geoId,
            checkIn: w.checkIn,
            checkOut: w.checkOut,
            adults: opts.adults,
            rooms: '1',
          })
        : [];
    if (hotels.length > 0) {
      return { hotels, sampledWindow: i === 0 ? null : w };
    }
  }
  return { hotels: [], sampledWindow: null };
}

function toOfferData(
  h: TAHotel,
  cityCode: string,
  checkIn: string,
  checkOut: string,
): HotelOfferData {
  const norm = normalizeHotel(h, cityCode, checkIn, checkOut);
  // Tripadvisor periodically drops live pricing for valid hotels (longer stays,
  // far-future dates). We still render those cards so the user can browse
  // properties and click through to detail; HotelCard shows "—" when
  // pricePerNight is 0 instead of a misleading €0.

  const photos = (h.cardPhotos || [])
    .map((p) => ({ uri: expandPhotoUrl(p.sizes?.urlTemplate) }))
    .filter((m) => m.uri);

  return {
    hotel: {
      hotelId: h.id,
      name: cleanHotelName(h.title),
      rating: String(Math.max(1, Math.min(5, Math.round(h.bubbleRating?.rating || 3)))),
      cityCode: cityCode,
      address: {
        lines: h.secondaryInfo ? [h.secondaryInfo] : h.primaryInfo ? [h.primaryInfo] : undefined,
        cityName: getCityFromIata(cityCode) || cityCode,
      },
      amenities: h.amenities || [],
      media: photos.length > 0 ? photos : undefined,
    },
    offers: [
      {
        id: `live-${h.id}`,
        price: {
          currency: 'EUR',
          total: String(norm.totalPrice),
          base: String(Math.round(norm.totalPrice * 0.85 * 100) / 100),
        },
        checkInDate: checkIn,
        checkOutDate: checkOut,
        policies: {
          cancellations: [{ amount: '0', deadline: checkIn }],
        },
      },
    ],
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityCode = searchParams.get('cityCode')?.toUpperCase();
  const cityQuery = searchParams.get('cityQuery')?.trim();
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');
  const adults = searchParams.get('adults') || '2';

  if ((!cityCode && !cityQuery) || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'Either cityCode or cityQuery, plus checkIn + checkOut, are required' },
      { status: 400 },
    );
  }

  // Flight path uses real IATA; road-trip uses the city name itself (no IATA
  // pretense). HotelOfferData.hotel.cityCode is purely an identifier shown on
  // the card; not consumed as IATA downstream for the road-trip flow.
  const effectiveCityCode = cityCode || (cityQuery || '').split(',')[0].trim();
  const cacheKey = cityCode
    ? `hotelsSearch:v4:${cityCode}:${checkIn}:${checkOut}:${adults}`
    : `hotelsSearch:v4:byQuery:${(cityQuery || '').toLowerCase()}:${checkIn}:${checkOut}:${adults}`;

  const cached = await getCached(cacheKey);
  if (cached) {
    // v3 entries store the {hotels, pricingNote} tuple; older v2 entries are
    // plain HotelOfferData[]. Both paths return the same response shape.
    const payload = cached.data as
      | HotelOfferData[]
      | { hotels: HotelOfferData[]; pricingNote: PricingNote | null };
    const hotels = Array.isArray(payload) ? payload : payload.hotels;
    const pricingNote = Array.isArray(payload) ? null : payload.pricingNote;
    return NextResponse.json({
      hotels,
      source: 'cached',
      count: hotels.length,
      pricingNote,
    });
  }

  if (!canMakeRapidApiCall()) {
    return NextResponse.json(
      {
        hotels: [],
        source: 'fallback',
        count: 0,
        warning: 'Daily hotel-search quota reached. Try again later.',
      },
      { status: 503 },
    );
  }

  try {
    recordRapidApiCall();
    let rawHotels: TAHotel[] = [];
    let sampledWindow: SampledWindow | null = null;

    if (cityCode) {
      const res = await searchHotelsWithWindowFallback({
        mode: 'cityCode',
        cityCode,
        checkIn,
        checkOut,
        adults,
      });
      rawHotels = res.hotels;
      sampledWindow = res.sampledWindow;
    } else {
      // Free-text query path — used by /road-trip for cities without an IATA
      // upstream. Mirror the flight side first by translating the city name
      // to a known IATA code; only when no IATA is reachable do we fall back
      // to the cityQuery → geoId cascade.
      const cityNameOnly = (cityQuery || '').split(',')[0].trim();
      const iata =
        resolveStaticIata(cityNameOnly) || (await resolveIataViaSearch(cityNameOnly));

      if (iata) {
        const res = await searchHotelsWithWindowFallback({
          mode: 'cityCode',
          cityCode: iata,
          checkIn,
          checkOut,
          adults,
        });
        rawHotels = res.hotels;
        sampledWindow = res.sampledWindow;
      }

      if (rawHotels.length === 0) {
        const geoId = await getGeoIdByQuery(cityQuery as string);
        if (geoId) {
          const res = await searchHotelsWithWindowFallback({
            mode: 'geoId',
            geoId,
            checkIn,
            checkOut,
            adults,
          });
          rawHotels = res.hotels;
          sampledWindow = res.sampledWindow;
        }
      }

      if (rawHotels.length === 0) {
        return NextResponse.json({
          hotels: [],
          source: 'live',
          count: 0,
          warning: `No hotels available in ${cityQuery} for the selected dates.`,
        });
      }
    }

    const hotels = rawHotels.map((h) =>
      toOfferData(h, effectiveCityCode, sampledWindow?.checkIn ?? checkIn, sampledWindow?.checkOut ?? checkOut),
    );

    if (hotels.length === 0) {
      return NextResponse.json({
        hotels: [],
        source: 'live',
        count: 0,
        warning: `No hotels available in ${cityQuery || cityCode} for the selected dates.`,
      });
    }

    const pricingNote: PricingNote | null = sampledWindow
      ? {
          sampledCheckIn: sampledWindow.checkIn,
          sampledCheckOut: sampledWindow.checkOut,
          userCheckIn: checkIn,
          userCheckOut: checkOut,
        }
      : null;

    await setCache(cacheKey, { hotels, pricingNote }, 60 * 24);
    return NextResponse.json({
      hotels,
      source: 'live',
      count: hotels.length,
      pricingNote,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[hotels/search] failed:', message);
    return NextResponse.json(
      {
        hotels: [],
        source: 'error',
        count: 0,
        warning: `Unable to fetch hotels: ${message}`,
      },
      { status: 500 },
    );
  }
}
