import type { TAHotel, TARestaurant } from '@/lib/tripadvisor-client';
import type { RoadTripAiContent } from '@/lib/road-trip-prompt';
import type { DailyForecast } from '@/lib/weatherService';
import { CITY_HERO_IMAGES } from '@/lib/tripDetail';

export interface RoadTripStopover {
  city: string;
  country?: string;
  iata?: string;
  lat: number;
  lng: number;
  order: number;
  arrivalHourFromStart: number;
  hotel: TAHotel | null;
  /** One-day weather forecast for the estimated arrival date. */
  weather?: DailyForecast | null;
  /** Top ~3 restaurants in the stopover city (Tripadvisor). */
  restaurants?: TARestaurant[];
}

export interface RoadTripData {
  id: string;
  origin: { query: string; formatted: string; lat: number; lng: number };
  destination: { query: string; formatted: string; lat: number; lng: number };
  destinationCity: string;
  destinationCountry: string;
  destinationIata?: string;
  mode: 'car' | 'bus' | 'train';
  departureDate: string;
  returnDate?: string;
  adults: number;
  drive: {
    distanceKm: number;
    durationHours: number;
    durationInTrafficHours?: number;
  };
  cost: {
    fuel: number;
    tolls: number;
    busFarePerPerson: number;
    /** Per-person estimated train fare (€). 0 when mode != 'train'. */
    trainFarePerPerson: number;
    ferry: number;
    total: number;
    currency: 'EUR';
  };
  ferry?: {
    segments: Array<{
      distanceKm: number;
      durationHours: number;
      fromName?: string;
      toName?: string;
    }>;
    totalDurationHours: number;
    estimatedCost: number;
  };
  stopovers: RoadTripStopover[];
  hotelDestination: TAHotel | null;
  externalLinks: { googleMaps: string; flixbus?: string; trainline?: string };
  aiContent: RoadTripAiContent | null;
  warnings: string[];
}

/** Resolve destination hero image. Falls back to a generic road photo. */
export function resolveRoadTripHero(data: RoadTripData): string {
  const id = CITY_HERO_IMAGES[data.destinationCity];
  if (id) return `https://images.unsplash.com/${id}?w=1600&h=700&fit=crop&q=85`;
  // Generic scenic road fallback
  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&h=700&fit=crop&q=85';
}

export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  return m === 0 ? `${hr}h` : `${hr}h ${m}m`;
}

export function formatDate(d: string, locale: string): string {
  try {
    return new Date(d).toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

export function shortCityFromFormatted(formatted: string): string {
  return formatted.split(',')[0]?.trim() || formatted;
}

export function hotelPhotoUrl(
  hotel: TAHotel | null,
  width = 400,
  height = 240,
): string | null {
  if (!hotel?.cardPhotos?.[0]?.sizes?.urlTemplate) return null;
  return hotel.cardPhotos[0].sizes.urlTemplate
    .replace('{width}', String(width))
    .replace('{height}', String(height));
}
