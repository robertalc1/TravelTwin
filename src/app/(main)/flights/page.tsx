"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, SlidersHorizontal, ArrowUpDown, ChevronDown, Loader2, ChevronLeft, ChevronRight, Plane } from "lucide-react";
import { FlightCard } from "@/components/features/flights/FlightCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Flight } from "@/lib/supabase/types";

const PAGE_SIZE = 20;
const sortOptions = [
    { value: "price-asc", label: "Cheapest" },
    { value: "price-desc", label: "Most Expensive" },
    { value: "time-asc", label: "Shortest" },
    { value: "distance-asc", label: "Nearest" },
];

const flightTypeOptions = [
    { value: "", label: "All Classes" },
    { value: "economic", label: "Economic" },
    { value: "premium", label: "Premium" },
    { value: "firstClass", label: "First Class" },
];

export default function FlightsPage() {
    const [cities, setCities] = useState<string[]>([]);
    const [fromCity, setFromCity] = useState("");
    const [toCity, setToCity] = useState("");
    const [flightType, setFlightType] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("price-asc");
    const [showFilters, setShowFilters] = useState(false);

    const [flights, setFlights] = useState<Flight[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [loadingCities, setLoadingCities] = useState(true);

    // Load cities
    useEffect(() => {
        async function load() {
            try {
                const supabase = createClient();
                const { data } = await supabase.from("flights").select("from, to").limit(2000);
                if (data) {
                    const allCities = [...new Set([
                        ...data.map((f: { from: string }) => f.from),
                        ...data.map((f: { to: string }) => f.to)
                    ])].sort() as string[];
                    setCities(allCities);
                }
            } catch {
                // Ignore
            } finally {
                setLoadingCities(false);
            }
        }
        load();
    }, []);

    async function searchFlights(pageNum: number = 0) {
        setLoading(true);
        setHasSearched(true);

        try {
            const supabase = createClient();
            let query = supabase.from("flights").select("*", { count: "exact" });

            if (fromCity) query = query.eq("from", fromCity);
            if (toCity) query = query.eq("to", toCity);
            if (flightType) query = query.eq("flightType", flightType);
            if (maxPrice) query = query.lte("price", Number(maxPrice));

            // Sort
            const [field, dir] = sortBy.split("-");
            const sortField = field === "time" ? "time" : field === "distance" ? "distance" : "price";
            query = query.order(sortField, { ascending: dir === "asc" });

            // Pagination
            const from = pageNum * PAGE_SIZE;
            query = query.range(from, from + PAGE_SIZE - 1);

            const { data, count, error } = await query;

            if (error) throw error;

            setFlights((data as Flight[]) || []);
            setTotalCount(count || 0);
            setPage(pageNum);
        } catch (err) {
            console.error("Flight search error:", err);
        } finally {
            setLoading(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        searchFlights(0);
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="min-h-screen bg-background">
            {/* Search header */}
            <div className="bg-primary-700 pb-6 pt-6">
                <form onSubmit={handleSubmit} className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-3">
                            <div className="relative rounded-radius-md bg-white/10 backdrop-blur-sm border border-white/10">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                                <select
                                    value={fromCity}
                                    onChange={(e) => setFromCity(e.target.value)}
                                    className="w-full appearance-none bg-transparent pl-10 pr-8 py-3.5 text-sm font-medium text-white outline-none [&>option]:text-black"
                                >
                                    <option value="">From (Any)</option>
                                    {cities.map((c) => (
                                        <option key={`from-${c}`} value={c}>{c}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <div className="relative rounded-radius-md bg-white/10 backdrop-blur-sm border border-white/10">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-400" />
                                <select
                                    value={toCity}
                                    onChange={(e) => setToCity(e.target.value)}
                                    className="w-full appearance-none bg-transparent pl-10 pr-8 py-3.5 text-sm font-medium text-white outline-none [&>option]:text-black"
                                >
                                    <option value="">To (Any)</option>
                                    {cities.map((c) => (
                                        <option key={`to-${c}`} value={c}>{c}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <div className="relative rounded-radius-md bg-white/10 backdrop-blur-sm border border-white/10">
                                <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                                <select
                                    value={flightType}
                                    onChange={(e) => setFlightType(e.target.value)}
                                    className="w-full appearance-none bg-transparent pl-10 pr-8 py-3.5 text-sm font-medium text-white outline-none [&>option]:text-black"
                                >
                                    {flightTypeOptions.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                            </div>
                        </div>
                        <div className="md:col-span-3 flex gap-2">
                            <div className="relative flex-1 rounded-radius-md bg-white/10 backdrop-blur-sm border border-white/10">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/50 font-semibold">R$</span>
                                <input
                                    type="number"
                                    placeholder="Max price"
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
                {/* Results header */}
                {hasSearched && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-h3 text-text-primary">
                                {fromCity && toCity
                                    ? `${fromCity} → ${toCity}`
                                    : fromCity
                                        ? `Flights from ${fromCity}`
                                        : toCity
                                            ? `Flights to ${toCity}`
                                            : "All Flights"}
                            </h1>
                            <p className="text-body-sm text-text-muted mt-1">
                                {loading ? "Searching..." : `${totalCount.toLocaleString()} flights found`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Sort */}
                            <div className="relative">
                                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => {
                                        setSortBy(e.target.value);
                                        searchFlights(0);
                                    }}
                                    className="appearance-none rounded-radius-sm border border-border-default pl-10 pr-8 py-2 text-sm font-medium text-text-secondary bg-surface hover:bg-surface-sunken transition-colors focus:outline-none"
                                >
                                    {sortOptions.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                            </div>
                        </div>
                    </div>
                )}

                {!hasSearched ? (
                    <div className="text-center py-24">
                        <Plane className="h-16 w-16 text-text-muted mx-auto mb-4 opacity-30" />
                        <h2 className="text-h3 text-text-primary mb-2">Search for Flights</h2>
                        <p className="text-body text-text-muted max-w-md mx-auto">
                            Select departure and destination cities above and click search to find flights from our database of 271K+ flights.
                        </p>
                    </div>
                ) : loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-44 rounded-radius-lg" />
                        ))}
                    </div>
                ) : flights.length === 0 ? (
                    <div className="text-center py-16 rounded-radius-xl bg-surface-sunken border border-border-default">
                        <Plane className="h-12 w-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-h4 text-text-primary mb-2">No flights found</h3>
                        <p className="text-body text-text-muted">Try different filters or routes</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {flights.map((flight, i) => (
                                <div key={`${flight.id}-${i}`} className="stagger-item">
                                    <FlightCard
                                        airline={flight.agency}
                                        departureTime={flight.time}
                                        arrivalTime=""
                                        departureCode={flight.from.split("(")[1]?.replace(")", "") || flight.from.substring(0, 3).toUpperCase()}
                                        arrivalCode={flight.to.split("(")[1]?.replace(")", "") || flight.to.substring(0, 3).toUpperCase()}
                                        departureCity={flight.from}
                                        arrivalCity={flight.to}
                                        duration={`${flight.distance}km`}
                                        stops={0}
                                        price={flight.price}
                                        tripType={flight.flightType}
                                        badges={
                                            flight.price < 200
                                                ? ["Great Deal"]
                                                : flight.flightType === "firstClass"
                                                    ? ["Premium"]
                                                    : []
                                        }
                                    />
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
                                    onClick={() => searchFlights(page - 1)}
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
                                    onClick={() => searchFlights(page + 1)}
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
