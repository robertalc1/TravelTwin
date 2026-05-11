/* Airport transfer estimator. Tripadvisor16 does not offer a transfer-quotes
   endpoint, so this route always returns a dynamic fallback computed from
   real airport coordinates + haversine distance. Path kept at /api/amadeus/
   transfers to avoid breaking existing frontend consumers. */

import { NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/cache';
import { getAirportCoord, haversineKm } from '@/lib/airportCoordinates';

export interface TransferOffer {
  id: string;
  transferType: string;
  start?: { dateTime?: string; locationCode?: string };
  end?: { address?: { line?: string; cityName?: string } };
  vehicle: {
    code: string;
    description: string;
    seats: { count: number }[];
    baggages: { count: number; size: string }[];
    imageURL?: string;
  };
  serviceProvider: {
    name: string;
    logoUrl?: string;
    rating?: string;
  };
  quotation: {
    monetaryAmount: string;
    currencyCode: string;
    isEstimated?: boolean;
  };
  distance: { value: number; unit: string };
  duration: string;
  source?: 'live' | 'cached' | 'fallback';
}

function durationToISO(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `PT${h}H${m}M`;
  if (h > 0) return `PT${h}H`;
  return `PT${m}M`;
}

function buildDynamicFallback(
  startLocationCode: string,
  endCityName: string,
  endLat: number,
  endLng: number,
): TransferOffer[] {
  const airport = getAirportCoord(startLocationCode);
  const airportLat = airport?.lat ?? endLat + 0.3;
  const airportLng = airport?.lng ?? endLng + 0.2;

  const distanceKm = Math.max(5, Math.round(haversineKm(airportLat, airportLng, endLat, endLng)));

  const sedanPrice = Math.round(Math.max(25, distanceKm * 1.8));
  const businessPrice = Math.round(sedanPrice * 1.9);
  const vanPrice = Math.round(sedanPrice * 2.7);

  const durationMinutes = Math.max(12, Math.round((distanceKm / 45) * 60));
  const durationISO = durationToISO(durationMinutes);

  const cityHash = endCityName ? endCityName.toLowerCase().replace(/\s+/g, '-') : 'dest';

  return [
    {
      id: `fallback-sedan-${startLocationCode}-${cityHash}`,
      transferType: 'PRIVATE',
      vehicle: {
        code: 'CAR',
        description: 'Economy Sedan',
        seats: [{ count: 3 }],
        baggages: [{ count: 2, size: 'M' }],
      },
      serviceProvider: { name: 'Local Transfer Co.', rating: '4.2' },
      quotation: {
        monetaryAmount: String(sedanPrice),
        currencyCode: 'EUR',
        isEstimated: true,
      },
      distance: { value: distanceKm, unit: 'KM' },
      duration: durationISO,
      source: 'fallback',
    },
    {
      id: `fallback-business-${startLocationCode}-${cityHash}`,
      transferType: 'PRIVATE',
      vehicle: {
        code: 'CAR',
        description: 'Business Class',
        seats: [{ count: 3 }],
        baggages: [{ count: 3, size: 'L' }],
      },
      serviceProvider: { name: 'Premium Transfers', rating: '4.7' },
      quotation: {
        monetaryAmount: String(businessPrice),
        currencyCode: 'EUR',
        isEstimated: true,
      },
      distance: { value: distanceKm, unit: 'KM' },
      duration: durationISO,
      source: 'fallback',
    },
    {
      id: `fallback-van-${startLocationCode}-${cityHash}`,
      transferType: 'PRIVATE',
      vehicle: {
        code: 'VAN',
        description: 'Comfort Van (up to 6)',
        seats: [{ count: 6 }],
        baggages: [{ count: 6, size: 'L' }],
      },
      serviceProvider: { name: 'Group Transfers', rating: '4.5' },
      quotation: {
        monetaryAmount: String(vanPrice),
        currencyCode: 'EUR',
        isEstimated: true,
      },
      distance: { value: distanceKm, unit: 'KM' },
      duration: durationISO,
      source: 'fallback',
    },
  ];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const startLocationCode = searchParams.get('startLocationCode');
  const endGeoCode = searchParams.get('endGeoCode');
  const endCityName = searchParams.get('endCityName') || 'Destination';
  const startDateTime = searchParams.get('startDateTime');
  const adults = searchParams.get('adults') || '1';

  if (!startLocationCode || !endGeoCode || !startDateTime) {
    return NextResponse.json(
      { error: 'Missing required parameters: startLocationCode, endGeoCode, startDateTime' },
      { status: 400 },
    );
  }

  const [endLatStr, endLngStr] = endGeoCode.split(',');
  const endLat = Number(endLatStr);
  const endLng = Number(endLngStr);
  const haveEndCoords = Number.isFinite(endLat) && Number.isFinite(endLng);

  const cacheKey = `transfers:${startLocationCode}:${endGeoCode}:${startDateTime}:${adults}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached.data, source: 'cached' });
  }

  if (!haveEndCoords) {
    return NextResponse.json({ data: [], source: 'fallback' });
  }

  const offers = buildDynamicFallback(startLocationCode, endCityName, endLat, endLng);
  await setCache(cacheKey, offers, 60 * 24); // 24h — purely static math
  return NextResponse.json({ data: offers, source: 'fallback' });
}
