import { NextResponse } from 'next/server';
import { searchHotelOffers } from '@/lib/amadeus-client';
import { getCached, setCache } from '@/lib/cache';

interface FallbackOffer {
  type: 'hotel-offers';
  hotel: {
    type: 'hotel';
    hotelId: string;
    name: string;
    rating: string;
    cityCode: string;
    amenities: string[];
    address: { lines: string[]; cityName: string; countryCode: string };
    media: { uri: string }[];
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
  source: 'fallback';
}

const HOTEL_NAMES_BY_CITY: Record<string, string[]> = {
  PAR: ['Hotel Lumière Paris', 'Le Petit Montmartre', 'Seine River Suites', 'Eiffel Garden Hotel', 'Champs-Élysées Palace'],
  LON: ['Thames View Hotel', 'Kensington Boutique', 'London Bridge Inn', 'Soho Central Hotel', 'Mayfair Luxury Suites'],
  ROM: ['Colosseum View Inn', 'Roman Holiday Hotel', 'Trastevere Suites', 'Vatican Guesthouse', 'Pantheon Residences'],
  IST: ['Bosphorus Palace', 'Sultanahmet Suites', 'Istanbul Modern', 'Golden Horn Hotel', 'Beyoglu Boutique'],
  BCN: ['Gothic Quarter Inn', 'Barceloneta Beach Hotel', 'Eixample Suites', 'Park Güell Views', 'Las Ramblas Hotel'],
  AMS: ['Canal House Amsterdam', 'Jordaan Boutique', 'Vondelpark View Hotel', 'Anne Frank Suites', 'Dam Square Inn'],
  BUH: ['Athenee Palace', 'Old Town Bucharest', 'Herastrau View', 'Calea Victoriei Hotel', 'Royal Court Inn'],
  ATH: ['Acropolis View', 'Plaka Boutique', 'Athens Riviera', 'Lycabettus Hotel', 'Syntagma Suites'],
  DXB: ['Burj View Dubai', 'Jumeirah Beach Resort', 'Downtown Dubai Suites', 'Marina Walk Hotel', 'Palm Island Inn'],
  MAD: ['Gran Via Madrid', 'Retiro Park Hotel', 'Salamanca Boutique', 'Sol Plaza Hotel', 'Chueca Suites'],
};

function generateFallbackOffers(
  hotelIds: string[],
  checkInDate: string,
  checkOutDate: string,
  cityCode: string,
  currency = 'EUR'
): FallbackOffer[] {
  const nights = Math.max(
    1,
    Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86_400_000)
  );

  const names = HOTEL_NAMES_BY_CITY[cityCode] ?? HOTEL_NAMES_BY_CITY.PAR;
  const basePrices = [89, 120, 155, 195, 240];
  const stars = [3, 4, 4, 5, 5];
  const amenitiesList: string[][] = [
    ['WIFI', 'RESTAURANT'],
    ['WIFI', 'FITNESS_CENTER', 'RESTAURANT'],
    ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT'],
    ['WIFI', 'SWIMMING_POOL', 'SPA', 'FITNESS_CENTER', 'RESTAURANT', 'BAR'],
    ['WIFI', 'SWIMMING_POOL', 'SPA', 'FITNESS_CENTER', 'RESTAURANT', 'BAR', 'CONCIERGE'],
  ];

  return hotelIds.slice(0, 5).map((hotelId, index) => {
    const idx = index % 5;
    const basePrice = basePrices[idx];
    const totalBase = basePrice * nights;
    const totalWithTax = Math.round(totalBase * 1.2);
    return {
      type: 'hotel-offers',
      hotel: {
        type: 'hotel',
        hotelId,
        name: names[idx] || `Hotel ${cityCode} ${index + 1}`,
        rating: String(stars[idx]),
        cityCode,
        amenities: amenitiesList[idx],
        address: {
          lines: [`${index + 1} Main Street`],
          cityName: cityCode,
          countryCode: 'EU',
        },
        media: [],
      },
      offers: [
        {
          id: `fallback-offer-${hotelId}`,
          checkInDate,
          checkOutDate,
          rateCode: 'RAC',
          room: {
            type: idx >= 3 ? 'SUPERIOR_ROOM' : 'STANDARD_ROOM',
            typeEstimated: {
              category: idx >= 3 ? 'SUPERIOR_ROOM' : 'STANDARD_ROOM',
              beds: 1,
              bedType: 'DOUBLE',
            },
            description: { text: idx >= 3 ? 'Superior room with city view' : 'Comfortable standard room' },
          },
          price: {
            currency,
            base: String(totalBase),
            total: String(totalWithTax),
            variations: { average: { base: String(basePrice) } },
          },
          policies: {
            cancellations: [
              {
                deadline: `${checkInDate}T00:00:00`,
                amount: idx < 3 ? '0' : String(basePrice),
              },
            ],
            paymentType: 'GUARANTEE',
          },
        },
      ],
      source: 'fallback',
    };
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hotelIdsParam = searchParams.get('hotelIds');
  const checkInDate = searchParams.get('checkInDate');
  const checkOutDate = searchParams.get('checkOutDate');
  const adults = searchParams.get('adults') || '1';
  const cityCode = (searchParams.get('cityCode') || 'PAR').toUpperCase();

  if (!hotelIdsParam || !checkInDate || !checkOutDate) {
    return NextResponse.json(
      { error: 'hotelIds, checkInDate, checkOutDate required' },
      { status: 400 }
    );
  }

  const hotelIds = hotelIdsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  const cacheKey = `hotels_offers:${hotelIds.join(',')}:${checkInDate}:${checkOutDate}:${adults}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached.data, source: 'cached' });
  }

  try {
    const offers = await searchHotelOffers(hotelIds, checkInDate, checkOutDate, adults);
    if (offers.length > 0) {
      await setCache(cacheKey, offers, 30);
      return NextResponse.json({ data: offers, source: 'live' });
    }
    const fb = generateFallbackOffers(hotelIds, checkInDate, checkOutDate, cityCode);
    return NextResponse.json({ data: fb, source: 'fallback' });
  } catch (err) {
    console.error('[Hotels offers] error:', (err as Error)?.message);
    const fb = generateFallbackOffers(hotelIds, checkInDate, checkOutDate, cityCode);
    return NextResponse.json({ data: fb, source: 'fallback' });
  }
}
