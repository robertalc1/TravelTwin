"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, Loader2, Hotel as HotelIcon, AlertCircle } from "lucide-react";
import { HotelCard } from "@/components/features/hotels/HotelCard";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { Skeleton } from "@/components/ui/Skeleton";
import { getHotelImage } from "@/lib/hotelImages";
import { useCurrencyStore } from "@/stores/currencyStore";
import type { NormalizedHotel } from "@/lib/supabase/types";

const POPULAR_CITIES: Array<[string, string]> = [
    ["PAR", "Paris"],
    ["LON", "London"],
    ["ROM", "Rome"],
    ["BCN", "Barcelona"],
    ["IST", "Istanbul"],
    ["NYC", "New York"],
    ["TYO", "Tokyo"],
    ["DXB", "Dubai"],
];

export default function HotelsPage() {
    const [cityIata, setCityIata] = useState("");
    const [cityDisplay, setCityDisplay] = useState("");
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");

    const formatCurrency = useCurrencyStore((s) => s.format);
    const [hotels, setHotels] = useState<NormalizedHotel[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [warning, setWarning] = useState("");

    useEffect(() => {
        const checkIn = new Date();
        checkIn.setDate(checkIn.getDate() + 7);
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + 3);
        setCheckInDate(checkIn.toISOString().split("T")[0]);
        setCheckOutDate(checkOut.toISOString().split("T")[0]);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const city = params.get("city");
        if (city) { setCityIata(city); setCityDisplay(city); }
    }, []);

    const nights =
        checkInDate && checkOutDate
            ? Math.max(
                  1,
                  Math.ceil(
                      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000
                  )
              )
            : 1;

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!cityIata || !checkInDate || !checkOutDate) return;

        setLoading(true);
        setHasSearched(true);
        setHotels([]);
        setWarning("");

        try {
            const params = new URLSearchParams({
                cityCode: cityIata,
                checkInDate,
                checkOutDate,
            });
            const res = await fetch(`/api/hotels/live?${params}`);
            const data = await res.json();
            setHotels(data.hotels || []);
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
                        backgroundImage: 'url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=600&fit=crop&q=80)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="relative mx-auto max-w-[1280px] px-4 lg:px-8 py-12 lg:py-16">
                    <div className="flex items-center gap-3 mb-2">
                        <HotelIcon className="h-7 w-7" />
                        <h1 className="text-3xl md:text-4xl font-extrabold">Search Worldwide Hotels</h1>
                    </div>
                    <p className="text-white/90 mb-8 max-w-xl">
                        Live availability and real prices from thousands of hotels — from boutique stays to 5-star resorts.
                    </p>

                    {/* Search card */}
                    <form
                        onSubmit={handleSearch}
                        className="bg-white dark:bg-surface text-text-primary rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-3"
                    >
                        <div className="md:col-span-5">
                            <label className="block text-xs font-semibold text-text-muted mb-1">Destination</label>
                            <LocationAutocomplete
                                value={cityIata}
                                displayValue={cityDisplay}
                                onSelect={(code, display) => { setCityIata(code); setCityDisplay(display); }}
                                placeholder="City or airport"
                                icon="destination"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-text-muted mb-1">Check-in</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                                <input
                                    type="date"
                                    value={checkInDate}
                                    onChange={(e) => setCheckInDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-text-muted mb-1">Check-out</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                                <input
                                    type="date"
                                    value={checkOutDate}
                                    onChange={(e) => setCheckOutDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
                                    required
                                    min={checkInDate}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-1 flex items-end">
                            <button
                                type="submit"
                                disabled={loading || !cityIata}
                                className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 transition-colors"
                                aria-label="Search hotels"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Results */}
            <div className="mx-auto max-w-[1280px] px-4 py-10 lg:px-8">
                {warning && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {warning}
                    </div>
                )}

                {hasSearched && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">
                                {cityDisplay ? `Hotels in ${cityDisplay}` : "Hotel Search Results"}
                            </h2>
                            <p className="text-sm text-text-muted mt-1">
                                {loading
                                    ? "Searching..."
                                    : `${hotels.length} hotel${hotels.length !== 1 ? "s" : ""} found · ${nights} night${nights !== 1 ? "s" : ""}`}
                            </p>
                        </div>
                    </div>
                )}

                {!hasSearched ? (
                    <div className="text-center py-20">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 mb-4">
                            <HotelIcon className="h-8 w-8 text-primary-500" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary mb-2">Where do you want to stay?</h2>
                        <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
                            Enter a city above to find hotels with live availability. Supports any city worldwide.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {POPULAR_CITIES.map(([code, label]) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => { setCityIata(code); setCityDisplay(label); }}
                                    className="rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-4 py-1.5 text-sm font-medium text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface overflow-hidden">
                                <Skeleton className="aspect-[16/10] rounded-none" />
                                <div className="p-4 space-y-2">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : hotels.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {hotels.map((hotel, i) => (
                            <div key={`${hotel.id}-${i}`} className="stagger-item">
                                <HotelCard
                                    name={hotel.name}
                                    location={hotel.cityName || hotel.address}
                                    image={getHotelImage(hotel.name, hotel.cityName || hotel.cityCode, hotel.rating)}
                                    rating={hotel.rating}
                                    reviewCount={0}
                                    price={hotel.pricePerNight}
                                    currency={hotel.currency}
                                    amenities={hotel.amenities.length > 0 ? hotel.amenities : ["WiFi"]}
                                    source={hotel.source}
                                    lastUpdated={hotel.lastUpdated}
                                    roomType={hotel.roomType}
                                    cancellationPolicy={hotel.cancellationPolicy}
                                    badges={
                                        hotel.pricePerNight < 80
                                            ? ["Great Value"]
                                            : hotel.rating >= 5
                                              ? ["Luxury"]
                                              : []
                                    }
                                />
                                <div className="px-4 pb-3 pt-2 flex items-center justify-between text-xs text-text-muted rounded-b-2xl border border-t-0 border-neutral-200 dark:border-border-default bg-white dark:bg-surface -mt-2">
                                    <span>{hotel.roomType || "Standard Room"} · {nights} night{nights !== 1 ? "s" : ""}</span>
                                    <span className="font-mono font-semibold text-primary-500">
                                        Total: {formatCurrency(hotel.pricePerNight * nights, hotel.currency || 'EUR')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 rounded-2xl bg-white dark:bg-surface border border-neutral-200 dark:border-border-default px-6">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 mb-4">
                            <HotelIcon className="h-7 w-7 text-primary-500" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-2">
                            We couldn&apos;t fetch hotels for this city
                        </h3>
                        <p className="text-sm text-text-muted max-w-md mx-auto mb-5">
                            {warning ||
                                "Some cities have limited availability in our test environment. Try one of these popular destinations:"}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {[
                                ["PAR", "Paris"],
                                ["LON", "London"],
                                ["BCN", "Barcelona"],
                                ["MAD", "Madrid"],
                                ["BER", "Berlin"],
                            ].map(([code, label]) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => { setCityIata(code); setCityDisplay(label); }}
                                    className="rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-4 py-1.5 text-sm font-medium text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
