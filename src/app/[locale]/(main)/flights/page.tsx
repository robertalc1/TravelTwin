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
import type { NormalizedFlight } from "@/lib/supabase/types";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";

const FLIGHT_CLASS_OPTIONS = [
    { value: "", en: "All Classes", ro: "Toate clasele" },
    { value: "ECONOMY", en: "Economy", ro: "Economic" },
    { value: "PREMIUM_ECONOMY", en: "Premium Economy", ro: "Premium Economy" },
    { value: "BUSINESS", en: "Business", ro: "Business" },
    { value: "FIRST", en: "First Class", ro: "First Class" },
];

// Routes confirmed to have multi-carrier coverage on Tripadvisor16 RapidAPI.
// Each one is served by at least 2 major airlines year-round so search
// reliably returns results — picked from src/lib/commonRoutes.ts.
const POPULAR_ROUTES: Array<[string, string, string]> = [
    ["OTP", "LHR", "Bucharest → London"],
    ["OTP", "CDG", "Bucharest → Paris"],
    ["OTP", "FCO", "Bucharest → Rome"],
    ["OTP", "BCN", "Bucharest → Barcelona"],
    ["OTP", "MAD", "Bucharest → Madrid"],
    ["OTP", "AMS", "Bucharest → Amsterdam"],
    ["OTP", "MUC", "Bucharest → Munich"],
    ["OTP", "VIE", "Bucharest → Vienna"],
    ["OTP", "IST", "Bucharest → Istanbul"],
    ["OTP", "ATH", "Bucharest → Athens"],
    ["OTP", "DXB", "Bucharest → Dubai"],
    ["LHR", "JFK", "London → New York"],
];

function FlightsPageContent() {
    const router = useRouter();
    const search = useSearchParams();
    const locale = useLocale();
    const t = useTranslations("flights");
    const isRo = locale === "ro";

    // Form state seeded from URL so back/share/refresh preserve the query.
    const [originIata, setOriginIata] = useState(search.get("from") || "");
    const [originDisplay, setOriginDisplay] = useState(search.get("from") || "");
    const [destIata, setDestIata] = useState(search.get("to") || "");
    const [destDisplay, setDestDisplay] = useState(search.get("to") || "");
    const [departureDate, setDepartureDate] = useState(search.get("departureDate") || "");
    const [returnDate, setReturnDate] = useState(search.get("returnDate") || "");
    const [flightClass, setFlightClass] = useState(search.get("travelClass") || "");

    const { user } = useUser();
    const openAuthModal = useAuthModalStore((s) => s.open);

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
            setOriginDisplay(qsFrom);
        }
        if (qsTo && qsTo !== destIata) {
            setDestIata(qsTo);
            setDestDisplay(qsTo);
        }
        if (qsDep && qsDep !== departureDate) setDepartureDate(qsDep);
        if (qsRet !== returnDate) setReturnDate(qsRet);
        if (qsCls !== flightClass) setFlightClass(qsCls);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

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
                                placeholder={isRo ? "Oraș sau aeroport" : "City or airport"}
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
                                placeholder={isRo ? "Oraș sau aeroport" : "City or airport"}
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
                <div className="mx-auto max-w-[1280px] px-4 py-12 lg:px-8">
                    <div className="text-center">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20 mb-4">
                            <Plane className="h-8 w-8 text-primary-500" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary mb-2">
                            {isRo ? "Unde vrei să zbori?" : "Where would you like to fly?"}
                        </h2>
                        <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
                            {isRo
                                ? "Alege plecarea și destinația de mai sus și apasă căutare — afișăm prețuri live cu filtre după preț, escale și durată."
                                : "Pick departure and destination above and press search — we show live prices with filters for price, stops and duration."}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                            {POPULAR_ROUTES.map(([from, to, label]) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => {
                                        setOriginIata(from);
                                        setOriginDisplay(from);
                                        setDestIata(to);
                                        setDestDisplay(to);
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
            {warning && (
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {warning}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-text-primary truncate">
                        {origin} → {destination}
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
                                            ? `Rute disponibile din ${origin} pe ${departureDate}:`
                                            : `Routes available from ${origin} on ${departureDate}:`}
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
                                                            {s.origin} → {s.destination}
                                                        </div>
                                                        <div className="text-xs text-text-muted mt-0.5">
                                                            {s.destinationCity} · {s.airlineName}
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
