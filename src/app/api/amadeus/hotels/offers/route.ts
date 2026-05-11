/* Hotels offers endpoint — returns Amadeus-shaped hotel-offer cards from
   live Tripadvisor16 data. Used by the TripDetail HotelsTab. */

import { NextResponse } from 'next/server';
import { searchHotelsByCity, type TAHotel } from '@/lib/tripadvisor-client';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';
import { getHotelImage } from '@/lib/hotelImages';
import { getCityFromIata, getCountryFromIata } from '@/lib/iataMapping';

interface AmadeusShapedOffer {
  type: 'hotel-offers';
  hotel: {
    type: 'hotel';
    hotelId: string;
    name: string;
    rating: string;
    cityCode: string;
    amenities: string[];
    address: { lines: string[]; cityName: string; countryCode: string };
    latitude: number;
    longitude: number;
    media: { uri: string; category?: string }[];
  };
  offers: Array<{
    id: string;
    checkInDate: string;
    checkOutDate: string;
    rateCode: string;
    room: {
      type: string;
      typeEstimated: { category: string; beds: number; bedType: string };
      description: { text: string };
    };
    price: {
      currency: string;
      base: string;
      total: string;
      variations: { average: { base: string } };
    };
    policies: {
      cancellations: { deadline: string; amount: string }[];
      paymentType: string;
    };
  }>;
  source: 'live' | 'cached';
}

function parsePriceDisplay(s: string): { value: number; currency: string } {
  const currency = s.includes('€')
    ? 'EUR'
    : s.includes('£')
      ? 'GBP'
      : s.includes('$')
        ? 'USD'
        : 'EUR';
  const value = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
  return { value, currency };
}

function mapTAToAmadeus(
  h: TAHotel,
  cityCode: string,
  checkInDate: string,
  checkOutDate: string,
  nights: number,
): AmadeusShapedOffer {
  const priceStr = h.priceForDisplay || h.strikethroughPrice || '';
  const { value: rawPrice, currency } = parsePriceDisplay(priceStr);

  const detailsLower = (h.priceDetails || '').toLowerCase();
  const isPerNight = detailsLower.includes('per night') || detailsLower.includes('/ night');
  const pricePerNight = isPerNight ? rawPrice : rawPrice / Math.max(1, nights);
  const total = Math.round(pricePerNight * nights * 100) / 100;

  const ratingFloat = h.bubbleRating?.rating ?? 0;
  const stars = Math.max(1, Math.min(5, Math.round(ratingFloat)));

  const name = h.title || `${getCityFromIata(cityCode)} Hotel`;
  const address = h.secondaryInfo || h.primaryInfo || '';
  const amenities = (h.amenities || []).slice(0, 6);
  const photoTemplate = h.cardPhotos?.[0]?.sizes?.urlTemplate;
  const photoUri = photoTemplate
    ? photoTemplate.replace(/\{width\}/g, '800').replace(/\{height\}/g, '600')
    : getHotelImage(name, getCityFromIata(cityCode), stars);

  return {
    type: 'hotel-offers',
    hotel: {
      type: 'hotel',
      hotelId: h.id,
      name,
      rating: String(stars),
      cityCode,
      amenities,
      address: {
        lines: [address],
        cityName: getCityFromIata(cityCode),
        countryCode: getCountryFromIata(cityCode).slice(0, 2).toUpperCase() || 'EU',
      },
      latitude: 0,
      longitude: 0,
      media: photoUri ? [{ uri: photoUri, category: 'EXTERIOR' }] : [],
    },
    offers: [
      {
        id: `ta-offer-${h.id}`,
        checkInDate,
        checkOutDate,
        rateCode: 'RAC',
        room: {
          type: stars >= 4 ? 'SUPERIOR_ROOM' : 'STANDARD_ROOM',
          typeEstimated: {
            category: stars >= 4 ? 'SUPERIOR_ROOM' : 'STANDARD_ROOM',
            beds: 1,
            bedType: 'DOUBLE',
          },
          description: {
            text:
              stars >= 5
                ? 'Luxury suite with premium amenities and city views'
                : stars >= 4
                  ? 'Superior room with modern amenities'
                  : 'Comfortable standard room in a prime location',
          },
        },
        price: {
          currency,
          base: String(Math.round(pricePerNight * nights * 100) / 100),
          total: String(total),
          variations: {
            average: { base: String(Math.round(pricePerNight * 100) / 100) },
          },
        },
        policies: {
          cancellations: [
            {
              deadline: `${checkInDate}T00:00:00`,
              amount: stars <= 4 ? '0' : String(Math.round(pricePerNight)),
            },
          ],
          paymentType: 'GUARANTEE',
        },
      },
    ],
    source: 'live',
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hotelIdsParam = searchParams.get('hotelIds');
  const checkInDate = searchParams.get('checkInDate');
  const checkOutDate = searchParams.get('checkOutDate');
  const adults = searchParams.get('adults') || '1';
  const cityCode = (searchParams.get('cityCode') || '').toUpperCase();

  if (!hotelIdsParam || !checkInDate || !checkOutDate || !cityCode) {
    return NextResponse.json(
      { error: 'hotelIds, checkInDate, checkOutDate, cityCode required' },
      { status: 400 },
    );
  }

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86_400_000,
    ),
  );

  const cacheKey = `ta_offers:${cityCode}:${checkInDate}:${checkOutDate}:${adults}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached.data, source: 'cached' });
  }

  if (!canMakeRapidApiCall()) {
    return NextResponse.json({
      data: [],
      source: 'fallback',
      warning: 'Hotel quota reached for today. Try again later.',
    });
  }

  try {
    recordRapidApiCall();
    const taHotels = await searchHotelsByCity({
      cityCode,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults,
      rooms: '1',
    });

    const offers = taHotels
      .map((h) => mapTAToAmadeus(h, cityCode, checkInDate, checkOutDate, nights))
      .filter((o) => parseFloat(o.offers[0].price.total) > 0)
      .slice(0, 12);

    if (offers.length === 0) {
      return NextResponse.json({
        data: [],
        source: 'fallback',
        warning: `No hotels found in ${cityCode} for the selected dates.`,
      });
    }

    await setCache(cacheKey, offers, 60);
    return NextResponse.json({ data: offers, source: 'live' });
  } catch (err: unknown) {
    console.error('[hotels/offers] Tripadvisor failed:', (err as Error)?.message);
    return NextResponse.json({
      data: [],
      source: 'error',
      warning: 'Unable to fetch hotel prices right now. Try again.',
    });
  }
}
