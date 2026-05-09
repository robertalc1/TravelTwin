'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plane, MapPin, Car, Footprints, Bus, Bike,
  Coffee, Utensils, Compass, ExternalLink, Route as RouteIcon,
  Info,
} from 'lucide-react';
import type { TripDetail } from '@/lib/tripDetail';
import {
  buildDirectionsEmbedUrl,
  buildPlaceEmbedUrl,
  buildRouteStops,
  TRAVEL_MODES,
  type TravelMode,
} from './buildEmbedUrl';
import { getAirportCoord } from '@/lib/airportCoordinates';

interface Props {
  trip: TripDetail;
  /** From the `planResults` sessionStorage entry — populated by the planner. */
  originCity: string;
  originCode: string;
}

const MODE_META: Record<TravelMode, { label: string; icon: typeof Car }> = {
  driving: { label: 'Driving', icon: Car },
  walking: { label: 'Walking', icon: Footprints },
  transit: { label: 'Transit', icon: Bus },
  bicycling: { label: 'Cycling', icon: Bike },
};

function googleMapsSearchUrl(name: string, city: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(`${name}, ${city}`)}`;
}

export default function RouteMapView({ trip, originCity, originCode }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<TravelMode>('driving');
  /**
   * When non-null, the iframe shows just this place (Embed API "place" mode)
   * instead of the full route. Set by clicking any sidebar item; cleared by
   * the "Back to full route" pill or by changing the travel mode.
   */
  const [focusedPlace, setFocusedPlace] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const ai = trip.aiContent;
  const attractions = (ai?.topAttractions ?? []).slice(0, 4);
  const restaurants = ai?.topRestaurants ?? [];
  const cafes = ai?.topCafes ?? [];

  // Build route stops + URLs
  const { origin, destination, waypoints } = buildRouteStops({
    originCity,
    originCode,
    destinationCity: trip.destinationCity,
    attractions,
    max: 4,
  });

  // Full multi-stop route (airport → 4 attractions) — used in the default
  // (un-focused) state.
  const fullRouteUrl = buildDirectionsEmbedUrl({
    apiKey,
    origin,
    destination,
    waypoints,
    mode,
  });

  // When the user clicks a place we switch to a SINGLE-STOP directions
  // embed (airport → focused place) so the iframe still draws an actual
  // travel polyline and lets the user compare modes for that one trip.
  const focusedDirectionsUrl = focusedPlace
    ? buildDirectionsEmbedUrl({
        apiKey,
        origin,
        destination: focusedPlace,
        waypoints: [],
        mode,
      })
    : null;

  // Last-ditch fallback if no API key / origin is available.
  const cityPlaceUrl = buildPlaceEmbedUrl(
    apiKey,
    `${trip.destinationCity}, ${trip.destinationCountry}`,
  );

  const iframeSrc = focusedDirectionsUrl ?? fullRouteUrl ?? cityPlaceUrl;
  // Force reload the iframe whenever the rendered route changes.
  const iframeKey = focusedPlace
    ? `focus:${focusedPlace}:${mode}`
    : `route:${mode}`;

  const airport = originCode ? getAirportCoord(originCode) : undefined;
  const airportLabel = airport
    ? `${airport.name} (${originCode})`
    : originCity
      ? `${originCity}${originCode ? ` (${originCode})` : ''}`
      : 'Airport';

  // Lock body scroll on desktop where the layout is full-height.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 1024) document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/plan/trip/${trip.id}`);
    }
  };

  function focusPlace(name: string) {
    setFocusedPlace(`${name}, ${trip.destinationCity}`);
    // Scroll the map into view on mobile so the user sees the result
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function showFullRoute() {
    setFocusedPlace(null);
  }

  function selectMode(next: TravelMode) {
    // Mode now applies to BOTH the full route and the focused single-stop
    // route, so we don't clear focus — the user can compare modes for the
    // place they just tapped.
    setMode(next);
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-background">
      {/* ── Header bar ── */}
      <header className="shrink-0 border-b border-neutral-200 dark:border-border-default bg-white dark:bg-surface">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to trip"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted leading-none">
              Plan your day
            </p>
            <h1 className="text-base sm:text-xl font-extrabold text-text-primary truncate mt-1">
              Route in {trip.destinationCity}
            </h1>
          </div>
        </div>
      </header>

      {/* ── Body: split-panel on desktop, stacked on mobile ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">

        {/* Map column — comes second in DOM order on desktop, first on mobile */}
        <section className="order-1 lg:order-2 lg:flex-1 relative bg-neutral-100 dark:bg-neutral-900">
          {/* Floating controls — mode toggle (always) + focused-place chip */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 max-w-[calc(100%-1.5rem)]">
            {/* Mode toggle — always visible. Switching modes works for both
                the full route and the focused single-stop route, so the user
                can compare driving vs walking vs transit vs cycling for any
                place they tapped. */}
            <div className="flex gap-1 bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/60 dark:border-border-default p-1">
              {TRAVEL_MODES.map((id) => {
                const { label, icon: Icon } = MODE_META[id];
                const selected = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectMode(id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all ${
                      selected
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-surface-elevated'
                    }`}
                    aria-pressed={selected}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mode-availability notice — Google's transit and cycling data
                isn't available for every city/route. When the iframe shows
                no polyline for these modes, the user shouldn't think our app
                is broken — surface a tiny hint nudging them to try driving
                or walking instead. */}
            {(mode === 'transit' || mode === 'bicycling') && (
              <div className="flex items-start gap-1.5 bg-amber-50/95 dark:bg-amber-900/20 backdrop-blur-md rounded-xl border border-amber-200/60 dark:border-amber-800/40 px-3 py-1.5 max-w-full">
                <Info className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                  {mode === 'transit'
                    ? 'Public transit data depends on Google coverage for this city. If no bus routes appear, try driving or walking.'
                    : 'Cycling routes depend on Google coverage. If the path is missing, try driving or walking.'}
                </p>
              </div>
            )}

            {/* Focused-place chip — visible only when the user has tapped a
                place. Tells them what the iframe is showing now and gives
                them a one-tap escape back to the full multi-stop route. */}
            {focusedPlace && (
              <div className="flex items-center gap-2 bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/60 dark:border-border-default px-3 py-1.5 w-full max-w-full">
                <MapPin className="h-3.5 w-3.5 text-primary-500 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                  Route to {focusedPlace.split(',')[0]}
                </span>
                <button
                  type="button"
                  onClick={showFullRoute}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-500 hover:bg-primary-600 px-3 py-1 text-xs font-bold text-white shadow shrink-0 ml-auto"
                >
                  <RouteIcon className="h-3 w-3" />
                  Full route
                </button>
              </div>
            )}
          </div>

          <div className="h-[55vh] lg:h-[calc(100vh-4rem)]">
            {iframeSrc ? (
              <iframe
                key={iframeKey}
                title={
                  focusedPlace
                    ? `Route to ${focusedPlace} (${mode})`
                    : `Route to ${trip.destinationCity} (${mode})`
                }
                src={iframeSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-neutral-50 dark:bg-surface-elevated text-center px-6">
                <div>
                  <p className="text-sm font-bold text-text-primary mb-1">
                    Google Maps key not configured
                  </p>
                  <p className="text-xs text-text-muted">
                    Add <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment
                    to enable the interactive map.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sidebar — comes first in DOM (it's the explanatory column) */}
        <aside className="order-2 lg:order-1 lg:w-[420px] lg:shrink-0 lg:overflow-y-auto lg:h-[calc(100vh-4rem)] border-t lg:border-t-0 lg:border-r border-neutral-200 dark:border-border-default bg-white dark:bg-surface">
          <div className="p-4 sm:p-5 space-y-6">

            {/* ROUTE STOPS */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Your route
                </h2>
                {focusedPlace && (
                  <button
                    type="button"
                    onClick={showFullRoute}
                    className="text-xs font-bold text-primary-500 hover:text-primary-600 inline-flex items-center gap-1"
                  >
                    <RouteIcon className="h-3 w-3" /> Show full route
                  </button>
                )}
              </div>
              <ol className="relative space-y-2">
                {/* Connector line */}
                <span className="absolute left-[15px] top-3 bottom-3 w-px bg-neutral-200 dark:bg-border-default" aria-hidden />

                <li className="relative flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-md z-10">
                    <Plane className="h-4 w-4" />
                  </span>
                  <button
                    type="button"
                    onClick={() => focusPlace(airportLabel)}
                    className="min-w-0 pt-1 text-left flex-1 group"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted leading-none">
                      Arrive at
                    </p>
                    <p className="text-sm font-semibold text-text-primary group-hover:text-primary-500 transition-colors mt-0.5 truncate">
                      {airportLabel}
                    </p>
                  </button>
                </li>

                {attractions.map((a, i) => {
                  const isFocused = focusedPlace?.startsWith(a.name + ',');
                  return (
                    <li key={a.name + i} className="relative flex items-start gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold z-10 ${
                          isFocused
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'bg-white dark:bg-surface border-primary-500 text-primary-600 dark:text-primary-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => focusPlace(a.name)}
                        className="min-w-0 pt-1 text-left flex-1 group"
                      >
                        <p className={`text-sm font-semibold transition-colors truncate ${
                          isFocused ? 'text-primary-500' : 'text-text-primary group-hover:text-primary-500'
                        }`}>
                          {a.name}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{a.description}</p>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {attractions.length === 0 && (
                <p className="text-xs text-text-muted">
                  No attractions data yet — open the trip detail page to fetch the day plan.
                </p>
              )}
            </section>

            {/* RESTAURANTS */}
            {restaurants.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
                  <Utensils className="h-3.5 w-3.5" /> Restaurants
                </h2>
                <ul className="space-y-1.5">
                  {restaurants.map((r) => (
                    <PlaceItem
                      key={r.name}
                      name={r.name}
                      sub={`${r.cuisine}${r.priceRange ? ' · ' + r.priceRange : ''}`}
                      city={trip.destinationCity}
                      isFocused={focusedPlace?.startsWith(r.name + ',') ?? false}
                      onFocus={() => focusPlace(r.name)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* CAFÉS */}
            {cafes.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
                  <Coffee className="h-3.5 w-3.5" /> Cafés
                </h2>
                <ul className="space-y-1.5">
                  {cafes.map((c) => (
                    <PlaceItem
                      key={c.name}
                      name={c.name}
                      sub={c.specialty}
                      city={trip.destinationCity}
                      isFocused={focusedPlace?.startsWith(c.name + ',') ?? false}
                      onFocus={() => focusPlace(c.name)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* All attractions deeper view */}
            {attractions.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
                  <Compass className="h-3.5 w-3.5" /> Things to do
                </h2>
                <ul className="space-y-1.5">
                  {attractions.map((a) => (
                    <PlaceItem
                      key={a.name}
                      name={a.name}
                      sub={a.description}
                      city={trip.destinationCity}
                      isFocused={focusedPlace?.startsWith(a.name + ',') ?? false}
                      onFocus={() => focusPlace(a.name)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* Back to trip */}
            <Link
              href={`/plan/trip/${trip.id}`}
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-4 py-3 text-sm font-semibold text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-sunken transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to your trip
            </Link>

            <p className="text-[10px] text-text-muted text-center leading-relaxed pt-1">
              Powered by Google Maps Embed — free of charge, switch modes as
              often as you like.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface PlaceItemProps {
  name: string;
  sub?: string;
  city: string;
  isFocused: boolean;
  onFocus: () => void;
}

/**
 * Sidebar list row. Main click focuses the in-app map iframe on this place
 * (no navigation, stays in our UI). The small external-link icon button is a
 * separate optional escape hatch to open Google Maps in a new tab.
 */
function PlaceItem({ name, sub, city, isFocused, onFocus }: PlaceItemProps) {
  return (
    <li>
      <div
        className={`relative flex items-start gap-2 rounded-xl border transition-colors ${
          isFocused
            ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-900/15 ring-2 ring-primary-500/20'
            : 'border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/10'
        }`}
      >
        <button
          type="button"
          onClick={onFocus}
          className="flex items-start gap-2 flex-1 min-w-0 px-3 py-2.5 text-left group"
          aria-pressed={isFocused}
        >
          <MapPin
            className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
              isFocused ? 'text-primary-500' : 'text-text-muted group-hover:text-primary-500'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-semibold transition-colors truncate ${
                isFocused ? 'text-primary-500' : 'text-text-primary group-hover:text-primary-500'
              }`}
            >
              {name}
            </p>
            {sub && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{sub}</p>}
          </div>
        </button>
        <a
          href={googleMapsSearchUrl(name, city)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${name} in Google Maps in a new tab`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-9 w-9 mr-1 my-auto items-center justify-center rounded-lg text-text-muted hover:text-primary-500 hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </li>
  );
}
