"use client";

import { useState, useEffect } from "react";
import { Search, Calendar, Loader2, Hotel as HotelIcon, AlertCircle, Star } from "lucide-react";
import { HotelCard } from "@/components/features/hotels/HotelCard";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { getHotelImage, formatPrice } from "@/lib/hotelImages";
import type { NormalizedHotel } from "@/lib/supabase/types";

export default function HotelsPage() {
    const [cityIata, setCityIata] = useState("");
    const [cityDisplay, setCityDisplay] = useState("");
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");

    const [hotels, setHotels] = useState<NormalizedHotel[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [warning, setWarning] = useState("");

    // Set default dates (1 week from now, 3 nights)
    useEffect(() => {
        const checkIn = new Date();
        checkIn.setDate(checkIn.getDate() + 7);
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + 3);
        setCheckInDate(checkIn.toISOString().split("T")[0]);
        setCheckOutDate(checkOut.toISOString().split("T")[0]);
    }, []);

    // Pre-fill from URL params
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
                      (new Date(checkOutDate).getTime() -
                          new Date(checkInDate).getTime()) /
                          86400000
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
        <div className="min-h-screen bg-background">
            {/* Search header */}
            <div className="bg-primary-700 pb-6 pt-6">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <h1 className="text-center text-xl font-display font-bold text-white mb-4">
                        Search Worldwide Hotels
                    </h1>

                    <form
                        onSubmit={handleSearch}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2"
                    >
                        {/* City */}
                        <div className="md:col-span-4">
                            <LocationAutocomplete
                                value={cityIata}
                                displayValue={cityDisplay}
                                onSelect={(code, display) => {
                                    setCityIata(code);
                                    setCityDisplay(display);
                                }}
                                placeholder="City or airport..."
                                icon="destination"
                                className="[&_input]:!bg-white/10 [&_input]:!border-white/10 [&_input]:!text-white [&_input]:placeholder:!text-white/40 [&_svg]:!text-white/60"
                            />
                        </div>

                        {/* Check-in */}
                        <div className="md:col-span-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none z-10" />
                                <input
                                    type="date"
                                    value={checkInDate}
                                    onChange={(e) => setCheckInDate(e.target.value)}
                                    className="w-full rounded-radius-md bg-white/10 border border-white/10 pl-10 pr-3 py-3 text-sm font-medium text-white outline-none [color-scheme:dark]"
                                    required
                                />
                            </div>
                        </div>

                        {/* Check-out */}
                        <div className="md:col-span-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none z-10" />
                                <input
                                    type="date"
                                    value={checkOutDate}
                                    onChange={(e) => setCheckOutDate(e.target.value)}
                                    className="w-full rounded-radius-md bg-white/10 border border-white/10 pl-10 pr-3 py-3 text-sm font-medium text-white outline-none [color-scheme:dark]"
                                    required
                                    min={checkInDate}
                                />
                            </div>
                        </div>

                        {/* Search button */}
                        <div className="md:col-span-2">
                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full h-auto py-3"
                                disabled={loading || !cityIata}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Search className="h-4 w-4" /> Search
                                    </>
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

                {hasSearched && (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-h3 text-text-primary">
                                {cityDisplay
                                    ? `Hotels in ${cityDisplay}`
                                    : "Hotel Search Results"}
                            </h2>
                            <p className="text-body-sm text-text-muted mt-1">
                                {loading
                                    ? "Searching..."
                                    : `${hotels.length} hotel${hotels.length !== 1 ? "s" : ""} found · ${nights} night${nights !== 1 ? "s" : ""}`}
                            </p>
                        </div>
                    </div>
                )}

                {!hasSearched ? (
                    <div className="text-center py-24">
                        <HotelIcon className="h-16 w-16 text-text-muted mx-auto mb-4 opacity-30" />
                        <h2 className="text-h3 text-text-primary mb-2">
                            Search Worldwide Hotels
                        </h2>
                        <p className="text-body text-text-muted max-w-md mx-auto">
                            Enter a city name above to find hotels with live
                            availability. Supports any city worldwide — try
                            Paris, Tokyo, Dubai, Bucharest, etc.
                        </p>
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="rounded-radius-lg border border-border-default bg-surface overflow-hidden"
                            >
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
                                    amenities={
                                        hotel.amenities.length > 0
                                            ? hotel.amenities
                                            : ["WiFi"]
                                    }
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
                                {/* Total price footer */}
                                <div className="px-4 pb-3 pt-0 -mt-2 flex items-center justify-between text-xs text-text-muted rounded-b-radius-lg border border-t-0 border-border-default bg-surface">
                                    <span>
                                        {hotel.roomType || "Standard Room"} ·{" "}
                                        {nights} night{nights !== 1 ? "s" : ""}
                                    </span>
                                    <span className="font-mono font-semibold text-primary-500">
                                        Total:{" "}
                                        {formatPrice(
                                            hotel.pricePerNight * nights,
                                            hotel.currency
                                        )}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 rounded-radius-xl bg-surface-sunken border border-border-default">
                        <HotelIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
                        <h3 className="text-h4 text-text-primary mb-2">
                            No hotels found
                        </h3>
                        <p className="text-body text-text-muted">
                            {warning ||
                                "Try a different city, adjust your dates, or try a nearby airport code."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
