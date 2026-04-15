/* ── Pexels Videos API Client ──
   Free tier: 200 req/hour, 20,000/month.
   Docs: https://www.pexels.com/api/documentation/#videos
   API key required in env: PEXELS_API_KEY
─────────────────────────────────────────────────── */

const PEXELS_BASE = 'https://api.pexels.com/videos';

export interface PexelsVideoFile {
    id: number;
    quality: 'sd' | 'hd' | 'uhd';
    file_type: string;
    width: number;
    height: number;
    link: string;
    fps?: number;
}

export interface PexelsVideo {
    id: number;
    width: number;
    height: number;
    duration: number;
    image: string; // thumbnail URL
    user: { id: number; name: string; url: string };
    video_files: PexelsVideoFile[];
    video_pictures: Array<{ id: number; picture: string; nr: number }>;
    url: string; // page URL on Pexels
}

interface PexelsSearchResponse {
    page: number;
    per_page: number;
    total_results: number;
    url: string;
    videos: PexelsVideo[];
    next_page?: string;
    prev_page?: string;
}

/** Pick the best playable .mp4 file — prefer HD around 720p for fast loading */
export function pickBestVideoFile(video: PexelsVideo): string | null {
    if (!video.video_files?.length) return null;
    const mp4Files = video.video_files.filter(f => f.file_type === 'video/mp4');
    if (mp4Files.length === 0) return video.video_files[0]?.link || null;

    // Prefer HD around 720p (best quality vs load time balance)
    const hd720 = mp4Files.find(f => f.quality === 'hd' && f.height >= 600 && f.height <= 800);
    if (hd720) return hd720.link;
    const anyHd = mp4Files.find(f => f.quality === 'hd');
    if (anyHd) return anyHd.link;
    const sd = mp4Files.find(f => f.quality === 'sd');
    if (sd) return sd.link;
    return mp4Files[0].link;
}

/** Search videos for a query string */
export async function searchVideos(
    query: string,
    perPage = 8
): Promise<PexelsVideo[]> {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
        console.warn('[pexels] PEXELS_API_KEY not set — videos will not load');
        return [];
    }
    if (!query?.trim()) return [];

    try {
        const url = `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&size=medium`;
        const res = await fetch(url, {
            headers: {
                Authorization: apiKey, // NOTE: no "Bearer" prefix per Pexels docs
            },
            // Cache 24h — destination videos don't change often
            next: { revalidate: 86400 },
        });

        if (!res.ok) {
            console.warn(`[pexels] Request failed for "${query}": ${res.status} ${res.statusText}`);
            return [];
        }

        const data: PexelsSearchResponse = await res.json();
        return (data.videos || [])
            // Keep only videos under 60 seconds (real "shorts" experience)
            .filter(v => v.duration > 0 && v.duration <= 60)
            .slice(0, perPage);
    } catch (e) {
        console.warn(`[pexels] Error searching "${query}":`, (e as Error).message);
        return [];
    }
}

/** Get videos for a city — falls back gracefully if specific search fails */
export async function getCityShorts(
    city: string,
    country?: string
): Promise<PexelsVideo[]> {
    if (!city) return [];

    // Try city-specific first
    let videos = await searchVideos(`${city} city travel`, 8);
    if (videos.length >= 4) return videos;

    // Fallback: just city name
    const cityOnly = await searchVideos(city, 8);
    if (cityOnly.length >= 4) return cityOnly;

    // Combine what we have
    videos = [...videos, ...cityOnly.filter(v => !videos.find(x => x.id === v.id))];
    if (videos.length >= 3) return videos;

    // Last resort: country
    if (country) {
        const countryVids = await searchVideos(`${country} travel`, 8);
        videos = [...videos, ...countryVids.filter(v => !videos.find(x => x.id === v.id))];
    }
    return videos.slice(0, 8);
}
