import { NextRequest, NextResponse } from "next/server";

export const revalidate = 86400;

/**
 * Generic Unsplash search endpoint (server-side only — key never exposed to browser).
 * GET /api/unsplash?query=Eiffel+Tower+Paris
 * Returns { url, thumb, credit, creditLink }
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Unsplash API error" }, { status: res.status });
    }

    const data = await res.json();
    const photo = data?.results?.[0];
    if (!photo) {
      return NextResponse.json({ error: "No results" }, { status: 404 });
    }

    return NextResponse.json({
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      credit: photo.user.name,
      creditLink: `${photo.user.links.html}?utm_source=traveltwin&utm_medium=referral`,
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
