/* ── Database type definitions for TravelTwin ── */

export interface Flight {
    id: number;
    travelCode: string;
    userCode: string;
    from: string;
    to: string;
    flightType: "economic" | "premium" | "firstClass";
    price: number;
    time: string;
    distance: number;
    agency: string;
    date: string;
}

export interface Hotel {
    id: number;
    travelCode: string;
    userCode: string;
    name: string;
    place: string;
    days: number;
    price: number;
    total: number;
    date: string;
}

export interface Country {
    id: number;
    name: string;
    code?: string;
    continent?: string;
}

export interface City {
    id: number;
    name: string;
    country_id?: number;
    description?: string;
    image_url?: string;
    avg_budget?: number;
    temperature?: string;
}

export interface Attraction {
    id: number;
    name: string;
    city_id?: number;
    description?: string;
    category?: string;
    price?: number;
    image_url?: string;
}

export interface DailyCost {
    id: number;
    city_id?: number;
    category?: string;
    min_cost?: number;
    max_cost?: number;
    avg_cost?: number;
}

export interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    nationality: string | null;
    travel_style: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface SavedTrip {
    id: string;
    user_id: string;
    destination: string;
    origin: string;
    outbound_flight: Flight | null;
    return_flight: Flight | null;
    hotel: Hotel | null;
    total_cost: number;
    budget: number;
    days: number;
    status: "planning" | "booked" | "completed";
    created_at: string;
}

export interface UserSearch {
    id: string;
    user_id: string;
    from_city: string;
    budget: number;
    days: number;
    flight_type: string;
    results_count: number;
    created_at: string;
}

export interface Review {
    id: string;
    user_id: string;
    city_name: string;
    rating: number;
    text: string;
    user_name?: string;
    created_at: string;
}

export interface Favorite {
    id: string;
    user_id: string;
    city_name: string;
    city_data: Record<string, unknown> | null;
    created_at: string;
}

/* ── Recommendation types ── */
export interface TripRecommendation {
    destination: string;
    outboundFlight: Flight;
    returnFlight: Flight;
    hotel: Hotel;
    totalCost: number;
    savings: number;
    savingsPercent: number;
}

/* ── Normalized API types (Amadeus + static) ── */
export type DataSource = 'live' | 'cached' | 'fallback';

export interface NormalizedFlight {
    id: string;
    origin: string;
    originCity: string;
    destination: string;
    destinationCity: string;
    departureDate: string;
    arrivalDate: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    stops: number;
    airline: string;
    airlineName: string;
    price: number;
    currency: string;
    travelClass: string;
    source: DataSource;
    lastUpdated: string;
    bookingLink?: string;
}

export interface NormalizedHotel {
    id: string;
    name: string;
    cityCode: string;
    cityName: string;
    address: string;
    rating: number;
    pricePerNight: number;
    totalPrice: number;
    currency: string;
    roomType: string;
    amenities: string[];
    cancellationPolicy: string;
    source: DataSource;
    lastUpdated: string;
    bookingLink?: string;
}

export interface LocationResult {
    iataCode: string;
    name: string;
    cityName: string;
    countryName: string;
    type: 'AIRPORT' | 'CITY';
}

export interface FlightInspiration {
    destination: string;
    destinationCity: string;
    departureDate: string;
    returnDate: string;
    price: number;
    currency: string;
    source: DataSource;
}
