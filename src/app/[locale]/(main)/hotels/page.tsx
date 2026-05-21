"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Calendar, Loader2, Hotel as HotelIcon, AlertCircle } from "lucide-react";
import { HotelCard } from "@/components/features/hotels/HotelCard";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { Skeleton } from "@/components/ui/Skeleton";
import { getHotelImage } from "@/lib/hotelImages";
import { useCurrencyStore } from "@/stores/currencyStore";
import type { NormalizedHotel } from "@/lib/supabase/types";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";

// City codes here MUST be real airport IATAs that exist in iataMapping.ts —
// the hotels API resolves the city name from the IATA before querying
// Tripadvisor. Metro-area codes (PAR, LON, NYC, TYO) are NOT in the mapping
// and silently return zero hotels, so we use the main airport IATA instead.
const POPULAR_CITIES: Array<[string, string]> = [
    ["CDG", "Paris"],
    ["LHR", "London"],
    ["FCO", "Rome"],
    ["BCN", "Barcelona"],
    ["IST", "Istanbul"],
    ["JFK", "New York"],
    ["NRT", "Tokyo"],
    ["DXB", "Dubai"],
];

export default function HotelsPage() {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations("hotels");
    const isRo = locale === "ro";
    const [cityIata, setCityIata] = useState("");
    const [cityDisplay, setCityDisplay] = useState("");
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");
    const [tripId, setTripId] = useState<string | null>(null);

    const formatCurrency = useCurrencyStore((s) => s.format);
    const [hotels, setHotels] = useState<NormalizedHotel[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [warning, setWarning] = useState("");
    const [responseSource, setResponseSource] = useState<string>("");
    const { user } = useUser();
    const openAuthModal = useAuthModalStore((s) => s.open);

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
        const city = params.get("city") || params.get("cityCode");
        const cityName = params.get("cityName");
        const ciQs = params.get("checkIn");
        const coQs = params.get("checkOut");
        const tid = params.get("tripId");
        if (city) {
            setCityIata(city.toUpperCase());
            setCityDisplay(cityName || city.toUpperCase());
        }
        if (ciQs) setCheckInDate(ciQs);
        if (coQs) setCheckOutDate(coQs);
        if (tid) setTripId(tid);
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
        if (!user) {
            openAuthModal("login", `/${locale}/hotels`);
            return;
        }

        setLoading(true);
        setHasSearched(true);
        setHotels([]);
        setWarning("");
        setResponseSource("");

        try {
            const params = new URLSearchParams({
                cityCode: cityIata,
                checkInDate,
                checkOutDate,
            });
            const res = await fetch(`/api/hotels/live?${params}`);
            const data = await res.json();
            setHotels(data.hotels || []);
            setResponseSource(data.source || "");
            if (data.warning) setWarning(data.warning);
        } catch {
            setWarning(t("errorGeneric"));
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
                        <h1 className="text-3xl md:text-4xl font-extrabold">
                            {isRo ? "Caută hoteluri din toată lumea" : "Search Worldwide Hotels"}
                        </h1>
                    </div>
                    <p className="text-white/90 mb-8 max-w-xl">
                        {isRo
                            ? "Disponibilitate live și prețuri reale din mii de hoteluri — de la cazări boutique la resort-uri de 5 stele."
                            : "Live availability and real prices from thousands of hotels — from boutique stays to 5-star resorts."}
                    </p>

                    {/* Search card */}
                    <form
                        onSubmit={handleSearch}
                        className="bg-white dark:bg-surface text-text-primary rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-3"
                    >
                        <div className="md:col-span-5">
                            <label className="block text-xs font-semibold text-text-muted mb-1">{t("destination")}</label>
                            <LocationAutocomplete
                                value={cityIata}
                                displayValue={cityDisplay}
                                onSelect={(code, display) => { setCityIata(code); setCityDisplay(display); }}
                                placeholder={isRo ? "Oraș sau aeroport" : "City or airport"}
                                icon="destination"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-text-muted mb-1">{t("checkIn")}</label>
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
                            <label className="block text-xs font-semibold text-text-muted mb-1">{t("checkOut")}</label>
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
                                aria-label={t("searchCta")}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Results */}
            <div className="mx-auto max-w-[1280px] px-4 py-10 lg:px-8">
                {hasSearched && !loading && hotels.length > 0 && responseSource === "live" && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {isRo
                            ? "Prețuri live + disponibilitate reală preluate acum de la Tripadvisor. Datele se actualizează la fiecare căutare."
                            : "Live prices + real availability fetched right now from Tripadvisor. Data refreshes on every search."}
                    </div>
                )}

                {hasSearched && !loading && hotels.length > 0 && responseSource === "cached" && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {isRo
                            ? "Rezultate din cache (ultimele 60 min). Refresh pagina pentru date noi."
                            : "Cached results (last 60 min). Refresh the page for fresh data."}
                    </div>
                )}

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
                                {cityDisplay
                                    ? (isRo ? `Hoteluri în ${cityDisplay}` : `Hotels in ${cityDisplay}`)
                                    : (isRo ? "Rezultate căutare hoteluri" : "Hotel Search Results")}
                            </h2>
                            <p className="text-sm text-text-muted mt-1">
                                {loading
                                    ? (isRo ? "Se caută..." : "Searching...")
                                    : isRo
                                        ? `${hotels.length} ${hotels.length === 1 ? "hotel găsit" : "hoteluri găsite"} · ${nights} ${nights === 1 ? "noapte" : "nopți"}`
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
                        <h2 className="text-xl font-bold text-text-primary mb-2">
                            {isRo ? "Unde vrei să stai?" : "Where do you want to stay?"}
                        </h2>
                        <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
                            {isRo
                                ? "Introdu un oraș mai sus pentru a găsi hoteluri cu disponibilitate live. Funcționează cu orice oraș din lume."
                                : "Enter a city above to find hotels with live availability. Supports any city worldwide."}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                            {POPULAR_CITIES.map(([code, label]) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => { setCityIata(code); setCityDisplay(label); }}
                                    className="rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
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
                        {hotels.map((hotel, i) => {
                            const totalPrice = hotel.pricePerNight * nights;
                            const goToDetail = () => {
                                try {
                                    sessionStorage.setItem(`hotelView_${hotel.id}`, JSON.stringify(hotel));
                                } catch { /* ignore quota */ }
                                const qs = new URLSearchParams({
                                    cityCode: cityIata,
                                    checkIn: checkInDate,
                                    checkOut: checkOutDate,
                                    name: hotel.name,
                                    total: String(Math.round(totalPrice)),
                                });
                                if (tripId) qs.set("tripId", tripId);
                                router.push(`/${locale}/hotels/${encodeURIComponent(hotel.id)}?${qs.toString()}`);
                            };
                            return (
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
                                        onClick={goToDetail}
                                        ctaLabel={isRo ? "Vezi detalii" : "View Details"}
                                        badges={
                                            hotel.pricePerNight < 80
                                                ? [isRo ? "Preț excelent" : "Great Value"]
                                                : hotel.rating >= 5
                                                  ? [isRo ? "Lux" : "Luxury"]
                                                  : []
                                        }
                                    />
                                    <div
                                        onClick={goToDetail}
                                        className="px-4 pb-3 pt-2 flex items-center justify-between text-xs text-text-muted rounded-b-2xl border border-t-0 border-neutral-200 dark:border-border-default bg-white dark:bg-surface -mt-2 cursor-pointer"
                                    >
                                        <span>{hotel.roomType || (isRo ? "Cameră standard" : "Standard Room")} · {isRo ? `${nights} ${nights === 1 ? "noapte" : "nopți"}` : `${nights} night${nights !== 1 ? "s" : ""}`}</span>
                                        <span className="font-mono font-semibold text-primary-500">
                                            {isRo ? "Total" : "Total"}: {formatCurrency(totalPrice, hotel.currency || 'EUR')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 rounded-2xl bg-white dark:bg-surface border border-neutral-200 dark:border-border-default px-6">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 mb-4">
                            <HotelIcon className="h-7 w-7 text-primary-500" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-2">
                            {isRo ? "Nu am putut obține hoteluri pentru acest oraș" : "We couldn’t fetch hotels for this city"}
                        </h3>
                        <p className="text-sm text-text-muted max-w-md mx-auto mb-5">
                            {warning ||
                                (isRo
                                    ? "Tripadvisor nu are disponibilitate pentru acest oraș și aceste date. Încearcă alte date sau una dintre destinațiile populare de mai jos:"
                                    : "Tripadvisor has no availability for this city on these dates. Try different dates or one of the popular destinations below:")}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                            {[
                                ["CDG", "Paris"],
                                ["LHR", "London"],
                                ["BCN", "Barcelona"],
                                ["MAD", "Madrid"],
                                ["BER", "Berlin"],
                            ].map(([code, label]) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => { setCityIata(code); setCityDisplay(label); }}
                                    className="rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
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
