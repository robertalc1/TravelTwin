// ── Itinerary component types ──────────────────────────────────────────────

export type TransportType = 'flight' | 'train' | 'bus' | 'mixed';
export type TransportIcon = 'plane' | 'bus' | 'train';

export interface StopDetail {
  airport: string;
  layoverDuration: string; // e.g. "2h 10m"
}

export interface TransportLeg {
  id: string;
  type: TransportType;
  /** Icons to show on the dashed line — multiple for mixed transport */
  transportIcons: TransportIcon[];
  from: { city: string; iataCode?: string };
  to: { city: string; iataCode?: string };
  departure: { time: string; date: string; isoDateTime: string };
  arrival: { time: string; date: string; isoDateTime: string };
  stops: number;
  stopsDetails?: StopDetail[];
  airlineCode?: string;
  airline?: string;
}

export interface ItineraryStop {
  id: string;
  /** City name at the destination of the corresponding leg */
  city: string;
  /** Display date, e.g. "Fri, 15 May" */
  arrivalDate: string;
  /** Number of nights/days spent here. 0 for departure city. */
  daysCount: number;
  /** True for the last bullet — renders "Return to {city}" */
  isReturn?: boolean;
}
