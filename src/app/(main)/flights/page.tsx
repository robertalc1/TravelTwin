"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown, Loader2, Plane, Calendar, AlertCircle } from "lucide-react";
import { FlightCard } from "@/components/features/flights/FlightCard";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDuration } from "@/lib/hotelImages";
import type { NormalizedFlight } from "@/lib/supabase/types";

const flightClassOptions = [
    { value: "", label: "All Classes" },
    { value: "ECONOMY", label: "Economy" },
    { value: "PREMIUM_ECONOMY", label: "Premium Economy" },
    { value: "BUSINESS", label: "Business" },
    { value: "FIRST", label: "First Class" },
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

    // Set default departure date to 1 week from now
    useEffect(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDepartureDate(d.toISOString().split("T")[0]);
    }, []);

    // Pre-fill from URL params (e.g., from explore page links)
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
            if (data.warning) setWarning(data.warning);
        } catch {
            setWarning("Search failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Search header */}
            <div className="bg-primary-700 pb-6 pt-6">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <h1 className="text-center text-xl font-display font-bold text-white mb-4">
                        Search Worldwide Flights
                    </h1>

                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        {/* Origin */}
                        <div className="md:col-span-3">
                            <LocationAutocomplete
                                value={originIata}
                                displayValue={originDisplay}
                                onSelect={(code, display) => {
                                    setOriginIata(code);
                                    setOriginDisplay(display);
                                }}
                                placeholder="From (city or airport)"
                                icon="origin"
                                className="[&_input]:!bg-white/10 [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/40 [&_svg]:!text-white/60"
                            />
                        </div>

                        {/* Destination */}
                        <div className="md:col-span-3">
                            <LocationAutocomplete
                                value={destIata}
                                displayValue={destDisplay}
                                onSelect={(code, display) => {
                                    setDestIata(code);
                                    setDestDisplay(display);
                                }}
                                placeholder="To (city or airport)"
                                icon="destination"
                                className="[&_input]:!bg-white/10 [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/40 [&_svg]:!text-accent-400"
                            />
                        </div>

                        {/* Departure date */}
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

                        {/* Return date (optional) */}
                        <div className="md:col-span-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none z-10" />
                                <input
                                    type="date"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    className="w-full rounded-radius-md bg-white/10 border border-white/10 pl-10 pr-3 py-3 text-sm font-medium text-white/70 outline-none [color-scheme:dark]"
                                    placeholder="Return (optional)"
                                    min={departureDate}
                                />
                            </div>
                        </div>

                        {/* Class + Search */}
                        <div className="md:col-span-2 flex gap-2">
                            <div className="relative flex-1 rounded-radius-md bg-white/10 border border-white/10">
                                <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                                <select
                                    value={flightClass}
                                    onChange={(e) => setFlightClass(e.target.value)}
                                    className="w-full appearance-none bg-transparent pl-10 pr-8 py-3 text-sm font-medium text-white outline-none [&>option]:text-black"
                                >
                                    {flightClassOptions.map(({ value, label }) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                            </div>
                            <Button
                                variant="primary"
                                size="lg"
                                className="shrink-0 h-auto"
                                disabled={loading || !originIata || !destIata}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
                {/* Warning banner */}
                {warning && (
                    <div className="mb-4 flex items-start gap-3 rounded-radius-md bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {warning}
                    </div>
                )}

                {/* Results header */}
                {hasSearched && (
                    <div className="mb-6">
                        <h2 className="text-h3 text-text-primary">
                            {originDisplay && destDisplay
                                ? `${originDisplay} → ${destDisplay}`
                                : "Flight Search Results"}
                        </h2>
                        <p className="text-body-sm text-text-muted mt-1">
                            {loading
                                ? "Searching live prices..."
                                : `${flights.length} flight${flights.length !== 1 ? "s" : ""} found`}
                        </p>
                    </div>
                )}

                {!hasSearched ? (
                    <div className="text-center py-24">
                        <Plane className="h-16 w-16 text-text-muted mx-auto mb-4 opacity-30" />
                        <h2 className="text-h3 text-text-primary mb-2">
                            Search Worldwide Flights
                        </h2>
                        <p className="text-body text-text-muted max-w-md mx-auto">
                            Enter departure and destination cities above and click search.
                            Supports any city or airport worldwide — try Bucharest, London,
                            New York, Paris, Dubai, etc.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-text-muted">
                            <span>Popular routes:</span>
                            {[
                                ["OTP", "LHR", "Bucharest → London"],
                                ["OTP", "CDG", "Bucharest → Paris"],
                                ["LHR", "JFK", "London → New York"],
                                ["CDG", "DXB", "Paris → Dubai"],
                            ].map(([from, to, label]) => (
                                <button
                                    key={label}
                                    onClick={() => {
                                        setOriginIata(from);
                                        setOriginDisplay(from);
                                        setDestIata(to);
                                        setDestDisplay(to);
                                    }}
                                    className="rounded-full border border-border-default px-3 py-1 text-xs font-medium hover:bg-surface-sunken transition-colors"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-44 rounded-radius-lg" />
                        ))}
                    </div>
                ) : flights.length > 0 ? (
                    <div className="space-y-3">
                        {flights.map((flight, i) => (
                            <div key={`${flight.id}-${i}`} className="stagger-item">
                                <FlightCard
                                    airline={flight.airlineName || flight.airline}
                                    departureTime={flight.departureTime}
                                    arrivalTime={flight.arrivalTime}
                                    departureCode={flight.origin}
                                    arrivalCode={flight.destination}
                                    departureCity={flight.originCity !== flight.origin ? flight.originCity : ""}
                                    arrivalCity={flight.destinationCity !== flight.destination ? flight.destinationCity : ""}
                                    duration={formatDuration(flight.duration) || flight.duration}
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
                ) : (
                    <div className="text-center py-16 rounded-radius-xl bg-surface-sunken border border-border-default">
                        <Plane className="h-12 w-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-h4 text-text-primary mb-2">
                            No flights found
                        </h3>
                        <p className="text-body text-text-muted max-w-md mx-auto">
                            {warning ||
                                "Try different cities, dates, or flight class. Use valid city names like Bucharest, London, New York, Paris, etc."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
