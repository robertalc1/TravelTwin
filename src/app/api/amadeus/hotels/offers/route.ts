import { NextResponse } from 'next/server';
import { searchHotelOffers } from '@/lib/amadeus-client';
import { getCached, setCache } from '@/lib/cache';

interface CityHotelTemplate {
  name: string;
  address: string;
  stars: number;
  pricePerNight: number;
  amenities: string[];
  lat: number;
  lng: number;
  imageQuery: string;
}

const CITY_HOTELS: Record<string, CityHotelTemplate[]> = {
  ATH: [
    { name: 'Acropolis View Hotel', address: 'Dionysiou Areopagitou 15, Athens', stars: 4, pricePerNight: 120, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 37.9715, lng: 23.7257, imageQuery: 'athens acropolis hotel' },
    { name: 'Plaka Boutique', address: 'Adrianou 28, Plaka, Athens', stars: 3, pricePerNight: 85, amenities: ['WIFI', 'FITNESS_CENTER', 'RESTAURANT'], lat: 37.9745, lng: 23.7296, imageQuery: 'athens boutique hotel' },
    { name: 'Athens Riviera Resort', address: 'Posidonos 40, Glyfada, Athens', stars: 5, pricePerNight: 220, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER'], lat: 37.8677, lng: 23.7516, imageQuery: 'athens luxury hotel pool' },
    { name: 'Monastiraki Square Inn', address: 'Monastiraki Square 5, Athens', stars: 3, pricePerNight: 75, amenities: ['WIFI', 'RESTAURANT'], lat: 37.9756, lng: 23.7234, imageQuery: 'athens city hotel' },
    { name: 'Grande Bretagne Athens', address: 'Syntagma Square 1, Athens', stars: 5, pricePerNight: 350, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER', 'BAR'], lat: 37.9753, lng: 23.7354, imageQuery: 'grand hotel athens luxury' },
  ],
  IST: [
    { name: 'Sultanahmet Palace Hotel', address: 'Torun Sokak 19, Sultanahmet, Istanbul', stars: 4, pricePerNight: 110, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 41.0054, lng: 28.9768, imageQuery: 'istanbul sultanahmet hotel' },
    { name: 'Bosphorus View Suites', address: 'Ciragan Cad 32, Besiktas, Istanbul', stars: 5, pricePerNight: 280, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER'], lat: 41.0456, lng: 29.0034, imageQuery: 'istanbul bosphorus luxury hotel' },
    { name: 'Grand Bazaar Boutique', address: 'Kapalıçarşı, Beyazıt, Istanbul', stars: 3, pricePerNight: 72, amenities: ['WIFI', 'RESTAURANT'], lat: 41.0107, lng: 28.9680, imageQuery: 'istanbul boutique hotel' },
    { name: 'Beyoglu Modern Hotel', address: 'Istiklal Cad 45, Beyoglu, Istanbul', stars: 4, pricePerNight: 135, amenities: ['WIFI', 'FITNESS_CENTER', 'RESTAURANT', 'BAR'], lat: 41.0336, lng: 28.9775, imageQuery: 'istanbul modern hotel' },
    { name: 'Galata Tower Residences', address: 'Galata Kulesi Sk 8, Karakoy, Istanbul', stars: 4, pricePerNight: 160, amenities: ['WIFI', 'RESTAURANT', 'BAR', 'SWIMMING_POOL'], lat: 41.0256, lng: 28.9744, imageQuery: 'istanbul galata hotel rooftop' },
  ],
  PAR: [
    { name: 'Hotel Lumière Montmartre', address: '18 Rue Lepic, Montmartre, Paris', stars: 4, pricePerNight: 155, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 48.8845, lng: 2.3369, imageQuery: 'paris montmartre hotel' },
    { name: 'Le Marais Boutique Hotel', address: '42 Rue de Bretagne, Le Marais, Paris', stars: 4, pricePerNight: 180, amenities: ['WIFI', 'FITNESS_CENTER', 'RESTAURANT'], lat: 48.8605, lng: 2.3616, imageQuery: 'paris marais boutique hotel' },
    { name: 'Eiffel Seine Suites', address: '7 Quai Branly, Paris', stars: 5, pricePerNight: 320, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER', 'BAR'], lat: 48.8584, lng: 2.2945, imageQuery: 'paris eiffel tower luxury hotel' },
    { name: 'Latin Quarter Inn', address: '55 Rue Saint-Jacques, Paris', stars: 3, pricePerNight: 98, amenities: ['WIFI', 'RESTAURANT'], lat: 48.8494, lng: 2.3471, imageQuery: 'paris latin quarter hotel' },
    { name: 'Champs-Élysées Palace', address: '101 Av. des Champs-Élysées, Paris', stars: 5, pricePerNight: 480, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'FITNESS_CENTER', 'RESTAURANT', 'BAR'], lat: 48.8698, lng: 2.3078, imageQuery: 'paris luxury palace hotel' },
  ],
  LON: [
    { name: 'Covent Garden Boutique', address: '10 Monmouth St, Covent Garden, London', stars: 4, pricePerNight: 200, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 51.5133, lng: -0.1255, imageQuery: 'london covent garden hotel' },
    { name: 'Hyde Park Suites', address: '56 Bayswater Rd, London', stars: 4, pricePerNight: 175, amenities: ['WIFI', 'FITNESS_CENTER', 'RESTAURANT'], lat: 51.5074, lng: -0.1657, imageQuery: 'london hyde park hotel' },
    { name: 'The Shard View Hotel', address: '31 St Thomas St, Southwark, London', stars: 5, pricePerNight: 380, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER', 'BAR'], lat: 51.5045, lng: -0.0865, imageQuery: 'london luxury hotel shard' },
    { name: 'Shoreditch Creative Inn', address: '88 Curtain Rd, Shoreditch, London', stars: 3, pricePerNight: 120, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 51.5247, lng: -0.0793, imageQuery: 'london shoreditch boutique hotel' },
    { name: 'Mayfair Grand Hotel', address: '50 Park Lane, Mayfair, London', stars: 5, pricePerNight: 520, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'FITNESS_CENTER', 'RESTAURANT', 'BAR'], lat: 51.5074, lng: -0.1537, imageQuery: 'london mayfair luxury hotel' },
  ],
  ROM: [
    { name: 'Colosseum View Inn', address: 'Via Sacra 15, Roma', stars: 4, pricePerNight: 140, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 41.8902, lng: 12.4924, imageQuery: 'rome colosseum hotel' },
    { name: 'Trastevere Boutique', address: 'Via della Lungaretta 40, Trastevere, Roma', stars: 3, pricePerNight: 95, amenities: ['WIFI', 'RESTAURANT'], lat: 41.8891, lng: 12.4693, imageQuery: 'rome trastevere boutique hotel' },
    { name: 'Vatican Gardens Hotel', address: 'Via della Conciliazione 33, Roma', stars: 4, pricePerNight: 165, amenities: ['WIFI', 'SWIMMING_POOL', 'RESTAURANT', 'FITNESS_CENTER'], lat: 41.9029, lng: 12.4534, imageQuery: 'rome vatican hotel' },
    { name: 'Pantheon Residences', address: 'Via del Pantheon 8, Roma', stars: 5, pricePerNight: 290, amenities: ['WIFI', 'SPA', 'RESTAURANT', 'BAR', 'FITNESS_CENTER'], lat: 41.8986, lng: 12.4769, imageQuery: 'rome luxury hotel pantheon' },
    { name: 'Piazza Navona Suites', address: 'Piazza Navona 12, Roma', stars: 4, pricePerNight: 195, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 41.8992, lng: 12.4730, imageQuery: 'rome piazza navona hotel' },
  ],
  BCN: [
    { name: 'Gothic Quarter Inn', address: 'Carrer del Bisbe 12, Barri Gòtic, Barcelona', stars: 3, pricePerNight: 90, amenities: ['WIFI', 'RESTAURANT'], lat: 41.3828, lng: 2.1761, imageQuery: 'barcelona gothic quarter hotel' },
    { name: 'Barceloneta Beach Hotel', address: 'Passeig Marítim 32, Barceloneta, Barcelona', stars: 4, pricePerNight: 175, amenities: ['WIFI', 'SWIMMING_POOL', 'RESTAURANT', 'FITNESS_CENTER', 'BAR'], lat: 41.3796, lng: 2.1912, imageQuery: 'barcelona beach hotel pool' },
    { name: 'Sagrada Familia View', address: 'Carrer de Provença 230, Eixample, Barcelona', stars: 4, pricePerNight: 145, amenities: ['WIFI', 'RESTAURANT', 'FITNESS_CENTER'], lat: 41.4036, lng: 2.1744, imageQuery: 'barcelona sagrada familia hotel' },
    { name: 'Las Ramblas Boutique', address: 'La Rambla 95, Barcelona', stars: 4, pricePerNight: 160, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 41.3816, lng: 2.1734, imageQuery: 'barcelona ramblas hotel' },
    { name: 'Park Güell Luxury Resort', address: 'Carrer de Larrard 5, Gràcia, Barcelona', stars: 5, pricePerNight: 310, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER', 'BAR'], lat: 41.4145, lng: 2.1527, imageQuery: 'barcelona luxury hotel gaudi' },
  ],
  AMS: [
    { name: 'Canal House Amsterdam', address: 'Keizersgracht 148, Amsterdam', stars: 4, pricePerNight: 175, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 52.3741, lng: 4.8851, imageQuery: 'amsterdam canal house hotel' },
    { name: 'Jordaan Boutique', address: 'Bloemstraat 84, Jordaan, Amsterdam', stars: 3, pricePerNight: 105, amenities: ['WIFI', 'RESTAURANT'], lat: 52.3744, lng: 4.8830, imageQuery: 'amsterdam jordaan boutique' },
    { name: 'Vondelpark View Hotel', address: 'Vondelstraat 18, Amsterdam', stars: 4, pricePerNight: 165, amenities: ['WIFI', 'FITNESS_CENTER', 'RESTAURANT'], lat: 52.3580, lng: 4.8686, imageQuery: 'amsterdam vondelpark hotel' },
    { name: 'Anne Frank Suites', address: 'Prinsengracht 280, Amsterdam', stars: 4, pricePerNight: 195, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 52.3752, lng: 4.8839, imageQuery: 'amsterdam historic hotel' },
    { name: 'Dam Square Palace', address: 'Dam 9, Amsterdam', stars: 5, pricePerNight: 320, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER', 'BAR'], lat: 52.3731, lng: 4.8926, imageQuery: 'amsterdam luxury hotel dam' },
  ],
  BUH: [
    { name: 'Athenee Palace Bucharest', address: 'Strada Episcopiei 1-3, Bucharest', stars: 5, pricePerNight: 195, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER'], lat: 44.4385, lng: 26.0972, imageQuery: 'bucharest athenee palace luxury' },
    { name: 'Old Town Bucharest Inn', address: 'Strada Lipscani 22, Bucharest', stars: 3, pricePerNight: 65, amenities: ['WIFI', 'RESTAURANT'], lat: 44.4317, lng: 26.1042, imageQuery: 'bucharest old town hotel' },
    { name: 'Herastrau Park Hotel', address: 'Bulevardul Aviatorilor 86, Bucharest', stars: 4, pricePerNight: 110, amenities: ['WIFI', 'FITNESS_CENTER', 'RESTAURANT'], lat: 44.4711, lng: 26.0827, imageQuery: 'bucharest park hotel' },
    { name: 'Calea Victoriei Boutique', address: 'Calea Victoriei 56, Bucharest', stars: 4, pricePerNight: 130, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 44.4378, lng: 26.0958, imageQuery: 'bucharest boutique hotel' },
    { name: 'Royal Court Suites', address: 'Strada Smârdan 14, Bucharest', stars: 4, pricePerNight: 95, amenities: ['WIFI', 'RESTAURANT'], lat: 44.4308, lng: 26.1024, imageQuery: 'bucharest royal hotel' },
  ],
  MAD: [
    { name: 'Gran Via Madrid', address: 'Gran Vía 21, Madrid', stars: 4, pricePerNight: 165, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 40.4200, lng: -3.7050, imageQuery: 'madrid gran via hotel' },
    { name: 'Retiro Park Hotel', address: 'Calle Alfonso XII 34, Madrid', stars: 4, pricePerNight: 145, amenities: ['WIFI', 'FITNESS_CENTER', 'RESTAURANT'], lat: 40.4153, lng: -3.6844, imageQuery: 'madrid retiro hotel' },
    { name: 'Salamanca Boutique', address: 'Calle Serrano 45, Madrid', stars: 5, pricePerNight: 285, amenities: ['WIFI', 'SPA', 'RESTAURANT', 'FITNESS_CENTER', 'BAR'], lat: 40.4283, lng: -3.6797, imageQuery: 'madrid salamanca luxury' },
    { name: 'Sol Plaza Hotel', address: 'Puerta del Sol 7, Madrid', stars: 3, pricePerNight: 88, amenities: ['WIFI', 'RESTAURANT'], lat: 40.4170, lng: -3.7035, imageQuery: 'madrid sol hotel' },
    { name: 'Chueca Suites', address: 'Calle de Augusto Figueroa 35, Madrid', stars: 4, pricePerNight: 155, amenities: ['WIFI', 'RESTAURANT', 'BAR'], lat: 40.4220, lng: -3.6968, imageQuery: 'madrid chueca boutique' },
  ],
  DXB: [
    { name: 'Burj View Hotel', address: 'Sheikh Mohammed bin Rashid Blvd, Downtown Dubai', stars: 5, pricePerNight: 380, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER', 'BAR'], lat: 25.1972, lng: 55.2744, imageQuery: 'dubai burj khalifa hotel' },
    { name: 'Jumeirah Beach Resort', address: 'Jumeirah Beach Rd, Dubai', stars: 5, pricePerNight: 450, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER', 'BAR'], lat: 25.1414, lng: 55.1856, imageQuery: 'dubai jumeirah beach resort' },
    { name: 'Downtown Dubai Suites', address: 'Mohammed Bin Rashid Blvd, Dubai', stars: 4, pricePerNight: 220, amenities: ['WIFI', 'SWIMMING_POOL', 'RESTAURANT', 'FITNESS_CENTER'], lat: 25.2048, lng: 55.2708, imageQuery: 'dubai downtown hotel' },
    { name: 'Marina Walk Hotel', address: 'Dubai Marina Walk, Dubai', stars: 4, pricePerNight: 195, amenities: ['WIFI', 'SWIMMING_POOL', 'RESTAURANT', 'BAR'], lat: 25.0810, lng: 55.1403, imageQuery: 'dubai marina hotel' },
    { name: 'Old Dubai Heritage Inn', address: 'Bur Dubai, Dubai', stars: 3, pricePerNight: 95, amenities: ['WIFI', 'RESTAURANT'], lat: 25.2607, lng: 55.2972, imageQuery: 'dubai heritage hotel' },
  ],
};

function genericFallback(cityCode: string): CityHotelTemplate[] {
  return [
    { name: `${cityCode} Grand Hotel`, address: `Central Square 1, ${cityCode}`, stars: 4, pricePerNight: 120, amenities: ['WIFI', 'RESTAURANT', 'FITNESS_CENTER'], lat: 0, lng: 0, imageQuery: `${cityCode} hotel` },
    { name: `${cityCode} Boutique Inn`, address: `Old Town 12, ${cityCode}`, stars: 3, pricePerNight: 80, amenities: ['WIFI', 'RESTAURANT'], lat: 0, lng: 0, imageQuery: 'boutique hotel european' },
    { name: `${cityCode} Luxury Palace`, address: `Boulevard 55, ${cityCode}`, stars: 5, pricePerNight: 250, amenities: ['WIFI', 'SWIMMING_POOL', 'SPA', 'RESTAURANT', 'FITNESS_CENTER'], lat: 0, lng: 0, imageQuery: 'luxury hotel pool' },
  ];
}

interface UnsplashRandomResponse {
  urls?: { regular?: string; small?: string };
}

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  try {
    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
      query
    )}&orientation=landscape&content_filter=high&client_id=${key}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as UnsplashRandomResponse;
    return data.urls?.regular ?? null;
  } catch {
    return null;
  }
}

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
  source: 'fallback';
}

async function generateFallbackOffers(
  hotelIds: string[],
  checkInDate: string,
  checkOutDate: string,
  cityCode: string
): Promise<FallbackOffer[]> {
  const nights = Math.max(
    1,
    Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86_400_000)
  );

  const cityHotels = CITY_HOTELS[cityCode] ?? genericFallback(cityCode);
  const limit = Math.min(hotelIds.length, cityHotels.length);
  const ids = hotelIds.slice(0, limit);

  // Fetch all Unsplash images in parallel; resolves to null when no key.
  const images = await Promise.all(
    cityHotels.slice(0, limit).map((h) => fetchUnsplashImage(h.imageQuery))
  );

  return ids.map((hotelId, index) => {
    const hotelData = cityHotels[index % cityHotels.length];
    const baseTotal = hotelData.pricePerNight * nights;
    const totalWithTax = Math.round(baseTotal * 1.15);
    const isFreeCancel = hotelData.stars <= 4;
    const imageUri = images[index];

    return {
      type: 'hotel-offers',
      hotel: {
        type: 'hotel',
        hotelId,
        name: hotelData.name,
        rating: String(hotelData.stars),
        cityCode,
        amenities: hotelData.amenities,
        address: {
          lines: [hotelData.address],
          cityName: cityCode,
          countryCode: 'EU',
        },
        latitude: hotelData.lat,
        longitude: hotelData.lng,
        media: imageUri ? [{ uri: imageUri, category: 'EXTERIOR' }] : [],
      },
      offers: [
        {
          id: `fallback-offer-${hotelId}-${index}`,
          checkInDate,
          checkOutDate,
          rateCode: 'RAC',
          room: {
            type: hotelData.stars >= 4 ? 'SUPERIOR_ROOM' : 'STANDARD_ROOM',
            typeEstimated: {
              category: hotelData.stars >= 4 ? 'SUPERIOR_ROOM' : 'STANDARD_ROOM',
              beds: 1,
              bedType: 'DOUBLE',
            },
            description: {
              text:
                hotelData.stars >= 5
                  ? 'Luxury suite with panoramic city view and premium amenities'
                  : hotelData.stars >= 4
                  ? 'Superior room with city view and modern amenities'
                  : 'Comfortable standard room in a prime location',
            },
          },
          price: {
            currency: 'EUR',
            base: String(baseTotal),
            total: String(totalWithTax),
            variations: { average: { base: String(hotelData.pricePerNight) } },
          },
          policies: {
            cancellations: [
              {
                deadline: `${checkInDate}T00:00:00`,
                amount: isFreeCancel ? '0' : String(hotelData.pricePerNight),
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
    const fb = await generateFallbackOffers(hotelIds, checkInDate, checkOutDate, cityCode);
    return NextResponse.json({ data: fb, source: 'fallback' });
  } catch (err) {
    console.error('[Hotels offers] error:', (err as Error)?.message);
    const fb = await generateFallbackOffers(hotelIds, checkInDate, checkOutDate, cityCode);
    return NextResponse.json({ data: fb, source: 'fallback' });
  }
}
