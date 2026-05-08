"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudSun, ChevronUp, X } from "lucide-react";
import { WeatherDayItem } from "./WeatherDayItem";
import { clothingTips, type WeatherResponse, type DailyForecast } from "@/lib/weatherService";

interface Props {
  lat: number;
  lon: number;
  startDate: string;
  endDate: string;
  cityName: string;
}

/**
 * Compact, always-visible weather widget pinned to the bottom-right corner.
 * Default state is a tiny pill (icon + min/max). Tap to expand into the full
 * daily forecast + packing tips. Hidden entirely if Open-Meteo can't serve the
 * date range (more than 16 days ahead).
 */
export default function StickyWeatherWidget({ lat, lon, startDate, endDate, cityName }: Props) {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lon: lon.toString(),
          start: startDate,
          end: endDate,
        });
        const res = await fetch(`/api/weather?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as WeatherResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Forecast unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [lat, lon, startDate, endDate]);

  if (loading || error || !data || data.daily.length === 0) {
    return null;
  }

  // Aggregate min/max across the trip for the collapsed pill.
  const minT = Math.round(Math.min(...data.daily.map((d) => d.tempMin)));
  const maxT = Math.round(Math.max(...data.daily.map((d) => d.tempMax)));
  const today = new Date().toISOString().slice(0, 10);
  const tips = clothingTips(data.daily);

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      <AnimatePresence initial={false} mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-border-default">
              <div className="flex items-center gap-2">
                <CloudSun className="h-5 w-5 text-primary-500" />
                <h3 className="text-base font-bold text-secondary-500 dark:text-white">
                  Weather in {cityName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Collapse weather"
                className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-neutral-100 dark:hover:bg-surface-elevated transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {data.daily.map((d: DailyForecast) => (
                  <WeatherDayItem key={d.date} day={d} highlight={d.date === today} />
                ))}
              </div>

              {tips.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-border-default">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">
                    What to pack
                  </p>
                  <ul className="space-y-1">
                    {tips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-primary-500 shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            type="button"
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2.5 rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface pl-3 pr-4 py-2 shadow-xl hover:shadow-2xl transition-shadow"
            aria-label={`Weather in ${cityName}: ${minT}° to ${maxT}°`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
              <CloudSun className="h-4 w-4 text-primary-500" />
            </span>
            <span className="text-left">
              <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none">
                {cityName}
              </span>
              <span className="block text-sm font-extrabold text-text-primary leading-tight">
                {minT}° / {maxT}°
              </span>
            </span>
            <ChevronUp className="h-4 w-4 text-text-muted" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
