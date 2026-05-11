/* GET /api/cars/search — rental cars from Tripadvisor16.
   Params: cityCode (IATA), pickUpDate, dropOffDate, [pickUpTime, dropOffTime, driverAge]
   Replaces the legacy airport-transfers route with real Tripadvisor car offers. */

import { NextResponse } from 'next/server';
import {
  getCarLocationId,
  searchCars,
  type TACar,
} from '@/lib/tripadvisor-client';
import { getCached, setCache } from '@/lib/cache';
import { canMakeRapidApiCall, recordRapidApiCall } from '@/lib/rateLimiter';
import { getCityFromIata } from '@/lib/iataMapping';

export interface NormalizedCar {
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
  source: 'live' | 'cached';
}

function normalize(c: TACar, source: 'live' | 'cached'): NormalizedCar {
  return { ...c, source };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityCode = searchParams.get('cityCode')?.toUpperCase();
  const pickUpDate = searchParams.get('pickUpDate');
  const dropOffDate = searchParams.get('dropOffDate');
  const pickUpTime = searchParams.get('pickUpTime') || '10:00';
  const dropOffTime = searchParams.get('dropOffTime') || '10:00';
  const driverAge = parseInt(searchParams.get('driverAge') || '25', 10);

  if (!cityCode || !pickUpDate || !dropOffDate) {
    return NextResponse.json(
      { error: 'cityCode, pickUpDate, dropOffDate are required' },
      { status: 400 },
    );
  }

  const cacheKey = `cars:${cityCode}:${pickUpDate}:${dropOffDate}:${driverAge}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    const cars = (cached.data as TACar[]).map((c) => normalize(c, 'cached'));
    return NextResponse.json({
      cars,
      source: 'cached',
      count: cars.length,
      cityName: getCityFromIata(cityCode),
    });
  }

  if (!canMakeRapidApiCall()) {
    return NextResponse.json({
      cars: [],
      source: 'fallback',
      count: 0,
      warning: 'Daily rental-cars quota reached. Try again later.',
    });
  }

  try {
    recordRapidApiCall();
    console.log(`[cars/search] resolving location for ${cityCode}`);
    const locationId = await getCarLocationId(cityCode);
    if (!locationId) {
      console.warn(`[cars/search] no locationId for ${cityCode}`);
      return NextResponse.json({
        cars: [],
        source: 'fallback',
        count: 0,
        warning: `Couldn't find a car-rental location for ${cityCode}. Tripadvisor returned no match.`,
        debug: { step: 'searchLocation', cityCode },
      });
    }

    console.log(`[cars/search] locationId=${locationId}, searching cars`);
    recordRapidApiCall();
    const taCars = await searchCars({
      pickUpLocationId: locationId,
      pickUpDate,
      dropOffDate,
      pickUpTime,
      dropOffTime,
      driverAge,
    });
    console.log(`[cars/search] got ${taCars.length} raw cars from Tripadvisor`);

    const cars = taCars
      .filter((c) => c.totalPrice > 0)
      .slice(0, 20)
      .map((c) => normalize(c, 'live'));

    if (cars.length === 0) {
      return NextResponse.json({
        cars: [],
        source: 'fallback',
        count: 0,
        warning: `No rental cars available in ${cityCode} for those dates.`,
        cityName: getCityFromIata(cityCode),
        debug: { step: 'searchCars', locationId, rawCount: taCars.length },
      });
    }

    await setCache(cacheKey, taCars, 60);
    return NextResponse.json({
      cars,
      source: 'live',
      count: cars.length,
      cityName: getCityFromIata(cityCode),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cars/search] Tripadvisor failed:', message);
    return NextResponse.json({
      cars: [],
      source: 'error',
      count: 0,
      warning: `Unable to fetch car-rental offers: ${message}`,
      debug: { error: message },
    });
  }
}
