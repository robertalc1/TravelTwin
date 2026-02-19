"use client";

import { useState, useEffect } from "react";
import { Sparkles, MapPin, Search, Loader2, Star, DollarSign, Thermometer, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

interface CityData {
    id: number;
    name: string;
    description?: string;
    image_url?: string;
    avg_budget?: number;
    temperature?: string;
    country_id?: number;
}

interface AttractionData {
    id: number;
    name: string;
    description?: string;
    category?: string;
    price?: number;
    image_url?: string;
}

interface DailyCostData {
    id: number;
    category?: string;
    min_cost?: number;
    max_cost?: number;
    avg_cost?: number;
}

export default function ExplorePage() {
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const [cities, setCities] = useState<CityData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
    const [attractions, setAttractions] = useState<AttractionData[]>([]);
    const [dailyCosts, setDailyCosts] = useState<DailyCostData[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [favoritedCities, setFavoritedCities] = useState<Set<string>>(new Set());
    const [togglingFav, setTogglingFav] = useState<string | null>(null);

    useEffect(() => {
        async function loadCities() {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from("cities")
                    .select("*")
                    .order("name");

                if (error) throw error;
                setCities(data || []);
            } catch (err) {
                console.error("Failed to load cities:", err);
            } finally {
                setLoading(false);
            }
        }
        loadCities();
    }, []);

    // Load user's favorites
    useEffect(() => {
        if (!user) return;
        async function loadFavorites() {
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from("favorites")
                    .select("city_name")
                    .eq("user_id", user!.id);
                if (data) {
                    setFavoritedCities(new Set(data.map((f: { city_name: string }) => f.city_name)));
                }
            } catch {
                // Ignore
            }
        }
        loadFavorites();
    }, [user]);

    async function toggleFavorite(e: React.MouseEvent, cityName: string, cityData: CityData) {
        e.stopPropagation();
        if (!user) {
            window.location.href = "/login";
            return;
        }
        setTogglingFav(cityName);
        try {
            if (favoritedCities.has(cityName)) {
                await fetch(`/api/favorites?city_name=${encodeURIComponent(cityName)}`, { method: "DELETE" });
                setFavoritedCities((prev) => {
                    const next = new Set(prev);
                    next.delete(cityName);
                    return next;
                });
            } else {
                await fetch("/api/favorites", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ city_name: cityName, city_data: { id: cityData.id, description: cityData.description, temperature: cityData.temperature, avg_budget: cityData.avg_budget } }),
                });
                setFavoritedCities((prev) => new Set(prev).add(cityName));
            }
        } catch {
            // Ignore
        } finally {
            setTogglingFav(null);
        }
    }

    async function loadCityDetails(city: CityData) {
        setSelectedCity(city);
        setLoadingDetail(true);
        try {
            const supabase = createClient();
            const [attractionsRes, costsRes] = await Promise.all([
                supabase.from("attractions").select("*").eq("city_id", city.id).order("name"),
                supabase.from("daily_costs").select("*").eq("city_id", city.id),
            ]);
            setAttractions((attractionsRes.data as AttractionData[]) || []);
            setDailyCosts((costsRes.data as DailyCostData[]) || []);
        } catch {
            setAttractions([]);
            setDailyCosts([]);
        } finally {
            setLoadingDetail(false);
        }
    }

    const filteredCities = cities.filter(
        (c) =>
            !query ||
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.description?.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-gradient-to-b from-primary-800 to-primary-600 pt-8 pb-16">
                <div className="mx-auto max-w-4xl px-4 text-center">
                    <Badge variant="accent" className="mb-4 text-sm px-4 py-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Discover Destinations
                    </Badge>
                    <h1 className="text-display text-white mb-4 !text-3xl md:!text-4xl lg:!text-5xl">
                        Where do you dream of going?
                    </h1>
                    <p className="text-lg text-primary-100/80 mb-8 max-w-xl mx-auto">
                        Explore cities, see attractions, and check daily costs to plan your next trip
                    </p>

                    {/* Search input */}
                    <div className="relative max-w-2xl mx-auto">
                        <div className="flex items-center rounded-radius-xl bg-white/95 backdrop-blur-lg shadow-xl p-2">
                            <Search className="h-5 w-5 text-text-muted ml-4 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search cities..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="flex-1 bg-transparent px-4 py-3 text-text-primary placeholder:text-text-muted outline-none text-body"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 lg:px-8 -mt-8">
                {/* City detail panel */}
                {selectedCity && (
                    <div className="mb-8 rounded-radius-xl bg-surface border border-border-default shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-display text-xl font-bold text-white">
                                    {selectedCity.name}
                                </h2>
                                {selectedCity.description && (
                                    <p className="text-sm text-primary-100 mt-1">{selectedCity.description}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedCity(null)}
                                className="text-white/70 hover:text-white text-sm font-medium transition-colors"
                            >
                                Close ✕
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="p-6 space-y-4">
                                <Skeleton className="h-6 w-48" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-24 rounded-radius-md" />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6">
                                {/* Attractions */}
                                {attractions.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-h4 text-text-primary mb-3 flex items-center gap-2">
                                            <Star className="h-5 w-5 text-gold-500" />
                                            Attractions ({attractions.length})
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {attractions.map((a) => (
                                                <div
                                                    key={a.id}
                                                    className="rounded-radius-md border border-border-default bg-surface-sunken p-4"
                                                >
                                                    <h4 className="font-display text-sm font-bold text-text-primary mb-1">
                                                        {a.name}
                                                    </h4>
                                                    {a.category && (
                                                        <Badge variant="neutral" className="text-[10px] mb-2">
                                                            {a.category}
                                                        </Badge>
                                                    )}
                                                    {a.description && (
                                                        <p className="text-xs text-text-muted line-clamp-2">{a.description}</p>
                                                    )}
                                                    {a.price != null && (
                                                        <p className="text-xs font-semibold text-accent-500 mt-2">
                                                            R${a.price}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Daily costs */}
                                {dailyCosts.length > 0 && (
                                    <div>
                                        <h3 className="text-h4 text-text-primary mb-3 flex items-center gap-2">
                                            <DollarSign className="h-5 w-5 text-success" />
                                            Daily Costs
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {dailyCosts.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="rounded-radius-md border border-border-default bg-surface-sunken p-4 flex items-center justify-between"
                                                >
                                                    <span className="text-sm font-medium text-text-primary">
                                                        {c.category}
                                                    </span>
                                                    <span className="font-mono text-sm font-bold text-primary-500">
                                                        R${c.avg_cost ?? c.min_cost}
                                                        {c.max_cost && c.min_cost !== c.max_cost && (
                                                            <span className="text-text-muted font-normal"> – R${c.max_cost}</span>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {attractions.length === 0 && dailyCosts.length === 0 && (
                                    <p className="text-center text-text-muted py-8">
                                        No detailed information available for this city yet.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Cities grid */}
                <section className="py-10">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <h2 className="text-h2 text-text-primary">
                                {loading ? "Loading..." : `${filteredCities.length} Destinations`}
                            </h2>
                            <p className="text-body text-text-tertiary mt-1">
                                Click a city to see attractions and daily costs
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="rounded-radius-lg border border-border-default bg-surface overflow-hidden">
                                    <Skeleton className="aspect-[3/2] rounded-none" />
                                    <div className="p-4 space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredCities.length === 0 ? (
                        <div className="text-center py-16 rounded-radius-xl bg-surface-sunken border border-border-default">
                            <MapPin className="h-12 w-12 text-text-muted mx-auto mb-4" />
                            <h3 className="text-h4 text-text-primary mb-2">No cities found</h3>
                            <p className="text-body text-text-muted">
                                Try a different search term
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredCities.map((city) => (
                                <button
                                    key={city.id}
                                    onClick={() => loadCityDetails(city)}
                                    className={cn(
                                        "stagger-item group rounded-radius-lg overflow-hidden bg-surface border text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                                        selectedCity?.id === city.id
                                            ? "border-primary-500 ring-2 ring-primary-500/20"
                                            : "border-border-default hover:border-border-emphasis"
                                    )}
                                >
                                    {city.image_url ? (
                                        <div className="relative aspect-[3/2] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                                            <img
                                                src={city.image_url}
                                                alt={city.name}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                                                <h3 className="font-display text-lg font-bold text-white">
                                                    {city.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5">
                                                    {city.temperature && (
                                                        <Badge variant="neutral" className="!bg-white/20 !text-white backdrop-blur-sm text-[10px]">
                                                            <Thermometer className="h-3 w-3" />
                                                            {city.temperature}
                                                        </Badge>
                                                    )}
                                                    <button
                                                        onClick={(e) => toggleFavorite(e, city.name, city)}
                                                        disabled={togglingFav === city.name}
                                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors"
                                                        aria-label={favoritedCities.has(city.name) ? "Remove from favorites" : "Add to favorites"}
                                                    >
                                                        {togglingFav === city.name ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Heart className={cn("h-4 w-4", favoritedCities.has(city.name) && "fill-red-400 text-red-400")} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center">
                                            <MapPin className="h-12 w-12 text-primary-300" />
                                            <div className="absolute bottom-3 left-3">
                                                <h3 className="font-display text-lg font-bold text-text-primary">
                                                    {city.name}
                                                </h3>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-4">
                                        {city.description && (
                                            <p className="text-body-sm text-text-muted mb-3 line-clamp-2">
                                                {city.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3">
                                            {city.avg_budget != null && (
                                                <span className="text-body-sm font-semibold text-accent-500">
                                                    ~R${city.avg_budget}/day
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
