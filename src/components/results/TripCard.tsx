"use client";

import { useState } from "react";
import { Plane, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useCurrencyStore } from "@/stores/currencyStore";

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
    viewDealHref?: string;
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
    viewDealHref,
}: TripCardProps) {
    const [imageError, setImageError] = useState(false);
    const [navigating, setNavigating] = useState(false);
    const formatCurrency = useCurrencyStore((s) => s.format);
    const router = useRouter();
    const locale = useLocale();
    const isRo = locale === "ro";

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString(isRo ? "ro-RO" : "en-US", {
                day: "numeric",
                month: "short",
            });
        } catch {
            return dateStr;
        }
    };

    const handleViewDeal = () => {
        setNavigating(true);
        if (viewDealHref) {
            router.push(viewDealHref);
            return;
        }
        // If a full TripPackage is stored for this id (deals or planner),
        // open the rich /plan/trip/[id] detail page; otherwise the slim /trips/[id].
        const hasFullPackage =
            typeof window !== "undefined" && sessionStorage.getItem(`trip_${id}`);
        const path = hasFullPackage || id.startsWith("deal-") ? `/plan/trip/${id}` : `/trips/${id}`;
        router.push(`/${locale}${path}`);
    };

    const fallbackImage = `https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=600&fit=crop`;

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
                    <span className="absolute top-3 left-3 rounded-md bg-success px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-white shadow-sm">
                        Direct
                    </span>
                )}
                {badge && (
                    <span className="absolute top-3 left-3 rounded-md bg-accent-500 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-white shadow-sm">
                        {badge}
                    </span>
                )}

            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-base font-bold text-secondary-500 dark:text-white mb-1">
                    {days} {isRo ? "zile" : "days"} - {destinationCity}
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
                                {formatCurrency(originalPrice, currency)}
                            </span>
                        )}
                        <span className="text-xl font-bold text-secondary-500 dark:text-white">
                            {formatCurrency(discountedPrice, currency)}
                        </span>
                        <p className="text-[10px] text-text-muted mt-0.5">
                            {isRo
                                ? `Transport pentru ${travelers} ${travelers > 1 ? "persoane" : "persoană"}`
                                : `Transportation for ${travelers} person${travelers > 1 ? "s" : ""}`}
                        </p>
                    </div>

                    <button
                        onClick={handleViewDeal}
                        disabled={navigating}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-600 hover:shadow-md active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-70"
                    >
                        {navigating && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isRo ? "Vezi oferta" : "View deal"}
                    </button>
                </div>
            </div>
        </div>
    );
}
