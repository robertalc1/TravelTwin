"use client";

import { useEffect, useState, useRef } from "react";

interface NormalizedVideo {
  id: number;
  thumbnail: string;
  url: string;
  author: string;
  pexelsUrl: string;
}

interface DestinationVideosProps {
  city: string;
  country?: string;
}

export default function DestinationVideos({ city, country }: DestinationVideosProps) {
  const [video, setVideo] = useState<NormalizedVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    setLoading(true);

    const url = `/api/videos/${encodeURIComponent(city)}${country ? `?country=${encodeURIComponent(country)}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setVideo((data.videos as NormalizedVideo[])?.[0] ?? null);
      })
      .catch(() => { if (!cancelled) setVideo(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [city, country]);

  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-secondary-500 mb-4">Discover {city}</h2>
        <div className="w-full aspect-video rounded-2xl bg-neutral-200 dark:bg-surface-elevated animate-pulse" />
      </section>
    );
  }

  if (!video) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-secondary-500 mb-4">Discover {city}</h2>

      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
        <video
          ref={videoRef}
          src={video.url}
          poster={video.thumbnail}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        />
      </div>
    </section>
  );
}
