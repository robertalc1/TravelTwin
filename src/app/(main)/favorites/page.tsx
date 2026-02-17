"use client";

import { useState, useEffect } from "react";
import { Heart, Trash2, Loader2, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { Favorite } from "@/lib/supabase/types";

export default function FavoritesPage() {
    const { user, loading: userLoading } = useUser();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        loadFavorites();
    }, [user]);

    async function loadFavorites() {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("favorites")
                .select("*")
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setFavorites((data as Favorite[]) || []);
        } catch (err) {
            console.error("Failed to load favorites:", err);
        } finally {
            setLoading(false);
        }
    }

    async function removeFavorite(id: string) {
        setRemoving(id);
        try {
            const supabase = createClient();
            await supabase.from("favorites").delete().eq("id", id);
            setFavorites((prev) => prev.filter((f) => f.id !== id));
        } catch (err) {
            console.error("Failed to remove favorite:", err);
        } finally {
            setRemoving(null);
        }
    }

    if (userLoading || loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
                <Skeleton className="h-10 w-48 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-36 rounded-radius-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-h2 text-text-primary flex items-center gap-3">
                        <Heart className="h-7 w-7 text-accent-500" />
                        My Favorites
                    </h1>
                    <p className="text-body text-text-muted mt-1">
                        {favorites.length} {favorites.length === 1 ? "destination" : "destinations"} saved
                    </p>
                </div>
            </div>

            {favorites.length === 0 ? (
                <div className="text-center py-24 rounded-radius-xl bg-surface-sunken border border-border-default">
                    <Heart className="h-14 w-14 text-text-muted mx-auto mb-4 opacity-30" />
                    <h3 className="text-h3 text-text-primary mb-2">No favorites yet</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto mb-6">
                        Explore our destinations and save your favorites to access them quickly later.
                    </p>
                    <Button variant="primary" size="lg" onClick={() => window.location.href = "/explore"}>
                        Explore Destinations
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.map((fav) => (
                        <div
                            key={fav.id}
                            className="rounded-radius-xl border border-border-default bg-surface p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-display text-lg font-bold text-text-primary flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary-500" />
                                        {fav.city_name}
                                    </h3>
                                    <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                                        <Clock className="h-3 w-3" />
                                        Saved {new Date(fav.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeFavorite(fav.id)}
                                    disabled={removing === fav.id}
                                    className="text-text-muted hover:text-error transition-colors p-1"
                                    aria-label="Remove from favorites"
                                >
                                    {removing === fav.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
