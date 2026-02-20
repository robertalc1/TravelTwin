import { NextResponse } from 'next/server';
import amadeus from '@/lib/amadeus';
import { getCached, setCache } from '@/lib/cache';
import { canMakeAmadeusCall, recordAmadeusCall } from '@/lib/rateLimiter';
import { getCityFromIata } from '@/lib/iataMapping';
import type { NormalizedHotel } from '@/lib/supabase/types';

function normalizeAmadeusHotel(
  offer: Record<string, unknown>,
  cityCode: string
): NormalizedHotel {
  const hotel = offer.hotel as Record<string, unknown> | undefined;
  const offers = (offer.offers as Record<string, unknown>[]) || [];
  const firstOffer = offers[0] || {};
  const price = firstOffer.price as Record<string, unknown> | undefined;
  const room = firstOffer.room as Record<string, unknown> | undefined;
  const roomDesc = room?.description as Record<string, unknown> | undefined;
  const policies = firstOffer.policies as Record<string, unknown> | undefined;
  const cancellation = policies?.cancellations as
    | Record<string, unknown>[]
    | undefined;

  const totalPrice = parseFloat(price?.total as string) || 0;
  const checkIn = (firstOffer.checkInDate as string) || '';
  const checkOut = (firstOffer.checkOutDate as string) || '';
  const nights =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.ceil(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              86400000
          )
        )
      : 1;

  // Sanity check: price per night should be reasonable (< $5000)
  const rawPricePerNight = totalPrice / nights;
  const pricePerNight =
    rawPricePerNight > 5000
      ? Math.round(rawPricePerNight / 100) // Might be in minor currency units
      : Math.round(rawPricePerNight * 100) / 100;

  const correctedTotal = Math.round(pricePerNight * nights * 100) / 100;

  return {
    id: (hotel?.hotelId as string) || crypto.randomUUID(),
    name: (hotel?.name as string) || 'Unknown Hotel',
    cityCode,
    cityName: getCityFromIata(cityCode),
    address:
      ((hotel?.address as Record<string, unknown>)?.lines as string[])?.join(
        ', '
      ) || '',
    rating: parseInt(hotel?.rating as string) || 3,
    pricePerNight,
    totalPrice: correctedTotal,
    currency: (price?.currency as string) || 'USD',
    roomType:
      (roomDesc?.text as string) ||
      ((room?.typeEstimated as Record<string, unknown>)
        ?.category as string) ||
      'Standard Room',
    amenities: ((hotel?.amenities as string[]) || []).slice(0, 6),
    cancellationPolicy: cancellation?.[0]
      ? `Free cancellation before ${
          (cancellation[0].deadline as string)?.split('T')[0] || 'check-in'
        }`
      : 'Non-refundable',
    source: 'live',
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get('cityCode')?.toUpperCase();
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const adults = searchParams.get('adults') || '1';
    const rooms = searchParams.get('rooms') || '1';

    if (!cityCode || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: 'Missing required params: cityCode, checkInDate, checkOutDate' },
        { status: 400 }
      );
    }

    // 1. Check cache (30 min TTL)
    const cacheKey = `hotel:${cityCode}:${checkInDate}:${checkOutDate}:${adults}:${rooms}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      const hotels = (cached.data as NormalizedHotel[]).map((h) => ({
        ...h,
        source: 'cached' as const,
      }));
      return NextResponse.json({ hotels, source: 'cached', count: hotels.length });
    }

    // 2. Try Amadeus API
    if (canMakeAmadeusCall()) {
      try {
        // First get hotel IDs for the city
        recordAmadeusCall();
        const hotelsResponse =
          await amadeus.referenceData.locations.hotels.byCity.get({
            cityCode,
            radius: 30,
            radiusUnit: 'KM',
          });

        const hotelIds = (
          (hotelsResponse.data || []) as Record<string, unknown>[]
        )
          .slice(0, 20)
          .map((h) => h.hotelId as string)
          .filter(Boolean);

        if (hotelIds.length > 0) {
          recordAmadeusCall();
          const offersResponse =
            await amadeus.shopping.hotelOffersSearch.get({
              hotelIds: hotelIds.join(','),
              checkInDate,
              checkOutDate,
              adults,
              roomQuantity: rooms,
              currency: 'USD',
            });

          const hotels: NormalizedHotel[] = (
            (offersResponse.data || []) as Record<string, unknown>[]
          ).map((offer) => normalizeAmadeusHotel(offer, cityCode));

          if (hotels.length > 0) {
            await setCache(cacheKey, hotels, 30);
            return NextResponse.json({
              hotels,
              source: 'live',
              count: hotels.length,
            });
          }
        }

        // No hotels found
        return NextResponse.json({
          hotels: [],
          source: 'live',
          count: 0,
          warning: `No hotels found in ${cityCode} for the selected dates. Try different dates.`,
        });
      } catch (err: unknown) {
        const error = err as {
          response?: { statusCode?: number };
          message?: string;
        };
        console.warn(
          '[Hotels] Amadeus error:',
          error?.response?.statusCode || error?.message
        );
      }
    }

    // 3. Rate-limited or Amadeus unavailable — friendly error
    return NextResponse.json({
      hotels: [],
      source: 'error',
      count: 0,
      warning: 'Unable to fetch live hotel prices right now. Please try again in a moment.',
    });
  } catch (error) {
    console.error('[Hotels] Unexpected error:', error);
    return NextResponse.json(
      {
        hotels: [],
        source: 'error',
        count: 0,
        warning: 'Search failed. Please try again.',
      },
      { status: 200 }
    );
  }
}
