"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Heart, Trash2, Loader2, MapPin, Clock, Hotel as HotelIcon, Plane, Car } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { Favorite } from "@/lib/supabase/types";

export default function FavoritesPage() {
    const locale = useLocale();
    const router = useRouter();
    const isRo = locale === "ro";
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

    /**
     * Resolve a click on a favorite card to the right destination URL.
     * For trips we also re-hydrate sessionStorage so the detail page can
     * render without re-fetching the package; for hotels we forward the
     * stored search params so the standalone hotel page can re-query.
     */
    function openFavorite(fav: Favorite) {
        const data = (fav.item_data ?? {}) as Record<string, unknown>;
        if (fav.item_type === "trip") {
            const tripType = String(data.trip_type ?? "");
            const fullData = data.fullData;
            if (tripType === "road-trip") {
                try {
                    if (fullData) sessionStorage.setItem(`roadTrip_${fav.item_id}`, JSON.stringify(fullData));
                } catch { /* quota or private mode — page can still render fallback */ }
                router.push(`/${locale}/road-trip/result/${fav.item_id}`);
                return;
            }
            if (tripType === "flight") {
                try {
                    if (fullData) sessionStorage.setItem(`trip_${fav.item_id}`, JSON.stringify(fullData));
                } catch { /* ignore */ }
                router.push(`/${locale}/plan/trip/${fav.item_id}`);
                return;
            }
        }
        if (fav.item_type === "hotel") {
            const qs = new URLSearchParams();
            if (data.cityCode) qs.set("cityCode", String(data.cityCode));
            if (data.checkIn) qs.set("checkIn", String(data.checkIn));
            if (data.checkOut) qs.set("checkOut", String(data.checkOut));
            if (data.total) qs.set("total", String(data.total));
            if (fav.item_name) qs.set("name", fav.item_name);
            router.push(`/${locale}/hotels/${encodeURIComponent(fav.item_id)}?${qs.toString()}`);
            return;
        }
        // city / attraction: legacy entries from a deprecated heart-on-card
        // button. /explore doesn't exist; land on the homepage instead.
        router.push(`/${locale}`);
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
                        {isRo ? "Favoritele mele" : "My Favorites"}
                    </h1>
                    <p className="text-body text-text-muted mt-1">
                        {favorites.length} {favorites.length === 1
                            ? (isRo ? "salvat" : "saved")
                            : (isRo ? "salvate" : "saved")}
                    </p>
                </div>
            </div>

            {favorites.length === 0 ? (
                <div className="text-center py-24 rounded-radius-xl bg-surface-sunken border border-border-default">
                    <Heart className="h-14 w-14 text-text-muted mx-auto mb-4 opacity-30" />
                    <h3 className="text-h3 text-text-primary mb-2">{isRo ? "Niciun favorit încă" : "No favorites yet"}</h3>
                    <p className="text-body text-text-muted max-w-md mx-auto mb-6">
                        {isRo
                            ? "Salvează un trip de pe pagina de ofertă (butonul ❤︎) și revino aici oricând să-l deschizi din nou."
                            : "Save a trip from any trip detail page (the ❤︎ button) and come back here to re-open it."}
                    </p>
                    <Button variant="primary" size="lg" onClick={() => router.push(`/${locale}/explore`)}>
                        {isRo ? "Explorează destinații" : "Explore destinations"}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.map((fav) => (
                        <FavoriteCard
                            key={fav.id}
                            fav={fav}
                            removing={removing === fav.id}
                            onOpen={() => openFavorite(fav)}
                            onRemove={() => removeFavorite(fav.id)}
                            isRo={isRo}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function FavoriteCard({
    fav,
    removing,
    onOpen,
    onRemove,
    isRo,
}: {
    fav: Favorite;
    removing: boolean;
    onOpen: () => void;
    onRemove: () => void;
    isRo: boolean;
}) {
    const data = (fav.item_data ?? {}) as Record<string, unknown>;
    const isTrip = fav.item_type === "trip";
    const isHotel = fav.item_type === "hotel";
    const tripType = String(data.trip_type ?? "");

    const TypeIcon = isHotel
        ? HotelIcon
        : tripType === "road-trip"
            ? Car
            : tripType === "flight"
                ? Plane
                : MapPin;
    const typeLabel = isHotel
        ? (isRo ? "Hotel" : "Hotel")
        : tripType === "road-trip"
            ? (isRo ? "Road trip" : "Road trip")
            : tripType === "flight"
                ? (isRo ? "Zbor" : "Flight")
                : (isRo ? "Destinație" : "Destination");

    const subtitle = isTrip
        ? [data.departureDate, data.returnDate].filter(Boolean).join(" → ")
        : isHotel
            ? [data.checkIn, data.checkOut].filter(Boolean).join(" → ")
            : "";

    return (
        <div className="group rounded-radius-xl border border-border-default bg-surface overflow-hidden hover:shadow-md transition-shadow">
            <button
                type="button"
                onClick={onOpen}
                className="w-full text-left p-5 cursor-pointer"
            >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                    <TypeIcon className="h-3.5 w-3.5" />
                    {typeLabel}
                </div>
                <h3 className="font-display text-lg font-bold text-text-primary flex items-center gap-2 line-clamp-1">
                    <MapPin className="h-4 w-4 text-primary-500 shrink-0" />
                    {fav.item_name}
                </h3>
                {subtitle && (
                    <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
                )}
                <p className="text-xs text-text-muted flex items-center gap-1 mt-3">
                    <Clock className="h-3 w-3" />
                    {isRo ? "Salvat" : "Saved"} {new Date(fav.created_at).toLocaleDateString()}
                </p>
            </button>
            <div className="border-t border-border-default px-5 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                    {isRo ? "Deschide →" : "Open →"}
                </span>
                <button
                    onClick={onRemove}
                    disabled={removing}
                    className="text-text-muted hover:text-error transition-colors p-1"
                    aria-label={isRo ? "Elimină din favorite" : "Remove from favorites"}
                >
                    {removing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                </button>
            </div>
        </div>
    );
}
