'use client'

import { X } from 'lucide-react'
import { useFiltersStore, DURATION_LABELS } from '@/stores/filtersStore'
import type { TravelStyle } from '@/stores/filtersStore'

const STOPS_LABELS: Record<string, string> = {
  direct: 'Direct flights',
  '1-stop': 'Max 1 stop',
  '2-stops': 'Max 2 stops',
}

const STYLE_LABELS: Record<string, string> = {
  budget: 'Budget',
  comfort: 'Comfort',
  'bus-train': 'Bus & Train',
}

const SORT_LABELS: Record<string, string> = {
  'lowest-price': 'Lowest price',
  'least-stops': 'Fewest stops',
  'most-stops': 'Most stops',
}

export function ActiveFiltersChips() {
  const store = useFiltersStore()

  type Chip = { key: string; label: string; onRemove: () => void }
  const chips: Chip[] = []

  if (store.sortBy) {
    chips.push({
      key: `sort-${store.sortBy}`,
      label: SORT_LABELS[store.sortBy] ?? store.sortBy,
      onRemove: () => store.applyFilters({ ...getFilterData(), sortBy: null }),
    })
  }

  store.durationGroups.forEach((g) => {
    chips.push({
      key: `dur-${g}`,
      label: DURATION_LABELS[g] ?? `${g} nights`,
      onRemove: () =>
        store.applyFilters({
          ...getFilterData(),
          durationGroups: store.durationGroups.filter((x) => x !== g),
        }),
    })
  })

  if (store.maxStops !== 'any') {
    chips.push({
      key: `stops-${store.maxStops}`,
      label: STOPS_LABELS[store.maxStops] ?? store.maxStops,
      onRemove: () => store.applyFilters({ ...getFilterData(), maxStops: 'any' }),
    })
  }

  if (store.transport !== 'any') {
    chips.push({
      key: `transport-${store.transport}`,
      label: store.transport.charAt(0).toUpperCase() + store.transport.slice(1),
      onRemove: () => store.applyFilters({ ...getFilterData(), transport: 'any' }),
    })
  }

  store.placesToAvoid.forEach((p) => {
    chips.push({
      key: `avoid-${p}`,
      label: `Not ${p}`,
      onRemove: () =>
        store.applyFilters({
          ...getFilterData(),
          placesToAvoid: store.placesToAvoid.filter((x) => x !== p),
        }),
    })
  })

  store.travelStyles.forEach((s) => {
    chips.push({
      key: `style-${s}`,
      label: STYLE_LABELS[s] ?? s,
      onRemove: () =>
        store.applyFilters({
          ...getFilterData(),
          travelStyles: store.travelStyles.filter((x) => x !== (s as TravelStyle)),
        }),
    })
  })

  if (store.tripType) {
    chips.push({
      key: `type-${store.tripType}`,
      label: store.tripType === 'multi-city' ? 'Multi city' : 'Single city',
      onRemove: () => store.applyFilters({ ...getFilterData(), tripType: null }),
    })
  }

  // Snapshot of current filter data — used to build partial patches above
  function getFilterData() {
    return {
      sortBy: store.sortBy,
      durationGroups: store.durationGroups,
      maxStops: store.maxStops,
      transport: store.transport,
      placesToAvoid: store.placesToAvoid,
      travelStyles: store.travelStyles,
      tripType: store.tripType,
    }
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-5" role="list" aria-label="Active filters">
      {chips.map(({ key, label, onRemove }) => (
        <span
          key={key}
          role="listitem"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 dark:border-primary-800/60 dark:bg-primary-900/20 px-3 py-1 text-sm font-medium text-primary-700 dark:text-primary-300"
        >
          {label}
          <button
            onClick={onRemove}
            aria-label={`Remove ${label} filter`}
            className="flex items-center justify-center rounded-full p-0.5 hover:bg-primary-100 dark:hover:bg-primary-800/50 transition-colors"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  )
}
