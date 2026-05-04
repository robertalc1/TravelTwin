'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Hotel, Car, ChevronDown, ChevronUp, X, Shield } from 'lucide-react';
import { useTripPricing } from '@/stores/tripPricingStore';
import { useCurrencyStore } from '@/stores/currencyStore';

interface PriceBreakdownProps {
  onBook?: () => void;
  showBookButton?: boolean;
  nights?: number;
}

export default function PriceBreakdown({
  onBook,
  showBookButton = true,
  nights,
}: PriceBreakdownProps) {
  const [expanded, setExpanded] = useState(true);
  const breakdown = useTripPricing((s) => s.breakdown);
  const selectedHotel = useTripPricing((s) => s.selectedHotel);
  const selectedTransfer = useTripPricing((s) => s.selectedTransfer);
  const removeHotel = useTripPricing((s) => s.removeHotel);
  const removeTransfer = useTripPricing((s) => s.removeTransfer);
  const formatCurrency = useCurrencyStore((s) => s.format);
  const src = breakdown.currency || 'EUR';
  const total = breakdown.flightPrice + breakdown.hotelPrice + breakdown.transferPrice;

  return (
    <div className="bg-white dark:bg-surface rounded-2xl border border-neutral-200 dark:border-border-default overflow-hidden shadow-md">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide">Total Price</p>
          <motion.p
            key={total}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            className="text-3xl font-extrabold text-primary-500"
          >
            {formatCurrency(total, src)}
          </motion.p>
          <p className="text-xs text-text-muted mt-0.5">
            {nights ? `${nights} nights · ` : ''}per person · all included
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-text-muted" />
        ) : (
          <ChevronDown className="h-5 w-5 text-text-muted" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-neutral-100 dark:border-border-default overflow-hidden"
          >
            <div className="p-5 space-y-3">
              {/* Flight */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Plane className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-sm text-text-secondary">Flight</span>
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  {breakdown.flightPrice > 0
                    ? formatCurrency(breakdown.flightPrice, src)
                    : '—'}
                </span>
              </div>

              {/* Hotel */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedHotel
                        ? 'bg-orange-50 dark:bg-orange-900/20'
                        : 'bg-neutral-100 dark:bg-surface-elevated'
                    }`}
                  >
                    <Hotel
                      className={`h-4 w-4 ${
                        selectedHotel ? 'text-primary-500' : 'text-text-muted'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm text-text-secondary block">Hotel</span>
                    {selectedHotel ? (
                      <p className="text-xs text-text-muted truncate max-w-[150px]">
                        {selectedHotel.hotel.name}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted">Not selected</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-sm font-semibold ${
                      selectedHotel ? 'text-text-primary' : 'text-text-muted'
                    }`}
                  >
                    {breakdown.hotelPrice > 0
                      ? formatCurrency(breakdown.hotelPrice, src)
                      : '+ Add'}
                  </span>
                  {selectedHotel && (
                    <button
                      type="button"
                      onClick={removeHotel}
                      aria-label="Remove hotel"
                      className="p-1 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Transfer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedTransfer
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-neutral-100 dark:bg-surface-elevated'
                    }`}
                  >
                    <Car
                      className={`h-4 w-4 ${
                        selectedTransfer ? 'text-green-500' : 'text-text-muted'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm text-text-secondary block">Transfer</span>
                    {selectedTransfer ? (
                      <p className="text-xs text-text-muted truncate max-w-[150px]">
                        {selectedTransfer.vehicle.description}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted">Not selected</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-sm font-semibold ${
                      selectedTransfer ? 'text-text-primary' : 'text-text-muted'
                    }`}
                  >
                    {breakdown.transferPrice > 0
                      ? formatCurrency(breakdown.transferPrice, src)
                      : '+ Add'}
                  </span>
                  {selectedTransfer && (
                    <button
                      type="button"
                      onClick={removeTransfer}
                      aria-label="Remove transfer"
                      className="p-1 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-200 dark:border-border-default pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-text-primary">Total</span>
                <span className="text-lg font-extrabold text-primary-500">
                  {formatCurrency(total, src)}
                </span>
              </div>
            </div>

            {showBookButton && (
              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={onBook}
                  className="w-full bg-primary-500 text-white font-semibold py-3 rounded-xl hover:bg-primary-600 transition-colors"
                >
                  Book Now — {formatCurrency(total, src)}
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-text-muted">
                  <Shield className="h-3.5 w-3.5 text-green-500" />
                  Secure checkout · Free cancellation within 24h
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
