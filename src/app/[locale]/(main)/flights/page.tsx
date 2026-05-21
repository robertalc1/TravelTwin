"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
    Search, ChevronDown, Loader2, Plane, Calendar, AlertCircle,
    Filter, RotateCcw,
} from "lucide-react";
import { FlightResultCard } from "@/components/features/flights/FlightResultCard";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { Skeleton } from "@/components/ui/Skeleton";
import { TripCard } from "@/components/results/TripCard";
import type { NormalizedFlight } from "@/lib/supabase/types";
import { useUser } from "@/hooks/useUser";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useAuthModalStore } from "@/stores/authModalStore";
import { getCityFromIata } from "@/lib/iataMapping";
import { getCityImageByIata } from "@/lib/cityImages";

/** Build a friendly "City (CODE)" display label for an IATA code. */
function iataToDisplay(iata: string): string {
    if (!iata) return "";
    const city = getCityFromIata(iata);
    return city && city !== iata ? `${city} (${iata})` : iata;
}

interface DealPackage {
    id: string;
    destination: { iata: string; city: string };
    nights: number;
    totalPrice: number;
    currency: string;
    flight: { stops: number } | null;
    hotel: { checkIn: string; checkOut: string } | null;
}

const FLIGHT_CLASS_OPTIONS = [
    { value: "", en: "All Classes", ro: "Toate clasele" },
    { value: "ECONOMY", en: "Economy", ro: "Economic" },
    { value: "PREMIUM_ECONOMY", en: "Premium Economy", ro: "Premium Economy" },
    { value: "BUSINESS", en: "Business", ro: "Business" },
    { value: "FIRST", en: "First Class", ro: "First Class" },
];

function FlightsPageContent() {
    const router = useRouter();
    const search = useSearchParams();
    const locale = useLocale();
    const t = useTranslations("flights");
    const isRo = locale === "ro";

    // Form state — initial values hydrate the IATA code to a friendly
    // "City (CODE)" display so deep-linked URLs don't show raw codes.
    const initialFrom = search.get("from") || "";
    const initialTo = search.get("to") || "";
    const [originIata, setOriginIata] = useState(initialFrom);
    const [originDisplay, setOriginDisplay] = useState(iataToDisplay(initialFrom));
    const [destIata, setDestIata] = useState(initialTo);
    const [destDisplay, setDestDisplay] = useState(iataToDisplay(initialTo));
    const [departureDate, setDepartureDate] = useState(search.get("departureDate") || "");
    const [returnDate, setReturnDate] = useState(search.get("returnDate") || "");
    const [flightClass, setFlightClass] = useState(search.get("travelClass") || "");

    const { user } = useUser();
    const openAuthModal = useAuthModalStore((s) => s.open);
    const { iataCode: detectedIata, airportCity: detectedCity, isLoading: locLoading } = useUserLocation();

    // Pre-fill origin with the user's IP-detected airport on cold loads so
    // the empty state can render real "deals from your city" cards without
    // forcing them to type anything (mirrors homepage behavior).
    useEffect(() => {
        if (locLoading) return;
        if (originIata) return;
        if (!detectedIata) return;
        setOriginIata(detectedIata);
        setOriginDisplay(`${detectedCity || getCityFromIata(detectedIata)} (${detectedIata})`);
    }, [locLoading, detectedIata, detectedCity, originIata]);

    // Default departure date when not in URL — 7 days from today.
    useEffect(() => {
        if (departureDate) return;
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDepartureDate(d.toISOString().split("T")[0]);
    }, [departureDate]);

    // Sync form state from URL changes (back-button, shared link).
    useEffect(() => {
        const qsFrom = search.get("from") || "";
        const qsTo = search.get("to") || "";
        const qsDep = search.get("departureDate") || "";
        const qsRet = search.get("returnDate") || "";
        const qsCls = search.get("travelClass") || "";
        if (qsFrom && qsFrom !== originIata) {
            setOriginIata(qsFrom);
            setOriginDisplay(iataToDisplay(qsFrom));
        }
        if (qsTo && qsTo !== destIata) {
            setDestIata(qsTo);
            setDestDisplay(iataToDisplay(qsTo));
        }
        if (qsDep && qsDep !== departureDate) setDepartureDate(qsDep);
        if (qsRet !== returnDate) setReturnDate(qsRet);
        if (qsCls !== flightClass) setFlightClass(qsCls);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // ── Empty-state deals from origin ──────────────────────────────────
    // When the user lands without a destination picked, show the same
    // homepage-style grid of real Tripadvisor packages departing from
    // their origin city. Card click navigates back to /flights with the
    // route preselected so the user stays in the flights flow.
    const [emptyDeals, setEmptyDeals] = useState<DealPackage[]>([]);
    const [emptyDealsLoading, setEmptyDealsLoading] = useState(false);
    const hasUrlSearch =
        !!search.get("from") && !!search.get("to") && !!search.get("departureDate");

    useEffect(() => {
        if (hasUrlSearch) return;
        if (!originIata) return;
        if (!user) return; // /api/deals requires auth
        let cancelled = false;
        setEmptyDealsLoading(true);
        fetch(`/api/deals/from/${originIata}`)
            .then((r) => r.json())
            .then((data: { packages?: DealPackage[] }) => {
                if (cancelled) return;
                const pkgs = (data.packages || []).slice(0, 12);
                setEmptyDeals(pkgs);
                // Persist full packages so TripCard's default click handler
                // can hydrate /plan/trip/[id] via sessionStorage — same
                // pattern the homepage uses to avoid a dead-end click that
                // would otherwise trigger a fresh, often-empty flight search.
                for (const pkg of pkgs) {
                    try {
                        sessionStorage.setItem(`trip_${pkg.id}`, JSON.stringify(pkg));
                    } catch { /* sessionStorage full / unavailable */ }
                }
            })
            .catch(() => { if (!cancelled) setEmptyDeals([]); })
            .finally(() => { if (!cancelled) setEmptyDealsLoading(false); });
        return () => { cancelled = true; };
    }, [hasUrlSearch, originIata, user]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!originIata || !destIata || !departureDate) return;
        const qs = new URLSearchParams({
            from: originIata,
            to: destIata,
            departureDate,
        });
        if (returnDate) qs.set("returnDate", returnDate);
        if (flightClass) qs.set("travelClass", flightClass);
        const target = `/${locale}/flights?${qs.toString()}`;
        if (!user) {
            openAuthModal("login", target);
            return;
        }
        router.push(target);
    }

    const hasSearched =
        !!search.get("from") && !!search.get("to") && !!search.get("departureDate");

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-background">
            {/* Hero — overflow-hidden on the bg image only so the
                LocationAutocomplete dropdown escapes the hero box. */}
            <div className="relative bg-gradient-to-br from-primary-500 to-primary-600 text-white">
                <div
                    className="absolute inset-0 opacity-20 overflow-hidden"
                    style={{
                        backgroundImage:
                            "url(https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=600&fit=crop&q=80)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
                <div className="relative mx-auto max-w-[1400px] px-4 lg:px-8 py-10 lg:py-14">
                    <div className="flex items-center gap-3 mb-6">
                        <Plane className="h-7 w-7" />
                        <h1 className="text-3xl md:text-4xl font-extrabold">
                            {isRo ? "Caută zboruri din toată lumea" : "Search Worldwide Flights"}
                        </h1>
                    </div>

                    <form
                        onSubmit={handleSearch}
                        className="bg-white dark:bg-surface text-text-primary rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-3"
                    >
                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-text-muted mb-1">{t("from")}</label>
                            <LocationAutocomplete
                                value={originIata}
                                displayValue={originDisplay}
                                onSelect={(code, display) => {
                                    setOriginIata(code);
                                    setOriginDisplay(display);
                                }}
                                placeholder={isRo ? "București, Cluj, Constanța..." : "Bucharest, Cluj, Constanța..."}
                                icon="origin"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-text-muted mb-1">{t("to")}</label>
                            <LocationAutocomplete
                                value={destIata}
                                displayValue={destDisplay}
                                onSelect={(code, display) => {
                                    setDestIata(code);
                                    setDestDisplay(display);
                                }}
                                placeholder={isRo ? "Londra, Paris, Istanbul..." : "London, Paris, Istanbul..."}
                                icon="destination"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-text-muted mb-1">{t("departure")}</label>
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
                            <label className="block text-xs font-semibold text-text-muted mb-1">
                                {isRo ? "Întoarcere (opțional)" : "Return (optional)"}
                            </label>
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
                            <label className="block text-xs font-semibold text-text-muted mb-1">
                                {isRo ? "Clasă" : "Class"}
                            </label>
                            <div className="relative">
                                <select
                                    value={flightClass}
                                    onChange={(e) => setFlightClass(e.target.value)}
                                    className="w-full appearance-none px-3 pr-9 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
                                >
                                    {FLIGHT_CLASS_OPTIONS.map(({ value, en, ro }) => (
                                        <option key={value} value={value}>{isRo ? ro : en}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                            </div>
                        </div>

                        <div className="md:col-span-12">
                            <button
                                type="submit"
                                disabled={!originIata || !destIata}
                                className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors"
                            >
                                <Search className="h-4 w-4" />
                                {t("searchCta")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Results OR empty state */}
            {hasSearched ? (
                <ResultsSection
                    origin={search.get("from") || ""}
                    destination={search.get("to") || ""}
                    departureDate={search.get("departureDate") || ""}
                    returnDate={search.get("returnDate") || ""}
                    travelClass={search.get("travelClass") || ""}
                />
            ) : (
                <div className="mx-auto max-w-[1280px] px-4 py-10 lg:px-8">
                    {originIata && (
                        <div className="mb-6">
                            <h2 className="text-2xl font-extrabold text-text-primary">
                                {isRo
                                    ? `Cele mai ieftine zboruri din ${getCityFromIata(originIata)}`
                                    : `Cheapest flights from ${getCityFromIata(originIata)}`}
                            </h2>
                            <p className="text-sm text-text-muted mt-1">
                                {isRo
                                    ? "Rute reale găsite live pe Tripadvisor — apasă pe orice card să vezi zborurile disponibile."
                                    : "Live routes from Tripadvisor — click any card to see available flights."}
                            </p>
                        </div>
                    )}

                    {emptyDealsLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="h-72 rounded-xl" />
                            ))}
                        </div>
                    )}

                    {!emptyDealsLoading && emptyDeals.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {emptyDeals.map((pkg, i) => (
                                <TripCard
                                    key={pkg.id}
                                    id={pkg.id}
                                    destination={pkg.destination.iata}
                                    destinationCity={pkg.destination.city}
                                    origin={originIata}
                                    originCity={getCityFromIata(originIata)}
                                    imageUrl={getCityImageByIata(pkg.destination.iata)}
                                    days={pkg.nights}
                                    departureDate={pkg.hotel?.checkIn || ""}
                                    returnDate={pkg.hotel?.checkOut || ""}
                                    originalPrice={Math.round(pkg.totalPrice * 1.25)}
                                    discountedPrice={pkg.totalPrice}
                                    currency={pkg.currency}
                                    isDirect={pkg.flight?.stops === 0}
                                    travelers={1}
                                    badge={i === 0 ? (isRo ? "Cel mai ieftin" : "Cheapest") : undefined}
                                />
                            ))}
                        </div>
                    )}

                    {!emptyDealsLoading && emptyDeals.length === 0 && (
                        <div className="text-center py-12">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 mb-4">
                                <Plane className="h-8 w-8 text-primary-500" />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary mb-2">
                                {isRo ? "Unde vrei să zbori?" : "Where would you like to fly?"}
                            </h3>
                            <p className="text-sm text-text-muted max-w-md mx-auto">
                                {isRo
                                    ? "Scrie numele orașului de plecare și al destinației în câmpurile de mai sus (ex. București, Londra, Istanbul) și apasă căutare."
                                    : "Type the city you're leaving from and your destination above (e.g. Bucharest, London, Istanbul) and press search."}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────
// Results section — Tripadvisor live flights + filter sidebar inline.
// ─────────────────────────────────────────────────────────────────────
function ResultsSection(props: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    travelClass: string;
}) {
    const locale = useLocale();
    const t = useTranslations("flights");
    const isRo = locale === "ro";
    const { origin, destination, departureDate, returnDate, travelClass } = props;

    interface Suggestion {
        origin: string;
        destination: string;
        destinationCity: string;
        price: number;
        currency: string;
        airline: string;
        airlineName: string;
    }
    const [flights, setFlights] = useState<NormalizedFlight[]>([]);
    const [loading, setLoading] = useState(true);
    const [warning, setWarning] = useState<string | null>(null);
    const [responseSource, setResponseSource] = useState<string>("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    const [sortBy, setSortBy] = useState<"recommended" | "price" | "duration">("recommended");
    const [stopsFilter, setStopsFilter] = useState<"any" | "direct" | "one">("any");
    const [maxPrice, setMaxPrice] = useState<string>("");
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    useEffect(() => {
        if (!origin || !destination || !departureDate) return;
        let cancelled = false;
        setLoading(true);
        setFlights([]);
        setWarning(null);
        setResponseSource("");
        setSuggestions([]);

        const params = new URLSearchParams({
            origin,
            destination,
            departureDate,
            ...(returnDate && { returnDate }),
            ...(travelClass && { travelClass }),
        });
        fetch(`/api/flights/live?${params}`)
            .then((r) => r.json())
            .then((data: { flights?: NormalizedFlight[]; source?: string; warning?: string; suggestions?: Suggestion[] }) => {
                if (cancelled) return;
                setFlights(data.flights || []);
                setResponseSource(data.source || "");
                if (data.warning) setWarning(data.warning);
                if (data.suggestions) setSuggestions(data.suggestions);
            })
            .catch(() => {
                if (!cancelled) setWarning(t("errorGeneric"));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [origin, destination, departureDate, returnDate, travelClass, t]);

    const allPrices = flights.map((f) => f.price);
    const maxPriceAvailable = allPrices.length ? Math.ceil(Math.max(...allPrices)) : 0;

    // Convert ISO duration (PT2H30M) → total minutes for sorting / display.
    function durationMinutes(iso: string): number {
        const h = parseInt(iso.match(/(\d+)H/)?.[1] || "0", 10);
        const m = parseInt(iso.match(/(\d+)M/)?.[1] || "0", 10);
        return h * 60 + m;
    }

    const filtered = useMemo(() => {
        const maxN = maxPrice ? parseFloat(maxPrice) : Infinity;
        return flights
            .filter((f) => {
                if (f.price > maxN) return false;
                if (stopsFilter === "direct" && f.stops !== 0) return false;
                if (stopsFilter === "one" && f.stops > 1) return false;
                return true;
            })
            .sort((a, b) => {
                if (sortBy === "price") return a.price - b.price;
                if (sortBy === "duration") return durationMinutes(a.duration) - durationMinutes(b.duration);
                return 0;
            });
    }, [flights, stopsFilter, maxPrice, sortBy]);

    function resetFilters() {
        setSortBy("recommended");
        setStopsFilter("any");
        setMaxPrice("");
    }

    return (
        <main className="mx-auto max-w-[1400px] px-4 lg:px-8 py-6 lg:py-10">
            {/* Source banner */}
            {!loading && flights.length > 0 && responseSource === "live" && (
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {isRo
                        ? "Prețuri live preluate acum de la peste 500 de companii aeriene."
                        : "Live prices fetched right now from 500+ airlines."}
                </div>
            )}
            {!loading && flights.length > 0 && responseSource === "cached" && (
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {isRo
                        ? "Rezultate din cache (ultimele 30 min)."
                        : "Cached results (last 30 min)."}
                </div>
            )}
            {warning && responseSource === "route_not_indexed" && (
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {warning}
                </div>
            )}
            {warning && responseSource !== "route_not_indexed" && (
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {warning}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-text-primary truncate">
                        {getCityFromIata(origin)} → {getCityFromIata(destination)}
                    </h2>
                    <p className="text-xs text-text-muted mt-1">
                        {loading
                            ? (isRo ? "Caut prețuri live..." : "Searching live prices...")
                            : isRo
                            ? `${filtered.length} ${filtered.length === 1 ? "zbor" : "zboruri"}${flights.length !== filtered.length ? ` din ${flights.length}` : ""}`
                            : `${filtered.length} flight${filtered.length !== 1 ? "s" : ""}${flights.length !== filtered.length ? ` of ${flights.length}` : ""}`}
                        {departureDate ? ` · ${departureDate}` : ""}
                        {returnDate ? ` → ${returnDate}` : ""}
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
                                    setSortBy(e.target.value as "recommended" | "price" | "duration")
                                }
                                className="w-full text-sm border border-neutral-200 dark:border-border-default rounded-xl px-3 py-2 bg-white dark:bg-surface text-text-primary"
                            >
                                <option value="recommended">{isRo ? "Recomandate" : "Recommended"}</option>
                                <option value="price">{isRo ? "Cel mai mic preț" : "Lowest price"}</option>
                                <option value="duration">{isRo ? "Cea mai scurtă durată" : "Shortest duration"}</option>
                            </select>
                        </section>

                        <section className="mb-5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                                {isRo ? "Escale" : "Stops"}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {(["any", "direct", "one"] as const).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setStopsFilter(s)}
                                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                            stopsFilter === s
                                                ? "bg-primary-500 text-white"
                                                : "bg-neutral-100 dark:bg-surface-elevated text-text-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                        }`}
                                    >
                                        {s === "any"
                                            ? (isRo ? "Oricâte" : "Any")
                                            : s === "direct"
                                            ? (isRo ? "Direct" : "Direct")
                                            : (isRo ? "Max 1 escală" : "Max 1 stop")}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="mb-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                                {isRo ? "Preț maxim per pasager" : "Max price per traveler"}
                            </h4>
                            <input
                                type="number"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                placeholder={maxPriceAvailable ? `€${maxPriceAvailable}` : isRo ? "Fără limită" : "No limit"}
                                className="w-full border border-neutral-200 dark:border-border-default rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-surface text-text-primary"
                            />
                        </section>
                    </div>
                </aside>

                {/* Flight list */}
                <section>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="h-44 rounded-2xl" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 rounded-2xl bg-white dark:bg-surface border border-neutral-200 dark:border-border-default">
                            <Plane className="h-12 w-12 text-text-muted mx-auto mb-4 opacity-40" />
                            <h3 className="text-lg font-bold text-text-primary mb-2">
                                {flights.length === 0
                                    ? t("noResults")
                                    : isRo
                                    ? "Niciun zbor nu corespunde filtrelor"
                                    : "No flights match your filters"}
                            </h3>
                            <p className="text-sm text-text-muted max-w-md mx-auto">
                                {flights.length === 0
                                    ? warning || (isRo ? "Încearcă alte orașe, date sau clasa de zbor." : "Try different cities, dates, or flight class.")
                                    : isRo
                                    ? "Relaxează filtrele ca să vezi mai multe opțiuni."
                                    : "Loosen the filters to see more options."}
                            </p>
                            {flights.length > 0 && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="mt-4 text-sm text-primary-500 hover:underline"
                                >
                                    {isRo ? "Resetează filtrele" : "Reset filters"}
                                </button>
                            )}
                            {flights.length === 0 && suggestions.length > 0 && (
                                <div className="mt-8 max-w-2xl mx-auto">
                                    <p className="text-sm font-semibold text-text-primary mb-3">
                                        {isRo
                                            ? `Rute disponibile din ${getCityFromIata(origin)} pe ${departureDate}:`
                                            : `Routes available from ${getCityFromIata(origin)} on ${departureDate}:`}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {suggestions.map((s) => {
                                            const href = `/${locale}/flights?from=${s.origin}&to=${s.destination}&departureDate=${departureDate}${returnDate ? `&returnDate=${returnDate}` : ""}${travelClass ? `&travelClass=${travelClass}` : ""}`;
                                            return (
                                                <a
                                                    key={s.destination}
                                                    href={href}
                                                    className="flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-200 dark:border-border-default bg-neutral-50 dark:bg-surface-elevated hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors text-left"
                                                >
                                                    <div>
                                                        <div className="font-semibold text-sm text-text-primary">
                                                            {getCityFromIata(s.origin)} → {s.destinationCity}
                                                        </div>
                                                        <div className="text-xs text-text-muted mt-0.5">
                                                            {s.airlineName}
                                                        </div>
                                                    </div>
                                                    <div className="text-base font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                                                        €{Math.round(s.price)}
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {flights.length === 0 && origin && destination && departureDate && (
                                <a
                                    href={`/api/debug/flights?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(departureDate)}&probeBoth=1`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-6 inline-block text-xs text-text-muted hover:text-primary-500 hover:underline"
                                >
                                    {isRo ? "Vezi ce zice Tripadvisor pentru ruta asta" : "See what Tripadvisor returned for this route"}
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map((flight, i) => (
                                <div key={`${flight.id}-${i}`} className="stagger-item">
                                    <FlightResultCard flight={flight} />
                                </div>
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

export default function FlightsPage() {
    return (
        <Suspense fallback={<PageFallback />}>
            <FlightsPageContent />
        </Suspense>
    );
}
