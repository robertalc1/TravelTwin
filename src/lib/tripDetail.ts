export interface TripDetail {
  id: string;
  destinationCode: string;       // e.g. "CDG"
  destinationCity: string;       // e.g. "Paris"
  destinationCountry: string;    // e.g. "France"
  destinationLat: number;        // e.g. 48.8566
  destinationLon: number;        // e.g. 2.3522
  imageId?: string;              // Unsplash photo ID
  nights: number;
  departureDate: string;         // "2026-05-10"
  returnDate: string;            // "2026-05-17"
  currency: string;              // "EUR"
  totalPrice: number;

  // Flight
  airline: string;
  airlineCode: string;
  flightPrice: number;
  departureTime: string;         // ISO string
  arrivalTime: string;           // ISO string
  duration: string;              // "PT2H30M"
  stops: number;

  // Hotel
  hotelName: string;
  hotelStars: number;
  hotelPrice: number;
  hotelPricePerNight: number;
  hotelCheckIn: string;
  hotelCheckOut: string;
  hotelAmenities?: string[];

  // AI content
  aiContent: {
    description: string;
    whyThisTrip: string;
    dayByDay: Array<{
      day: number;
      title: string;
      morning: { activity: string; description: string; type: string };
      afternoon: { activity: string; description: string; type: string };
      evening: { activity: string; description: string; type: string };
    }>;
    topAttractions: Array<{
      name: string;
      description: string;
      category: string;
    }>;
    topRestaurants: Array<{
      name: string;
      cuisine: string;
      priceRange: string;
      description: string;
    }>;
    topCafes: Array<{
      name: string;
      specialty: string;
      description: string;
    }>;
    localTips: string[];
    estimatedDailyExpenses: {
      food: number;
      transport: number;
      activities: number;
    };
  } | null;
}

/** Known city coordinates for fallback when lat/lon are not in the data */
export const CITY_COORDS: Record<string, [number, number]> = {
  'London': [51.5074, -0.1278],
  'Paris': [48.8566, 2.3522],
  'Rome': [41.9028, 12.4964],
  'Barcelona': [41.3874, 2.1686],
  'Amsterdam': [52.3676, 4.9041],
  'Istanbul': [41.0082, 28.9784],
  'Athens': [37.9838, 23.7275],
  'Vienna': [48.2082, 16.3738],
  'Prague': [50.0755, 14.4378],
  'Lisbon': [38.7223, -9.1393],
  'Berlin': [52.52, 13.405],
  'Madrid': [40.4168, -3.7038],
  'Dubai': [25.2048, 55.2708],
  'Bucharest': [44.4268, 26.1025],
  'Budapest': [47.4979, 19.0402],
  'Tokyo': [35.6762, 139.6503],
  'New York': [40.7128, -74.006],
  'Milan': [45.4642, 9.19],
  'Warsaw': [52.2297, 21.0122],
  'Krakow': [50.0647, 19.945],
  'Copenhagen': [55.6761, 12.5683],
  'Singapore': [1.3521, 103.8198],
  'Bangkok': [13.7563, 100.5018],
  'Dubrovnik': [42.6507, 18.0944],
  'Bali': [-8.3405, 115.092],
  'Santorini': [36.3932, 25.4615],
};

/** Known city hero images (Unsplash IDs) */
export const CITY_HERO_IMAGES: Record<string, string> = {
  'London': 'photo-1513635269975-59663e0ac1ad',
  'Paris': 'photo-1502602898657-3e91760cbb34',
  'Rome': 'photo-1552832230-c0197dd311b5',
  'Barcelona': 'photo-1583422409516-2895a77efded',
  'Amsterdam': 'photo-1534351590666-13e3e96b5017',
  'Istanbul': 'photo-1524231757912-21f4fe3a7200',
  'Athens': 'photo-1555993539-1732b0258235',
  'Vienna': 'photo-1516550893923-42d28e5677af',
  'Prague': 'photo-1541849546-216549ae216d',
  'Lisbon': 'photo-1548707309-dcebeab9ea9b',
  'Berlin': 'photo-1560969184-10fe8719e047',
  'Madrid': 'photo-1539037116277-4db20889f2d4',
  'Dubai': 'photo-1512453979798-5ea266f8880c',
  'Bucharest': 'photo-1558618666-fcd25c85cd64',
  'Budapest': 'photo-1549877452-9c387954fbc2',
  'Tokyo': 'photo-1540959733332-eab4deabeeaf',
  'New York': 'photo-1485871981521-5b1fd3805eee',
  'Milan': 'photo-1513581166391-887a96ddeafd',
  'Warsaw': 'photo-1519197924294-4ba991a11128',
  'Bali': 'photo-1537996194471-e657df975ab4',
  'Santorini': 'photo-1570077188670-e3a8d69ac5ff',
};

export function resolveCoordsForCity(city: string): [number, number] {
  return CITY_COORDS[city] ?? [48.8566, 2.3522]; // default to Paris
}

export function resolveHeroUrl(trip: TripDetail): string {
  if (trip.imageId) {
    return `https://images.unsplash.com/${trip.imageId}?w=1600&h=700&fit=crop&q=85`;
  }
  const id = CITY_HERO_IMAGES[trip.destinationCity];
  if (id) return `https://images.unsplash.com/${id}?w=1600&h=700&fit=crop&q=85`;
  return 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600&h=700&fit=crop&q=85';
}
