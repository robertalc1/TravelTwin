"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Calendar, ChevronDown, Loader2, ChevronLeft, ChevronRight, Hotel as HotelIcon } from "lucide-react";
import { HotelCard } from "@/components/features/hotels/HotelCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Hotel } from "@/lib/supabase/types";

const PAGE_SIZE = 20;

export default function HotelsPage() {
    const [places, setPlaces] = useState<string[]>([]);
    const [selectedPlace, setSelectedPlace] = useState("");
    const [days, setDays] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [loadingPlaces, setLoadingPlaces] = useState(true);

    // Load places
    useEffect(() => {
        async function loadPlaces() {
            try {
                const supabase = createClient();
                const { data } = await supabase.from("hotels").select("place").limit(2000);
                if (data) {
                    const unique = [...new Set(data.map((h: { place: string }) => h.place))].sort() as string[];
                    setPlaces(unique);
                }
            } catch {
                // Ignore
            } finally {
                setLoadingPlaces(false);
            }
        }
        loadPlaces();
    }, []);

    async function searchHotels(pageNum: number = 0) {
        setLoading(true);
        setHasSearched(true);

        try {
            const supabase = createClient();
            let query = supabase.from("hotels").select("*", { count: "exact" });

            if (selectedPlace) query = query.eq("place", selectedPlace);
            if (days) query = query.eq("days", Number(days));
            if (maxPrice) query = query.lte("price", Number(maxPrice));

            query = query.order("price", { ascending: true });

            const from = pageNum * PAGE_SIZE;
            query = query.range(from, from + PAGE_SIZE - 1);

            const { data, count, error } = await query;
            if (error) throw error;

            setHotels((data as Hotel[]) || []);
            setTotalCount(count || 0);
            setPage(pageNum);
        } catch (err) {
            console.error("Hotel search error:", err);
        } finally {
            setLoading(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        searchHotels(0);
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="min-h-screen bg-background">
            {/* Search header */}
            <div className="bg-primary-700 pb-6 pt-6">
                <form onSubmit={handleSubmit} className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-4">
                            <div className="relative rounded-radius-md bg-white/10 backdrop-blur-sm border border-white/10">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                                <select
                                    value={selectedPlace}
                                    onChange={(e) => setSelectedPlace(e.target.value)}
                                    className="w-full appearance-none bg-transparent pl-10 pr-8 py-3.5 text-sm font-medium text-white outline-none [&>option]:text-black"
                                >
                                    <option value="">All Destinations</option>
                                    {places.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <div className="relative rounded-radius-md bg-white/10 backdrop-blur-sm border border-white/10">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                                <select
                                    value={days}
                                    onChange={(e) => setDays(e.target.value)}
                                    className="w-full appearance-none bg-transparent pl-10 pr-8 py-3.5 text-sm font-medium text-white outline-none [&>option]:text-black"
                                >
                                    <option value="">Any Duration</option>
                                    {[1, 2, 3, 4].map((d) => (
                                        <option key={d} value={d}>{d} {d === 1 ? "night" : "nights"}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                            </div>
                        </div>
                        <div className="md:col-span-5 flex gap-2">
                            <div className="relative flex-1 rounded-radius-md bg-white/10 backdrop-blur-sm border border-white/10">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/50 font-semibold">R$</span>
                                <input
                                    type="number"
                                    placeholder="Max price per night"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    className="w-full bg-transparent pl-10 pr-4 py-3.5 text-sm font-medium text-white placeholder:text-white/40 outline-none"
                                />
                            </div>
                            <Button variant="primary" size="lg" className="shrink-0 h-auto" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
                {hasSearched && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-h3 text-text-primary">
                                {selectedPlace ? `Hotels in ${selectedPlace}` : "All Hotels"}
                            </h1>
                            <p className="text-body-sm text-text-muted mt-1">
                                {loading ? "Searching..." : `${totalCount.toLocaleString()} hotels found`}
                            </p>
                        </div>
                    </div>
                )}

                {!hasSearched ? (
                    <div className="text-center py-24">
                        <HotelIcon className="h-16 w-16 text-text-muted mx-auto mb-4 opacity-30" />
                        <h2 className="text-h3 text-text-primary mb-2">Search for Hotels</h2>
                        <p className="text-body text-text-muted max-w-md mx-auto">
                            Select a destination and your preferences above to find hotels from our database of 40K+ properties.
                        </p>
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="rounded-radius-lg border border-border-default bg-surface overflow-hidden">
                                <Skeleton className="aspect-[16/10] rounded-none" />
                                <div className="p-4 space-y-2">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : hotels.length === 0 ? (
                    <div className="text-center py-16 rounded-radius-xl bg-surface-sunken border border-border-default">
                        <HotelIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-h4 text-text-primary mb-2">No hotels found</h3>
                        <p className="text-body text-text-muted">Try different filters or destinations</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {hotels.map((hotel, i) => (
                                <div key={`${hotel.id}-${i}`} className="stagger-item">
                                    <HotelCard
                                        name={hotel.name}
                                        location={hotel.place}
                                        image={`https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80`}
                                        rating={4.0 + Math.random() * 0.9}
                                        reviewCount={Math.floor(100 + Math.random() * 2000)}
                                        price={hotel.price}
                                        amenities={["WiFi", "Breakfast"]}
                                        badges={hotel.price < 100 ? ["Great Value"] : []}
                                    />
                                    <div className="px-4 pb-3 pt-0 -mt-2 flex items-center justify-between text-xs text-text-muted">
                                        <span>{hotel.days} {hotel.days === 1 ? "night" : "nights"}</span>
                                        <span className="font-mono font-semibold text-primary-500">
                                            Total: R${hotel.total}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-8 py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 0 || loading}
                                    onClick={() => searchHotels(page - 1)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <span className="text-body-sm text-text-secondary">
                                    Page {page + 1} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages - 1 || loading}
                                    onClick={() => searchHotels(page + 1)}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
