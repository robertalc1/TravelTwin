'use client'

import { create } from 'zustand'

export type SortBy = 'lowest-price' | 'least-stops' | 'most-stops'
export type MaxStops = 'any' | 'direct' | '1-stop' | '2-stops'
export type Transport = 'any' | 'flight' | 'bus' | 'train'
export type TravelStyle = 'budget' | 'comfort' | 'bus-train'
export type TripType = 'multi-city' | 'single-city'

// Duration groups mapped to night ranges
export const DURATION_RANGES: Record<number, [number, number]> = {
  1: [1, 3],
  2: [4, 6],
  3: [7, 10],
  4: [11, 999],
}

export const DURATION_LABELS: Record<number, string> = {
  1: '1–3 nights',
  2: '4–6 nights',
  3: '7–10 nights',
  4: '11+ nights',
}

export type FilterData = {
  sortBy: SortBy | null
  durationGroups: number[]
  maxStops: MaxStops
  transport: Transport
  placesToAvoid: string[]
  travelStyles: TravelStyle[]
  tripType: TripType | null
}

type FiltersState = FilterData & {
  activeCategory: string

  setActiveCategory: (cat: string) => void
  applyFilters: (data: FilterData) => void
  resetFilters: () => void
  getActiveFiltersCount: () => number
}

const DATA_DEFAULTS: FilterData = {
  sortBy: null,
  durationGroups: [],
  maxStops: 'any',
  transport: 'any',
  placesToAvoid: [],
  travelStyles: [],
  tripType: null,
}

export const useFiltersStore = create<FiltersState>((set, get) => ({
  activeCategory: 'for-you',
  ...DATA_DEFAULTS,

  setActiveCategory: (cat) => set({ activeCategory: cat }),

  applyFilters: (data) => set(data),

  // Resets all filter fields but preserves the active category tab
  resetFilters: () =>
    set({ ...DATA_DEFAULTS, activeCategory: get().activeCategory }),

  getActiveFiltersCount: () => {
    const s = get()
    return [
      s.sortBy !== null,
      s.durationGroups.length > 0,
      s.maxStops !== 'any',
      s.transport !== 'any',
      s.placesToAvoid.length > 0,
      s.travelStyles.length > 0,
      s.tripType !== null,
    ].filter(Boolean).length
  },
}))
