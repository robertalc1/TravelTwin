'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useSearchMessages } from '@/hooks/useSearchMessages'

type Props = {
  isLoading: boolean
  progress: number
  city: string
  resultsCount?: number
}

export function SearchProgressHeader({ isLoading, progress, city, resultsCount }: Props) {
  const message = useSearchMessages(isLoading)

  return (
    <div className="mb-6">
      <h2 className="text-h2 text-secondary-500">
        Cheapest deals from {city}
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
            {/* Animated subtitle */}
            <div className="flex items-center gap-1.5 mt-2 text-body-sm text-text-secondary">
              <AnimatePresence mode="wait">
                <motion.span
                  key={message}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                >
                  {message}...
                </motion.span>
              </AnimatePresence>
              <Sparkles className="size-3.5 text-primary-500 animate-pulse flex-shrink-0" />
            </div>

            {/* Progress bar */}
            <div
              className="mt-4 w-full h-1.5 bg-primary-100 dark:bg-primary-900/20 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Searching for deals"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>

            {/* Percent label */}
            <div className="mt-1.5 text-right text-caption text-text-muted tabular-nums">
              Searching... {progress}%
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
            {resultsCount} ready-to-book package{resultsCount !== 1 ? 's' : ''}, sorted by price & variety
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
