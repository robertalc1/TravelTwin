'use client';

/* ── Zustand Search Store ── */

import { create } from 'zustand';
import type { Location, ItineraryResult, FilterOptions } from '@/types/itinerary';

interface SearchState {
    // Search params
    origin: Location | null;
    destination: Location | null;
    departureDate: string | null;
    returnDate: string | null;
    adults: number;
    children: number;
    budget: number;
    currency: string;
    preferences: string[];

    // Results
    results: ItineraryResult | null;
    loading: boolean;
    error: string | null;

    // Filters
    activeTab: string;
    filters: Partial<FilterOptions>;

    // Actions
    setOrigin: (location: Location | null) => void;
    setDestination: (location: Location | null) => void;
    setDepartureDate: (date: string | null) => void;
    setReturnDate: (date: string | null) => void;
    setAdults: (count: number) => void;
    setChildren: (count: number) => void;
    setBudget: (amount: number) => void;
    setCurrency: (currency: string) => void;
    setPreferences: (prefs: string[]) => void;
    setActiveTab: (tab: string) => void;
    setFilters: (filters: Partial<FilterOptions>) => void;
    setResults: (results: ItineraryResult | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    searchItineraries: () => Promise<void>;
    reset: () => void;
}

const initialState = {
    origin: null,
    destination: null,
    departureDate: null,
    returnDate: null,
    adults: 2,
    children: 0,
    budget: 1500,
    currency: 'EUR',
    preferences: [],
    results: null,
    loading: false,
    error: null,
    activeTab: 'for-you',
    filters: {},
};

export const useSearchStore = create<SearchState>((set, get) => ({
    ...initialState,

    setOrigin: (location) => set({ origin: location }),
    setDestination: (location) => set({ destination: location }),
    setDepartureDate: (date) => set({ departureDate: date }),
    setReturnDate: (date) => set({ returnDate: date }),
    setAdults: (count) => set({ adults: Math.max(1, count) }),
    setChildren: (count) => set({ children: Math.max(0, count) }),
    setBudget: (amount) => set({ budget: amount }),
    setCurrency: (currency) => set({ currency }),
    setPreferences: (prefs) => set({ preferences: prefs }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setFilters: (filters) => set({ filters }),
    setResults: (results) => set({ results }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    searchItineraries: async () => {
        const state = get();
        if (!state.origin || !state.destination || !state.departureDate || !state.returnDate) {
            set({ error: 'Please fill in all required fields.' });
            return;
        }

        set({ loading: true, error: null, results: null });

        try {
            const res = await fetch('/api/itinerary/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin: state.origin.iataCode,
                    destination: state.destination.iataCode,
                    departureDate: state.departureDate,
                    returnDate: state.returnDate,
                    adults: state.adults,
                    children: state.children,
                    budget: state.budget,
                    currency: state.currency,
                    preferences: state.preferences,
                }),
            });

            const data = await res.json();

            if (data.error) {
                set({ error: data.error, loading: false });
                return;
            }

            set({
                results: {
                    packages: data.packages || [],
                    totalOptions: data.totalOptions || 0,
                    searchParams: data.searchParams || state,
                    timestamp: new Date().toISOString(),
                },
                loading: false,
            });
        } catch {
            set({ error: 'Search failed. Please try again.', loading: false });
        }
    },

    reset: () => set(initialState),
}));
