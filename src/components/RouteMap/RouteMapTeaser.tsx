'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Plane, Navigation, Sparkles } from 'lucide-react';
import { buildStaticPreviewUrl } from './buildEmbedUrl';

interface Props {
  originCity: string;
  originCode: string;
  destinationCity: string;
  destinationLat: number;
  destinationLon: number;
  /** Internal href for the full-page route view, e.g. `/plan/trip/[id]/map`. */
  href: string;
}

/**
 * Teaser card that replaces the inline iframe on the trip detail page.
 * Renders a static-map thumbnail (cheap; one Static Maps API call) plus
 * a CTA that opens the dedicated split-panel route page where the user
 * can pick a travel mode and explore the attractions.
 */
export default function RouteMapTeaser({
  originCity,
  originCode,
  destinationCity,
  destinationLat,
  destinationLon,
  href,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const staticUrl = buildStaticPreviewUrl(apiKey, destinationLat, destinationLon, '1280x600');

  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface shadow-sm hover:shadow-lg transition-shadow"
      aria-label={`Open the full route map for ${destinationCity}`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative h-56 sm:h-72 lg:h-[360px] overflow-hidden"
      >
        {staticUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={staticUrl}
            alt={`Map preview of ${destinationCity}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-100 via-amber-50 to-sky-100 dark:from-primary-900/30 dark:via-amber-900/20 dark:to-sky-900/30" />
        )}

        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/10" />

        {/* Route badge — top left */}
        {(originCode || originCity) && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 rounded-full bg-white/95 dark:bg-surface/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold shadow-md">
            <Plane className="h-3.5 w-3.5 text-primary-500" />
            <span className="text-text-primary">{originCode || originCity}</span>
            <span className="text-text-muted">→</span>
            <MapPin className="h-3.5 w-3.5 text-primary-500" />
            <span className="text-text-primary">{destinationCity}</span>
          </div>
        )}

        {/* CTA — bottom-left */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 flex flex-col items-start gap-2 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-white/85 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Interactive route map
          </p>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold drop-shadow-md max-w-2xl">
            Plan your day in {destinationCity}
          </p>
          <span className="mt-2 sm:mt-3 inline-flex items-center gap-2 rounded-full bg-primary-500 group-hover:bg-primary-600 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-bold shadow-lg transition-all group-hover:gap-3 group-hover:px-7">
            <Navigation className="h-4 w-4" />
            Open full route map
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
