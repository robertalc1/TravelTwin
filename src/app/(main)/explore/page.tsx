"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, MapPin, Sun, Mountain, Umbrella, Palmtree, Building2, Compass, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const moods = [
    { id: "beach", label: "Beach & Sun", icon: Umbrella, color: "text-accent-500" },
    { id: "adventure", label: "Adventure", icon: Mountain, color: "text-success" },
    { id: "city", label: "City Break", icon: Building2, color: "text-primary-500" },
    { id: "nature", label: "Nature Escape", icon: Palmtree, color: "text-success" },
    { id: "cultural", label: "Cultural", icon: Compass, color: "text-warning" },
];

const inspirations = [
    {
        title: "Hidden Gems of Southeast Asia",
        subtitle: "Off-the-beaten-path destinations from Laos to Myanmar",
        image: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80",
        budget: "From $45/day",
        mood: "Adventure",
        duration: "10-14 days",
    },
    {
        title: "Mediterranean Coast Road Trip",
        subtitle: "Drive from Barcelona to Dubrovnik along the coast",
        image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80",
        budget: "From $85/day",
        mood: "Beach & Sun",
        duration: "7-10 days",
    },
    {
        title: "Nordic Wilderness Adventure",
        subtitle: "Northern Lights, fjords, and Arctic landscapes",
        image: "https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&q=80",
        budget: "From $120/day",
        mood: "Nature",
        duration: "5-7 days",
    },
    {
        title: "Japan: Ancient & Modern",
        subtitle: "Tokyo neon to Kyoto temples — the full experience",
        image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
        budget: "From $95/day",
        mood: "Cultural",
        duration: "12-14 days",
    },
    {
        title: "Patagonia End of the World",
        subtitle: "Glaciers, peaks, and the wildest landscapes on Earth",
        image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
        budget: "From $75/day",
        mood: "Adventure",
        duration: "8-12 days",
    },
    {
        title: "Italian Riviera Escape",
        subtitle: "Cinque Terre, Portofino, and Amalfi coast warmth",
        image: "https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800&q=80",
        budget: "From $110/day",
        mood: "Beach & Sun",
        duration: "5-7 days",
    },
];

export default function ExplorePage() {
    const [activeMood, setActiveMood] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-gradient-to-b from-primary-800 to-primary-600 pt-8 pb-16">
                <div className="mx-auto max-w-4xl px-4 text-center">
                    <Badge variant="accent" className="mb-4 text-sm px-4 py-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI-Powered Discovery
                    </Badge>
                    <h1 className="text-display text-white mb-4 !text-3xl md:!text-4xl lg:!text-5xl">
                        Where do you dream of going?
                    </h1>
                    <p className="text-lg text-primary-100/80 mb-8 max-w-xl mx-auto">
                        Tell us what kind of trip you want and our AI will find the perfect destinations
                    </p>

                    {/* AI search input */}
                    <div className="relative max-w-2xl mx-auto">
                        <div className="flex items-center rounded-radius-xl bg-white/95 backdrop-blur-lg shadow-xl p-2">
                            <Sparkles className="h-5 w-5 text-accent-500 ml-4 shrink-0" />
                            <input
                                type="text"
                                placeholder='Try "Beach getaway for 2 under $1000" or "Adventure trip in April"'
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="flex-1 bg-transparent px-4 py-3 text-text-primary placeholder:text-text-muted outline-none text-body"
                            />
                            <Button variant="primary" size="md" className="shrink-0">
                                <Sparkles className="h-4 w-4" />
                                Discover
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 lg:px-8 -mt-8">
                {/* Mood filters */}
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
                    {moods.map(({ id, label, icon: Icon, color }) => (
                        <button
                            key={id}
                            onClick={() => setActiveMood(activeMood === id ? null : id)}
                            className={cn(
                                "flex items-center gap-2 whitespace-nowrap rounded-radius-full bg-surface border px-5 py-3 text-sm font-semibold transition-all duration-200 shadow-sm shrink-0",
                                activeMood === id
                                    ? "border-primary-500 bg-primary-50 text-primary-600 shadow-md"
                                    : "border-border-default text-text-secondary hover:border-border-emphasis hover:shadow-md"
                            )}
                        >
                            <Icon className={cn("h-4 w-4", activeMood === id ? "text-primary-500" : color)} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Inspirations grid */}
                <section className="py-10">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <h2 className="text-h2 text-text-primary">Trip Inspirations</h2>
                            <p className="text-body text-text-tertiary mt-1">Curated itineraries to spark your next adventure</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {inspirations.map((item, i) => (
                            <Link
                                key={item.title}
                                href="/trips/new"
                                className="stagger-item group rounded-radius-lg overflow-hidden bg-surface border border-border-default hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <div className="relative aspect-[3/2] overflow-hidden">
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    <div className="absolute bottom-3 left-3 flex gap-2">
                                        <Badge variant="accent" className="!bg-white/20 !text-white backdrop-blur-sm text-[10px]">
                                            {item.mood}
                                        </Badge>
                                        <Badge variant="neutral" className="!bg-white/20 !text-white backdrop-blur-sm text-[10px]">
                                            {item.duration}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-display text-base font-bold text-text-primary group-hover:text-primary-500 transition-colors mb-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-body-sm text-text-muted mb-3 line-clamp-2">{item.subtitle}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-body-sm font-semibold text-accent-500">{item.budget}</span>
                                        <span className="flex items-center gap-1 text-body-sm font-medium text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Plan this trip
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
