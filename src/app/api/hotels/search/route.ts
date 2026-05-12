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
  type TAHotel,
} from '@/lib/tripadvisor-client';
import { normalizeHotel } from '@/lib/tripadvisor-normalize';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';
import { getCityFromIata } from '@/lib/iataMapping';

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

function toOfferData(
  h: TAHotel,
  cityCode: string,
  checkIn: string,
  checkOut: string,
): HotelOfferData | null {
  const norm = normalizeHotel(h, cityCode, checkIn, checkOut);
  if (norm.totalPrice <= 0) return null;

  const photos = (h.cardPhotos || [])
    .map((p) => ({ uri: expandPhotoUrl(p.sizes?.urlTemplate) }))
    .filter((m) => m.uri);

  return {
    hotel: {
      hotelId: h.id,
      name: cleanHotelName(h.title),
      rating: String(Math.max(1, Math.min(5, Math.round(h.bubbleRating?.rating || 3)))),
      cityCode: cityCode.toUpperCase(),
      address: {
        lines: h.secondaryInfo ? [h.secondaryInfo] : h.primaryInfo ? [h.primaryInfo] : undefined,
        cityName: getCityFromIata(cityCode),
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
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');
  const adults = searchParams.get('adults') || '2';

  if (!cityCode || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'cityCode, checkIn, checkOut are required' },
      { status: 400 },
    );
  }

  const cacheKey = `hotelsSearch:v2:${cityCode}:${checkIn}:${checkOut}:${adults}`;
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
    const rawHotels = await searchHotelsByCity({
      cityCode,
      checkIn,
      checkOut,
      adults,
      rooms: '1',
    });

    const hotels = rawHotels
      .map((h) => toOfferData(h, cityCode, checkIn, checkOut))
      .filter((o): o is HotelOfferData => o !== null);

    if (hotels.length === 0) {
      return NextResponse.json({
        hotels: [],
        source: 'live',
        count: 0,
        warning: `No hotels available in ${cityCode} for the selected dates.`,
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
