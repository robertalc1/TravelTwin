'use client';

import { useState } from 'react';
import { Plane, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RouteVisual from './RouteVisual';
import type { TransportLeg } from './types';

interface Props {
  leg: TransportLeg;
  /** First leg cannot be removed */
  isFirst: boolean;
  onChangeFlight: () => void;
  onRemove: () => void;
}

/**
 * Single transport card with border-l accent.
 * Shows: header (Transport label + Change/× buttons) + route visual.
 */
export default function TransportCard({ leg, isFirst, onChangeFlight, onRemove }: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 border-l-[4px] border-l-blue-500 bg-white p-5 dark:border-gray-800 dark:border-l-blue-500 dark:bg-gray-900">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <Plane className="h-3.5 w-3.5 text-blue-500" />
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transport</span>
          {leg.airline && (
            <span className="text-xs text-gray-400 dark:text-gray-500">· {leg.airline}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onChangeFlight}
            className="rounded-full border border-orange-400 px-4 py-1 text-sm text-orange-500 transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            Change
          </button>

          {/* × only on non-first legs */}
          {!isFirst && (
            <button
              type="button"
              aria-label="Remove leg"
              onClick={() => setConfirmRemove(true)}
              className="rounded-full p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Route visual */}
      <RouteVisual leg={leg} />

      {/* Inline confirmation dialog */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden rounded-lg bg-gray-50 p-4 dark:bg-gray-800"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Remove this leg from your itinerary?
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={onRemove}
                className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
