'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useLocale } from 'next-intl'

type Props = {
  isLoading: boolean
  progress: number
  city: string
  resultsCount?: number
  totalCount?: number
}

export function SearchProgressHeader({ isLoading, progress, city, resultsCount, totalCount }: Props) {
  const locale = useLocale()
  const isRo = locale === 'ro'

  return (
    <div className="mb-6">
      <h2 className="text-h2 text-secondary-500">
        {isRo ? `Cele mai ieftine oferte din ${city}` : `Cheapest deals from ${city}`}
      </h2>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading-meta"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Neutral subtitle + big percent (no API name surfaced) */}
            <div className="mt-2 flex items-baseline justify-between text-body-sm">
              <span className="text-text-secondary">
                {isRo ? 'Se încarcă cele mai noi oferte pentru tine...' : 'Loading the latest deals for you...'}
              </span>
              <span className="text-base font-bold text-primary-500 tabular-nums">
                {progress}%
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="mt-2 w-full h-1.5 bg-primary-100 dark:bg-primary-900/20 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={isRo ? 'Caut oferte' : 'Searching for deals'}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ) : resultsCount !== undefined && resultsCount > 0 ? (
          <motion.p
            key="results-count"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-body-sm text-text-secondary mt-1"
          >
            {totalCount !== undefined && totalCount > (resultsCount ?? 0)
              ? (isRo
                  ? `Afișez ${resultsCount} din ${totalCount} oferte`
                  : `Showing ${resultsCount} of ${totalCount} deals`)
              : (isRo
                  ? `${resultsCount} ${resultsCount === 1 ? 'pachet gata de rezervat' : 'pachete gata de rezervat'}, sortate după preț și varietate`
                  : `${resultsCount} ready-to-book package${resultsCount !== 1 ? 's' : ''}, sorted by price & variety`)}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
