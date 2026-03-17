"use client";

import { useEffect, useState } from "react";
import { Camera, ExternalLink } from "lucide-react";

interface Props {
  names: string[];
  city: string;
}

export default function AttractionPhotos({ names, city }: Props) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!names.length) return;
    fetch(
      `/api/attractions/images?names=${encodeURIComponent(names.join(","))}&city=${encodeURIComponent(city)}`
    )
      .then((r) => r.json())
      .then((data) => setImages(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [names.join(","), city]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {names.map((name, i) => {
        const imgSrc = images[name];
        return (
          <a
            key={i}
            href={`https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-neutral-200 dark:bg-surface border border-neutral-200 dark:border-border-default shadow-sm hover:shadow-lg transition-shadow"
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20">
                {loading ? (
                  <div className="h-6 w-6 rounded-full border-2 border-primary-300 border-t-primary-500 animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-primary-400" />
                )}
              </div>
            )}
            {/* Gradient + name overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
              <span className="text-xs font-semibold text-white leading-tight line-clamp-2 flex-1">
                {name}
              </span>
              <ExternalLink className="h-3 w-3 text-white/70 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        );
      })}
    </div>
  );
}
