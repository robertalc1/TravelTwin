"use client";

import { useEffect, useState } from "react";
import { CloudSun } from "lucide-react";
import { WeatherDayItem } from "./WeatherDayItem";
import type { WeatherResponse, DailyForecast } from "@/lib/weatherService";

interface Props {
  lat: number;
  lon: number;
  startDate: string;
  endDate: string;
  cityName: string;
  /**
   * `overlay` (default) — frosted glass for placement on top of the hero photo.
   * `inline`           — solid card with regular border, for placement on the
   *                      page background (used below the hero on mobile).
   */
  variant?: 'overlay' | 'inline';
}

/**
 * Compact horizontal weather strip. Two style variants share the same data:
 * the `overlay` variant lives inside the hero on top of the photo; the `inline`
 * variant renders as a regular card on the page so it has its own readable
 * surface when there isn't enough room over the hero (e.g. mobile, where the
 * overlay would cover the video). Hidden if Open-Meteo can't serve the date
 * range (more than 16 days ahead).
 */
export default function HeroWeatherStrip({ lat, lon, startDate, endDate, cityName, variant = 'overlay' }: Props) {
  const [data, setData] = useState<WeatherResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lon: lon.toString(),
          start: startDate,
          end: endDate,
        });
        const res = await fetch(`/api/weather?${params}`);
        if (!res.ok) return;
        const json = (await res.json()) as WeatherResponse;
        if (!cancelled) setData(json);
      } catch {
        /* hide on error */
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [lat, lon, startDate, endDate]);

  if (!data || data.daily.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);

  const isOverlay = variant === 'overlay';
  const wrapperClass = isOverlay
    ? 'rounded-xl sm:rounded-2xl bg-white/15 dark:bg-black/30 backdrop-blur-md border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xl'
    : 'rounded-2xl bg-white dark:bg-surface border border-neutral-200 dark:border-border-default px-3 py-2.5 shadow-sm';
  const labelClass = isOverlay ? 'text-white/90' : 'text-text-secondary';
  const iconClass = isOverlay ? 'text-white/90' : 'text-primary-500';

  return (
    <div className={wrapperClass}>
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 px-1">
        <CloudSun className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 ${iconClass}`} />
        <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate ${labelClass}`}>
          Weather in {cityName}
        </span>
      </div>
      <div className="flex gap-1 sm:gap-1.5 overflow-x-auto snap-x snap-mandatory pb-0.5 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {data.daily.map((d: DailyForecast) => (
          <WeatherDayItem key={d.date} day={d} highlight={d.date === today} />
        ))}
      </div>
    </div>
  );
}
