/* ── Itinerary & Trip Package Types ── */

export interface Location {
    iataCode: string;
    name: string;
    cityName: string;
    countryName?: string;
    latitude?: number;
    longitude?: number;
}

export interface ItinerarySearchParams {
    origin: string;
    originName?: string;
    destination: string;
    destinationName?: string;
    departureDate: string;
    returnDate: string;
    adults: number;
    children: number;
    budget: number;
    currency: string;
    preferences: string[];
}

export interface FlightSegment {
    departure: {
        airport: string;
        terminal?: string;
        time: string;
    };
    arrival: {
        airport: string;
        terminal?: string;
        time: string;
    };
    carrier: string;
    flightNumber: string;
    aircraft?: string;
    duration: string;
}

export interface ParsedFlightOffer {
    id: string;
    price: {
        total: number;
        currency: string;
        base: number;
    };
    itineraries: {
        duration: string;
        segments: FlightSegment[];
    }[];
    validatingAirlineCodes: string[];
}

export interface ParsedHotelOffer {
    hotelId: string;
    name: string;
    rating: number;
    address: Record<string, unknown>;
    location: {
        lat: number;
        lon: number;
    };
    offers: {
        id: string;
        checkIn: string;
        checkOut: string;
        price: {
            total: number;
            currency: string;
        };
        roomType?: string;
        description?: string;
        guests?: number;
    }[];
    amenities?: string[];
}

export interface PointOfInterest {
    id: string;
    name: string;
    category: string;
    rank: number;
    tags: string[];
    geoCode: {
        latitude: number;
        longitude: number;
    };
}

export interface DayPlan {
    day: number;
    date: string;
    activities: {
        time: string;
        title: string;
        description: string;
        type: 'flight' | 'hotel' | 'activity' | 'transfer';
        cost?: number;
    }[];
}

export interface TripPackage {
    id: string;
    flight: ParsedFlightOffer;
    hotel: ParsedHotelOffer;
    activities: PointOfInterest[];
    activitiesBudget: number;
    totalPrice: number;
    priceBreakdown: {
        flights: number;
        hotel: number;
        activities: number;
    };
    savings: number;
    withinBudget: boolean;
    itinerary: DayPlan[];
}

export interface ItineraryResult {
    packages: TripPackage[];
    totalOptions: number;
    searchParams: ItinerarySearchParams;
    timestamp: string;
}

export interface TripCardData {
    id: string;
    destination: string;
    destinationCity: string;
    origin: string;
    originCity: string;
    imageUrl: string;
    days: number;
    departureDate: string;
    returnDate: string;
    originalPrice: number;
    discountedPrice: number;
    currency: string;
    isDirect: boolean;
    travelers: number;
    badge?: string;
    isFavorite?: boolean;
}

export type CategoryTab =
    | 'trips'
    | 'for-you'
    | 'weekend'
    | 'beach'
    | 'multi-city'
    | 'snow'
    | 'hidden-gems'
    | 'intercontinental';

export interface FilterOptions {
    sortBy: 'lowest-price' | 'least-cities' | 'most-cities';
    numberOfCities: number;
    maxStops: 'any' | 'direct' | '1' | '2';
    transport: 'any' | 'flight' | 'bus' | 'train';
    placesToAvoid: string;
    travelStyle: 'budget' | 'comfort' | 'bus-train';
    tripType: 'multi-city' | 'single-city';
}
