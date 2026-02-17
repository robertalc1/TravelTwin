"use client";

import { useState } from "react";
import { Search, MapPin, Calendar, Users, SlidersHorizontal, Grid3X3, MapIcon, Star } from "lucide-react";
import { HotelCard } from "@/components/features/hotels/HotelCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const mockHotels = [
    {
        name: "The Langham, London",
        location: "Marylebone, London",
        distance: "0.5 km to center",
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
        rating: 4.8,
        reviewCount: 2341,
        price: 289,
        originalPrice: 389,
        amenities: ["WiFi", "Pool", "Parking", "Breakfast"],
        badges: ["Best Seller"],
    },
    {
        name: "Hotel Café Royal",
        location: "Piccadilly, London",
        distance: "0.2 km to center",
        image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
        rating: 4.6,
        reviewCount: 1892,
        price: 342,
        amenities: ["WiFi", "Pool", "Breakfast"],
        badges: [],
    },
    {
        name: "Shangri-La The Shard",
        location: "London Bridge, London",
        distance: "1.2 km to center",
        image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
        rating: 4.9,
        reviewCount: 3105,
        price: 445,
        originalPrice: 520,
        amenities: ["WiFi", "Pool", "Parking", "Breakfast", "Gym", "Spa"],
        badges: ["Top Rated"],
    },
    {
        name: "Premier Inn London City",
        location: "Tower Hill, London",
        distance: "2.1 km to center",
        image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
        rating: 4.2,
        reviewCount: 5621,
        price: 119,
        amenities: ["WiFi", "Breakfast"],
        badges: ["Great Value"],
    },
    {
        name: "The Savoy",
        location: "Strand, London",
        distance: "0.8 km to center",
        image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
        rating: 4.7,
        reviewCount: 4210,
        price: 512,
        amenities: ["WiFi", "Pool", "Parking", "Breakfast", "Spa"],
        badges: [],
    },
    {
        name: "citizenM Tower of London",
        location: "Tower Hill, London",
        distance: "1.8 km to center",
        image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80",
        rating: 4.4,
        reviewCount: 2876,
        price: 156,
        originalPrice: 195,
        amenities: ["WiFi", "Coffee"],
        badges: ["Best Price"],
    },
];

export default function HotelsPage() {
    const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

    return (
        <div className="min-h-screen bg-background">
            {/* Search header */}
            <div className="bg-primary-700 pb-6 pt-6">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-4">
                            <div className="flex items-center gap-3 rounded-radius-md bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
                                <MapPin className="h-4 w-4 text-white/60 shrink-0" />
                                <div>
                                    <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Destination</div>
                                    <div className="text-sm font-medium text-white">London, United Kingdom</div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-4">
                            <div className="flex items-center gap-3 rounded-radius-md bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
                                <Calendar className="h-4 w-4 text-white/60 shrink-0" />
                                <div>
                                    <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Check-in — Check-out</div>
                                    <div className="text-sm font-medium text-white">Mar 15 – Mar 22</div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-4 flex gap-2">
                            <div className="flex-1 flex items-center gap-3 rounded-radius-md bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
                                <Users className="h-4 w-4 text-white/60 shrink-0" />
                                <div>
                                    <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Guests & Rooms</div>
                                    <div className="text-sm font-medium text-white">2 Adults, 1 Room</div>
                                </div>
                            </div>
                            <Button variant="primary" size="lg" className="shrink-0 h-auto">
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
                {/* Results header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-h3 text-text-primary">Hotels in London</h1>
                        <p className="text-body-sm text-text-muted mt-1">
                            {mockHotels.length} properties found · Mar 15 – Mar 22 · 2 Adults
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-radius-sm border border-border-default overflow-hidden">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                                    viewMode === "grid" ? "bg-primary-50 text-primary-600" : "text-text-muted hover:bg-surface-sunken"
                                )}
                            >
                                <Grid3X3 className="h-4 w-4" />
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode("map")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                                    viewMode === "map" ? "bg-primary-50 text-primary-600" : "text-text-muted hover:bg-surface-sunken"
                                )}
                            >
                                <MapIcon className="h-4 w-4" />
                                Map
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-6">
                    {/* Sidebar filters */}
                    <aside className="hidden md:block shrink-0 w-64 space-y-6">
                        <div>
                            <h3 className="text-overline text-text-muted mb-3">Price per night</h3>
                            <div className="space-y-2">
                                {["Under $100", "$100 – $200", "$200 – $350", "$350+"].map((r) => (
                                    <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
                                        <input type="checkbox" className="h-4 w-4 rounded border-border-emphasis text-primary-500" />
                                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{r}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-overline text-text-muted mb-3">Star rating</h3>
                            <div className="flex gap-1.5">
                                {[3, 4, 5].map((s) => (
                                    <button
                                        key={s}
                                        className="flex items-center gap-1 rounded-radius-sm border border-border-default px-3 py-1.5 text-sm font-medium text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                                    >
                                        {s}
                                        <Star className="h-3 w-3 fill-gold-500 text-gold-500" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-overline text-text-muted mb-3">Amenities</h3>
                            <div className="space-y-2">
                                {["WiFi", "Pool", "Parking", "Breakfast", "Spa", "Gym"].map((a) => (
                                    <label key={a} className="flex items-center gap-2.5 cursor-pointer group">
                                        <input type="checkbox" className="h-4 w-4 rounded border-border-emphasis text-primary-500" />
                                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{a}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-overline text-text-muted mb-3">Guest rating</h3>
                            <div className="space-y-2">
                                {["Exceptional (4.5+)", "Very Good (4.0+)", "Good (3.5+)"].map((g) => (
                                    <label key={g} className="flex items-center gap-2.5 cursor-pointer group">
                                        <input type="checkbox" className="h-4 w-4 rounded border-border-emphasis text-primary-500" />
                                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{g}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Results grid */}
                    <div className="flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {mockHotels.map((hotel, i) => (
                                <div key={i} className="stagger-item">
                                    <HotelCard {...hotel} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
