'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plane, Navigation, Sparkles } from 'lucide-react';

interface RouteMapEmbedProps {
  originCode: string;
  originCity: string;
  destinationCity: string;
  destinationCountry: string;
  destinationLat: number;
  destinationLon: number;
  attractions: Array<{ name: string }>;
}

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

  const directionsUrl =
    apiKey
      ? `https://www.google.com/maps/embed/v1/directions` +
        `?key=${apiKey}` +
        `&origin=${encodeURIComponent(origin)}` +
        `&destination=${encodeURIComponent(`${destinationCity} city center`)}` +
        (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '') +
        `&mode=driving`
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
      `&zoom=11&size=800x400&scale=2&maptype=roadmap` +
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
            <div className="relative h-[420px] sm:h-[500px] overflow-hidden">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              {/* Route badge — top left */}
              <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-white/95 dark:bg-surface/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold shadow-md">
                <Plane className="h-3.5 w-3.5 text-primary-500" />
                <span className="text-text-primary">{originCode || originCity}</span>
                <span className="text-text-muted">→</span>
                <MapPin className="h-3.5 w-3.5 text-primary-500" />
                <span className="text-text-primary">{destinationCity}</span>
              </div>

              {/* CTA centered — bottom */}
              <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col items-start gap-2 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Interactive route
                </p>
                <p className="text-2xl font-extrabold drop-shadow-sm">
                  See your journey on Google Maps
                </p>
                <p className="text-sm text-white/85 max-w-md">
                  Driving directions from {originCity || originCode} airport to {destinationCity},
                  with the top attractions plotted along the way.
                </p>
                <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-500 group-hover:bg-primary-600 px-5 py-2.5 text-sm font-bold shadow-lg transition-all group-hover:gap-3 group-hover:px-6">
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
            className="relative h-[420px] sm:h-[500px]"
          >
            {directionsUrl ? (
              <iframe
                title={`Route from ${originCity} to ${destinationCity}`}
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
