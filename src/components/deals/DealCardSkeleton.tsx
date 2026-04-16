'use client'

import { motion } from 'framer-motion'

type Props = {
  delay?: number
}

export function DealCardSkeleton({ delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay }}
      className="shimmer-card rounded-2xl overflow-hidden border border-neutral-200 dark:border-border-default bg-white dark:bg-surface"
    >
      {/* Image placeholder */}
      <div className="h-44 bg-neutral-200 dark:bg-neutral-800" />

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-full w-3/4" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full w-1/2" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full w-2/3" />

        <div className="flex items-end justify-between pt-2">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-20" />
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full w-24" />
        </div>
      </div>
    </motion.div>
  )
}
