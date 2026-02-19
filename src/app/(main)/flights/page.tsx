"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, ArrowUpDown, ChevronDown, Loader2, ChevronLeft, ChevronRight, Plane, Zap, Database, MapPin, Calendar } from "lucide-react";
import { FlightCard } from "@/components/features/flights/FlightCard";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Flight, NormalizedFlight } from "@/lib/supabase/types";

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

const travelClassMap: Record<string, string> = {
    economic: "ECONOMY",
    premium: "PREMIUM_ECONOMY",
    firstClass: "FIRST",
};

export default function FlightsPage() {
    // Static search state
    const [cities, setCities] = useState<string[]>([]);
    const [fromCity, setFromCity] = useState("");
    const [toCity, setToCity] = useState("");
    const [flightType, setFlightType] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("price-asc");

    // Live search state
    const [liveMode, setLiveMode] = useState(true);
    const [originIata, setOriginIata] = useState("");
    const [originDisplay, setOriginDisplay] = useState("");
    const [destIata, setDestIata] = useState("");
    const [destDisplay, setDestDisplay] = useState("");
    const [departureDate, setDepartureDate] = useState("");
    const [returnDate, setReturnDate] = useState("");

    // Results
    const [flights, setFlights] = useState<Flight[]>([]);
    const [liveFlights, setLiveFlights] = useState<NormalizedFlight[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [loadingCities, setLoadingCities] = useState(true);
    const [warning, setWarning] = useState("");

    // Load cities for static mode
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

    // Set default departure date to tomorrow
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 7);
        setDepartureDate(tomorrow.toISOString().split("T")[0]);
    }, []);

    async function searchLive() {
        if (!originIata || !destIata || !departureDate) return;
        setLoading(true);
        setHasSearched(true);
        setLiveFlights([]);
        setWarning("");

        try {
            const params = new URLSearchParams({
                origin: originIata,
                destination: destIata,
                departureDate,
                ...(returnDate && { returnDate }),
                ...(flightType && travelClassMap[flightType] && { travelClass: travelClassMap[flightType] }),
            });
            const res = await fetch(`/api/flights/live?${params}`);
            const data = await res.json();
            setLiveFlights(data.flights || []);
            setTotalCount(data.count || 0);
            setWarning(data.warning || "");
        } catch {
            setWarning("Search failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function searchStatic(pageNum: number = 0) {
        setLoading(true);
        setHasSearched(true);

        try {
            const supabase = createClient();
            let query = supabase.from("flights").select("*", { count: "exact" });

            if (fromCity) query = query.eq("from", fromCity);
            if (toCity) query = query.eq("to", toCity);
            if (flightType) query = query.eq("flightType", flightType);
            if (maxPrice) query = query.lte("price", Number(maxPrice));

            const [field, dir] = sortBy.split("-");
            const sortField = field === "time" ? "time" : field === "distance" ? "distance" : "price";
            query = query.order(sortField, { ascending: dir === "asc" });

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
        if (liveMode) {
            searchLive();
        } else {
            searchStatic(0);
        }
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="min-h-screen bg-background">
            {/* Search header */}
            <div className="bg-primary-700 pb-6 pt-6">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    {/* Mode toggle */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <button
                            onClick={() => setLiveMode(true)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                                liveMode
                                    ? "bg-white text-primary-700"
                                    : "bg-white/10 text-white/70 hover:bg-white/20"
                            )}
                        >
                            <Zap className="h-3.5 w-3.5" />
                            Search Worldwide (Live)
                        </button>
                        <button
                            onClick={() => setLiveMode(false)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                                !liveMode
                                    ? "bg-white text-primary-700"
                                    : "bg-white/10 text-white/70 hover:bg-white/20"
                            )}
                        >
                            <Database className="h-3.5 w-3.5" />
                            Search Brazil (Static)
                        </button>
                    </div>

                    {liveMode ? (
                        /* Live search form */
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                            <div className="md:col-span-3">
                                <LocationAutocomplete
                                    value={originIata}
                                    displayValue={originDisplay}
                                    onSelect={(code, display) => { setOriginIata(code); setOriginDisplay(display); }}
                                    placeholder="From (city or airport)"
                                    icon="origin"
                                    className="[&_input]:!bg-white/10 [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/40 [&_svg]:!text-white/60"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <LocationAutocomplete
                                    value={destIata}
                                    displayValue={destDisplay}
                                    onSelect={(code, display) => { setDestIata(code); setDestDisplay(display); }}
                                    placeholder="To (city or airport)"
                                    icon="destination"
                                    className="[&_input]:!bg-white/10 [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/40 [&_svg]:!text-accent-400"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none z-10" />
                                    <input
                                        type="date"
                                        value={departureDate}
                                        onChange={(e) => setDepartureDate(e.target.value)}
                                        className="w-full rounded-radius-md bg-white/10 border border-white/10 pl-10 pr-3 py-3 text-sm font-medium text-white outline-none [color-scheme:dark]"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none z-10" />
                                    <input
                                        type="date"
                                        value={returnDate}
                                        onChange={(e) => setReturnDate(e.target.value)}
                                        className="w-full rounded-radius-md bg-white/10 border border-white/10 pl-10 pr-3 py-3 text-sm font-medium text-white/70 outline-none placeholder:text-white/40 [color-scheme:dark]"
                                        placeholder="Return (optional)"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 flex gap-2">
                                <div className="relative flex-1 rounded-radius-md bg-white/10 border border-white/10">
                                    <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                                    <select
                                        value={flightType}
                                        onChange={(e) => setFlightType(e.target.value)}
                                        className="w-full appearance-none bg-transparent pl-10 pr-8 py-3 text-sm font-medium text-white outline-none [&>option]:text-black"
                                    >
                                        {flightTypeOptions.map(({ value, label }) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                                </div>
                                <Button variant="primary" size="lg" className="shrink-0 h-auto" disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                        </form>
                    ) : (
                        /* Static search form */
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-2">
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
                        </form>
                    )}
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
                {/* Warning banner */}
                {warning && (
                    <div className="mb-4 rounded-radius-md bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                        {warning}
                    </div>
                )}

                {/* Results header */}
                {hasSearched && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-h3 text-text-primary">
                                {liveMode
                                    ? originDisplay && destDisplay
                                        ? `${originDisplay} → ${destDisplay}`
                                        : "Live Flight Search"
                                    : fromCity && toCity
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
                        {!liveMode && (
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => {
                                            setSortBy(e.target.value);
                                            searchStatic(0);
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
                        )}
                    </div>
                )}

                {!hasSearched ? (
                    <div className="text-center py-24">
                        <Plane className="h-16 w-16 text-text-muted mx-auto mb-4 opacity-30" />
                        <h2 className="text-h3 text-text-primary mb-2">Search for Flights</h2>
                        <p className="text-body text-text-muted max-w-md mx-auto">
                            {liveMode
                                ? "Search worldwide flights with live pricing from Amadeus. Type a city or airport to get started."
                                : "Select departure and destination cities above and click search to find flights from our database of 271K+ flights."}
                        </p>
                    </div>
                ) : loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-44 rounded-radius-lg" />
                        ))}
                    </div>
                ) : liveMode && liveFlights.length > 0 ? (
                    /* Live results */
                    <div className="space-y-3">
                        {liveFlights.map((flight, i) => (
                            <div key={`${flight.id}-${i}`} className="stagger-item">
                                <FlightCard
                                    airline={flight.airlineName || flight.airline}
                                    departureTime={flight.departureTime}
                                    arrivalTime={flight.arrivalTime}
                                    departureCode={flight.origin}
                                    arrivalCode={flight.destination}
                                    departureCity={flight.originCity}
                                    arrivalCity={flight.destinationCity}
                                    duration={flight.duration.replace("PT", "").replace("H", "h ").replace("M", "m")}
                                    stops={flight.stops}
                                    price={flight.price}
                                    currency={flight.currency}
                                    tripType={flight.travelClass}
                                    source={flight.source}
                                    lastUpdated={flight.lastUpdated}
                                    badges={[
                                        ...(flight.stops === 0 ? ["Direct"] : []),
                                        ...(flight.price < 100 ? ["Great Deal"] : []),
                                    ]}
                                />
                            </div>
                        ))}
                    </div>
                ) : !liveMode && flights.length > 0 ? (
                    /* Static results */
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
                                        currency="BRL"
                                        tripType={flight.flightType}
                                        source="fallback"
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
                                    onClick={() => searchStatic(page - 1)}
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
                                    onClick={() => searchStatic(page + 1)}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 rounded-radius-xl bg-surface-sunken border border-border-default">
                        <Plane className="h-12 w-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-h4 text-text-primary mb-2">No flights found</h3>
                        <p className="text-body text-text-muted">
                            {liveMode
                                ? "Try different cities, dates, or switch to Static mode for Brazilian flights."
                                : "Try different filters or routes"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
