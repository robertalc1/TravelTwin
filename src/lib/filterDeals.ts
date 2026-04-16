import type { EnrichedDeal } from '@/lib/dealEnrichment'
import type { SortBy, MaxStops, Transport, TravelStyle, TripType } from '@/stores/filtersStore'
import { DURATION_RANGES } from '@/stores/filtersStore'

export type FilterParams = {
  activeCategory: string
  sortBy: SortBy | null
  durationGroups: number[]
  maxStops: MaxStops
  transport: Transport
  placesToAvoid: string[]
  travelStyles: TravelStyle[]
  tripType: TripType | null
}

const STOPS_MAX: Record<string, number> = {
  direct: 0,
  '1-stop': 1,
  '2-stops': 2,
}

// Which destination categories each tab requires (OR logic)
const CATEGORY_TAGS: Record<string, string[]> = {
  beach: ['beach'],
  snow: ['snow'],
  'hidden-gems': ['hidden-gem'],
  intercontinental: ['intercontinental'],
  // "multi-city" repurposed: show culturally rich city destinations
  'multi-city': ['culture', 'city', 'food', 'adventure', 'nightlife'],
}

/**
 * Pure function — applies all active filters to a deal array and returns
 * the filtered + sorted result. Zero side effects, safe for useMemo.
 */
export function filterDeals(deals: EnrichedDeal[], f: FilterParams): EnrichedDeal[] {
  let result = [...deals]

  // ── 1. Category tab ───────────────────────────────────────────────────────
  if (f.activeCategory === 'weekend') {
    result = result.filter((d) => d.nights <= 3)
  } else if (f.activeCategory !== 'for-you' && f.activeCategory !== 'trips') {
    const tags = CATEGORY_TAGS[f.activeCategory] ?? [f.activeCategory]
    result = result.filter((d) => tags.some((t) => d.categories.includes(t)))
  }

  // ── 2. Duration groups ────────────────────────────────────────────────────
  if (f.durationGroups.length > 0) {
    result = result.filter((d) =>
      f.durationGroups.some((g) => {
        const [min, max] = DURATION_RANGES[g] ?? [0, 999]
        return d.nights >= min && d.nights <= max
      }),
    )
  }

  // ── 3. Max stops ──────────────────────────────────────────────────────────
  if (f.maxStops !== 'any') {
    const maxN = STOPS_MAX[f.maxStops] ?? 99
    result = result.filter((d) => (d.flight?.stops ?? 0) <= maxN)
  }

  // ── 4. Transport (all current deals are flights) ──────────────────────────
  if (f.transport !== 'any' && f.transport !== 'flight') {
    // bus / train: no results in current data set
    return []
  }

  // ── 5. Places to avoid ────────────────────────────────────────────────────
  if (f.placesToAvoid.length > 0) {
    result = result.filter((d) => {
      const city = d.destination.city.toLowerCase()
      const country = d.destination.country.toLowerCase()
      return !f.placesToAvoid.some(
        (p) => city.includes(p.toLowerCase()) || country.includes(p.toLowerCase()),
      )
    })
  }

  // ── 6. Travel styles (multi-select OR) ───────────────────────────────────
  if (f.travelStyles.length > 0) {
    result = result.filter((d) =>
      f.travelStyles.some((style) => {
        if (style === 'budget')
          return (
            d.destination.budgetLevel === 'budget' ||
            d.categories.includes('budget') ||
            d.totalPrice < 400
          )
        if (style === 'comfort')
          return d.destination.budgetLevel !== 'budget'
        // bus-train: no matches in current data
        return false
      }),
    )
  }

  // ── 7. Trip type ──────────────────────────────────────────────────────────
  if (f.tripType === 'multi-city') {
    result = result.filter((d) => (d.flight?.stops ?? 0) >= 1)
  } else if (f.tripType === 'single-city') {
    result = result.filter((d) => (d.flight?.stops ?? 0) === 0)
  }

  // ── 8. Sort ───────────────────────────────────────────────────────────────
  if (f.sortBy === 'lowest-price') {
    result.sort((a, b) => a.totalPrice - b.totalPrice)
  } else if (f.sortBy === 'least-stops') {
    result.sort((a, b) => (a.flight?.stops ?? 0) - (b.flight?.stops ?? 0))
  } else if (f.sortBy === 'most-stops') {
    result.sort((a, b) => (b.flight?.stops ?? 0) - (a.flight?.stops ?? 0))
  }

  return result
}
