"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Volume2, VolumeX, ExternalLink } from "lucide-react";

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
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [muted, setMuted] = useState(true);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

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

        return () => {
            cancelled = true;
        };
    }, [city, country]);

    function handleHover(i: number) {
        setActiveIndex(i);
        const video = videoRefs.current[i];
        if (video) {
            video.currentTime = 0;
            video.play().catch(() => {
                /* autoplay may be blocked, ignore silently */
            });
        }
    }

    function handleLeave(i: number) {
        const video = videoRefs.current[i];
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        setActiveIndex(null);
    }

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
                    {muted ? (
                        <VolumeX className="h-3.5 w-3.5" />
                    ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                    )}
                    {muted ? "Muted" : "Sound on"}
                </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 scroll-smooth">
                {videos.map((v, i) => (
                    <div
                        key={v.id}
                        className="relative flex-shrink-0 w-64 aspect-[9/16] rounded-2xl overflow-hidden bg-black snap-start group cursor-pointer shadow-lg hover:shadow-2xl transition-shadow"
                        onMouseEnter={() => handleHover(i)}
                        onMouseLeave={() => handleLeave(i)}
                        onClick={() => {
                            if (activeIndex === i) handleLeave(i);
                            else handleHover(i);
                        }}
                    >
                        <video
                            ref={(el) => { videoRefs.current[i] = el; return undefined; }}
                            src={v.url}
                            poster={v.thumbnail}
                            muted={muted}
                            loop
                            playsInline
                            preload="metadata"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

                        {activeIndex !== i && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="rounded-full bg-white/20 backdrop-blur-md p-4 group-hover:scale-110 transition-transform">
                                    <Play className="h-6 w-6 text-white fill-white" />
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-3 left-3 right-3 text-xs">
                            <p className="font-semibold text-white drop-shadow truncate">
                                {city}
                            </p>
                            <a
                                href={v.pexelsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-white/70 hover:text-white text-[10px] truncate flex items-center gap-1 mt-0.5 transition-colors"
                            >
                                by {v.author}
                                <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
