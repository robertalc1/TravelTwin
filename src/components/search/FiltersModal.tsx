"use client";

import { useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";

interface FiltersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
}

interface FilterState {
    sortBy: string;
    numberOfCities: number;
    maxStops: string;
    transport: string;
    placesToAvoid: string;
    travelStyle: string;
    tripType: string;
}

const defaultFilters: FilterState = {
    sortBy: "lowest-price",
    numberOfCities: 1,
    maxStops: "any",
    transport: "any",
    placesToAvoid: "",
    travelStyle: "budget",
    tripType: "single-city",
};

export function FiltersModal({ isOpen, onClose, onApply }: FiltersModalProps) {
    const [filters, setFilters] = useState<FilterState>(defaultFilters);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div
                className="relative w-full max-w-md max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-neutral-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-white z-10 rounded-t-2xl">
                    <h2 className="text-lg font-bold text-text-primary">Filters</h2>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Sort by */}
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-3">Sort by</h3>
                        <div className="flex flex-wrap gap-3">
                            {["Lowest Price", "Least Cities", "Most Cities"].map((opt) => {
                                const val = opt.toLowerCase().replace(" ", "-");
                                return (
                                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="sortBy"
                                            value={val}
                                            checked={filters.sortBy === val}
                                            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                            className="accent-primary-500"
                                        />
                                        <span className="text-sm text-text-secondary">{opt}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="border-b border-neutral-200 mt-5" />
                    </div>

                    {/* Number of cities */}
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-3">Number of cities</h3>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map((n) => (
                                <button
                                    key={n}
                                    onClick={() => setFilters({ ...filters, numberOfCities: n })}
                                    className={`h-10 w-10 rounded-lg border-2 text-sm font-semibold transition-all ${filters.numberOfCities === n
                                            ? "border-secondary-500 bg-secondary-500 text-white"
                                            : "border-neutral-200 text-text-secondary hover:border-neutral-300"
                                        }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <div className="border-b border-neutral-200 mt-5" />
                    </div>

                    {/* Max stops */}
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-3">Max stops</h3>
                        <div className="flex flex-wrap gap-3">
                            {["Any", "Direct", "1 stop", "2 stops"].map((opt) => {
                                const val = opt.toLowerCase().replace(" ", "-");
                                return (
                                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="maxStops"
                                            value={val}
                                            checked={filters.maxStops === val}
                                            onChange={(e) => setFilters({ ...filters, maxStops: e.target.value })}
                                            className="accent-primary-500"
                                        />
                                        <span className="text-sm text-text-secondary">{opt}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="border-b border-neutral-200 mt-5" />
                    </div>

                    {/* Transport */}
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-3">Transport</h3>
                        <div className="flex flex-wrap gap-3">
                            {["Any", "Flight", "Bus", "Train"].map((opt) => {
                                const val = opt.toLowerCase();
                                return (
                                    <label key={val} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="transport"
                                            value={val}
                                            checked={filters.transport === val}
                                            onChange={(e) => setFilters({ ...filters, transport: e.target.value })}
                                            className="accent-primary-500"
                                        />
                                        <span className="text-sm text-text-secondary">{opt}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="border-b border-neutral-200 mt-5" />
                    </div>

                    {/* Places to avoid */}
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-3">Places to avoid</h3>
                        <input
                            type="text"
                            value={filters.placesToAvoid}
                            onChange={(e) => setFilters({ ...filters, placesToAvoid: e.target.value })}
                            placeholder="Places you wish to exclude"
                            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                        <div className="border-b border-neutral-200 mt-5" />
                    </div>

                    {/* Travel style */}
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-3">Your style of traveling</h3>
                        <div className="flex flex-wrap gap-2">
                            {["Budget", "Comfort", "Bus & Train"].map((opt) => {
                                const val = opt.toLowerCase().replace(" & ", "-");
                                return (
                                    <button
                                        key={val}
                                        onClick={() => setFilters({ ...filters, travelStyle: val })}
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${filters.travelStyle === val
                                                ? "border-secondary-500 bg-secondary-50 text-secondary-500"
                                                : "border-neutral-200 text-text-secondary hover:border-neutral-300"
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="border-b border-neutral-200 mt-5" />
                    </div>

                    {/* Trip type */}
                    <div>
                        <h3 className="text-sm font-bold text-text-primary mb-3">Type Of Trip</h3>
                        <div className="flex flex-wrap gap-2">
                            {["Multi City", "Single City"].map((opt) => {
                                const val = opt.toLowerCase().replace(" ", "-");
                                return (
                                    <button
                                        key={val}
                                        onClick={() => setFilters({ ...filters, tripType: val })}
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${filters.tripType === val
                                                ? "border-secondary-500 bg-secondary-50 text-secondary-500"
                                                : "border-neutral-200 text-text-secondary hover:border-neutral-300"
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Apply button */}
                <div className="sticky bottom-0 px-6 py-4 border-t border-neutral-200 bg-white rounded-b-2xl">
                    <button
                        onClick={() => { onApply(filters); onClose(); }}
                        className="w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white hover:bg-primary-600 transition-colors"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
