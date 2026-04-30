import { NextResponse } from 'next/server';
import { amadeusRest } from '@/lib/amadeus-client';
import { getCached, setCache } from '@/lib/cache';

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

function fallbackTransfers(cityName: string): TransferOffer[] {
  return [
    {
      id: `fb-economy-${cityName}`,
      transferType: 'PRIVATE',
      vehicle: {
        code: 'CAR',
        description: 'Economy Sedan',
        seats: [{ count: 3 }],
        baggages: [{ count: 2, size: 'M' }],
      },
      serviceProvider: { name: 'Local Transfer Co.', rating: '4.2' },
      quotation: { monetaryAmount: '45.00', currencyCode: 'EUR', isEstimated: true },
      distance: { value: 25, unit: 'KM' },
      duration: 'PT35M',
      source: 'fallback',
    },
    {
      id: `fb-business-${cityName}`,
      transferType: 'PRIVATE',
      vehicle: {
        code: 'CAR',
        description: 'Business Class',
        seats: [{ count: 3 }],
        baggages: [{ count: 3, size: 'L' }],
      },
      serviceProvider: { name: 'Premium Transfers', rating: '4.7' },
      quotation: { monetaryAmount: '85.00', currencyCode: 'EUR', isEstimated: true },
      distance: { value: 25, unit: 'KM' },
      duration: 'PT35M',
      source: 'fallback',
    },
    {
      id: `fb-van-${cityName}`,
      transferType: 'PRIVATE',
      vehicle: {
        code: 'VAN',
        description: 'Comfort Van (up to 6)',
        seats: [{ count: 6 }],
        baggages: [{ count: 6, size: 'L' }],
      },
      serviceProvider: { name: 'Group Transfers', rating: '4.5' },
      quotation: { monetaryAmount: '120.00', currencyCode: 'EUR', isEstimated: true },
      distance: { value: 25, unit: 'KM' },
      duration: 'PT35M',
      source: 'fallback',
    },
  ];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const startLocationCode = searchParams.get('startLocationCode');
  const endGeoCode = searchParams.get('endGeoCode');
  const endAddressLine = searchParams.get('endAddressLine') || 'City Center';
  const endCityName = searchParams.get('endCityName') || 'Destination';
  const endCountryCode = searchParams.get('endCountryCode') || 'FR';
  const endName = searchParams.get('endName') || endCityName;
  const endZipCode = searchParams.get('endZipCode') || '00000';
  const startDateTime = searchParams.get('startDateTime');
  const adults = searchParams.get('adults') || '1';

  if (!startLocationCode || !endGeoCode || !startDateTime) {
    return NextResponse.json(
      { error: 'Missing required parameters: startLocationCode, endGeoCode, startDateTime' },
      { status: 400 }
    );
  }

  const cacheKey = `transfers:${startLocationCode}:${endGeoCode}:${startDateTime}:${adults}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached.data, source: 'cached' });
  }

  try {
    const data = await amadeusRest('/v1/shopping/transfer-offers', {
      startLocationCode,
      endAddressLine,
      endCityName,
      endZipCode,
      endCountryCode,
      endName,
      endGeoCode,
      transferType: 'PRIVATE',
      startDateTime,
      adults,
    });

    const offers = ((data as { data?: TransferOffer[] }).data || []).map((o) => ({
      ...o,
      source: 'live' as const,
    }));

    if (offers.length > 0) {
      await setCache(cacheKey, offers, 30);
      return NextResponse.json({ data: offers, source: 'live' });
    }

    const fb = fallbackTransfers(endCityName);
    return NextResponse.json({ data: fb, source: 'fallback' });
  } catch (err) {
    console.error('[Transfers] error:', (err as Error)?.message);
    const fb = fallbackTransfers(endCityName);
    return NextResponse.json({ data: fb, source: 'fallback' });
  }
}
