'use client';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useTripPricing } from '@/stores/tripPricingStore';
import { useCurrencyStore } from '@/stores/currencyStore';

interface Props {
  onBook: () => void;
}

/**
 * Always-visible bottom bar on mobile (`<lg`). Mirrors the desktop sidebar's
 * total + Book Now CTA so customers don't have to scroll past every section
 * to reach the conversion point. Reads from the same useTripPricing store
 * as PriceBreakdown so the total updates live when the user changes hotel /
 * transfer / extras.
 */
export default function MobileBookBar({ onBook }: Props) {
  const breakdown = useTripPricing((s) => s.breakdown);
  const formatCurrency = useCurrencyStore((s) => s.format);
  const total =
    breakdown.flightPrice + breakdown.hotelPrice + breakdown.transferPrice + breakdown.extrasPrice;

  if (total <= 0) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white dark:bg-surface border-t border-neutral-200 dark:border-border-default shadow-[0_-8px_24px_rgba(0,0,0,0.08)] print:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none">
            Total
          </p>
          <motion.p
            key={total}
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            className="text-lg font-extrabold text-primary-500 leading-tight mt-0.5"
          >
            {formatCurrency(total, breakdown.currency)}
          </motion.p>
        </div>
        <button
          type="button"
          onClick={onBook}
          className="flex items-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 active:bg-primary-700 px-5 py-3 text-sm font-bold text-white shadow-md transition-colors min-h-[44px]"
        >
          <Lock className="h-4 w-4" /> Book Now
        </button>
      </div>
    </div>
  );
}
