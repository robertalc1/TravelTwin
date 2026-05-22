/* ── Google Maps Embed API URL builder ──────────────────────────────────
   Centralises the URL construction shared by the trip-detail teaser and
   the full-page RouteMapView. Embed API is FREE — no per-request cost —
   so all the cost optimisations are about minimising iframe reloads, not
   about avoiding requests.
─────────────────────────────────────────────────────────────────────── */

export type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

export const TRAVEL_MODES: TravelMode[] = ['driving', 'walking', 'transit', 'bicycling'];

export interface Attraction {
  name: string;
}

export interface BuildEmbedUrlInput {
  apiKey: string | undefined;
  /** Free-text origin (e.g. `"Bucharest airport (OTP)"`). */
  origin: string;
  /** Free-text destination (e.g. `"Athens, Greece"`). */
  destination: string;
  /** Up to 3 waypoints — Embed API caps at 3. Each is "Name, City". */
  waypoints?: string[];
  mode: TravelMode;
}

/** Build the Maps Embed API directions URL, or return null if no API key. */
export function buildDirectionsEmbedUrl(input: BuildEmbedUrlInput): string | null {
  if (!input.apiKey) return null;
  const params = new URLSearchParams({
    key: input.apiKey,
    origin: input.origin,
    destination: input.destination,
    mode: input.mode,
  });
  const wps = (input.waypoints ?? []).slice(0, 3).filter(Boolean);
  if (wps.length > 0) params.set('waypoints', wps.join('|'));
  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
}

/** Plain "place" embed fallback when the directions params are unavailable. */
export function buildPlaceEmbedUrl(apiKey: string | undefined, query: string): string | null {
  if (!apiKey) return null;
  const params = new URLSearchParams({ key: apiKey, q: query, zoom: '12' });
  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

/** Static-map URL drawing a line between origin → waypoints → destination.
 *  Used by the road-trip teaser so the user sees the route shape (not just
 *  a pin on the destination).
 *
 *  NOTE: this draws a STRAIGHT line between each point, not the real road
 *  polyline. For the actual on-road shape, pass a pre-encoded polyline from
 *  the Directions API as `encodedPolyline`. */
export function buildStaticRouteUrl(opts: {
  apiKey: string | undefined;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: Array<{ lat: number; lng: number }>;
  size?: string;
  encodedPolyline?: string;
}): string | null {
  if (!opts.apiKey) return null;
  const params = new URLSearchParams({
    size: opts.size || '1280x600',
    scale: '2',
    maptype: 'roadmap',
    key: opts.apiKey,
  });
  if (opts.encodedPolyline) {
    params.set('path', `color:0x10b981ff|weight:5|enc:${opts.encodedPolyline}`);
  } else {
    const points = [opts.origin, ...(opts.waypoints || []), opts.destination];
    const pathStr = points.map((p) => `${p.lat},${p.lng}`).join('|');
    params.set('path', `color:0x10b981ff|weight:5|geodesic:true|${pathStr}`);
  }
  const baseUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  const markers = [
    `color:green|label:A|${opts.origin.lat},${opts.origin.lng}`,
    ...(opts.waypoints || []).map(
      (w, i) => `color:orange|label:${i + 1}|${w.lat},${w.lng}`,
    ),
    `color:red|label:B|${opts.destination.lat},${opts.destination.lng}`,
  ];
  const markerStr = markers.map((m) => `&markers=${encodeURIComponent(m)}`).join('');
  return `${baseUrl}${markerStr}`;
}

/** Static-map preview URL (used for the TripDetailView teaser thumbnail). */
export function buildStaticPreviewUrl(
  apiKey: string | undefined,
  lat: number,
  lon: number,
  size = '1280x600',
): string | null {
  if (!apiKey) return null;
  const params = new URLSearchParams({
    center: `${lat},${lon}`,
    zoom: '11',
    size,
    scale: '2',
    maptype: 'roadmap',
    markers: `color:0xf97316|${lat},${lon}`,
    style: 'feature:poi|element:labels|visibility:off',
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/**
 * Build the route description from a list of attractions: returns
 * `{ origin, destination, waypoints, hotelStop }` ready for
 * `buildDirectionsEmbedUrl`.
 *
 *   stops = [airport, (optional hotel), attractions[0..N]]
 *   origin     = airport label
 *   destination= last attraction (or "{city} city center" if no attractions)
 *   waypoints  = (hotel if present) + attractions[0..N-1]
 *
 * Google Maps Embed Directions API caps at 3 waypoints, so when a hotel is
 * supplied we trim the attraction waypoints down to 2 (hotel + 2 = 3) and the
 * last attraction stays as the destination.
 */
export function buildRouteStops(opts: {
  originCity: string;
  originCode: string;
  destinationCity: string;
  attractions: Attraction[];
  /** Max attractions to include as stops (origin counts separately). Default 4. */
  max?: number;
  /** Optional accommodation to drop in as the first waypoint after the airport. */
  hotel?: { name: string; address?: string } | null;
}): {
  origin: string;
  destination: string;
  waypoints: string[];
  hotelStop: string | null;
} {
  const max = opts.max ?? 4;
  const top = opts.attractions.slice(0, max);

  const origin =
    opts.originCity && opts.originCode
      ? `${opts.originCity} airport (${opts.originCode})`
      : opts.originCity || `${opts.destinationCity} airport`;

  const hotelStop = opts.hotel
    ? `${opts.hotel.name}, ${opts.destinationCity}`
    : null;

  if (top.length === 0) {
    return {
      origin,
      destination: hotelStop ?? `${opts.destinationCity} city center`,
      waypoints: [],
      hotelStop,
    };
  }

  const destination = `${top[top.length - 1].name}, ${opts.destinationCity}`;
  // When a hotel takes a waypoint slot, trim attractions to 2 intermediates so
  // total waypoints stay <= 3 (Embed API hard cap).
  const intermediateCap = hotelStop ? 2 : Infinity;
  const attractionWaypoints = top
    .slice(0, -1)
    .slice(0, intermediateCap)
    .map((a) => `${a.name}, ${opts.destinationCity}`);

  const waypoints = hotelStop
    ? [hotelStop, ...attractionWaypoints]
    : attractionWaypoints;

  return { origin, destination, waypoints, hotelStop };
}
