"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown, Loader2, Plane, Calendar, AlertCircle } from "lucide-react";
import { FlightResultCard } from "@/components/features/flights/FlightResultCard";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { Skeleton } from "@/components/ui/Skeleton";
import type { NormalizedFlight } from "@/lib/supabase/types";

const flightClassOptions = [
    { value: "", label: "All Classes" },
    { value: "ECONOMY", label: "Economy" },
    { value: "PREMIUM_ECONOMY", label: "Premium Economy" },
    { value: "BUSINESS", label: "Business" },
    { value: "FIRST", label: "First Class" },
];

const POPULAR_ROUTES: Array<[string, string, string]> = [
    ["OTP", "LHR", "Bucharest → London"],
    ["OTP", "CDG", "Bucharest → Paris"],
    ["OTP", "BCN", "Bucharest → Barcelona"],
    ["LHR", "JFK", "London → New York"],
    ["CDG", "DXB", "Paris → Dubai"],
    ["OTP", "FCO", "Bucharest → Rome"],
];

export default function FlightsPage() {
    const [originIata, setOriginIata] = useState("");
    const [originDisplay, setOriginDisplay] = useState("");
    const [destIata, setDestIata] = useState("");
    const [destDisplay, setDestDisplay] = useState("");
    const [departureDate, setDepartureDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [flightClass, setFlightClass] = useState("");

    const [flights, setFlights] = useState<NormalizedFlight[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [warning, setWarning] = useState("");
    const [responseSource, setResponseSource] = useState<string>("");

    useEffect(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDepartureDate(d.toISOString().split("T")[0]);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const from = params.get("from");
        const to = params.get("to");
        if (from) { setOriginIata(from); setOriginDisplay(from); }
        if (to) { setDestIata(to); setDestDisplay(to); }
    }, []);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!originIata || !destIata || !departureDate) return;

        setLoading(true);
        setHasSearched(true);
        setFlights([]);
        setWarning("");
        setResponseSource("");

        try {
            const params = new URLSearchParams({
                origin: originIata,
                destination: destIata,
                departureDate,
                ...(returnDate && { returnDate }),
                ...(flightClass && { travelClass: flightClass }),
            });
            const res = await fetch(`/api/flights/live?${params}`);
            const data = await res.json();
            setFlights(data.flights || []);
            setResponseSource(data.source || "");
            if (data.warning) setWarning(data.warning);
        } catch {
            setWarning("Search failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-background">
            {/* Hero */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: 'url(https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=600&fit=crop&q=80)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="relative mx-auto max-w-[1280px] px-4 lg:px-8 py-12 lg:py-16">
                    <div className="flex items-center gap-3 mb-2">
                        <Plane className="h-7 w-7" />
                        <h1 className="text-3xl md:text-4xl font-extrabold">Search Worldwide Flights</h1>
                    </div>
                    <p className="text-white/90 mb-8 max-w-xl">
                        Compare live prices from 500+ airlines. Real-time fares, transparent stops, no hidden fees.
                    </p>

                    {/* Search card */}
                    <form
                        onSubmit={handleSearch}
                        className="bg-white dark:bg-surface text-text-primary rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-3"
                    >
                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-text-muted mb-1">From</label>
                            <LocationAutocomplete
                                value={originIata}
                                displayValue={originDisplay}
                                onSelect={(code, display) => { setOriginIata(code); setOriginDisplay(display); }}
                                placeholder="City or airport"
                                icon="origin"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-text-muted mb-1">To</label>
                            <LocationAutocomplete
                                value={destIata}
                                displayValue={destDisplay}
                                onSelect={(code, display) => { setDestIata(code); setDestDisplay(display); }}
                                placeholder="City or airport"
                                icon="destination"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-text-muted mb-1">Departure</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                                <input
                                    type="date"
                                    value={departureDate}
                                    onChange={(e) => setDepartureDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-text-muted mb-1">Return (optional)</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                                <input
                                    type="date"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
                                    min={departureDate}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-text-muted mb-1">Class</label>
                            <div className="relative">
                                <select
                                    value={flightClass}
                                    onChange={(e) => setFlightClass(e.target.value)}
                                    className="w-full appearance-none px-3 pr-9 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
                                >
                                    {flightClassOptions.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                            </div>
                        </div>

                        <div className="md:col-span-12">
                            <button
                                type="submit"
                                disabled={loading || !originIata || !destIata}
                                className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                {loading ? "Searching..." : "Search Flights"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Results */}
            <div className="mx-auto max-w-[1280px] px-4 py-10 lg:px-8">
                {hasSearched && !loading && flights.length > 0 && responseSource === "live" && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        Prices shown are from the Amadeus test environment and may not reflect current market prices.
                    </div>
                )}

                {hasSearched && !loading && flights.length > 0 && responseSource === "reference" && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-3 text-sm text-purple-800 dark:text-purple-300">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        Showing estimated prices based on typical route costs. Live pricing may differ.
                    </div>
                )}

                {warning && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {warning}
                    </div>
                )}

                {hasSearched && (
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-text-primary">
                            {originDisplay && destDisplay ? `${originDisplay} → ${destDisplay}` : "Flight Search Results"}
                        </h2>
                        <p className="text-sm text-text-muted mt-1">
                            {loading ? "Searching live prices..." : `${flights.length} flight${flights.length !== 1 ? "s" : ""} found`}
                        </p>
                    </div>
                )}

                {!hasSearched ? (
                    <div className="text-center py-20">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 mb-4">
                            <Plane className="h-8 w-8 text-primary-500" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary mb-2">Where would you like to fly?</h2>
                        <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
                            Enter departure and destination above. Supports any city or airport worldwide.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {POPULAR_ROUTES.map(([from, to, label]) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => {
                                        setOriginIata(from); setOriginDisplay(from);
                                        setDestIata(to); setDestDisplay(to);
                                    }}
                                    className="rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-4 py-1.5 text-sm font-medium text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-44 rounded-2xl" />
                        ))}
                    </div>
                ) : flights.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {flights.map((flight, i) => (
                            <div key={`${flight.id}-${i}`} className="stagger-item">
                                <FlightResultCard flight={flight} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 rounded-2xl bg-white dark:bg-surface border border-neutral-200 dark:border-border-default">
                        <Plane className="h-12 w-12 text-text-muted mx-auto mb-4 opacity-40" />
                        <h3 className="text-lg font-bold text-text-primary mb-2">No flights found</h3>
                        <p className="text-sm text-text-muted max-w-md mx-auto">
                            {warning || "Try different cities, dates, or flight class."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
