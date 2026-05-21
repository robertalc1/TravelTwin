"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Calendar, Loader2, Hotel as HotelIcon } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
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

    const [loading, setLoading] = useState(false);
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

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!cityIata || !checkInDate || !checkOutDate) return;
        const target = `/${locale}/hotels/search?cityCode=${encodeURIComponent(cityIata)}&cityName=${encodeURIComponent(cityDisplay || cityIata)}&checkIn=${checkInDate}&checkOut=${checkOutDate}${tripId ? `&tripId=${encodeURIComponent(tripId)}` : ""}`;
        if (!user) {
            openAuthModal("login", target);
            return;
        }
        setLoading(true);
        // /hotels/search uses the same /api/hotels/search (Tripadvisor RapidAPI)
        // as the plan-trip flow — same data, same filter sidebar UI, no duplicate
        // search surface to maintain.
        router.push(target);
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

            {/* Popular cities — quick-pick chips. Submitting the form (or clicking
                a chip and pressing search) routes the user to /hotels/search,
                which renders the polished filter-driven results UI on the same
                Tripadvisor RapidAPI used by the plan-trip flow. */}
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
                                onClick={() => { setCityIata(code); setCityDisplay(label); }}
                                className="rounded-full border border-neutral-200 dark:border-border-default bg-white dark:bg-surface px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
