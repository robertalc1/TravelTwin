"use client";

import { useEffect, useState, useRef } from "react";

interface NormalizedVideo {
  id: number;
  thumbnail: string;
  url: string;
  author: string;
  pexelsUrl: string;
}

interface Props {
  city: string;
  country?: string;
  /** Static fallback shown immediately while the video URL is being fetched. */
  fallbackImageUrl: string;
  alt: string;
}

/**
 * Full-bleed hero background that prefers a destination video clip and falls
 * back to a static image. The fallback image is rendered immediately so the
 * hero never appears blank while the Pexels API call resolves; the <video>
 * is only mounted once we have a URL, and uses preload="metadata" to keep
 * the network/decoder cost off the critical path.
 */
export default function HeroVideo({ city, country, fallbackImageUrl, alt }: Props) {
  const [video, setVideo] = useState<NormalizedVideo | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    const url = `/api/videos/${encodeURIComponent(city)}${country ? `?country=${encodeURIComponent(country)}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setVideo((data.videos as NormalizedVideo[])?.[0] ?? null);
      })
      .catch(() => { if (!cancelled) setVideo(null); });
    return () => { cancelled = true; };
  }, [city, country]);

  return (
    <>
      {/* Static image — always present so the hero is never blank.
          Hidden once the video has buffered enough to play. */}
      <img
        src={fallbackImageUrl}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          videoReady ? "opacity-0" : "opacity-100"
        }`}
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600&h=700&fit=crop&q=85";
        }}
      />

      {video?.url && (
        <video
          ref={videoRef}
          src={video.url}
          poster={video.thumbnail}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setVideoReady(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </>
  );
}
