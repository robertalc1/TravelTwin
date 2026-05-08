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
}

/**
 * Compact horizontal weather strip designed to live inside the trip hero.
 * Always-expanded; shows the daily forecast as a row of day pills with
 * a translucent backdrop so it reads on top of the hero photo. Hidden if
 * Open-Meteo can't serve the date range (more than 16 days ahead).
 */
export default function HeroWeatherStrip({ lat, lon, startDate, endDate, cityName }: Props) {
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

  return (
    <div className="rounded-xl sm:rounded-2xl bg-white/15 dark:bg-black/30 backdrop-blur-md border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xl">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 px-1">
        <CloudSun className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/90 shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/90 truncate">
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
