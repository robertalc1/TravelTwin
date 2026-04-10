"use client";

import { useEffect, useState } from "react";
import { Camera, ExternalLink, MapPin } from "lucide-react";

interface PhotoResult {
  url: string;
  credit: string;
  creditLink: string;
}

interface Props {
  names: string[];
  city: string;
  descriptions?: Record<string, string>;
  onSelectPlace?: (name: string) => void;
  selectedPlace?: string | null;
}

export default function AttractionPhotos({ names, city, descriptions, onSelectPlace, selectedPlace }: Props) {
  const [images, setImages] = useState<Record<string, PhotoResult>>({});
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
        const photo = images[name];
        return (
          <div
            key={i}
            onClick={() => onSelectPlace?.(name)}
            className={`group relative rounded-xl overflow-hidden aspect-[4/3] bg-neutral-200 dark:bg-surface shadow-sm hover:shadow-lg transition-all border-2 cursor-pointer ${
              selectedPlace === name
                ? "border-primary-500 ring-2 ring-primary-200"
                : "border-neutral-200 dark:border-border-default hover:border-primary-300"
            }`}
          >
            {photo?.url ? (
              <img
                src={photo.url}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20">
                {loading ? (
                  <div className="h-6 w-6 rounded-full border-2 border-primary-300 border-t-primary-500 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-primary-300 dark:text-primary-600" strokeWidth={1.5} />
                    <span className="text-xs text-primary-400 dark:text-primary-500 font-medium">No photo</span>
                  </>
                )}
              </div>
            )}

            {/* Gradient + name overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
              <span className="text-xs font-semibold text-white leading-tight line-clamp-2 flex-1">
                {name}
              </span>
              <a
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              >
                <ExternalLink className="h-3 w-3 text-white/70" />
              </a>
            </div>

            {/* Unsplash photo credit */}
            {photo?.credit && (
              <div className="absolute top-0 left-0 right-0">
                <a
                  href={photo.creditLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="block opacity-0 group-hover:opacity-100 transition-opacity px-2 pt-1 pb-0.5 bg-gradient-to-b from-black/50 to-transparent"
                >
                  <span className="text-[9px] text-white/80 truncate block">
                    Photo by {photo.credit} on Unsplash
                  </span>
                </a>
              </div>
            )}

            {/* Description tooltip */}
            {descriptions?.[name] && (
              <div className="absolute inset-x-0 top-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-[10px] text-white/90 bg-black/50 rounded-lg px-2 py-1 leading-snug line-clamp-2 backdrop-blur-sm">
                  {descriptions[name]}
                </p>
              </div>
            )}

            {/* Show on map indicator */}
            {onSelectPlace && (
              <div className={`absolute top-2 right-2 transition-opacity duration-200 ${selectedPlace === name ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                <div className="bg-orange-500 rounded-full p-1 shadow-md" title="Show on map">
                  <MapPin className="h-2.5 w-2.5 text-white" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
