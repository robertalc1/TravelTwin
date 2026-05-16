import { NextRequest, NextResponse } from 'next/server';
import { getCached, setCache } from '@/lib/cache';

/**
 * Server-side wrapper around the Google Maps Directions API.
 *
 * Returns simplified, UI-ready step data for the transit panel on the trip
 * map page. Walking + driving + cycling are also supported so the same
 * endpoint can power any travel mode the sidebar wants to surface.
 *
 * Cache: 6h per (origin, destination, mode, alternatives) — Directions API is
 * a paid call (~$5 / 1000), and the same airport→attraction lookup is hit
 * dozens of times as the user clicks around the sidebar.
 */

export type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

export interface TransitLineInfo {
  shortName: string;
  name?: string;
  vehicleType?: string;
  color?: string;
  textColor?: string;
  agencyName?: string;
}

export interface DirectionsStep {
  travelMode: 'WALKING' | 'TRANSIT' | 'DRIVING' | 'BICYCLING';
  durationText?: string;
  durationSeconds: number;
  distanceText?: string;
  instructionsHtml?: string;
  /** Only populated when travelMode === 'TRANSIT'. */
  transit?: {
    line: TransitLineInfo;
    departureStop: string;
    arrivalStop: string;
    departureTime?: string;
    arrivalTime?: string;
    numStops?: number;
    headsign?: string;
  };
}

export interface DirectionsRoute {
  summary: string;
  durationText?: string;
  durationSeconds: number;
  distanceText?: string;
  departureTime?: string;
  arrivalTime?: string;
  steps: DirectionsStep[];
  warnings: string[];
  /** Stable Google Maps web URL for this route — used by "Open in Google Maps". */
  googleMapsUrl: string;
}

export interface DirectionsResponse {
  routes: DirectionsRoute[];
  origin: string;
  destination: string;
  mode: TravelMode;
}

type GoogleStep = {
  travel_mode: 'WALKING' | 'TRANSIT' | 'DRIVING' | 'BICYCLING';
  duration?: { text: string; value: number };
  distance?: { text: string; value: number };
  html_instructions?: string;
  transit_details?: {
    line?: {
      short_name?: string;
      name?: string;
      color?: string;
      text_color?: string;
      vehicle?: { type?: string; name?: string };
      agencies?: Array<{ name?: string }>;
    };
    departure_stop?: { name?: string };
    arrival_stop?: { name?: string };
    departure_time?: { text?: string };
    arrival_time?: { text?: string };
    num_stops?: number;
    headsign?: string;
  };
};

type GoogleRoute = {
  summary?: string;
  warnings?: string[];
  legs?: Array<{
    duration?: { text: string; value: number };
    distance?: { text: string; value: number };
    departure_time?: { text?: string };
    arrival_time?: { text?: string };
    steps?: GoogleStep[];
  }>;
};

function googleMapsWebUrl(origin: string, destination: string, mode: TravelMode): string {
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: {
    origin?: string;
    destination?: string;
    mode?: TravelMode;
    alternatives?: boolean;
    locale?: string;
    /** ISO country code (e.g. "gr", "tr") to bias geocoding; defaults to no bias. */
    region?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { origin, destination, mode = 'transit', alternatives = true, locale, region } = body;

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Missing origin or destination' }, { status: 400 });
  }
  if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Origin and destination are the same' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
    || process.env.GOOGLE_MAPS_API_KEY
    || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured on the server.' },
      { status: 500 },
    );
  }

  const lang = locale === 'ro' ? 'ro' : 'en';
  const cacheKey = `directions:${mode}:${origin.toLowerCase()}:${destination.toLowerCase()}:${alternatives ? 'alt' : 'single'}:${lang}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...(cached.data as DirectionsResponse), source: 'cached' });
  }

  const params = new URLSearchParams({
    origin,
    destination,
    mode,
    key: apiKey,
    language: lang,
  });
  // Only set region bias if the caller passed one — otherwise Google geocodes
  // the free-text origin/destination globally. Previously this was hardcoded
  // to "ro" which made Google look for "Athens Airport" inside Romania first
  // and return NOT_FOUND.
  if (region) params.set('region', region);
  if (alternatives) params.set('alternatives', 'true');

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  let googleData: { status?: string; error_message?: string; routes?: GoogleRoute[] };
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) {
      return NextResponse.json(
        { error: `Google Directions HTTP ${r.status}` },
        { status: 502 },
      );
    }
    googleData = await r.json();
  } catch (e) {
    console.error('[directions] fetch failed', e);
    return NextResponse.json({ error: 'Failed to reach Google Directions' }, { status: 502 });
  }

  if (googleData.status && googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
    const msg = googleData.error_message || '';
    // Specific signal: the configured key has HTTP referer restrictions, which
    // Google rejects on server-side Directions calls. UI handles this with a
    // dedicated "setup needed" card instead of the generic error.
    const isRefererRestricted =
      /referer restrictions/i.test(msg)
      || (googleData.status === 'REQUEST_DENIED' && /API keys/i.test(msg));
    return NextResponse.json(
      {
        error: msg || `Google Directions returned status ${googleData.status}`,
        status: googleData.status,
        needsServerKey: isRefererRestricted,
      },
      { status: isRefererRestricted ? 503 : 502 },
    );
  }

  const routes: DirectionsRoute[] = (googleData.routes || []).map((r) => {
    const leg = r.legs?.[0];
    const steps: DirectionsStep[] = (leg?.steps || []).map((s) => {
      const t = s.transit_details;
      return {
        travelMode: s.travel_mode,
        durationText: s.duration?.text,
        durationSeconds: s.duration?.value || 0,
        distanceText: s.distance?.text,
        instructionsHtml: s.html_instructions,
        transit: t
          ? {
              line: {
                shortName: t.line?.short_name || t.line?.name || '—',
                name: t.line?.name,
                vehicleType: t.line?.vehicle?.type,
                color: t.line?.color,
                textColor: t.line?.text_color,
                agencyName: t.line?.agencies?.[0]?.name,
              },
              departureStop: t.departure_stop?.name || '',
              arrivalStop: t.arrival_stop?.name || '',
              departureTime: t.departure_time?.text,
              arrivalTime: t.arrival_time?.text,
              numStops: t.num_stops,
              headsign: t.headsign,
            }
          : undefined,
      };
    });

    return {
      summary: r.summary || '',
      durationText: leg?.duration?.text,
      durationSeconds: leg?.duration?.value || 0,
      distanceText: leg?.distance?.text,
      departureTime: leg?.departure_time?.text,
      arrivalTime: leg?.arrival_time?.text,
      steps,
      warnings: r.warnings || [],
      googleMapsUrl: googleMapsWebUrl(origin, destination, mode),
    };
  });

  const response: DirectionsResponse = {
    routes,
    origin,
    destination,
    mode,
  };

  // Cache 6h — directions are stable enough at this granularity and the
  // sidebar re-fetches whenever origin/destination/mode changes.
  await setCache(cacheKey, response, 60 * 6);

  return NextResponse.json(response);
}
