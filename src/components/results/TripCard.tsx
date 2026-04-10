"use client";

import { useState } from "react";
import { Heart, Plane } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TripCardProps {
    id: string;
    destination: string;
    destinationCity: string;
    origin: string;
    originCity: string;
    imageUrl: string;
    days: number;
    departureDate: string;
    returnDate: string;
    originalPrice?: number;
    discountedPrice: number;
    currency: string;
    isDirect?: boolean;
    travelers?: number;
    badge?: string;
}

export function TripCard({
    id,
    destination,
    destinationCity,
    origin,
    originCity,
    imageUrl,
    days,
    departureDate,
    returnDate,
    originalPrice,
    discountedPrice,
    currency,
    isDirect = false,
    travelers = 1,
    badge,
}: TripCardProps) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
            });
        } catch {
            return dateStr;
        }
    };

    const formatPrice = (price: number, curr: string) => {
        try {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: curr,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(price);
        } catch {
            return `${curr} ${Math.round(price)}`;
        }
    };

    const fallbackImage = `https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=600&fit=crop`;

    async function handleFavorite(e: React.MouseEvent) {
        e.preventDefault();
        if (favLoading) return;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            window.location.href = "/login";
            return;
        }

        setFavLoading(true);
        const newFav = !isFavorite;
        setIsFavorite(newFav);

        try {
            if (newFav) {
                await fetch("/api/favorites", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        city_name: destinationCity,
                        city_data: {
                            iata: destination,
                            price: discountedPrice,
                            currency,
                            days,
                        },
                    }),
                });
            } else {
                await fetch(
                    `/api/favorites?city_name=${encodeURIComponent(destinationCity)}`,
                    { method: "DELETE" }
                );
            }
        } catch {
            // Revert optimistic update on error
            setIsFavorite(!newFav);
        } finally {
            setFavLoading(false);
        }
    }

    return (
        <div className="group rounded-xl overflow-hidden bg-white dark:bg-surface border border-neutral-200 dark:border-border-default transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden">
                <img
                    src={imageError ? fallbackImage : imageUrl}
                    alt={destinationCity}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                {/* Badges */}
                {isDirect && (
                    <span className="absolute top-3 left-3 rounded-md bg-success px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        Direct
                    </span>
                )}
                {badge && (
                    <span className="absolute top-3 left-3 rounded-md bg-accent-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        {badge}
                    </span>
                )}

                {/* Favorite */}
                <button
                    onClick={handleFavorite}
                    disabled={favLoading}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all duration-200 hover:bg-white hover:scale-110 disabled:opacity-70"
                >
                    <Heart
                        className={`h-4 w-4 transition-colors ${
                            isFavorite ? "fill-red-500 text-red-500" : "text-neutral-600"
                        }`}
                    />
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-base font-bold text-secondary-500 mb-1">
                    {days} days - {destinationCity}
                </h3>
                <p className="text-xs text-text-secondary mb-1">
                    {formatDate(departureDate)} - {formatDate(returnDate)}
                </p>
                <div className="flex items-center gap-1 text-xs text-text-secondary mb-3">
                    <span>{originCity}</span>
                    <Plane className="h-3 w-3 rotate-90 text-text-muted" />
                    <span>{destinationCity}</span>
                    <Plane className="h-3 w-3 -rotate-90 text-text-muted" />
                    <span>{originCity}</span>
                </div>

                {/* Price row */}
                <div className="flex items-end justify-between">
                    <div>
                        {originalPrice && originalPrice > discountedPrice && (
                            <span className="text-sm text-text-muted line-through mr-2">
                                {formatPrice(originalPrice, currency)}
                            </span>
                        )}
                        <span className="text-xl font-bold text-secondary-500">
                            {formatPrice(discountedPrice, currency)}
                        </span>
                        <p className="text-[10px] text-text-muted mt-0.5">
                            Transportation for {travelers} person{travelers > 1 ? "s" : ""}
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            try {
                                sessionStorage.setItem(`tripView_${id}`, JSON.stringify({
                                    destination,
                                    destinationCity,
                                    origin,
                                    originCity,
                                    departureDate,
                                    returnDate,
                                    days,
                                    price: discountedPrice,
                                    originalPrice,
                                    currency,
                                    isDirect,
                                    travelers,
                                    imageUrl,
                                }));
                            } catch { /* ignore */ }
                            window.location.href = `/trips/${id}`;
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-600 hover:shadow-md active:scale-[0.98]"
                    >
                        View deal
                    </button>
                </div>
            </div>
        </div>
    );
}
