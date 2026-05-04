"use client";

import { useEffect, useState, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";

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
  const [muted, setMuted] = useState(true);
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

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  }

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-secondary-500">Discover {city}</h2>
        <button
          type="button"
          onClick={toggleMute}
          className="flex items-center gap-2 rounded-full bg-neutral-100 dark:bg-surface-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          {muted ? "Muted" : "Sound on"}
        </button>
      </div>

      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
        <video
          ref={videoRef}
          src={video.url}
          poster={video.thumbnail}
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        />
      </div>

      <p className="text-xs text-text-muted mt-2">
        Video by{" "}
        <a
          href={video.pexelsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary-500 transition-colors"
        >
          Pexels
        </a>
      </p>
    </section>
  );
}
