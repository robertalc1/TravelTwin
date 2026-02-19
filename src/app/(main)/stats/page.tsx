"use client";

import { useState, useEffect } from "react";
import {
    Plane,
    Hotel,
    MapPin,
    Globe,
    Mountain,
    DollarSign,
    TrendingDown,
    BarChart3,
    Loader2,
    Star,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";

interface StatsData {
    totalFlights: number;
    totalHotels: number;
    totalCities: number;
    totalCountries: number;
    totalAttractions: number;
    avgFlightPrice: number;
    avgHotelPrice: number;
    cheapestDestinations: { city: string; avgCost: number }[];
    topRoutes: { from: string; to: string; count: number; avgPrice: number }[];
}

const statCards = [
    { key: "totalFlights", label: "Flights", icon: Plane, color: "text-blue-500", bg: "bg-blue-500/10" },
    { key: "totalHotels", label: "Hotels", icon: Hotel, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { key: "totalCities", label: "Cities", icon: MapPin, color: "text-amber-500", bg: "bg-amber-500/10" },
    { key: "totalCountries", label: "Countries", icon: Globe, color: "text-purple-500", bg: "bg-purple-500/10" },
    { key: "totalAttractions", label: "Attractions", icon: Mountain, color: "text-rose-500", bg: "bg-rose-500/10" },
] as const;

export default function StatsPage() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const supabase = createClient();

                // Fetch all counts in parallel
                const [
                    flightsRes,
                    hotelsRes,
                    citiesRes,
                    countriesRes,
                    attractionsRes,
                ] = await Promise.all([
                    supabase.from("flights").select("*", { count: "exact", head: true }),
                    supabase.from("hotels").select("*", { count: "exact", head: true }),
                    supabase.from("cities").select("*", { count: "exact", head: true }),
                    supabase.from("countries").select("*", { count: "exact", head: true }),
                    supabase.from("attractions").select("*", { count: "exact", head: true }),
                ]);

                // Avg prices
                const { data: flightPrices } = await supabase
                    .from("flights")
                    .select("price")
                    .limit(1000);
                const { data: hotelPrices } = await supabase
                    .from("hotels")
                    .select("price")
                    .limit(1000);

                const avgFlight = flightPrices?.length
                    ? Math.round(flightPrices.reduce((sum: number, f: { price: number }) => sum + f.price, 0) / flightPrices.length)
                    : 0;
                const avgHotel = hotelPrices?.length
                    ? Math.round(hotelPrices.reduce((sum: number, h: { price: number }) => sum + h.price, 0) / hotelPrices.length)
                    : 0;

                // Cheapest destinations (hotels sorted by price)
                const { data: cheapHotels } = await supabase
                    .from("hotels")
                    .select("city, price")
                    .order("price", { ascending: true })
                    .limit(50);

                const destMap = new Map<string, number[]>();
                cheapHotels?.forEach((h: { city: string; price: number }) => {
                    const prices = destMap.get(h.city) || [];
                    prices.push(h.price);
                    destMap.set(h.city, prices);
                });
                const cheapestDestinations = Array.from(destMap.entries())
                    .map(([city, prices]) => ({
                        city,
                        avgCost: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
                    }))
                    .sort((a, b) => a.avgCost - b.avgCost)
                    .slice(0, 8);

                // Top routes
                const { data: routeData } = await supabase
                    .from("flights")
                    .select("from, to, price")
                    .limit(500);

                const routeMap = new Map<string, { from: string; to: string; count: number; total: number }>();
                routeData?.forEach((f: { from: string; to: string; price: number }) => {
                    const key = `${f.from}-${f.to}`;
                    const existing = routeMap.get(key) || { from: f.from, to: f.to, count: 0, total: 0 };
                    existing.count++;
                    existing.total += f.price;
                    routeMap.set(key, existing);
                });
                const topRoutes = Array.from(routeMap.values())
                    .map((r) => ({ ...r, avgPrice: Math.round(r.total / r.count) }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8);

                setStats({
                    totalFlights: flightsRes.count || 0,
                    totalHotels: hotelsRes.count || 0,
                    totalCities: citiesRes.count || 0,
                    totalCountries: countriesRes.count || 0,
                    totalAttractions: attractionsRes.count || 0,
                    avgFlightPrice: avgFlight,
                    avgHotelPrice: avgHotel,
                    cheapestDestinations,
                    topRoutes,
                });
            } catch {
                // Handle error gracefully
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
                    <div className="text-center mb-10">
                        <Skeleton className="h-8 w-32 mx-auto mb-4" />
                        <Skeleton className="h-10 w-64 mx-auto mb-3" />
                        <Skeleton className="h-5 w-96 mx-auto" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-radius-xl" />
                        ))}
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Skeleton className="h-64 rounded-radius-xl" />
                        <Skeleton className="h-64 rounded-radius-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-text-muted">Failed to load stats.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
                {/* Header */}
                <div className="text-center mb-10">
                    <Badge variant="accent" className="mb-4 text-sm px-4 py-1.5">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Platform Statistics
                    </Badge>
                    <h1 className="text-h1 text-text-primary mb-3">
                        Travel Data Dashboard
                    </h1>
                    <p className="text-body-lg text-text-tertiary max-w-lg mx-auto">
                        Real-time insights from our travel database
                    </p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
                    {statCards.map(({ key, label, icon: Icon, color, bg }) => (
                        <div key={key} className="rounded-radius-xl border border-border-default bg-surface p-5 text-center transition-shadow hover:shadow-md">
                            <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-radius-lg ${bg}`}>
                                <Icon className={`h-6 w-6 ${color}`} />
                            </div>
                            <p className="font-mono text-2xl font-bold text-text-primary">
                                {stats[key as keyof StatsData]?.toLocaleString()}
                            </p>
                            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mt-1">
                                {label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Avg Prices */}
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                    <div className="rounded-radius-xl border border-border-default bg-surface p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-radius-lg bg-blue-500/10">
                                <Plane className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-h5 text-text-primary">Average Flight Price</h3>
                                <p className="text-xs text-text-muted">Across all routes</p>
                            </div>
                        </div>
                        <p className="font-mono text-3xl font-bold text-primary-500">
                            R${stats.avgFlightPrice.toLocaleString()}
                        </p>
                    </div>
                    <div className="rounded-radius-xl border border-border-default bg-surface p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-radius-lg bg-emerald-500/10">
                                <Hotel className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-h5 text-text-primary">Average Hotel Price</h3>
                                <p className="text-xs text-text-muted">Per night</p>
                            </div>
                        </div>
                        <p className="font-mono text-3xl font-bold text-primary-500">
                            R${stats.avgHotelPrice.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Tables */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Cheapest Destinations */}
                    <div className="rounded-radius-xl border border-border-default bg-surface p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-radius-lg bg-amber-500/10">
                                <TrendingDown className="h-5 w-5 text-amber-500" />
                            </div>
                            <h3 className="text-h5 text-text-primary">Cheapest Destinations</h3>
                        </div>
                        <div className="space-y-3">
                            {stats.cheapestDestinations.map((dest, i) => (
                                <div key={dest.city} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm font-medium text-text-primary">{dest.city}</span>
                                    </div>
                                    <span className="font-mono text-sm font-semibold text-success">
                                        R${dest.avgCost.toLocaleString()}/night
                                    </span>
                                </div>
                            ))}
                            {stats.cheapestDestinations.length === 0 && (
                                <p className="text-sm text-text-muted text-center py-4">No data available</p>
                            )}
                        </div>
                    </div>

                    {/* Top Routes */}
                    <div className="rounded-radius-xl border border-border-default bg-surface p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-radius-lg bg-purple-500/10">
                                <Star className="h-5 w-5 text-purple-500" />
                            </div>
                            <h3 className="text-h5 text-text-primary">Popular Routes</h3>
                        </div>
                        <div className="space-y-3">
                            {stats.topRoutes.map((route, i) => (
                                <div key={`${route.from}-${route.to}`} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <span className="text-sm font-medium text-text-primary">{route.from}</span>
                                            <span className="text-xs text-text-muted mx-1.5">→</span>
                                            <span className="text-sm font-medium text-text-primary">{route.to}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono text-sm font-semibold text-primary-500">
                                            R${route.avgPrice.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-text-muted block">{route.count} flights</span>
                                    </div>
                                </div>
                            ))}
                            {stats.topRoutes.length === 0 && (
                                <p className="text-sm text-text-muted text-center py-4">No data available</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
