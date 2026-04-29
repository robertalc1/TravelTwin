/**
 * Open-Meteo client (no API key required).
 * Docs: https://open-meteo.com/en/docs
 *
 * We request daily aggregates only — hourly data is overkill for a 7-day
 * forecast preview and would 5x our payload size.
 */

export interface DailyForecast {
  date: string;            // YYYY-MM-DD
  tempMax: number;         // °C
  tempMin: number;         // °C
  precipitationMm: number;
  weatherCode: number;     // WMO code
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: DailyForecast[];
}

interface OpenMeteoRaw {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weathercode: number[];
  };
}

/**
 * Fetch a daily forecast between [start, end] inclusive.
 * Open-Meteo accepts up to 16 days into the future from `today`.
 */
export async function fetchForecast(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<WeatherResponse> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lon.toString());
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode"
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  const res = await fetch(url.toString(), { next: { revalidate: 10800 } });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const raw = (await res.json()) as OpenMeteoRaw;

  const daily: DailyForecast[] = raw.daily.time.map((d, i) => ({
    date: d,
    tempMax: raw.daily.temperature_2m_max[i],
    tempMin: raw.daily.temperature_2m_min[i],
    precipitationMm: raw.daily.precipitation_sum[i],
    weatherCode: raw.daily.weathercode[i],
  }));

  return { latitude: raw.latitude, longitude: raw.longitude, timezone: raw.timezone, daily };
}

/**
 * WMO weather code → Lucide icon name + human description.
 * https://open-meteo.com/en/docs#weathervariables
 */
export function decodeWeatherCode(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "Sun", label: "Clear sky" };
  if (code === 1) return { icon: "Sun", label: "Mainly clear" };
  if (code === 2) return { icon: "CloudSun", label: "Partly cloudy" };
  if (code === 3) return { icon: "Cloud", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "CloudFog", label: "Fog" };
  if (code >= 51 && code <= 57) return { icon: "CloudDrizzle", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { icon: "CloudRain", label: "Rain" };
  if (code >= 71 && code <= 77) return { icon: "Snowflake", label: "Snow" };
  if (code >= 80 && code <= 82) return { icon: "CloudRain", label: "Rain showers" };
  if (code >= 85 && code <= 86) return { icon: "Snowflake", label: "Snow showers" };
  if (code >= 95) return { icon: "CloudLightning", label: "Thunderstorm" };
  return { icon: "Cloud", label: "Unknown" };
}

/**
 * Generate a short, useful clothing recommendation from average temp + precip.
 * Kept locally so it works offline once the forecast is cached.
 */
export function clothingTips(daily: DailyForecast[]): string[] {
  if (daily.length === 0) return [];
  const avgMax = daily.reduce((s, d) => s + d.tempMax, 0) / daily.length;
  const totalRain = daily.reduce((s, d) => s + d.precipitationMm, 0);
  const tips: string[] = [];

  if (avgMax >= 25) tips.push("Light, breathable fabrics — t-shirts, shorts, sandals.");
  else if (avgMax >= 15) tips.push("Layered outfits — long sleeves with a light jacket.");
  else if (avgMax >= 5) tips.push("Warm coat, scarf, and closed shoes.");
  else tips.push("Heavy winter gear — insulated jacket, hat, gloves.");

  if (totalRain > 5) tips.push("Pack a compact umbrella or waterproof jacket.");
  if (avgMax >= 22) tips.push("Sunglasses and SPF 30+ sunscreen recommended.");
  if (avgMax < 10) tips.push("Thermal base layers will pay off.");

  return tips;
}
