"use client";

import { useState, useEffect } from "react";
import { Star, Loader2, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { Review } from "@/lib/supabase/types";

function StarRating({
    rating,
    interactive = false,
    onChange,
}: {
    rating: number;
    interactive?: boolean;
    onChange?: (r: number) => void;
}) {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type={interactive ? "button" : undefined}
                    onClick={() => interactive && onChange?.(star)}
                    disabled={!interactive}
                    className={cn(
                        "transition-colors",
                        interactive && "cursor-pointer hover:text-gold-400",
                        !interactive && "cursor-default"
                    )}
                >
                    <Star
                        className={cn(
                            "h-5 w-5",
                            star <= rating ? "fill-gold-500 text-gold-500" : "text-border-default"
                        )}
                    />
                </button>
            ))}
        </div>
    );
}

export default function ReviewsPage() {
    const { user, displayName, loading: userLoading } = useUser();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [cityName, setCityName] = useState("");
    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");
    const [cities, setCities] = useState<string[]>([]);

    useEffect(() => {
        loadReviews();
        loadCities();
    }, []);

    async function loadReviews() {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("reviews")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            setReviews((data as Review[]) || []);
        } catch (err) {
            console.error("Failed to load reviews:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadCities() {
        try {
            const supabase = createClient();
            const { data } = await supabase.from("cities").select("name").order("name");
            if (data) {
                setCities(data.map((c: { name: string }) => c.name));
            }
        } catch {
            // Ignore
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !cityName || !rating || !text.trim()) return;

        setSubmitting(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("reviews")
                .insert({
                    user_id: user.id,
                    city_name: cityName,
                    rating,
                    text: text.trim(),
                    user_name: displayName,
                })
                .select()
                .single();

            if (error) throw error;
            setReviews((prev) => [data as Review, ...prev]);
            setCityName("");
            setRating(0);
            setText("");
        } catch (err) {
            console.error("Failed to submit review:", err);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
            <div className="mb-8">
                <h1 className="text-h2 text-text-primary flex items-center gap-3">
                    <MessageSquare className="h-7 w-7 text-primary-500" />
                    City Reviews
                </h1>
                <p className="text-body text-text-muted mt-1">
                    Share your travel experiences and help fellow travelers
                </p>
            </div>

            {/* Submit form */}
            {user && (
                <div className="rounded-radius-xl border border-border-default bg-surface p-6 mb-8">
                    <h2 className="text-h4 text-text-primary mb-4">Write a Review</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-body-sm font-medium text-text-secondary mb-1.5 block">
                                    City
                                </label>
                                <select
                                    value={cityName}
                                    onChange={(e) => setCityName(e.target.value)}
                                    required
                                    className="w-full rounded-radius-sm border border-border-default bg-surface px-4 py-3 text-body text-text-primary transition-all hover:border-border-emphasis focus:border-border-focus focus:ring-2 focus:ring-border-focus/20 focus:outline-none"
                                >
                                    <option value="">Select a city</option>
                                    {cities.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-body-sm font-medium text-text-secondary mb-1.5 block">
                                    Rating
                                </label>
                                <StarRating rating={rating} interactive onChange={setRating} />
                            </div>
                        </div>
                        <div>
                            <label className="text-body-sm font-medium text-text-secondary mb-1.5 block">
                                Your Review
                            </label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={3}
                                required
                                placeholder="Share your experience..."
                                className="w-full rounded-radius-sm border border-border-default bg-surface px-4 py-3 text-body text-text-primary placeholder:text-text-muted transition-all hover:border-border-emphasis focus:border-border-focus focus:ring-2 focus:ring-border-focus/20 focus:outline-none resize-none"
                            />
                        </div>
                        <Button variant="primary" size="md" disabled={submitting || !rating || !text.trim()}>
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Review"
                            )}
                        </Button>
                    </form>
                </div>
            )}

            {/* Reviews list */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-36 rounded-radius-xl" />
                    ))}
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-16 rounded-radius-xl bg-surface-sunken border border-border-default">
                    <MessageSquare className="h-12 w-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-h4 text-text-primary mb-2">No reviews yet</h3>
                    <p className="text-body text-text-muted">
                        Be the first to review a destination!
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div
                            key={review.id}
                            className="rounded-radius-xl border border-border-default bg-surface p-5"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-500 text-sm font-bold">
                                        {(review.user_name || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">
                                            {review.user_name || "Anonymous"}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="neutral">{review.city_name}</Badge>
                                            <span className="text-xs text-text-muted">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <StarRating rating={review.rating} />
                            </div>
                            <p className="text-body text-text-secondary pl-13">
                                {review.text}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
