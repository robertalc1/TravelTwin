'use client';

import { Car, Bus, MapPin, Clock, Route } from 'lucide-react';

interface Props {
  originCity: string;
  destinationCity: string;
  mode: 'car' | 'bus';
  distanceKm: number;
  durationHours: number;
  durationInTrafficHours?: number;
  stopoverCity?: string;
}

export default function RoadItinerary({
  originCity,
  destinationCity,
  mode,
  distanceKm,
  durationHours,
  durationInTrafficHours,
  stopoverCity,
}: Props) {
  const Icon = mode === 'car' ? Car : Bus;
  const modeLabel = mode === 'car' ? 'Driving' : 'Bus';
  const totalHoursLabel = formatHours(durationHours);

  return (
    <section className="rounded-radius-xl border border-border-default bg-surface p-6 dark:border-border-default">
      <header className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
          <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-h3 text-text-primary">Your route</h2>
          <p className="text-body-sm text-text-secondary">{modeLabel} {originCity} → {destinationCity}</p>
        </div>
      </header>

      <div className="space-y-4">
        <Waypoint label="Departure" city={originCity} accent="primary" />

        <div className="ml-5 border-l-2 border-dashed border-emerald-300 dark:border-emerald-700 pl-6 py-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Route className="h-4 w-4" />
              {distanceKm} km
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {totalHoursLabel}
            </span>
            {durationInTrafficHours && durationInTrafficHours > durationHours * 1.05 && (
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                with traffic {formatHours(durationInTrafficHours)}
              </span>
            )}
          </div>
        </div>

        {stopoverCity && (
          <>
            <Waypoint label="Overnight stop" city={stopoverCity} accent="amber" />
            <div className="ml-5 border-l-2 border-dashed border-emerald-300 dark:border-emerald-700 pl-6 py-2">
              <div className="flex items-center gap-1.5 text-body-sm text-text-secondary">
                <Route className="h-4 w-4" />
                Second leg
              </div>
            </div>
          </>
        )}

        <Waypoint label="Arrival" city={destinationCity} accent="emerald" />
      </div>
    </section>
  );
}

function Waypoint({
  label,
  city,
  accent,
}: {
  label: string;
  city: string;
  accent: 'primary' | 'amber' | 'emerald';
}) {
  const ring =
    accent === 'primary'
      ? 'ring-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
      : accent === 'amber'
      ? 'ring-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300'
      : 'ring-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300';
  return (
    <div className="flex items-start gap-4">
      <span className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ${ring}`}>
        <MapPin className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
        <p className="text-body font-semibold text-text-primary">{city}</p>
      </div>
    </div>
  );
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
