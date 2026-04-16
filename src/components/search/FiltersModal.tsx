'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useFiltersStore } from '@/stores/filtersStore'
import {
  DURATION_LABELS,
  type SortBy,
  type MaxStops,
  type Transport,
  type TravelStyle,
  type TripType,
  type FilterData,
} from '@/stores/filtersStore'

// ── Reusable radio option ─────────────────────────────────────────────────────
function RadioOption<T extends string>({
  name,
  value,
  checked,
  label,
  onChange,
}: {
  name: string
  value: T
  checked: boolean
  label: string
  onChange: (v: T) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group select-none">
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          checked
            ? 'border-primary-500 bg-primary-500'
            : 'border-neutral-300 dark:border-neutral-600 group-hover:border-primary-400'
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        className={`text-sm transition-colors ${
          checked
            ? 'font-medium text-primary-600 dark:text-primary-400'
            : 'text-text-secondary dark:text-neutral-400'
        }`}
      >
        {label}
      </span>
    </label>
  )
}

// ── Pill toggle button ────────────────────────────────────────────────────────
function PillButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
        active
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
          : 'border-neutral-200 dark:border-neutral-700 text-text-secondary dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
      }`}
    >
      {label}
    </button>
  )
}

// ── Section divider ───────────────────────────────────────────────────────────
function Divider() {
  return <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
}

// ── Modal props ───────────────────────────────────────────────────────────────
type Props = {
  isOpen: boolean
  onClose: () => void
  onApply?: () => void
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

export function FiltersModal({ isOpen, onClose, onApply }: Props) {
  const store = useFiltersStore()
  const [local, setLocal] = useState<FilterData>(DATA_DEFAULTS)
  const [avoidInput, setAvoidInput] = useState('')
  const avoidInputRef = useRef<HTMLInputElement>(null)

  // Sync from store on open
  useEffect(() => {
    if (!isOpen) return
    setLocal({
      sortBy: store.sortBy,
      durationGroups: [...store.durationGroups],
      maxStops: store.maxStops,
      transport: store.transport,
      placesToAvoid: [...store.placesToAvoid],
      travelStyles: [...store.travelStyles],
      tripType: store.tripType,
    })
    setAvoidInput('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Escape closes the modal
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleSearch = useCallback(() => {
    store.applyFilters(local)
    onApply?.()
    onClose()
  }, [local, store, onApply, onClose])

  const handleReset = useCallback(() => {
    setLocal(DATA_DEFAULTS)
    setAvoidInput('')
  }, [])

  const addAvoidChip = useCallback(() => {
    const val = avoidInput.trim()
    if (val && !local.placesToAvoid.includes(val)) {
      setLocal((l) => ({ ...l, placesToAvoid: [...l.placesToAvoid, val] }))
    }
    setAvoidInput('')
    avoidInputRef.current?.focus()
  }, [avoidInput, local.placesToAvoid])

  const toggleDuration = (n: number) =>
    setLocal((l) => ({
      ...l,
      durationGroups: l.durationGroups.includes(n)
        ? l.durationGroups.filter((x) => x !== n)
        : [...l.durationGroups, n],
    }))

  const toggleStyle = (s: TravelStyle) =>
    setLocal((l) => ({
      ...l,
      travelStyles: l.travelStyles.includes(s)
        ? l.travelStyles.filter((x) => x !== s)
        : [...l.travelStyles, s],
    }))

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal panel — bottom-sheet on mobile, centered on desktop */}
          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Trip filters"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-[101] flex justify-center md:inset-0 md:items-center md:bottom-auto pointer-events-none"
          >
            <div
              className="pointer-events-auto relative w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-t-2xl md:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 mx-0 md:mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-t-2xl">
                <div className="w-8" />
                <h2 className="text-lg font-bold text-text-primary dark:text-white">Filters</h2>
                <button
                  onClick={onClose}
                  aria-label="Close filters"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-text-secondary dark:text-neutral-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── Sections ───────────────────────────────────────────── */}
              <div className="p-6 space-y-6">

                {/* Sort by */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-text-primary dark:text-white">Sort by</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {(
                      [
                        ['lowest-price', 'Lowest Price'],
                        ['least-stops', 'Fewest Stops'],
                        ['most-stops', 'Most Stops'],
                      ] as [SortBy, string][]
                    ).map(([val, label]) => (
                      <RadioOption
                        key={val}
                        name="sortBy"
                        value={val}
                        checked={local.sortBy === val}
                        label={label}
                        onChange={(v) => setLocal((l) => ({ ...l, sortBy: v }))}
                      />
                    ))}
                  </div>
                  <Divider />
                </section>

                {/* Trip duration */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-text-primary dark:text-white">Trip duration</h3>
                  <div className="flex flex-wrap gap-3">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleDuration(n)}
                        aria-pressed={local.durationGroups.includes(n)}
                        className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all ${
                          local.durationGroups.includes(n)
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                            : 'border-neutral-200 dark:border-neutral-700 text-text-secondary dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500'
                        }`}
                      >
                        {DURATION_LABELS[n]}
                      </button>
                    ))}
                  </div>
                  <Divider />
                </section>

                {/* Max stops */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-text-primary dark:text-white">Max stops</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {(
                      [
                        ['any', 'Any'],
                        ['direct', 'Direct'],
                        ['1-stop', '1 stop'],
                        ['2-stops', '2 stops'],
                      ] as [MaxStops, string][]
                    ).map(([val, label]) => (
                      <RadioOption
                        key={val}
                        name="maxStops"
                        value={val}
                        checked={local.maxStops === val}
                        label={label}
                        onChange={(v) => setLocal((l) => ({ ...l, maxStops: v }))}
                      />
                    ))}
                  </div>
                  <Divider />
                </section>

                {/* Transport */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-text-primary dark:text-white">Transport</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {(
                      [
                        ['any', 'Any'],
                        ['flight', 'Flight'],
                        ['bus', 'Bus'],
                        ['train', 'Train'],
                      ] as [Transport, string][]
                    ).map(([val, label]) => (
                      <RadioOption
                        key={val}
                        name="transport"
                        value={val}
                        checked={local.transport === val}
                        label={label}
                        onChange={(v) => setLocal((l) => ({ ...l, transport: v }))}
                      />
                    ))}
                  </div>
                  <Divider />
                </section>

                {/* Places to avoid */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-text-primary dark:text-white">
                    Places to avoid
                  </h3>

                  {local.placesToAvoid.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {local.placesToAvoid.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm text-text-secondary dark:text-neutral-300"
                        >
                          {p}
                          <button
                            type="button"
                            onClick={() =>
                              setLocal((l) => ({
                                ...l,
                                placesToAvoid: l.placesToAvoid.filter((x) => x !== p),
                              }))
                            }
                            aria-label={`Remove ${p}`}
                            className="transition-colors hover:text-red-500"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      ref={avoidInputRef}
                      type="text"
                      value={avoidInput}
                      onChange={(e) => setAvoidInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addAvoidChip()
                        }
                      }}
                      placeholder="City or country, then press Enter"
                      className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm placeholder:text-text-muted dark:placeholder:text-neutral-500 text-text-primary dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={addAvoidChip}
                      className="flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm font-medium text-text-secondary dark:text-neutral-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <Divider />
                </section>

                {/* Travel style */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-text-primary dark:text-white">
                    Your style of traveling
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['budget', 'Budget'],
                        ['comfort', 'Comfort'],
                        ['bus-train', 'Bus & Train'],
                      ] as [TravelStyle, string][]
                    ).map(([val, label]) => (
                      <PillButton
                        key={val}
                        active={local.travelStyles.includes(val)}
                        label={label}
                        onClick={() => toggleStyle(val)}
                      />
                    ))}
                  </div>
                  <Divider />
                </section>

                {/* Trip type */}
                <section>
                  <h3 className="mb-3 text-sm font-bold text-text-primary dark:text-white">
                    Type of trip
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['multi-city', 'Multi City'],
                        ['single-city', 'Single City'],
                      ] as [TripType, string][]
                    ).map(([val, label]) => (
                      <PillButton
                        key={val}
                        active={local.tripType === val}
                        label={label}
                        onClick={() =>
                          setLocal((l) => ({
                            ...l,
                            tripType: l.tripType === val ? null : val,
                          }))
                        }
                      />
                    ))}
                  </div>
                </section>
              </div>

              {/* ── Footer ─────────────────────────────────────────────── */}
              <div className="sticky bottom-0 z-10 flex items-center justify-between rounded-b-2xl border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm font-medium text-text-secondary dark:text-neutral-400 hover:text-text-primary dark:hover:text-white transition-colors"
                >
                  Reset all
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="rounded-xl bg-primary-500 px-8 py-2.5 text-sm font-bold text-white hover:bg-primary-600 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
