import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch Wikipedia thumbnail images for a list of attraction names.
 * GET /api/attractions/images?names=Tower+of+London,Big+Ben&city=London
 * Returns { "Tower of London": "https://...", "Big Ben": "https://..." }
 */
export async function GET(req: NextRequest) {
  const rawNames = req.nextUrl.searchParams.get("names") ?? "";
  const city = req.nextUrl.searchParams.get("city") ?? "";
  const names = rawNames
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  if (names.length === 0) {
    return NextResponse.json({});
  }

  const results: Record<string, string> = {};

  await Promise.all(
    names.map(async (name) => {
      try {
        // First try: "Attraction City"
        const withCity = city ? `${name} ${city}` : name;
        const img = await fetchWikiImage(withCity) ?? await fetchWikiImage(name);
        if (img) results[name] = img;
      } catch {
        // silently skip — UI will fallback to icon
      }
    })
  );

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

async function fetchWikiImage(query: string): Promise<string | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: "query",
      titles: query,
      prop: "pageimages",
      format: "json",
      pithumbsize: "600",
      origin: "*",
    });

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0] as any;
  return page?.thumbnail?.source ?? null;
}
