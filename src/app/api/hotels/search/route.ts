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
    ? `hotelsSearch:v2:${cityCode}:${checkIn}:${checkOut}:${adults}`
    : `hotelsSearch:v3:byQuery:${(cityQuery || '').toLowerCase()}:${checkIn}:${checkOut}:${adults}`;

  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({
      hotels: cached.data,
      source: 'cached',
      count: (cached.data as HotelOfferData[]).length,
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
    let rawHotels: TAHotel[];
    if (cityCode) {
      rawHotels = await searchHotelsByCity({
        cityCode,
        checkIn,
        checkOut,
        adults,
        rooms: '1',
      });
    } else {
      // Free-text query path — used by /road-trip for cities without an IATA
      // upstream. Strategy: mirror the flight side first by translating the
      // city name to a known IATA code (static map, then Tripadvisor's
      // /flights/searchAirport which powers our autocomplete). That lets us
      // reuse searchHotelsByCity exactly as the flight tab does. Only when no
      // IATA is reachable do we fall back to the cityQuery → geoId cascade.
      const cityNameOnly = (cityQuery || '').split(',')[0].trim();
      const iata =
        resolveStaticIata(cityNameOnly) || (await resolveIataViaSearch(cityNameOnly));

      if (iata) {
        rawHotels = await searchHotelsByCity({
          cityCode: iata,
          checkIn,
          checkOut,
          adults,
          rooms: '1',
        });
      } else {
        rawHotels = [];
      }

      // Either the IATA path was unavailable, or it came back empty (small
      // popas city with no Tripadvisor airport entry). Cascade fallback runs
      // the multi-endpoint geoId resolver and queries searchHotelsByGeoId.
      if (rawHotels.length === 0) {
        const geoId = await getGeoIdByQuery(cityQuery as string);
        if (geoId) {
          rawHotels = await searchHotelsByGeoId({
            geoId,
            checkIn,
            checkOut,
            adults,
            rooms: '1',
          });
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
      toOfferData(h, effectiveCityCode, checkIn, checkOut),
    );

    if (hotels.length === 0) {
      return NextResponse.json({
        hotels: [],
        source: 'live',
        count: 0,
        warning: `No hotels available in ${cityQuery || cityCode} for the selected dates.`,
      });
    }

    await setCache(cacheKey, hotels, 60 * 24);
    return NextResponse.json({
      hotels,
      source: 'live',
      count: hotels.length,
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
