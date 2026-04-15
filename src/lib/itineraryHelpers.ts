/**
 * Helpers for building and formatting itinerary data.
 * Used by src/components/itinerary/*.
 */

import type { TransportLeg, ItineraryStop } from '@/components/itinerary/types';
import type { TripDetail } from '@/lib/tripDetail';

// ── Date / time formatters ──────────────────────────────────────────────────

/** "2026-05-15" or ISO datetime → "15 May" */
export function formatDateShort(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

/** "2026-05-15" or ISO datetime → "Fri, 15 May" */
export function formatDateWithDay(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  } catch { return ''; }
}

/** ISO datetime → "12:25" */
export function formatTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso.slice(11, 16) || ''; }
}

/** Days between two date strings (positive integer) */
export function calculateDaysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  try {
    const a = new Date(start);
    const b = new Date(end);
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  } catch { return 0; }
}

/** Parse ISO 8601 duration "PT2H30M" → { hours: 2, minutes: 30 } */
export function parseISODuration(iso: string): { hours: number; minutes: number } {
  if (!iso) return { hours: 0, minutes: 0 };
  const hours = parseInt(iso.match(/(\d+)H/)?.[1] ?? '0', 10);
  const minutes = parseInt(iso.match(/(\d+)M/)?.[1] ?? '0', 10);
  return { hours, minutes };
}

// ── Stop badge styles ───────────────────────────────────────────────────────

export interface StopsLabelResult {
  text: string;
  bgClass: string;
  textClass: string;
}

export function getStopsLabel(stops: number): StopsLabelResult {
  if (stops === 0) {
    return {
      text: 'Direct',
      bgClass: 'bg-gray-100 dark:bg-gray-700',
      textClass: 'text-gray-600 dark:text-gray-300',
    };
  }
  if (stops === 1) {
    return {
      text: '1 stop',
      bgClass: 'bg-amber-100 dark:bg-amber-900/30',
      textClass: 'text-amber-700 dark:text-amber-300',
    };
  }
  return {
    text: `${stops} stops`,
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-300',
  };
}

// ── Trip → legs / stops builders ──────────────────────────────────────────

/**
 * Build TransportLeg[] from a flat TripDetail.
 * Produces 2 legs: outbound + return.
 */
export function buildLegsFromTrip(
  trip: TripDetail,
  originCity: string,
  originCode: string,
): TransportLeg[] {
  const origin = originCity || 'Origin';
  const originIata = originCode || undefined;

  const outbound: TransportLeg = {
    id: 'outbound',
    type: 'flight',
    transportIcons: ['plane'],
    from: { city: origin, iataCode: originIata },
    to: { city: trip.destinationCity, iataCode: trip.destinationCode },
    departure: {
      time: formatTime(trip.departureTime),
      date: formatDateShort(trip.departureTime || trip.departureDate),
      isoDateTime: trip.departureTime || trip.departureDate,
    },
    arrival: {
      time: formatTime(trip.arrivalTime),
      date: formatDateShort(trip.arrivalTime || trip.departureDate),
      isoDateTime: trip.arrivalTime || trip.departureDate,
    },
    stops: trip.stops,
    airlineCode: trip.airlineCode || undefined,
    airline: trip.airline || undefined,
  };

  const returnLeg: TransportLeg = {
    id: 'return',
    type: 'flight',
    transportIcons: ['plane'],
    from: { city: trip.destinationCity, iataCode: trip.destinationCode },
    to: { city: origin, iataCode: originIata },
    departure: {
      // Return departure time not stored in TripDetail — show date only
      time: '',
      date: formatDateShort(trip.returnDate),
      isoDateTime: trip.returnDate,
    },
    arrival: {
      time: '',
      date: formatDateShort(trip.returnDate),
      isoDateTime: trip.returnDate,
    },
    stops: trip.stops,
    airlineCode: trip.airlineCode || undefined,
    airline: trip.airline || undefined,
  };

  return [outbound, returnLeg];
}

/**
 * Build ItineraryStop[] aligned 1:1 with legs.
 * Each stop describes the destination city of the corresponding leg.
 */
export function buildStopsFromTrip(
  trip: TripDetail,
  originCity: string,
  legs: TransportLeg[],
): ItineraryStop[] {
  const nights = calculateDaysBetween(trip.departureDate, trip.returnDate) || trip.nights;
  const origin = originCity || 'Origin';

  // One stop per leg, describing where you arrive
  return legs.map((leg, i) => {
    const isLast = i === legs.length - 1;
    return {
      id: `stop-${i}`,
      city: leg.to.city,
      arrivalDate: isLast
        ? formatDateWithDay(trip.returnDate)
        : formatDateWithDay(leg.arrival.isoDateTime || trip.departureDate),
      daysCount: isLast ? 0 : nights,
      isReturn: isLast,
    };
  });
}
