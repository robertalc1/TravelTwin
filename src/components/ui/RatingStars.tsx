import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
    rating: number;
    maxStars?: number;
    reviewCount?: number;
    size?: "sm" | "md";
    className?: string;
}

export function RatingStars({
    rating,
    maxStars = 5,
    reviewCount,
    size = "sm",
    className,
}: RatingStarsProps) {
    const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${maxStars} stars`}>
                {Array.from({ length: maxStars }, (_, i) => {
                    const fill = Math.min(Math.max(rating - i, 0), 1);
                    return (
                        <span key={i} className="relative inline-flex">
                            {/* Empty star (bg) */}
                            <Star className={cn(starSize, "text-neutral-200 dark:text-neutral-700")} />
                            {/* Filled star (fg) */}
                            {fill > 0 && (
                                <span
                                    className="absolute inset-0 overflow-hidden"
                                    style={{ width: `${fill * 100}%` }}
                                >
                                    <Star className={cn(starSize, "fill-gold-500 text-gold-500")} />
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>
            <span className="text-body-sm font-semibold text-text-primary">{rating.toFixed(1)}</span>
            {reviewCount !== undefined && (
                <span className="text-body-sm text-text-muted">({reviewCount.toLocaleString()})</span>
            )}
        </div>
    );
}
