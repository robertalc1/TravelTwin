import {
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  type LucideIcon,
} from "lucide-react";
import { decodeWeatherCode, type DailyForecast } from "@/lib/weatherService";

const ICONS: Record<string, LucideIcon> = {
  Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Snowflake,
};

interface Props {
  day: DailyForecast;
  highlight?: boolean;
}

export function WeatherDayItem({ day, highlight = false }: Props) {
  const decoded = decodeWeatherCode(day.weatherCode);
  const Icon = ICONS[decoded.icon] ?? Cloud;
  const date = new Date(day.date);
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
  const dayNum = date.getDate();

  return (
    <div
      className={`flex flex-col items-center justify-between rounded-xl px-2 py-2 sm:px-3 sm:py-3 text-center min-w-[60px] sm:min-w-[72px] shrink-0 snap-start border transition-colors ${
        highlight
          ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
          : "border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated"
      }`}
    >
      <span className="text-[10px] sm:text-xs font-medium text-text-secondary">{weekday}</span>
      <span className="text-xs sm:text-sm font-bold text-text-primary mb-0.5 sm:mb-1">{dayNum}</span>
      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-500 my-0.5 sm:my-1" aria-label={decoded.label} />
      <span className="text-[10px] sm:text-xs text-text-muted leading-tight whitespace-nowrap">
        {Math.round(day.tempMin)}° / <span className="font-semibold text-text-primary">{Math.round(day.tempMax)}°</span>
      </span>
      {day.precipitationMm > 0.5 && (
        <span className="mt-0.5 text-[9px] sm:text-[10px] text-blue-500">{day.precipitationMm.toFixed(1)}mm</span>
      )}
    </div>
  );
}
