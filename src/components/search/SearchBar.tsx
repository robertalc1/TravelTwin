"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Search, Calendar, Users, X } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/LocationAutocomplete";

const regionCards = [
    { id: "anywhere", label: "Anywhere", emoji: "🌍" },
    { id: "europe", label: "Europe", emoji: "🇪🇺" },
    { id: "greece", label: "Greece", emoji: "🇬🇷" },
    { id: "spain", label: "Spain", emoji: "🇪🇸" },
    { id: "turkey", label: "Turkey", emoji: "🇹🇷" },
    { id: "italy", label: "Italy", emoji: "🇮🇹" },
];

interface SearchBarProps {
    onSearch: (params: {
        originIata: string;
        originDisplay: string;
        destinationIata: string;
        destinationDisplay: string;
        departureDate: string;
        returnDate: string;
        adults: number;
        children: number;
    }) => void;
    loading?: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
    const [showWhereDropdown, setShowWhereDropdown] = useState(false);
    const [showWhenDropdown, setShowWhenDropdown] = useState(false);
    const [showTravelersDropdown, setShowTravelersDropdown] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const [originIata, setOriginIata] = useState("");
    const [originDisplay, setOriginDisplay] = useState("");
    const [destinationIata, setDestinationIata] = useState("");
    const [destinationDisplay, setDestinationDisplay] = useState("");
    const [selectedRegion, setSelectedRegion] = useState("anywhere");

    const [departureDate, setDepartureDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);

    const whereRef = useRef<HTMLDivElement>(null);
    const whenRef = useRef<HTMLDivElement>(null);
    const travelersRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (whereRef.current && !whereRef.current.contains(e.target as Node)) setShowWhereDropdown(false);
            if (whenRef.current && !whenRef.current.contains(e.target as Node)) setShowWhenDropdown(false);
            if (travelersRef.current && !travelersRef.current.contains(e.target as Node)) setShowTravelersDropdown(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const totalTravelers = adults + children;
    const whereLabel = originDisplay && destinationDisplay
        ? `${originDisplay} – ${destinationDisplay}`
        : originDisplay
            ? `${originDisplay} – Anywhere`
            : "Where to?";

    const whenLabel = departureDate && returnDate
        ? `${new Date(departureDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(returnDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : "Anytime";

    function handleSearch() {
        const depDate = departureDate || getDateOffset(7);
        const retDate = returnDate || getDateOffset(14);
        onSearch({
            originIata,
            originDisplay,
            destinationIata,
            destinationDisplay,
            departureDate: depDate,
            returnDate: retDate,
            adults,
            children,
        });
        setMobileSearchOpen(false);
    }

    function getDateOffset(days: number): string {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
    }

    function handleRegionSelect(regionId: string) {
        setSelectedRegion(regionId);
        const regionMap: Record<string, { iata: string; display: string }> = {
            europe: { iata: "LON", display: "Europe" },
            greece: { iata: "ATH", display: "Athens, Greece" },
            spain: { iata: "MAD", display: "Madrid, Spain" },
            turkey: { iata: "IST", display: "Istanbul, Turkey" },
            italy: { iata: "ROM", display: "Rome, Italy" },
        };
        if (regionId === "anywhere") {
            setDestinationIata("");
            setDestinationDisplay("");
        } else {
            const region = regionMap[regionId];
            if (region) {
                setDestinationIata(region.iata);
                setDestinationDisplay(region.display);
            }
        }
    }

    // ─── MOBILE: Full-screen search overlay ───
    if (isMobile) {
        return (
            <>
                {/* Compact search trigger */}
                <button
                    onClick={() => setMobileSearchOpen(true)}
                    className="w-full max-w-md mx-auto flex items-center gap-3 rounded-full bg-white shadow-xl border border-neutral-200 px-5 py-3.5 text-left"
                >
                    <Search className="h-5 w-5 text-primary-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary truncate">
                            {whereLabel === "Where to?" ? "Where to?" : whereLabel}
                        </p>
                        <p className="text-xs text-text-muted">{whenLabel} · {totalTravelers} traveler{totalTravelers !== 1 ? "s" : ""}</p>
                    </div>
                </button>

                {/* Full screen overlay */}
                {mobileSearchOpen && (
                    <div className="fixed inset-0 z-[9999] bg-white dark:bg-surface flex flex-col overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-border-default">
                            <h2 className="text-lg font-bold text-text-primary">Search Trips</h2>
                            <button
                                onClick={() => setMobileSearchOpen(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-surface-elevated"
                            >
                                <X className="h-5 w-5 text-text-secondary" />
                            </button>
                        </div>

                        <div className="flex-1 p-4 space-y-6">
                            {/* Origin */}
                            <div>
                                <label className="text-sm font-bold text-text-primary mb-2 block">Departing from</label>
                                <LocationAutocomplete
                                    value={originIata}
                                    displayValue={originDisplay}
                                    onSelect={(code, display) => { setOriginIata(code); setOriginDisplay(display); }}
                                    placeholder="Constanța, Romania"
                                    icon="origin"
                                />
                            </div>

                            {/* Destination */}
                            <div>
                                <label className="text-sm font-bold text-text-primary mb-2 block">Where do you want to go?</label>
                                <LocationAutocomplete
                                    value={destinationIata}
                                    displayValue={destinationDisplay}
                                    onSelect={(code, display) => { setDestinationIata(code); setDestinationDisplay(display); }}
                                    placeholder="Search location"
                                    icon="destination"
                                />
                            </div>

                            {/* Region cards */}
                            <div className="grid grid-cols-3 gap-2">
                                {regionCards.map((region) => (
                                    <button
                                        key={region.id}
                                        onClick={() => handleRegionSelect(region.id)}
                                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${selectedRegion === region.id
                                            ? "border-primary-500 bg-primary-50"
                                            : "border-neutral-200 bg-white dark:bg-surface-elevated dark:border-border-default"
                                            }`}
                                    >
                                        <span className="text-xl">{region.emoji}</span>
                                        <span className="text-xs font-medium text-text-primary">{region.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary mb-1 block">Departure</label>
                                    <input
                                        type="date"
                                        value={departureDate}
                                        min={new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setDepartureDate(e.target.value)}
                                        className="w-full rounded-lg border border-neutral-200 dark:border-border-default dark:bg-surface-sunken dark:text-text-primary px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary mb-1 block">Return</label>
                                    <input
                                        type="date"
                                        value={returnDate}
                                        min={departureDate || new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setReturnDate(e.target.value)}
                                        className="w-full rounded-lg border border-neutral-200 dark:border-border-default dark:bg-surface-sunken dark:text-text-primary px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                    />
                                </div>
                            </div>

                            {/* Travelers */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">Adults</p>
                                        <p className="text-xs text-text-muted">Age 18+</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setAdults(Math.max(1, adults - 1))}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-text-secondary"
                                        >−</button>
                                        <span className="text-sm font-bold w-4 text-center">{adults}</span>
                                        <button
                                            onClick={() => setAdults(Math.min(9, adults + 1))}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-text-secondary"
                                        >+</button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">Children</p>
                                        <p className="text-xs text-text-muted">Age 0-17</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setChildren(Math.max(0, children - 1))}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-text-secondary"
                                        >−</button>
                                        <span className="text-sm font-bold w-4 text-center">{children}</span>
                                        <button
                                            onClick={() => setChildren(Math.min(9, children + 1))}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-text-secondary"
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom search button */}
                        <div className="p-4 border-t border-neutral-200 dark:border-border-default">
                            <button
                                onClick={handleSearch}
                                disabled={loading || !originIata}
                                className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
                            >
                                <Search className="h-4 w-4" />
                                Search
                            </button>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // ─── DESKTOP: Original pill bar ───
    return (
        <div className="relative mx-auto max-w-4xl">
            {/* Main bar */}
            <div className="flex items-stretch rounded-full bg-white shadow-xl border border-neutral-200 overflow-visible">
                {/* Where to */}
                <div ref={whereRef} className="relative flex-1 min-w-0">
                    <button
                        onClick={() => { setShowWhereDropdown(!showWhereDropdown); setShowWhenDropdown(false); setShowTravelersDropdown(false); }}
                        className="flex items-center gap-2 w-full px-5 py-4 text-left hover:bg-neutral-50 transition-colors rounded-l-full"
                    >
                        <MapPin className="h-4 w-4 text-primary-500 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-primary-500">Where to?</p>
                            <p className="text-sm font-medium text-text-primary truncate">{whereLabel}</p>
                        </div>
                    </button>

                    {/* Where dropdown */}
                    {showWhereDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-[560px] bg-white dark:bg-surface-elevated rounded-2xl shadow-2xl border border-neutral-200 dark:border-border-default p-6 z-[100] animate-fade-in">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Departing from */}
                                <div>
                                    <h3 className="text-sm font-bold text-text-primary mb-3">Departing from:</h3>
                                    <LocationAutocomplete
                                        value={originIata}
                                        displayValue={originDisplay}
                                        onSelect={(code, display) => { setOriginIata(code); setOriginDisplay(display); }}
                                        placeholder="Constanța, Romania"
                                        icon="origin"
                                    />
                                </div>
                                {/* Where do you want to go */}
                                <div>
                                    <h3 className="text-sm font-bold text-text-primary mb-3">Where do you want to go?</h3>
                                    <LocationAutocomplete
                                        value={destinationIata}
                                        displayValue={destinationDisplay}
                                        onSelect={(code, display) => { setDestinationIata(code); setDestinationDisplay(display); }}
                                        placeholder="Search location"
                                        icon="destination"
                                    />
                                </div>
                            </div>

                            {/* Region cards */}
                            <div className="grid grid-cols-3 gap-3 mt-5">
                                {regionCards.map((region) => (
                                    <button
                                        key={region.id}
                                        onClick={() => handleRegionSelect(region.id)}
                                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 hover:scale-[1.02] ${selectedRegion === region.id
                                            ? "border-primary-500 bg-primary-50"
                                            : "border-neutral-200 hover:border-primary-300 bg-white dark:bg-surface dark:border-border-default"
                                            }`}
                                    >
                                        <span className="text-2xl">{region.emoji}</span>
                                        <span className="text-xs font-medium text-text-primary">{region.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-px bg-neutral-200 my-3" />

                {/* When */}
                <div ref={whenRef} className="relative">
                    <button
                        onClick={() => { setShowWhenDropdown(!showWhenDropdown); setShowWhereDropdown(false); setShowTravelersDropdown(false); }}
                        className="flex items-center gap-2 px-5 py-4 hover:bg-neutral-50 transition-colors whitespace-nowrap"
                    >
                        <Calendar className="h-4 w-4 text-text-muted shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-text-secondary">When?</p>
                            <p className="text-sm font-medium text-text-primary">{whenLabel}</p>
                        </div>
                    </button>

                    {showWhenDropdown && (
                        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-surface-elevated rounded-2xl shadow-2xl border border-neutral-200 dark:border-border-default p-5 z-[100] animate-fade-in min-w-[300px]">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary mb-1 block">Departure</label>
                                    <input
                                        type="date"
                                        value={departureDate}
                                        min={new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setDepartureDate(e.target.value)}
                                        className="w-full rounded-lg border border-neutral-200 dark:border-border-default dark:bg-surface-sunken dark:text-text-primary px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-secondary mb-1 block">Return</label>
                                    <input
                                        type="date"
                                        value={returnDate}
                                        min={departureDate || new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setReturnDate(e.target.value)}
                                        className="w-full rounded-lg border border-neutral-200 dark:border-border-default dark:bg-surface-sunken dark:text-text-primary px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowWhenDropdown(false)}
                                    className="w-full rounded-lg bg-primary-500 text-white py-2 text-sm font-semibold hover:bg-primary-600 transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-px bg-neutral-200 my-3" />

                {/* Travelers */}
                <div ref={travelersRef} className="relative">
                    <button
                        onClick={() => { setShowTravelersDropdown(!showTravelersDropdown); setShowWhereDropdown(false); setShowWhenDropdown(false); }}
                        className="flex items-center gap-2 px-5 py-4 hover:bg-neutral-50 transition-colors whitespace-nowrap"
                    >
                        <Users className="h-4 w-4 text-text-muted shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-text-secondary">Travelers</p>
                            <p className="text-sm font-medium text-text-primary">{totalTravelers} traveller{totalTravelers !== 1 ? "s" : ""}</p>
                        </div>
                    </button>

                    {showTravelersDropdown && (
                        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-surface-elevated rounded-2xl shadow-2xl border border-neutral-200 dark:border-border-default p-5 z-[100] animate-fade-in min-w-[250px]">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">Adults</p>
                                        <p className="text-xs text-text-muted">Age 18+</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setAdults(Math.max(1, adults - 1))}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                                        >−</button>
                                        <span className="text-sm font-bold w-4 text-center">{adults}</span>
                                        <button
                                            onClick={() => setAdults(Math.min(9, adults + 1))}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                                        >+</button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-text-primary">Children</p>
                                        <p className="text-xs text-text-muted">Age 0-17</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setChildren(Math.max(0, children - 1))}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                                        >−</button>
                                        <span className="text-sm font-bold w-4 text-center">{children}</span>
                                        <button
                                            onClick={() => setChildren(Math.min(9, children + 1))}
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-text-secondary hover:border-primary-500 hover:text-primary-500 transition-colors"
                                        >+</button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTravelersDropdown(false)}
                                    className="w-full rounded-lg bg-primary-500 text-white py-2 text-sm font-semibold hover:bg-primary-600 transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search button */}
                <button
                    onClick={handleSearch}
                    disabled={loading || !originIata}
                    className="flex items-center gap-2 bg-primary-500 text-white px-6 py-4 font-semibold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-r-full"
                >
                    <Search className="h-4 w-4" />
                    Search
                </button>
            </div>
        </div>
    );
}
