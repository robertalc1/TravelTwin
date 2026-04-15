"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface NormalizedVideo {
    id: number;
    thumbnail: string;
    duration: number;
    width: number;
    height: number;
    url: string;
    author: string;
    authorUrl: string;
    pexelsUrl: string;
}

interface DestinationVideosProps {
    city: string;
    country?: string;
}

export default function DestinationVideos({ city, country }: DestinationVideosProps) {
    const [videos, setVideos] = useState<NormalizedVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [muted, setMuted] = useState(true);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Fetch videos from server-side endpoint
    useEffect(() => {
        if (!city) return;
        let cancelled = false;
        setLoading(true);

        const url = `/api/videos/${encodeURIComponent(city)}${country ? `?country=${encodeURIComponent(country)}` : ""}`;
        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (!cancelled) setVideos(data.videos || []);
            })
            .catch(() => {
                if (!cancelled) setVideos([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [city, country]);

    // IntersectionObserver: autoplay when entering viewport, pause when leaving
    const setupObserver = useCallback(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const video = entry.target as HTMLVideoElement;
                    if (entry.isIntersecting) {
                        video.play().catch(() => { /* blocked by browser policy, ignore */ });
                    } else {
                        video.pause();
                    }
                });
            },
            { threshold: 0.4 }
        );

        videoRefs.current.forEach(v => {
            if (v) observerRef.current!.observe(v);
        });
    }, []);

    // Re-run observer whenever video list changes
    useEffect(() => {
        if (videos.length > 0) setupObserver();
        return () => { observerRef.current?.disconnect(); };
    }, [videos, setupObserver]);

    function toggleMute() {
        const newMuted = !muted;
        setMuted(newMuted);
        videoRefs.current.forEach(v => {
            if (v) v.muted = newMuted;
        });
    }

    if (loading) {
        return (
            <section className="my-8">
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                    Discover {city}
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className="flex-shrink-0 w-64 aspect-[9/16] bg-neutral-200 dark:bg-surface-elevated rounded-2xl animate-pulse"
                        />
                    ))}
                </div>
            </section>
        );
    }

    if (videos.length === 0) return null;

    return (
        <section className="my-8">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">
                        Discover {city}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                        Videos provided by{" "}
                        <a
                            href="https://www.pexels.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-primary-500 transition-colors"
                        >
                            Pexels
                        </a>
                    </p>
                </div>
                <button
                    onClick={toggleMute}
                    className="flex items-center gap-2 rounded-full bg-neutral-100 dark:bg-surface-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-neutral-200 dark:hover:bg-surface-sunken transition-colors"
                    aria-label={muted ? "Unmute" : "Mute"}
                >
                    {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    {muted ? "Muted" : "Sound on"}
                </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 scroll-smooth">
                {videos.map((v, i) => (
                    <div
                        key={v.id}
                        className="flex-shrink-0 w-64 aspect-[9/16] rounded-2xl overflow-hidden bg-black snap-start shadow-lg"
                    >
                        <video
                            ref={(el) => { videoRefs.current[i] = el; return undefined; }}
                            src={v.url}
                            poster={v.thumbnail}
                            autoPlay
                            muted={muted}
                            loop
                            playsInline
                            preload="auto"
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}
