import { NextRequest, NextResponse } from "next/server";
import { fetchForecast } from "@/lib/weatherService";
import { getCached, setCache } from "@/lib/cache";

/**
 * GET /api/weather?lat=&lon=&start=&end=
 *
 * Wraps Open-Meteo with the existing api_cache table (3h TTL).
 * Open-Meteo allows free use without a key but rate-limits at the IP level —
 * caching server-side prevents bursts during simultaneous user sessions.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (Number.isNaN(lat) || Number.isNaN(lon) || !start || !end) {
    return NextResponse.json(
      { error: "Missing or invalid params: lat, lon, start, end" },
      { status: 400 }
    );
  }

  const cacheKey = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}:${start}:${end}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...(cached.data as object), source: "cached" });
  }

  try {
    const data = await fetchForecast(lat, lon, start, end);
    await setCache(cacheKey, data, 180); // 3 hours
    return NextResponse.json({ ...data, source: "live" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Forecast failed" },
      { status: 502 }
    );
  }
}
