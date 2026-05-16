'use client';

import { useEffect, useState } from 'react';
import {
  Bus, Train, TramFront, Plane as PlaneIcon, Ship,
  Footprints, Car, Bike, ArrowRight, ChevronRight,
  Clock, AlertCircle, ExternalLink, Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type {
  DirectionsResponse, DirectionsRoute, DirectionsStep, TravelMode,
} from '@/app/api/directions/route';

interface Props {
  origin: string;
  destination: string;
  mode: TravelMode;
  /** Shown in the header above the routes list. */
  label?: string;
}

const VEHICLE_ICON: Record<string, typeof Bus> = {
  BUS: Bus,
  INTERCITY_BUS: Bus,
  TROLLEYBUS: Bus,
  SHARE_TAXI: Bus,
  HEAVY_RAIL: Train,
  COMMUTER_TRAIN: Train,
  HIGH_SPEED_TRAIN: Train,
  LONG_DISTANCE_TRAIN: Train,
  RAIL: Train,
  SUBWAY: TramFront,
  METRO_RAIL: TramFront,
  TRAM: TramFront,
  MONORAIL: TramFront,
  FUNICULAR: TramFront,
  GONDOLA_LIFT: TramFront,
  CABLE_CAR: TramFront,
  FERRY: Ship,
  AIRPLANE: PlaneIcon,
};

const MODE_ICON: Record<DirectionsStep['travelMode'], typeof Bus> = {
  WALKING: Footprints,
  TRANSIT: Bus,
  DRIVING: Car,
  BICYCLING: Bike,
};

function stripHtml(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function formatDurationShort(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

function VehicleBadge({ step }: { step: DirectionsStep }) {
  if (step.travelMode !== 'TRANSIT' || !step.transit) {
    const Icon = MODE_ICON[step.travelMode] || Footprints;
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-neutral-200 dark:bg-surface-elevated text-text-secondary">
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }
  const { line } = step.transit;
  const Icon = VEHICLE_ICON[line.vehicleType || ''] || Bus;
  const bg = line.color || '#1f2937';
  const fg = line.textColor || '#ffffff';
  return (
    <span
      className="inline-flex h-7 min-w-[2.5rem] items-center gap-1 rounded-md px-1.5 text-[11px] font-bold shadow-sm whitespace-nowrap"
      style={{ backgroundColor: bg, color: fg }}
      title={line.name || line.shortName}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate max-w-[7rem]">{line.shortName}</span>
    </span>
  );
}

function RouteCard({ route, index }: { route: DirectionsRoute; index: number }) {
  const t = useTranslations('transit');
  const [expanded, setExpanded] = useState(index === 0);

  // Build the compact ribbon shown when collapsed: shows every transit step as
  // a colored badge separated by chevrons, mirroring the layout in the user's
  // Google Maps reference screenshots.
  const transitBadges = route.steps
    .map((s, i) => ({ step: s, idx: i }))
    .filter((x) => x.step.travelMode === 'TRANSIT' || x.step.travelMode === 'WALKING');

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white text-xs font-bold shrink-0">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">
                {route.departureTime && route.arrivalTime
                  ? `${route.departureTime} – ${route.arrivalTime}`
                  : route.summary || t('altRoute')}
              </p>
              {(route.durationText || route.distanceText) && (
                <p className="text-xs text-text-muted flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {route.durationText || formatDurationShort(route.durationSeconds)}
                  {route.distanceText && <span>· {route.distanceText}</span>}
                </p>
              )}
            </div>
          </div>
          <ChevronRight
            className={`h-4 w-4 text-text-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </div>

        {/* Compact ribbon — visible whether expanded or not, like Google Maps */}
        <div className="flex flex-wrap items-center gap-1.5">
          {transitBadges.map(({ step, idx }, i) => (
            <span key={idx} className="inline-flex items-center gap-1.5">
              <VehicleBadge step={step} />
              {i < transitBadges.length - 1 && (
                <ChevronRight className="h-3 w-3 text-text-muted" />
              )}
            </span>
          ))}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-200 dark:border-border-default px-4 py-3 bg-neutral-50/60 dark:bg-surface-elevated/40">
          <ol className="space-y-3">
            {route.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className="shrink-0">
                  <VehicleBadge step={step} />
                </div>
                <div className="min-w-0 flex-1">
                  {step.travelMode === 'TRANSIT' && step.transit ? (
                    <div>
                      <p className="font-semibold text-text-primary leading-tight">
                        {step.transit.departureStop}
                      </p>
                      {step.transit.departureTime && (
                        <p className="text-xs text-text-muted">
                          {t('departure', { time: step.transit.departureTime })}
                        </p>
                      )}
                      <div className="my-1.5 flex items-center gap-1.5 text-xs text-text-secondary">
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span>
                          {step.transit.line.name || step.transit.line.shortName}
                          {step.transit.headsign && ` → ${step.transit.headsign}`}
                          {step.transit.numStops != null && ` · ${t('stopsCount', { count: step.transit.numStops })}`}
                        </span>
                      </div>
                      <p className="font-semibold text-text-primary leading-tight">
                        {step.transit.arrivalStop}
                      </p>
                      {step.transit.arrivalTime && (
                        <p className="text-xs text-text-muted">
                          {t('arrival', { time: step.transit.arrivalTime })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-text-secondary leading-snug">
                        {stripHtml(step.instructionsHtml) || (step.travelMode === 'WALKING' ? t('walkOnFoot') : t('continue'))}
                      </p>
                      {(step.durationText || step.distanceText) && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {step.durationText}
                          {step.distanceText && ` · ${step.distanceText}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <a
            href={route.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t('openInGoogleMaps')}
          </a>
        </div>
      )}
    </div>
  );
}

export default function TransitDetails({ origin, destination, mode, label }: Props) {
  const t = useTranslations('transit');
  const [data, setData] = useState<DirectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsServerKey, setNeedsServerKey] = useState(false);

  useEffect(() => {
    if (!origin || !destination) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setNeedsServerKey(false);

    fetch('/api/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, mode, alternatives: true }),
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          if (json?.needsServerKey) {
            const err: Error & { needsServerKey?: boolean } = new Error(json.error || 'Server key not configured');
            err.needsServerKey = true;
            throw err;
          }
          throw new Error(json.error || `HTTP ${r.status}`);
        }
        return json as DirectionsResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as Error & { needsServerKey?: boolean };
        if (err.needsServerKey) {
          setNeedsServerKey(true);
        } else {
          setError(e instanceof Error ? e.message : 'Eroare necunoscută');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [origin, destination, mode]);

  const fallbackGoogleUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
        <Bus className="h-3.5 w-3.5" /> {label || t('title')}
      </h2>

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-4 py-3 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('loading')}
        </div>
      )}

      {/* Server key not configured — distinct from a network/Google error.
          Triggered when /api/directions returns needsServerKey: true (the
          public Maps key has HTTP referer restrictions and Google rejects it
          for server-side Directions calls). Shows an admin-friendly hint plus
          the "View in Google Maps" escape hatch so the end user is never blocked. */}
      {needsServerKey && !loading && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-900/15 px-4 py-3 text-sm">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {t('needsServerKeyTitle')}
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                {t('needsServerKeySubtitle')}
              </p>
            </div>
          </div>
          <a
            href={fallbackGoogleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t('viewInGoogleMaps')}
          </a>
        </div>
      )}

      {error && !needsServerKey && !loading && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-900/15 px-4 py-3 text-sm">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {t('noRoutesError')}
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">{error}</p>
            </div>
          </div>
          <a
            href={fallbackGoogleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t('viewInGoogleMaps')}
          </a>
        </div>
      )}

      {!loading && !error && data && data.routes.length === 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-4 py-3 text-sm">
          <p className="text-text-secondary mb-2">
            {t('noData')}
          </p>
          <a
            href={fallbackGoogleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t('tryInGoogleMaps')}
          </a>
        </div>
      )}

      {!loading && !error && data && data.routes.length > 0 && (
        <div className="space-y-3">
          {data.routes.slice(0, 4).map((route, i) => (
            <RouteCard key={i} route={route} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
