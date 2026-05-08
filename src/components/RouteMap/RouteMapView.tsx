'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Plane, MapPin, Car, Footprints, Bus, Bike,
  Coffee, Utensils, Compass, ExternalLink,
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

  const directionsUrl = buildDirectionsEmbedUrl({
    apiKey,
    origin,
    destination,
    waypoints,
    mode,
  });

  const placeUrl = buildPlaceEmbedUrl(
    apiKey,
    `${trip.destinationCity}, ${trip.destinationCountry}`,
  );

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
          {/* Floating mode toggle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/60 dark:border-border-default p-1 max-w-[calc(100%-1.5rem)]">
            {TRAVEL_MODES.map((id) => {
              const { label, icon: Icon } = MODE_META[id];
              const selected = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
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

          <div className="h-[55vh] lg:h-[calc(100vh-4rem)]">
            {directionsUrl ? (
              <iframe
                key={mode}
                title={`Route from ${originCity} to ${trip.destinationCity} (${mode})`}
                src={directionsUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : placeUrl ? (
              <iframe
                title={`Map of ${trip.destinationCity}`}
                src={placeUrl}
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                Your route
              </h2>
              <ol className="relative space-y-3">
                {/* Connector line */}
                <span className="absolute left-[15px] top-3 bottom-3 w-px bg-neutral-200 dark:bg-border-default" aria-hidden />

                <li className="relative flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-md z-10">
                    <Plane className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted leading-none">
                      Arrive at
                    </p>
                    <p className="text-sm font-semibold text-text-primary mt-0.5 truncate">
                      {airportLabel}
                    </p>
                  </div>
                </li>

                {attractions.map((a, i) => (
                  <li key={a.name + i} className="relative flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface border-2 border-primary-500 text-primary-600 dark:text-primary-400 text-xs font-bold z-10">
                      {i + 1}
                    </span>
                    <a
                      href={googleMapsSearchUrl(a.name, trip.destinationCity)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 pt-1 block group"
                    >
                      <p className="text-sm font-semibold text-text-primary group-hover:text-primary-500 transition-colors truncate">
                        {a.name}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{a.description}</p>
                    </a>
                  </li>
                ))}
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
                    <PlaceLink
                      key={r.name}
                      name={r.name}
                      sub={`${r.cuisine}${r.priceRange ? ' · ' + r.priceRange : ''}`}
                      city={trip.destinationCity}
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
                    <PlaceLink
                      key={c.name}
                      name={c.name}
                      sub={c.specialty}
                      city={trip.destinationCity}
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
                    <PlaceLink
                      key={a.name}
                      name={a.name}
                      sub={a.description}
                      city={trip.destinationCity}
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
          </div>
        </aside>
      </div>
    </div>
  );
}

interface PlaceLinkProps {
  name: string;
  sub?: string;
  city: string;
}

function PlaceLink({ name, sub, city }: PlaceLinkProps) {
  return (
    <li>
      <a
        href={googleMapsSearchUrl(name, city)}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex items-start gap-2 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-3 py-2.5 hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors group"
      >
        <MapPin className="h-3.5 w-3.5 text-text-muted group-hover:text-primary-500 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary group-hover:text-primary-500 transition-colors truncate">
            {name}
          </p>
          {sub && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{sub}</p>}
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </a>
    </li>
  );
}
