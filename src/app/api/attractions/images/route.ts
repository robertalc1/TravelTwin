import { NextRequest, NextResponse } from "next/server";

export const revalidate = 86400;

interface PhotoResult {
  url: string;
  credit: string;
  creditLink: string;
}

/**
 * Fetch Unsplash images for a list of attraction names (server-side, key never exposed).
 * GET /api/attractions/images?names=Tower+of+London,Big+Ben&city=London
 * Returns { "Tower of London": { url, credit, creditLink }, ... }
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

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  const results: Record<string, PhotoResult> = {};

  await Promise.all(
    names.map(async (name) => {
      try {
        const photo = accessKey
          ? await fetchUnsplashPhoto(`${name} ${city}`.trim(), accessKey) ??
            await fetchUnsplashPhoto(name, accessKey)
          : null;

        if (photo) {
          results[name] = photo;
        }
      } catch {
        // silently skip — UI will show fallback icon
      }
    })
  );

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

async function fetchUnsplashPhoto(
  query: string,
  accessKey: string
): Promise<PhotoResult | null> {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 86400 },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const photo = data?.results?.[0];
  if (!photo) return null;

  return {
    url: photo.urls.regular,
    credit: photo.user.name,
    creditLink: `${photo.user.links.html}?utm_source=traveltwin&utm_medium=referral`,
  };
}
