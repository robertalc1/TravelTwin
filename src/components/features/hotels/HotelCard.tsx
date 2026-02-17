"use client";

import { useState } from "react";
import { Heart, MapPin, Wifi, Car, Waves, Coffee } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RatingStars } from "@/components/ui/RatingStars";
import { cn } from "@/lib/utils";

interface HotelCardProps {
    name: string;
    location: string;
    distance?: string;
    image: string;
    images?: string[];
    rating: number;
    reviewCount: number;
    price: number;
    originalPrice?: number;
    amenities?: string[];
    badges?: string[];
    className?: string;
}

const amenityIcons: Record<string, typeof Wifi> = {
    WiFi: Wifi,
    Parking: Car,
    Pool: Waves,
    Breakfast: Coffee,
};

export function HotelCard({
    name,
    location,
    distance,
    image,
    rating,
    reviewCount,
    price,
    originalPrice,
    amenities = [],
    badges = [],
    className,
}: HotelCardProps) {
    const [liked, setLiked] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <div
            className={cn(
                "group overflow-hidden rounded-radius-lg border border-border-default bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-border-emphasis",
                className
            )}
        >
            {/* Image container */}
            <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <img
                    src={image}
                    alt={name}
                    className={cn(
                        "h-full w-full object-cover transition-all duration-500",
                        imageLoaded ? "opacity-100 group-hover:scale-105" : "opacity-0"
                    )}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                />

                {/* Wishlist heart */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setLiked(!liked);
                    }}
                    className={cn(
                        "absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-radius-full bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white hover:scale-110",
                        liked && "!bg-accent-500"
                    )}
                    aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
                >
                    <Heart
                        className={cn(
                            "h-4 w-4 transition-all duration-300",
                            liked ? "fill-white text-white scale-110" : "text-neutral-600"
                        )}
                    />
                </button>

                {/* Badges overlay */}
                {badges.length > 0 && (
                    <div className="absolute top-3 left-3 flex gap-1.5">
                        {badges.map((badge) => (
                            <Badge key={badge} variant="accent" className="!bg-accent-500 !text-white text-[10px] shadow-sm">
                                {badge}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-display text-base font-bold text-text-primary mb-1 line-clamp-1 group-hover:text-primary-500 transition-colors">
                    {name}
                </h3>

                <div className="flex items-center gap-1.5 text-body-sm text-text-muted mb-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-1">{location}</span>
                    {distance && (
                        <Badge variant="neutral" className="ml-1 text-[10px]">{distance}</Badge>
                    )}
                </div>

                <RatingStars rating={rating} reviewCount={reviewCount} className="mb-3" />

                {/* Amenities row */}
                {amenities.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                        {amenities.slice(0, 4).map((amenity) => {
                            const Icon = amenityIcons[amenity];
                            return Icon ? (
                                <div
                                    key={amenity}
                                    className="flex h-7 w-7 items-center justify-center rounded-radius-md bg-surface-sunken"
                                    title={amenity}
                                >
                                    <Icon className="h-3.5 w-3.5 text-text-tertiary" />
                                </div>
                            ) : null;
                        })}
                        {amenities.length > 4 && (
                            <span className="text-caption text-text-muted">+{amenities.length - 4} more</span>
                        )}
                    </div>
                )}

                {/* Price + CTA */}
                <div className="flex items-end justify-between">
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-mono text-xl font-bold text-text-primary">${price}</span>
                            {originalPrice && (
                                <span className="text-sm text-text-muted line-through">${originalPrice}</span>
                            )}
                        </div>
                        <span className="text-caption text-text-muted">per night</span>
                    </div>
                    <Button variant="primary" size="sm">
                        View Deal
                    </Button>
                </div>
            </div>
        </div>
    );
}
