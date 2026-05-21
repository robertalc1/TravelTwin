"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
    Search, Calendar, Loader2, Hotel as HotelIcon, AlertCircle,
    Filter, RotateCcw, Star,
} from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";
import HotelCard, { type HotelOfferData } from "@/components/Hotels/HotelCard";

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

function HotelsPageContent() {
    const router = useRouter();
    const search = useSearchParams();
    const locale = useLocale();
    const t = useTranslations("hotels");
    const isRo = locale === "ro";

    // Form state — seeded from query string so the user lands with the last
    // search prefilled when they navigate back / share a URL.
    const initialCity = (search.get("cityCode") || search.get("city") || "").toUpperCase();
    const initialCityName = search.get("cityName") || "";
    const initialCheckIn = search.get("checkIn") || "";
    const initialCheckOut = search.get("checkOut") || "";
    const initialTripId = search.get("tripId") || "";

    const [cityIata, setCityIata] = useState(initialCity);
    const [cityDisplay, setCityDisplay] = useState(initialCityName || initialCity);
    const [checkInDate, setCheckInDate] = useState(initialCheckIn);
    const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);
    const [tripId, setTripId] = useState(initialTripId);

    const { user } = useUser();
    const openAuthModal = useAuthModalStore((s) => s.open);

    // Default dates when none in URL — 7 days from today, 3-night trip.
    useEffect(() => {
        if (checkInDate && checkOutDate) return;
        const ci = new Date();
        ci.setDate(ci.getDate() + 7);
        const co = new Date(ci);
        co.setDate(co.getDate() + 3);
        if (!checkInDate) setCheckInDate(ci.toISOString().split("T")[0]);
        if (!checkOutDate) setCheckOutDate(co.toISOString().split("T")[0]);
    }, [checkInDate, checkOutDate]);

    // Keep form in sync when the URL changes (e.g. user clicks a popular chip
    // and submits — the new query string flows back into the form).
    useEffect(() => {
        const qsCity = (search.get("cityCode") || "").toUpperCase();
        const qsName = search.get("cityName") || "";
        const qsCi = search.get("checkIn") || "";
        const qsCo = search.get("checkOut") || "";
        const qsTid = search.get("tripId") || "";
        if (qsCity && qsCity !== cityIata) setCityIata(qsCity);
        if ((qsName || qsCity) && (qsName || qsCity) !== cityDisplay) setCityDisplay(qsName || qsCity);
        if (qsCi && qsCi !== checkInDate) setCheckInDate(qsCi);
        if (qsCo && qsCo !== checkOutDate) setCheckOutDate(qsCo);
        if (qsTid !== tripId) setTripId(qsTid);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // ── Search trigger ─────────────────────────────────────────────────
    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!cityIata || !checkInDate || !checkOutDate) return;
        const qs = new URLSearchParams({
            cityCode: cityIata,
            cityName: cityDisplay || cityIata,
            checkIn: checkInDate,
            checkOut: checkOutDate,
        });
        if (tripId) qs.set("tripId", tripId);
        const target = `/${locale}/hotels?${qs.toString()}`;
        if (!user) {
            openAuthModal("login", target);
            return;
        }
        // Push the URL — same page reload, useSearchParams refreshes, the
        // results section below the hero re-fetches automatically.
        router.push(target);
    }

    // Results visible only when the URL actually carries a search.
    const hasSearched =
        !!search.get("cityCode") && !!search.get("checkIn") && !!search.get("checkOut");

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-background">
            {/* ── Hero + search form ─────────────────────────────────────
                NOTE: overflow-hidden lives on the inner bg-image only, NOT on
                the hero root — otherwise the LocationAutocomplete dropdown
                gets clipped by the hero box. */}
            <div className="relative bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                <div
                    className="absolute inset-0 opacity-20 overflow-hidden"
                    style={{
                        backgroundImage:
                            "url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=600&fit=crop&q=80)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
                <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8 py-10 lg:py-14">
                    <div className="flex items-center gap-3 mb-6">
                        <HotelIcon className="h-7 w-7" />
                        <h1 className="text-3xl md:text-4xl font-extrabold">
                            {isRo ? "Caută hoteluri din toată lumea" : "Search Worldwide Hotels"}
                        </h1>
                    </div>

                    <form
                        onSubmit={handleSearch}
                        className="bg-white dark:bg-surface text-text-primary rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-3"
                    >
                        <div className="md:col-span-5">
                            <label className="block text-xs font-semibold text-text-muted mb-1">
                                {t("destination")}
                            </label>
                            <LocationAutocomplete
                                value={cityIata}
                                displayValue={cityDisplay}
                                onSelect={(code, display) => {
                                    setCityIata(code);
                                    setCityDisplay(display);
                                }}
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
                                disabled={!cityIata}
                                className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 transition-colors"
                                aria-label={t("searchCta")}
                            >
                                <Search className="h-4 w-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ── Results OR empty state ──────────────────────────────── */}
            {hasSearched ? (
                <ResultsSection
                    cityCode={cityIata}
                    cityName={cityDisplay || cityIata}
                    checkIn={checkInDate}
                    checkOut={checkOutDate}
                    tripId={tripId}
                />
            ) : (
                <div className="mx-auto max-w-[1280px] px-4 py-12 lg:px-8">
                    <div className="text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 mb-4">
                            <HotelIcon className="h-8 w-8 text-primary-500" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary mb-2">
                            {isRo ? "Unde vrei să stai?" : "Where do you want to stay?"}
                        </h2>
                        <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
                            {isRo
                                ? "Alege un oraș și apasă căutare — afișăm rezultate live de la Tripadvisor cu filtre după stele, preț și sortare."
                                : "Pick a city and press search — we show live results from Tripadvisor with star / price / sort filters."}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                            {POPULAR_CITIES.map(([code, label]) => (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => {
                                        setCityIata(code);
                                        setCityDisplay(label);
                                    }}
                                    className="rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────
// Results section — filter sidebar + Tripadvisor live cards.
// Identical UX to /hotels/search but rendered inline so the user keeps
// the search form above and can re-search a new city without using back.
// ─────────────────────────────────────────────────────────────────────
function ResultsSection(props: {
    cityCode: string;
    cityName: string;
    checkIn: string;
    checkOut: string;
    tripId: string;
}) {
    const router = useRouter();
    const locale = useLocale();
    const isRo = locale === "ro";
    const { cityCode, cityName, checkIn, checkOut, tripId } = props;

    const [hotels, setHotels] = useState<HotelOfferData[]>([]);
    const [loading, setLoading] = useState(true);
    const [warning, setWarning] = useState<string | null>(null);

    const [sortBy, setSortBy] = useState<"recommended" | "price" | "rating">("recommended");
    const [filterStars, setFilterStars] = useState(0);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    // Re-fetch whenever the underlying search params change.
    useEffect(() => {
        if (!cityCode || !checkIn || !checkOut) return;
        let cancelled = false;
        setLoading(true);
        setHotels([]);
        setWarning(null);

        const qs = new URLSearchParams({ cityCode, checkIn, checkOut, adults: "2" });
        fetch(`/api/hotels/search?${qs.toString()}`)
            .then((r) => r.json())
            .then((data: { hotels?: HotelOfferData[]; warning?: string }) => {
                if (cancelled) return;
                setHotels(data.hotels || []);
                setWarning(data.warning || null);
            })
            .catch(() => {
                if (!cancelled) {
                    setWarning(isRo ? "Nu am putut încărca hotelurile." : "Failed to load hotels.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [cityCode, checkIn, checkOut, isRo]);

    const nights = useMemo(() => {
        if (!checkIn || !checkOut) return 1;
        return Math.max(
            1,
            Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000),
        );
    }, [checkIn, checkOut]);

    const allPrices = hotels.map((h) => parseFloat(h.offers[0]?.price.total || "0"));
    const minPriceAvailable = allPrices.length ? Math.floor(Math.min(...allPrices)) : 0;
    const maxPriceAvailable = allPrices.length ? Math.ceil(Math.max(...allPrices)) : 0;

    const filtered = useMemo(() => {
        const minN = minPrice ? parseFloat(minPrice) : -Infinity;
        const maxN = maxPrice ? parseFloat(maxPrice) : Infinity;
        return hotels
            .filter((h) => {
                const stars = parseInt(h.hotel.rating || "0", 10);
                if (filterStars > 0 && stars < filterStars) return false;
                const total = parseFloat(h.offers[0]?.price.total || "0");
                if (total < minN || total > maxN) return false;
                return true;
            })
            .sort((a, b) => {
                if (sortBy === "price") {
                    return (
                        parseFloat(a.offers[0]?.price.total || "999999") -
                        parseFloat(b.offers[0]?.price.total || "999999")
                    );
                }
                if (sortBy === "rating") {
                    return (
                        parseInt(b.hotel.rating || "0", 10) - parseInt(a.hotel.rating || "0", 10)
                    );
                }
                return 0;
            });
    }, [hotels, filterStars, minPrice, maxPrice, sortBy]);

    function resetFilters() {
        setFilterStars(0);
        setMinPrice("");
        setMaxPrice("");
        setSortBy("recommended");
    }

    function handleHotelClick(h: HotelOfferData) {
        const qs = new URLSearchParams();
        if (checkIn) qs.set("checkIn", checkIn);
        if (checkOut) qs.set("checkOut", checkOut);
        if (cityCode) qs.set("cityCode", cityCode);
        if (h.offers[0]?.price.total) qs.set("total", h.offers[0].price.total);
        if (h.hotel.name) qs.set("name", h.hotel.name);
        // With a trip context, keep saving the choice back to the trip; without
        // tripId, land on the new standalone polished detail page.
        if (tripId) {
            router.push(
                `/${locale}/plan/trip/${encodeURIComponent(tripId)}/hotel/${encodeURIComponent(
                    h.hotel.hotelId,
                )}?${qs.toString()}`,
            );
        } else {
            router.push(
                `/${locale}/hotels/${encodeURIComponent(h.hotel.hotelId)}?${qs.toString()}`,
            );
        }
    }

    return (
        <main className="mx-auto max-w-[1400px] px-4 lg:px-8 py-6 lg:py-10">
            {/* Compact result header */}
            <div className="flex items-center justify-between mb-6">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-text-primary truncate">
                        {isRo ? `Cazări în ${cityName}` : `Stays in ${cityName}`}
                    </h2>
                    <p className="text-xs text-text-muted mt-1">
                        {hotels.length}{" "}
                        {isRo
                            ? hotels.length === 1
                                ? "rezultat"
                                : "rezultate"
                            : hotels.length === 1
                            ? "result"
                            : "results"}
                        {checkIn && checkOut ? ` · ${checkIn} → ${checkOut}` : ""}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setMobileFiltersOpen((v) => !v)}
                    className="lg:hidden inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-3 py-2 text-sm font-semibold text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
                >
                    <Filter className="h-4 w-4" />
                    {isRo ? "Filtre" : "Filters"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* Filters sidebar */}
                <aside
                    className={`${mobileFiltersOpen ? "block" : "hidden"} lg:block lg:sticky lg:top-24 lg:self-start`}
                >
                    <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-text-primary">
                                {isRo ? "Filtre" : "Filters"}
                            </h3>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex items-center gap-1 text-xs text-primary-500 hover:underline"
                            >
                                <RotateCcw className="h-3 w-3" />
                                {isRo ? "Resetează" : "Reset"}
                            </button>
                        </div>

                        <section className="mb-5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                                {isRo ? "Sortează după" : "Sort by"}
                            </h4>
                            <select
                                value={sortBy}
                                onChange={(e) =>
                                    setSortBy(e.target.value as "recommended" | "price" | "rating")
                                }
                                className="w-full text-sm border border-neutral-200 dark:border-border-default rounded-xl px-3 py-2 bg-white dark:bg-surface text-text-primary"
                            >
                                <option value="recommended">
                                    {isRo ? "Recomandate" : "Recommended"}
                                </option>
                                <option value="price">
                                    {isRo ? "Cel mai mic preț" : "Lowest price"}
                                </option>
                                <option value="rating">
                                    {isRo ? "Cele mai multe stele" : "Highest stars"}
                                </option>
                            </select>
                        </section>

                        <section className="mb-5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                                {isRo ? "Stele" : "Stars"}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {[0, 3, 4, 5].map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setFilterStars(s)}
                                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                                            filterStars === s
                                                ? "bg-primary-500 text-white"
                                                : "bg-neutral-100 dark:bg-surface-elevated text-text-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                        }`}
                                    >
                                        {s === 0 ? (
                                            isRo ? "Toate" : "All"
                                        ) : (
                                            <>
                                                {s}
                                                <Star className="h-3 w-3 fill-current" />
                                            </>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="mb-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                                {isRo ? "Buget (total)" : "Budget (total)"}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex flex-col text-[11px] text-text-muted">
                                    {isRo ? "Min" : "Min"}
                                    <input
                                        type="number"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        placeholder={String(minPriceAvailable || 0)}
                                        className="mt-1 w-full border border-neutral-200 dark:border-border-default rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-surface text-text-primary"
                                    />
                                </label>
                                <label className="flex flex-col text-[11px] text-text-muted">
                                    {isRo ? "Max" : "Max"}
                                    <input
                                        type="number"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        placeholder={maxPriceAvailable ? String(maxPriceAvailable) : isRo ? "Fără limită" : "No limit"}
                                        className="mt-1 w-full border border-neutral-200 dark:border-border-default rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-surface text-text-primary"
                                    />
                                </label>
                            </div>
                        </section>
                    </div>
                </aside>

                {/* Hotel list */}
                <section>
                    {warning && (
                        <div className="mb-4 flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            {warning}
                        </div>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-72 bg-neutral-100 dark:bg-surface-elevated rounded-2xl animate-pulse"
                                />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-5xl mb-4">🏨</p>
                            <p className="text-text-secondary">
                                {hotels.length === 0
                                    ? isRo
                                        ? "Niciun hotel disponibil pentru aceste date."
                                        : "No hotels available for these dates."
                                    : isRo
                                    ? "Niciun hotel nu corespunde filtrelor."
                                    : "No hotels match your filters."}
                            </p>
                            {hotels.length > 0 && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="mt-4 text-sm text-primary-500 hover:underline"
                                >
                                    {isRo ? "Resetează filtrele" : "Reset filters"}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map((h) => (
                                <HotelCard
                                    key={h.hotel.hotelId}
                                    hotelOffer={h}
                                    nights={nights}
                                    onSelect={handleHotelClick}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function PageFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
    );
}

export default function HotelsPage() {
    return (
        <Suspense fallback={<PageFallback />}>
            <HotelsPageContent />
        </Suspense>
    );
}
