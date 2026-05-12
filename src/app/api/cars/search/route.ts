/* GET /api/cars/search — Returns a Rentalcars.com partner deep-link.
   The Tripadvisor16 car-rental product is currently broken upstream
   (returns "Something went wrong" for every query/placeId — including
   their own playground default). Until they restore it, the trip flow
   delegates to a partner and the route exists as a stable contract for
   any legacy callers. */

import { NextResponse } from 'next/server';
import { getCityFromIata } from '@/lib/iataMapping';
import { buildRentalcarsUrl } from '@/lib/rentalcarsLink';

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
  source: 'live' | 'cached' | 'fallback';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityCode = searchParams.get('cityCode')?.toUpperCase();
  const pickUpDate = searchParams.get('pickUpDate');
  const dropOffDate = searchParams.get('dropOffDate');

  if (!cityCode || !pickUpDate || !dropOffDate) {
    return NextResponse.json(
      { error: 'cityCode, pickUpDate, dropOffDate are required' },
      { status: 400 },
    );
  }

  const partnerUrl = buildRentalcarsUrl({ iata: cityCode, pickUpDate, dropOffDate });

  return NextResponse.json({
    cars: [],
    source: 'partner',
    count: 0,
    cityName: getCityFromIata(cityCode),
    partner: { name: 'Rentalcars.com', url: partnerUrl },
    warning:
      'Live car-rental search is temporarily handled by our partner Rentalcars.com — open the link to compare real offers.',
  });
}
