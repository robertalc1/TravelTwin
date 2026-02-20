"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Sparkles,
    MapPin,
    Search,
    Loader2,
    Star,
    DollarSign,
    Thermometer,
    Heart,
    Plane,
    Zap,
    ArrowRight,
    Globe,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { formatPrice } from "@/lib/hotelImages";
import type { FlightInspiration } from "@/lib/supabase/types";

/* ── Worldwide Popular Destinations ── */
interface WorldDestination {
    name: string;
    country: string;
    iata: string;
    photoId: string;
    tags: string[];
}

const WORLD_DESTINATIONS: WorldDestination[] = [
    {
        name: "Paris",
        country: "France",
        iata: "CDG",
        photoId: "photo-1502602898657-3e91760cbb34",
        tags: ["Romance", "Culture", "Cuisine"],
    },
    {
        name: "Tokyo",
        country: "Japan",
        iata: "NRT",
        photoId: "photo-1540959733332-eab4deabeeaf",
        tags: ["Tech", "Food", "Culture"],
    },
    {
        name: "New York",
        country: "USA",
        iata: "JFK",
        photoId: "photo-1485871981521-5b1fd3805eee",
        tags: ["City", "Entertainment", "Shopping"],
    },
    {
        name: "Bali",
        country: "Indonesia",
        iata: "DPS",
        photoId: "photo-1537996194471-e657df975ab4",
        tags: ["Beach", "Wellness", "Nature"],
    },
    {
        name: "London",
        country: "United Kingdom",
        iata: "LHR",
        photoId: "photo-1513635269975-59663e0ac1ad",
        tags: ["Culture", "History", "Shopping"],
    },
    {
        name: "Rome",
        country: "Italy",
        iata: "FCO",
        photoId: "photo-1552832230-c0197dd311b5",
        tags: ["History", "Art", "Cuisine"],
    },
    {
        name: "Barcelona",
        country: "Spain",
        iata: "BCN",
        photoId: "photo-1583422409516-2895a77efded",
        tags: ["Beach", "Architecture", "Nightlife"],
    },
    {
        name: "Dubai",
        country: "UAE",
        iata: "DXB",
        photoId: "photo-1539037116277-4db20889f2d4",
        tags: ["Luxury", "Shopping", "Desert"],
    },
    {
        name: "Bangkok",
        country: "Thailand",
        iata: "BKK",
        photoId: "photo-1508009603885-50cf7c579365",
        tags: ["Street Food", "Temples", "Nightlife"],
    },
    {
        name: "Istanbul",
        country: "Turkey",
        iata: "IST",
        photoId: "photo-1524231757912-21f4fe3a7200",
        tags: ["History", "Culture", "Cuisine"],
    },
    {
        name: "Bucharest",
        country: "Romania",
        iata: "OTP",
        photoId: "photo-1558618666-fcd25c85cd64",
        tags: ["History", "Architecture", "Nightlife"],
    },
    {
        name: "Amsterdam",
        country: "Netherlands",
        iata: "AMS",
        photoId: "photo-1534351590666-13e3e96b5017",
        tags: ["Canals", "Culture", "Cycling"],
    },
    {
        name: "Singapore",
        country: "Singapore",
        iata: "SIN",
        photoId: "photo-1525625293386-3f8f99389edd",
        tags: ["Modern", "Food", "Shopping"],
    },
    {
        name: "Sydney",
        country: "Australia",
        iata: "SYD",
        photoId: "photo-1506973035872-a4ec16b8e8d9",
        tags: ["Beach", "Opera", "Nature"],
    },
    {
        name: "Lisbon",
        country: "Portugal",
        iata: "LIS",
        photoId: "photo-1548707309-dcebeab9ea9b",
        tags: ["History", "Seafood", "Trams"],
    },
    {
        name: "New Delhi",
        country: "India",
        iata: "DEL",
        photoId: "photo-1587474260584-136574528ed5",
        tags: ["History", "Cuisine", "Culture"],
    },
];

interface CityData {
    id: number;
    name: string;
    description?: string;
    image_url?: string;
    avg_budget?: number;
    temperature?: string;
    country_id?: number;
}

interface AttractionData {
    id: number;
    name: string;
    description?: string;
    category?: string;
    price?: number;
}

interface DailyCostData {
    id: number;
    category?: string;
    min_cost?: number;
    max_cost?: number;
    avg_cost?: number;
}

/* ── Destination Card ── */
function DestinationCard({
    dest,
    inspirationPrice,
    originIata,
    onSearch,
}: {
    dest: WorldDestination;
    inspirationPrice?: FlightInspiration;
    originIata: string;
    onSearch?: () => void;
}) {
    const imgUrl = `https://images.unsplash.com/${dest.photoId}?w=600&q=80`;
    const href = originIata
        ? `/flights?from=${originIata}&to=${dest.iata}`
        : `/flights`;

    return (
        <Link
            href={href}
            className="group block rounded-radius-lg overflow-hidden border border-border-default bg-surface transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-border-emphasis"
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                <img
                    src={imgUrl}
                    alt={dest.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                        // Fallback to gradient if image fails
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Price badge */}
                {inspirationPrice && (
                    <div className="absolute top-3 right-3">
                        <div className="rounded-full bg-accent-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                            from {formatPrice(inspirationPrice.price, inspirationPrice.currency)}
                        </div>
                    </div>
                )}

                {/* City info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-display text-lg font-bold text-white leading-tight">
                        {dest.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-white/70" />
                        <span className="text-xs text-white/80">{dest.country}</span>
                        <span className="ml-auto font-mono text-xs text-white/60">
                            {dest.iata}
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-3">
                <div className="flex flex-wrap gap-1 mb-2">
                    {dest.tags.map((tag) => (
                        <span
                            key={tag}
                            className="text-[10px] font-medium text-text-muted bg-surface-sunken rounded px-1.5 py-0.5"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="flex items-center justify-between">
                    {inspirationPrice ? (
                        <div>
                            <p className="text-xs text-text-muted">Flight from</p>
                            <p className="font-mono text-base font-bold text-accent-500">
                                {formatPrice(inspirationPrice.price, inspirationPrice.currency)}
                            </p>
                        </div>
                    ) : originIata ? (
                        <p className="text-xs text-text-muted">Click to search flights</p>
                    ) : (
                        <p className="text-xs text-text-muted">Set departure city for prices</p>
                    )}
                    <div className="flex items-center gap-1 text-primary-500 text-xs font-medium">
                        Search <ArrowRight className="h-3 w-3" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function ExplorePage() {
    const { user } = useAuth();

    // Inspiration state
    const [inspirationOrigin, setInspirationOrigin] = useState("");
    const [inspirationOriginDisplay, setInspirationOriginDisplay] = useState("");
    const [inspirations, setInspirations] = useState<FlightInspiration[]>([]);
    const [loadingInspiration, setLoadingInspiration] = useState(false);
    const [inspirationMessage, setInspirationMessage] = useState("");

    // Filter for world destinations
    const [destQuery, setDestQuery] = useState("");

    // Legacy: Brazilian cities from DB (for City Details section)
    const [dbCities, setDbCities] = useState<CityData[]>([]);
    const [loadingDbCities, setLoadingDbCities] = useState(true);
    const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
    const [attractions, setAttractions] = useState<AttractionData[]>([]);
    const [dailyCosts, setDailyCosts] = useState<DailyCostData[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [favoritedCities, setFavoritedCities] = useState<Set<string>>(new Set());
    const [togglingFav, setTogglingFav] = useState<string | null>(null);

    // Build a map of inspiration prices by IATA code
    const inspirationByIata: Record<string, FlightInspiration> = {};
    for (const insp of inspirations) {
        inspirationByIata[insp.destination] = insp;
    }

    const loadInspiration = useCallback(async (origin: string) => {
        if (!origin) return;
        setLoadingInspiration(true);
        setInspirationMessage("");
        try {
            const res = await fetch(`/api/flights/inspiration?origin=${origin}`);
            const data = await res.json();
            setInspirations(data.destinations || []);
            setInspirationMessage(data.message || "");
        } catch {
            setInspirationMessage("Could not load flight inspiration.");
        } finally {
            setLoadingInspiration(false);
        }
    }, []);

    // Load DB cities for the "City Details" section
    useEffect(() => {
        async function loadCities() {
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from("cities")
                    .select("*")
                    .order("name");
                setDbCities(data || []);
            } catch {
                // ignore
            } finally {
                setLoadingDbCities(false);
            }
        }
        loadCities();
    }, []);

    // Load user's favorites
    useEffect(() => {
        if (!user) return;
        async function loadFavorites() {
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from("favorites")
                    .select("city_name")
                    .eq("user_id", user!.id);
                if (data) {
                    setFavoritedCities(
                        new Set(data.map((f: { city_name: string }) => f.city_name))
                    );
                }
            } catch { /* ignore */ }
        }
        loadFavorites();
    }, [user]);

    async function toggleFavorite(
        e: React.MouseEvent,
        cityName: string,
        cityData: CityData
    ) {
        e.stopPropagation();
        if (!user) { window.location.href = "/login"; return; }
        setTogglingFav(cityName);
        try {
            if (favoritedCities.has(cityName)) {
                await fetch(
                    `/api/favorites?city_name=${encodeURIComponent(cityName)}`,
                    { method: "DELETE" }
                );
                setFavoritedCities((prev) => {
                    const next = new Set(prev);
                    next.delete(cityName);
                    return next;
                });
            } else {
                await fetch("/api/favorites", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        city_name: cityName,
                        city_data: {
                            id: cityData.id,
                            description: cityData.description,
                            temperature: cityData.temperature,
                            avg_budget: cityData.avg_budget,
                        },
                    }),
                });
                setFavoritedCities((prev) => new Set(prev).add(cityName));
            }
        } catch { /* ignore */ } finally {
            setTogglingFav(null);
        }
    }

    async function loadCityDetails(city: CityData) {
        setSelectedCity(city);
        setLoadingDetail(true);
        try {
            const supabase = createClient();
            const [attractionsRes, costsRes] = await Promise.all([
                supabase
                    .from("attractions")
                    .select("*")
                    .eq("city_id", city.id)
                    .order("name"),
                supabase.from("daily_costs").select("*").eq("city_id", city.id),
            ]);
            setAttractions((attractionsRes.data as AttractionData[]) || []);
            setDailyCosts((costsRes.data as DailyCostData[]) || []);
        } catch {
            setAttractions([]);
            setDailyCosts([]);
        } finally {
            setLoadingDetail(false);
        }
    }

    // Filter world destinations by query
    const filteredWorldDestinations = WORLD_DESTINATIONS.filter(
        (d) =>
            !destQuery ||
            d.name.toLowerCase().includes(destQuery.toLowerCase()) ||
            d.country.toLowerCase().includes(destQuery.toLowerCase()) ||
            d.iata.toLowerCase().includes(destQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-gradient-to-b from-primary-800 to-primary-600 pt-8 pb-16">
                <div className="mx-auto max-w-4xl px-4 text-center">
                    <Badge variant="accent" className="mb-4 text-sm px-4 py-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Discover Destinations
                    </Badge>
                    <h1 className="text-display text-white mb-4 !text-3xl md:!text-4xl lg:!text-5xl">
                        Where do you dream of going?
                    </h1>
                    <p className="text-lg text-primary-100/80 mb-8 max-w-xl mx-auto">
                        Browse popular worldwide destinations. Set your departure city to
                        see live prices from Amadeus.
                    </p>

                    {/* Search bar */}
                    <div className="relative max-w-2xl mx-auto">
                        <div className="flex items-center rounded-radius-xl bg-white/95 backdrop-blur-lg shadow-xl p-2">
                            <Search className="h-5 w-5 text-text-muted ml-4 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search destinations (Paris, Tokyo, Bucharest...)"
                                value={destQuery}
                                onChange={(e) => setDestQuery(e.target.value)}
                                className="flex-1 bg-transparent px-4 py-3 text-text-primary placeholder:text-text-muted outline-none text-body"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 lg:px-8 -mt-8 pb-16">
                {/* ── Flight Inspiration Panel ── */}
                <section className="mb-8 rounded-radius-xl bg-surface border border-border-default shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-accent-600 to-accent-500 px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-5 w-5 text-white" />
                            <h2 className="font-display text-lg font-bold text-white">
                                Cheapest Flights From Your City
                            </h2>
                        </div>
                        <p className="text-sm text-white/80">
                            Set your departure city to see live prices on destination cards below
                        </p>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <LocationAutocomplete
                                value={inspirationOrigin}
                                displayValue={inspirationOriginDisplay}
                                onSelect={(code, display) => {
                                    setInspirationOrigin(code);
                                    setInspirationOriginDisplay(display);
                                    loadInspiration(code);
                                }}
                                placeholder="Select your departure city..."
                                icon="origin"
                                className="flex-1"
                            />
                            {inspirationOrigin && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setInspirationOrigin("");
                                        setInspirationOriginDisplay("");
                                        setInspirations([]);
                                    }}
                                    className="shrink-0"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>

                        {loadingInspiration ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="h-24 rounded-radius-md" />
                                ))}
                            </div>
                        ) : inspirations.length > 0 ? (
                            <>
                                <p className="text-xs text-text-muted mb-3">
                                    Cheapest destinations from {inspirationOriginDisplay} — prices now shown on destination cards below
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {inspirations.slice(0, 8).map((dest, i) => (
                                        <Link
                                            key={`${dest.destination}-${i}`}
                                            href={`/flights?from=${inspirationOrigin}&to=${dest.destination}`}
                                            className="rounded-radius-md border border-border-default bg-surface-sunken p-4 hover:border-border-emphasis transition-colors hover:shadow-sm"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono text-lg font-bold text-primary-500">
                                                    {dest.destination}
                                                </span>
                                                <SourceBadge source={dest.source} />
                                            </div>
                                            <p className="text-sm text-text-primary font-medium truncate">
                                                {dest.destinationCity !== dest.destination
                                                    ? dest.destinationCity
                                                    : dest.destination}
                                            </p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="font-mono text-sm font-bold text-accent-500">
                                                    {formatPrice(dest.price, dest.currency)}
                                                </span>
                                                <span className="text-[10px] text-text-muted">
                                                    {dest.departureDate}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        ) : inspirationMessage ? (
                            <p className="text-center text-sm text-text-muted py-4">
                                {inspirationMessage}
                            </p>
                        ) : (
                            <p className="text-center text-sm text-text-muted py-4">
                                Select a departure city above to see cheapest flight deals &
                                live prices on destination cards
                            </p>
                        )}
                    </div>
                </section>

                {/* ── Worldwide Destinations Grid ── */}
                <section className="mb-12">
                    <div className="flex items-end justify-between mb-6">
                        <div>
                            <p className="text-overline text-accent-500 mb-1">WORLDWIDE</p>
                            <h2 className="text-h2 text-text-primary flex items-center gap-2">
                                <Globe className="h-6 w-6 text-primary-500" />
                                Popular Destinations
                            </h2>
                            <p className="text-body text-text-tertiary mt-1">
                                {filteredWorldDestinations.length} destinations
                                {inspirationOrigin
                                    ? ` · Live prices from ${inspirationOriginDisplay}`
                                    : " · Set departure city for live prices"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredWorldDestinations.map((dest) => (
                            <DestinationCard
                                key={dest.iata}
                                dest={dest}
                                inspirationPrice={inspirationByIata[dest.iata]}
                                originIata={inspirationOrigin}
                            />
                        ))}
                    </div>

                    {filteredWorldDestinations.length === 0 && (
                        <div className="text-center py-12 rounded-radius-xl bg-surface-sunken border border-border-default">
                            <MapPin className="h-12 w-12 text-text-muted mx-auto mb-3" />
                            <p className="text-text-muted">
                                No destinations match &quot;{destQuery}&quot;
                            </p>
                        </div>
                    )}
                </section>

                {/* ── City Details Panel ── */}
                {selectedCity && (
                    <div className="mb-8 rounded-radius-xl bg-surface border border-border-default shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-display text-xl font-bold text-white">
                                    {selectedCity.name}
                                </h2>
                                {selectedCity.description && (
                                    <p className="text-sm text-primary-100 mt-1">
                                        {selectedCity.description}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedCity(null)}
                                className="text-white/70 hover:text-white text-sm font-medium transition-colors"
                            >
                                Close ✕
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="p-6 space-y-4">
                                <Skeleton className="h-6 w-48" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-24 rounded-radius-md" />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6">
                                {attractions.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-h4 text-text-primary mb-3 flex items-center gap-2">
                                            <Star className="h-5 w-5 text-gold-500" />
                                            Attractions ({attractions.length})
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {attractions.map((a) => (
                                                <div
                                                    key={a.id}
                                                    className="rounded-radius-md border border-border-default bg-surface-sunken p-4"
                                                >
                                                    <h4 className="font-display text-sm font-bold text-text-primary mb-1">
                                                        {a.name}
                                                    </h4>
                                                    {a.category && (
                                                        <Badge
                                                            variant="neutral"
                                                            className="text-[10px] mb-2"
                                                        >
                                                            {a.category}
                                                        </Badge>
                                                    )}
                                                    {a.description && (
                                                        <p className="text-xs text-text-muted line-clamp-2">
                                                            {a.description}
                                                        </p>
                                                    )}
                                                    {a.price != null && (
                                                        <p className="text-xs font-semibold text-accent-500 mt-2">
                                                            ${a.price}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {dailyCosts.length > 0 && (
                                    <div>
                                        <h3 className="text-h4 text-text-primary mb-3 flex items-center gap-2">
                                            <DollarSign className="h-5 w-5 text-success" />
                                            Daily Costs
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {dailyCosts.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="rounded-radius-md border border-border-default bg-surface-sunken p-4 flex items-center justify-between"
                                                >
                                                    <span className="text-sm font-medium text-text-primary">
                                                        {c.category}
                                                    </span>
                                                    <span className="font-mono text-sm font-bold text-primary-500">
                                                        ${c.avg_cost ?? c.min_cost}
                                                        {c.max_cost &&
                                                            c.min_cost !== c.max_cost && (
                                                                <span className="text-text-muted font-normal">
                                                                    {" "}
                                                                    – ${c.max_cost}
                                                                </span>
                                                            )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {attractions.length === 0 && dailyCosts.length === 0 && (
                                    <p className="text-center text-text-muted py-8">
                                        No detailed information available for this city yet.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── DB Cities (local data) ── */}
                {!loadingDbCities && dbCities.length > 0 && (
                    <section className="py-8 border-t border-border-subtle">
                        <div className="mb-6">
                            <p className="text-overline text-text-muted mb-1">
                                CITY GUIDE
                            </p>
                            <h2 className="text-h3 text-text-primary">
                                Destination Details
                            </h2>
                            <p className="text-body text-text-tertiary mt-1">
                                Click a city to see attractions and daily cost estimates
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {dbCities.map((city) => (
                                <button
                                    key={city.id}
                                    onClick={() => loadCityDetails(city)}
                                    className={cn(
                                        "stagger-item group rounded-radius-lg overflow-hidden bg-surface border text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                                        selectedCity?.id === city.id
                                            ? "border-primary-500 ring-2 ring-primary-500/20"
                                            : "border-border-default hover:border-border-emphasis"
                                    )}
                                >
                                    {city.image_url ? (
                                        <div className="relative aspect-[3/2] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                                            <img
                                                src={city.image_url}
                                                alt={city.name}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                                                <h3 className="font-display text-lg font-bold text-white">
                                                    {city.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5">
                                                    {city.temperature && (
                                                        <Badge
                                                            variant="neutral"
                                                            className="!bg-white/20 !text-white backdrop-blur-sm text-[10px]"
                                                        >
                                                            <Thermometer className="h-3 w-3" />
                                                            {city.temperature}
                                                        </Badge>
                                                    )}
                                                    <button
                                                        onClick={(e) =>
                                                            toggleFavorite(e, city.name, city)
                                                        }
                                                        disabled={togglingFav === city.name}
                                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors"
                                                        aria-label={
                                                            favoritedCities.has(city.name)
                                                                ? "Remove from favorites"
                                                                : "Add to favorites"
                                                        }
                                                    >
                                                        {togglingFav === city.name ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Heart
                                                                className={cn(
                                                                    "h-4 w-4",
                                                                    favoritedCities.has(city.name) &&
                                                                        "fill-red-400 text-red-400"
                                                                )}
                                                            />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center">
                                            <MapPin className="h-12 w-12 text-primary-300" />
                                            <div className="absolute bottom-3 left-3">
                                                <h3 className="font-display text-lg font-bold text-text-primary">
                                                    {city.name}
                                                </h3>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-4">
                                        {city.description && (
                                            <p className="text-body-sm text-text-muted mb-3 line-clamp-2">
                                                {city.description}
                                            </p>
                                        )}
                                        {city.avg_budget != null && (
                                            <span className="text-body-sm font-semibold text-accent-500">
                                                ~${city.avg_budget}/day avg. budget
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
