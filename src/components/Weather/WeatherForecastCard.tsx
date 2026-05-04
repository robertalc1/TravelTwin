"use client";

import { useEffect, useState } from "react";
import { CloudSun, Loader2 } from "lucide-react";
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
 * Self-contained weather card. Fetches the forecast on mount and renders a
 * horizontal scroll of daily items + a clothing tip list.
 *
 * Designed to fail gracefully: if the date range is too far ahead (Open-Meteo
 * caps at ~16 days from today) we just hide the section.
 */
export function WeatherForecastCard({ lat, lon, startDate, endDate, cityName }: Props) {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6 flex items-center gap-3 text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading weather forecast…</span>
      </div>
    );
  }

  if (error || !data || data.daily.length === 0) {
    return null;
  }

  const tips = clothingTips(data.daily);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6">
      <div className="flex items-center gap-2 mb-4">
        <CloudSun className="h-5 w-5 text-primary-500" />
        <h3 className="text-lg font-bold text-secondary-500">
          Weather in {cityName}
        </h3>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {data.daily.map((d: DailyForecast) => (
          <WeatherDayItem key={d.date} day={d} highlight={d.date === today} />
        ))}
      </div>

      {tips.length > 0 && (
        <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-border-default">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            What to pack
          </p>
          <ul className="space-y-1.5">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">Data: Open-Meteo (free, no API key)</p>
    </div>
  );
}
