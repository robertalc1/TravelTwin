import { NextResponse } from 'next/server';
import { amadeusRest } from '@/lib/amadeus-client';
import { getCached, setCache } from '@/lib/cache';

interface HotelLocation {
  hotelId: string;
  name?: string;
  iataCode?: string;
  geoCode?: { latitude: number; longitude: number };
  address?: { countryCode?: string };
}

interface FallbackHotelLocation {
  hotelId: string;
  name: string;
  cityCode: string;
  geoCode: { latitude: number; longitude: number };
}

const FALLBACK_HOTELS: Record<string, FallbackHotelLocation[]> = {
  PAR: [
    { hotelId: 'ADPAR001', name: 'Hotel de Crillon', cityCode: 'PAR', geoCode: { latitude: 48.8676, longitude: 2.3217 } },
    { hotelId: 'ADPAR002', name: 'Le Marais Boutique', cityCode: 'PAR', geoCode: { latitude: 48.8566, longitude: 2.3522 } },
    { hotelId: 'ADPAR003', name: 'Paris Garden Hotel', cityCode: 'PAR', geoCode: { latitude: 48.8490, longitude: 2.3418 } },
    { hotelId: 'ADPAR004', name: 'Eiffel Tower View Hotel', cityCode: 'PAR', geoCode: { latitude: 48.8584, longitude: 2.2945 } },
    { hotelId: 'ADPAR005', name: 'Champs-Élysées Palace', cityCode: 'PAR', geoCode: { latitude: 48.8698, longitude: 2.3076 } },
  ],
  LON: [
    { hotelId: 'ADLON001', name: 'The Savoy London', cityCode: 'LON', geoCode: { latitude: 51.5102, longitude: -0.1203 } },
    { hotelId: 'ADLON002', name: 'Covent Garden Hotel', cityCode: 'LON', geoCode: { latitude: 51.5133, longitude: -0.1255 } },
    { hotelId: 'ADLON003', name: 'Hyde Park Suites', cityCode: 'LON', geoCode: { latitude: 51.5074, longitude: -0.1657 } },
    { hotelId: 'ADLON004', name: 'Tower Bridge Inn', cityCode: 'LON', geoCode: { latitude: 51.5055, longitude: -0.0754 } },
    { hotelId: 'ADLON005', name: 'Mayfair Boutique', cityCode: 'LON', geoCode: { latitude: 51.5097, longitude: -0.1473 } },
  ],
  ROM: [
    { hotelId: 'ADROM001', name: 'Hotel Eden Roma', cityCode: 'ROM', geoCode: { latitude: 41.9109, longitude: 12.4818 } },
    { hotelId: 'ADROM002', name: 'Colosseum View Hotel', cityCode: 'ROM', geoCode: { latitude: 41.8902, longitude: 12.4924 } },
    { hotelId: 'ADROM003', name: 'Vatican Gardens Inn', cityCode: 'ROM', geoCode: { latitude: 41.9029, longitude: 12.4534 } },
    { hotelId: 'ADROM004', name: 'Trastevere Suites', cityCode: 'ROM', geoCode: { latitude: 41.8893, longitude: 12.4683 } },
    { hotelId: 'ADROM005', name: 'Pantheon Residences', cityCode: 'ROM', geoCode: { latitude: 41.8986, longitude: 12.4769 } },
  ],
  IST: [
    { hotelId: 'ADIST001', name: 'Sultanahmet Palace', cityCode: 'IST', geoCode: { latitude: 41.0082, longitude: 28.9784 } },
    { hotelId: 'ADIST002', name: 'Bosphorus View Hotel', cityCode: 'IST', geoCode: { latitude: 41.0422, longitude: 29.0082 } },
    { hotelId: 'ADIST003', name: 'Grand Bazaar Suites', cityCode: 'IST', geoCode: { latitude: 41.0105, longitude: 28.9667 } },
    { hotelId: 'ADIST004', name: 'Galata Tower Hotel', cityCode: 'IST', geoCode: { latitude: 41.0256, longitude: 28.9744 } },
    { hotelId: 'ADIST005', name: 'Beyoglu Boutique', cityCode: 'IST', geoCode: { latitude: 41.0369, longitude: 28.9850 } },
  ],
  BCN: [
    { hotelId: 'ADBCN001', name: 'Hotel Arts Barcelona', cityCode: 'BCN', geoCode: { latitude: 41.3851, longitude: 2.1734 } },
    { hotelId: 'ADBCN002', name: 'Gothic Quarter Inn', cityCode: 'BCN', geoCode: { latitude: 41.3828, longitude: 2.1761 } },
    { hotelId: 'ADBCN003', name: 'Sagrada Familia View', cityCode: 'BCN', geoCode: { latitude: 41.4036, longitude: 2.1744 } },
    { hotelId: 'ADBCN004', name: 'Barceloneta Beach Hotel', cityCode: 'BCN', geoCode: { latitude: 41.3793, longitude: 2.1928 } },
    { hotelId: 'ADBCN005', name: 'Park Güell Suites', cityCode: 'BCN', geoCode: { latitude: 41.4145, longitude: 2.1527 } },
  ],
  AMS: [
    { hotelId: 'ADAMS001', name: 'Canal House Amsterdam', cityCode: 'AMS', geoCode: { latitude: 52.3676, longitude: 4.9041 } },
    { hotelId: 'ADAMS002', name: 'Jordaan Boutique', cityCode: 'AMS', geoCode: { latitude: 52.3744, longitude: 4.8830 } },
    { hotelId: 'ADAMS003', name: 'Vondelpark View Hotel', cityCode: 'AMS', geoCode: { latitude: 52.3580, longitude: 4.8686 } },
  ],
  BUH: [
    { hotelId: 'ADBUH001', name: 'Athenee Palace Bucharest', cityCode: 'BUH', geoCode: { latitude: 44.4385, longitude: 26.0972 } },
    { hotelId: 'ADBUH002', name: 'Old Town Bucharest Inn', cityCode: 'BUH', geoCode: { latitude: 44.4317, longitude: 26.1042 } },
    { hotelId: 'ADBUH003', name: 'Herastrau Park Hotel', cityCode: 'BUH', geoCode: { latitude: 44.4711, longitude: 26.0827 } },
  ],
  ATH: [
    { hotelId: 'ADATH001', name: 'Acropolis View Hotel', cityCode: 'ATH', geoCode: { latitude: 37.9715, longitude: 23.7257 } },
    { hotelId: 'ADATH002', name: 'Plaka Boutique', cityCode: 'ATH', geoCode: { latitude: 37.9728, longitude: 23.7315 } },
    { hotelId: 'ADATH003', name: 'Athens Riviera Suites', cityCode: 'ATH', geoCode: { latitude: 37.9356, longitude: 23.6493 } },
  ],
  DXB: [
    { hotelId: 'ADDXB001', name: 'Burj View Dubai', cityCode: 'DXB', geoCode: { latitude: 25.1972, longitude: 55.2744 } },
    { hotelId: 'ADDXB002', name: 'Jumeirah Beach Hotel', cityCode: 'DXB', geoCode: { latitude: 25.1414, longitude: 55.1856 } },
    { hotelId: 'ADDXB003', name: 'Downtown Dubai Suites', cityCode: 'DXB', geoCode: { latitude: 25.2048, longitude: 55.2708 } },
  ],
  MAD: [
    { hotelId: 'ADMAD001', name: 'Gran Via Madrid', cityCode: 'MAD', geoCode: { latitude: 40.4200, longitude: -3.7050 } },
    { hotelId: 'ADMAD002', name: 'Retiro Park Hotel', cityCode: 'MAD', geoCode: { latitude: 40.4153, longitude: -3.6844 } },
    { hotelId: 'ADMAD003', name: 'Salamanca Boutique', cityCode: 'MAD', geoCode: { latitude: 40.4283, longitude: -3.6797 } },
  ],
};

const DEFAULT_FALLBACK: FallbackHotelLocation[] = [
  { hotelId: 'ADDEF001', name: 'Central City Hotel', cityCode: 'DEF', geoCode: { latitude: 48.8566, longitude: 2.3522 } },
  { hotelId: 'ADDEF002', name: 'Airport Comfort Inn', cityCode: 'DEF', geoCode: { latitude: 48.8490, longitude: 2.3418 } },
  { hotelId: 'ADDEF003', name: 'Business Traveler Suite', cityCode: 'DEF', geoCode: { latitude: 48.8676, longitude: 2.3217 } },
];

function getFallbackList(cityCode: string): FallbackHotelLocation[] {
  return FALLBACK_HOTELS[cityCode] ?? DEFAULT_FALLBACK.map((h) => ({ ...h, cityCode }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityCode = searchParams.get('cityCode')?.toUpperCase();
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');
  const radius = searchParams.get('radius') || '20';

  if (!cityCode && (!latitude || !longitude)) {
    return NextResponse.json(
      { error: 'cityCode OR (latitude+longitude) required' },
      { status: 400 }
    );
  }

  const cacheKey = cityCode
    ? `hotels_list:${cityCode}:${radius}`
    : `hotels_list:${latitude},${longitude}:${radius}`;

  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached.data, source: 'cached' });
  }

  try {
    const path = cityCode
      ? '/v1/reference-data/locations/hotels/by-city'
      : '/v1/reference-data/locations/hotels/by-geocode';

    const params: Record<string, string | number> = cityCode
      ? { cityCode, radius, radiusUnit: 'KM', hotelSource: 'ALL' }
      : { latitude: latitude!, longitude: longitude!, radius, radiusUnit: 'KM' };

    const data = await amadeusRest(path, params);
    const list = ((data as { data?: HotelLocation[] }).data || []).slice(0, 20);

    if (list.length === 0) {
      const fb = getFallbackList(cityCode || 'DEFAULT');
      return NextResponse.json({ data: fb, source: 'fallback' });
    }

    await setCache(cacheKey, list, 60);
    return NextResponse.json({ data: list, source: 'live' });
  } catch (err) {
    console.error('[Hotels list] error:', (err as Error)?.message);
    const fb = getFallbackList(cityCode || 'DEFAULT');
    return NextResponse.json({ data: fb, source: 'fallback' });
  }
}
