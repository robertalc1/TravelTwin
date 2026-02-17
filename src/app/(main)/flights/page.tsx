"use client";

import { useState } from "react";
import { Search, MapPin, Calendar, Users, SlidersHorizontal, ArrowUpDown, Briefcase } from "lucide-react";
import { FlightCard } from "@/components/features/flights/FlightCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const mockFlights = [
    {
        airline: "Emirates",
        departureTime: "06:30",
        arrivalTime: "14:45",
        departureCode: "JFK",
        arrivalCode: "LHR",
        departureCity: "New York",
        arrivalCity: "London",
        duration: "7h 15m",
        stops: 0,
        price: 487,
        badges: ["Best Price", "Direct"],
    },
    {
        airline: "British Airways",
        departureTime: "10:00",
        arrivalTime: "22:20",
        departureCode: "JFK",
        arrivalCode: "LHR",
        departureCity: "New York",
        arrivalCity: "London",
        duration: "7h 20m",
        stops: 0,
        price: 512,
        badges: ["Direct"],
    },
    {
        airline: "Delta",
        departureTime: "16:45",
        arrivalTime: "06:10",
        departureCode: "JFK",
        arrivalCode: "LHR",
        departureCity: "New York",
        arrivalCity: "London",
        duration: "7h 25m",
        stops: 0,
        price: 538,
        badges: [],
    },
    {
        airline: "Lufthansa",
        departureTime: "09:15",
        arrivalTime: "19:30",
        departureCode: "JFK",
        arrivalCode: "LHR",
        departureCity: "New York",
        arrivalCity: "London",
        duration: "11h 15m",
        stops: 1,
        price: 342,
        badges: ["Best Price"],
    },
    {
        airline: "Air France",
        departureTime: "18:00",
        arrivalTime: "09:45",
        departureCode: "JFK",
        arrivalCode: "LHR",
        departureCity: "New York",
        arrivalCity: "London",
        duration: "10h 45m",
        stops: 1,
        price: 398,
        badges: [],
    },
    {
        airline: "KLM",
        departureTime: "21:30",
        arrivalTime: "13:15",
        departureCode: "JFK",
        arrivalCode: "LHR",
        departureCity: "New York",
        arrivalCity: "London",
        duration: "12h 45m",
        stops: 1,
        price: 315,
        badges: ["Best Price"],
    },
];

const sortOptions = ["Best", "Cheapest", "Fastest"];

const filters = [
    { label: "Direct only", active: false },
    { label: "1 stop max", active: false },
    { label: "Morning", active: false },
    { label: "Afternoon", active: false },
    { label: "Evening", active: false },
];

export default function FlightsPage() {
    const [activeSort, setActiveSort] = useState("Best");
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            {/* Search header */}
            <div className="bg-primary-700 pb-6 pt-6">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-3">
                            <div className="flex items-center gap-3 rounded-radius-md bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
                                <MapPin className="h-4 w-4 text-white/60 shrink-0" />
                                <div>
                                    <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">From</div>
                                    <div className="text-sm font-medium text-white">New York (JFK)</div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <div className="flex items-center gap-3 rounded-radius-md bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
                                <MapPin className="h-4 w-4 text-accent-400 shrink-0" />
                                <div>
                                    <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">To</div>
                                    <div className="text-sm font-medium text-white">London (LHR)</div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <div className="flex items-center gap-3 rounded-radius-md bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
                                <Calendar className="h-4 w-4 text-white/60 shrink-0" />
                                <div>
                                    <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">When</div>
                                    <div className="text-sm font-medium text-white">Mar 15 – Mar 22</div>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-3 flex gap-2">
                            <div className="flex-1 flex items-center gap-3 rounded-radius-md bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/10">
                                <Users className="h-4 w-4 text-white/60 shrink-0" />
                                <div>
                                    <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Travelers</div>
                                    <div className="text-sm font-medium text-white">1 Adult</div>
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
                        <h1 className="text-h3 text-text-primary">
                            New York → London
                        </h1>
                        <p className="text-body-sm text-text-muted mt-1">
                            {mockFlights.length} flights found · Mar 15 – Mar 22 · 1 Adult
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 rounded-radius-sm border border-border-default px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-sunken transition-colors md:hidden"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters
                        </button>
                    </div>
                </div>

                <div className="flex gap-6">
                    {/* Sidebar filters (desktop) */}
                    <aside className={cn(
                        "shrink-0 w-64 space-y-6",
                        showFilters ? "block" : "hidden md:block"
                    )}>
                        {/* Sort */}
                        <div>
                            <h3 className="text-overline text-text-muted mb-3">Sort by</h3>
                            <div className="flex flex-col gap-1">
                                {sortOptions.map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setActiveSort(opt)}
                                        className={cn(
                                            "flex items-center gap-2 rounded-radius-sm px-3 py-2 text-sm font-medium transition-colors text-left",
                                            activeSort === opt
                                                ? "bg-primary-50 text-primary-600 dark:bg-primary-50 dark:text-primary-500"
                                                : "text-text-secondary hover:bg-surface-sunken"
                                        )}
                                    >
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stops filter */}
                        <div>
                            <h3 className="text-overline text-text-muted mb-3">Stops</h3>
                            <div className="space-y-2">
                                {["Direct only", "1 stop max", "Any"].map((f) => (
                                    <label key={f} className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-border-emphasis text-primary-500 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                            {f}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Departure time */}
                        <div>
                            <h3 className="text-overline text-text-muted mb-3">Departure time</h3>
                            <div className="space-y-2">
                                {["Morning (6am-12pm)", "Afternoon (12pm-6pm)", "Evening (6pm-12am)"].map((f) => (
                                    <label key={f} className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-border-emphasis text-primary-500 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                            {f}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Bags */}
                        <div>
                            <h3 className="text-overline text-text-muted mb-3">Baggage</h3>
                            <div className="space-y-2">
                                {["Carry-on included", "Checked bag included"].map((f) => (
                                    <label key={f} className="flex items-center gap-2.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-border-emphasis text-primary-500 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                            {f}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Results */}
                    <div className="flex-1 space-y-3">
                        {/* Quick filter pills */}
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
                            {filters.map((f) => (
                                <button
                                    key={f.label}
                                    className={cn(
                                        "whitespace-nowrap rounded-radius-full border px-4 py-1.5 text-sm font-medium transition-colors shrink-0",
                                        f.active
                                            ? "border-primary-500 bg-primary-50 text-primary-600"
                                            : "border-border-default bg-surface text-text-secondary hover:border-border-emphasis"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {mockFlights.map((flight, i) => (
                            <div key={i} className="stagger-item">
                                <FlightCard {...flight} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
