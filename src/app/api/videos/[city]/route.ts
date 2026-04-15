import { NextResponse } from 'next/server';
import { getCityShorts, pickBestVideoFile } from '@/lib/pexelsVideos';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ city: string }> }
) {
    const { city: rawCity } = await params;
    const url = new URL(req.url);
    const country = url.searchParams.get('country') || undefined;
    const city = decodeURIComponent(rawCity || '').trim();

    if (!city) {
        return NextResponse.json({ videos: [], error: 'City required' }, { status: 400 });
    }

    const videos = await getCityShorts(city, country);

    const normalized = videos
        .map(v => ({
            id: v.id,
            thumbnail: v.image,
            duration: v.duration,
            width: v.width,
            height: v.height,
            url: pickBestVideoFile(v),
            author: v.user.name,
            authorUrl: v.user.url,
            pexelsUrl: v.url,
        }))
        .filter(v => v.url);

    return NextResponse.json(
        {
            city,
            country: country || null,
            count: normalized.length,
            videos: normalized,
        },
        {
            headers: {
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
            },
        }
    );
}
