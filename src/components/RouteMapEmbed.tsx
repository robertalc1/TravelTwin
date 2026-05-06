'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plane, Navigation, Sparkles, Car, Footprints, Bus } from 'lucide-react';

interface RouteMapEmbedProps {
  originCode: string;
  originCity: string;
  destinationCity: string;
  destinationCountry: string;
  destinationLat: number;
  destinationLon: number;
  attractions: Array<{ name: string }>;
}

type TravelMode = 'driving' | 'walking' | 'transit';

const MODE_OPTIONS: Array<{ id: TravelMode; label: string; icon: typeof Car }> = [
  { id: 'driving', label: 'Driving', icon: Car },
  { id: 'walking', label: 'Walking', icon: Footprints },
  { id: 'transit', label: 'Transit', icon: Bus },
];

export default function RouteMapEmbed({
  originCode,
  originCity,
  destinationCity,
  destinationCountry,
  destinationLat,
  destinationLon,
  attractions,
}: RouteMapEmbedProps) {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<TravelMode>('driving');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Embed Directions API caps waypoints at 3
  const waypoints = attractions
    .slice(0, 3)
    .map((a) => `${a.name}, ${destinationCity}`)
    .join('|');

  const origin =
    originCity && originCode
      ? `${originCity} airport (${originCode})`
      : originCity || `${destinationCity} airport`;

  const directionsUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/directions` +
      `?key=${apiKey}` +
      `&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(`${destinationCity} city center`)}` +
      (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '') +
      `&mode=${mode}`
    : null;

  // Fallback to a simple `place` map if the key is missing — at least show something
  const placeUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/place` +
      `?key=${apiKey}` +
      `&q=${encodeURIComponent(`${destinationCity}, ${destinationCountry}`)}` +
      `&zoom=12`
    : null;

  // Static map preview (no quota — uses Maps Static API at minimal cost; if no
  // key, just shows a styled gradient placeholder). Used inside the idle state.
  const staticPreviewUrl = apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap` +
      `?center=${destinationLat},${destinationLon}` +
      `&zoom=11&size=1280x600&scale=2&maptype=roadmap` +
      `&markers=color:0xf97316%7C${destinationLat},${destinationLon}` +
      `&style=feature:poi%7Celement:labels%7Cvisibility:off` +
      `&key=${apiKey}`
    : null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface shadow-sm">
      <AnimatePresence mode="wait" initial={false}>
        {!active ? (
          <motion.button
            key="idle"
            type="button"
            onClick={() => setActive(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative block w-full text-left group"
            aria-label={`Show interactive route from ${originCity || originCode} to ${destinationCity}`}
          >
            {/* Background — static preview if available, otherwise gradient */}
            <div className="relative h-[480px] sm:h-[600px] lg:h-[700px] overflow-hidden">
              {staticPreviewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={staticPreviewUrl}
                  alt={`Map preview of ${destinationCity}`}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary-100 via-amber-50 to-sky-100 dark:from-primary-900/30 dark:via-amber-900/20 dark:to-sky-900/30" />
              )}

              {/* Vignette overlay so the CTA pops */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/10" />

              {/* Route badge — top left */}
              <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-white/95 dark:bg-surface/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold shadow-md">
                <Plane className="h-3.5 w-3.5 text-primary-500" />
                <span className="text-text-primary">{originCode || originCity}</span>
                <span className="text-text-muted">→</span>
                <MapPin className="h-3.5 w-3.5 text-primary-500" />
                <span className="text-text-primary">{destinationCity}</span>
              </div>

              {/* CTA centered — bottom */}
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col items-start gap-2 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-white/85 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Interactive route map
                </p>
                <p className="text-3xl sm:text-4xl font-extrabold drop-shadow-md max-w-2xl">
                  Plan your day in {destinationCity}
                </p>
                <p className="text-sm sm:text-base text-white/90 max-w-xl">
                  Routes from the airport, walking paths between attractions, and transit
                  lines — all in one tap.
                </p>
                <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-500 group-hover:bg-primary-600 px-6 py-3 text-sm font-bold shadow-lg transition-all group-hover:gap-3 group-hover:px-7">
                  <Navigation className="h-4 w-4" />
                  Show route map
                </span>
              </div>
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative h-[480px] sm:h-[600px] lg:h-[700px]"
          >
            {/* Travel mode toggle bar — floats over the iframe */}
            {directionsUrl && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-1 bg-white/95 dark:bg-surface/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-200/60 dark:border-border-default p-1">
                {MODE_OPTIONS.map(({ id, label, icon: Icon }) => {
                  const selected = mode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMode(id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold transition-all ${
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
            )}

            {directionsUrl ? (
              <iframe
                key={mode}
                title={`Route from ${originCity} to ${destinationCity} (${mode})`}
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
                title={`Map of ${destinationCity}`}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
