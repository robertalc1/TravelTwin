'use client';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, X, Users, Briefcase, Settings2 } from 'lucide-react';
import { useTripPricing } from '@/stores/tripPricingStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import type { TransferOffer } from '@/lib/types/transfers';

interface RentalCarsTabProps {
  cityCode: string;
  cityName: string;
  pickUpDate: string;
  dropOffDate: string;
  tripId?: string;
}

// Re-export for any legacy import sites that still need the helper. Returning
// a TransferOffer keeps the trip pricing store happy without leaking the car
// shape further.
export function buildTransferFromCar(opts: {
  id: string;
  vendor: string;
  vendorLogo?: string;
  vehicleType: string;
  transmission: string;
  seatCount: number;
  bagCount: number;
  totalPrice: number;
  currency: string;
  source?: 'live' | 'cached' | 'fallback';
}): TransferOffer {
  return {
    id: opts.id,
    transferType: 'CAR_RENTAL',
    vehicle: {
      code: 'CAR',
      description: `${opts.vendor} · ${opts.vehicleType} (${opts.transmission})`,
      seats: [{ count: opts.seatCount }],
      baggages: [{ count: opts.bagCount, size: 'M' }],
    },
    serviceProvider: { name: opts.vendor, logoUrl: opts.vendorLogo },
    quotation: {
      monetaryAmount: String(Math.round(opts.totalPrice)),
      currencyCode: opts.currency,
      isEstimated: opts.source !== 'live',
    },
    distance: { value: 0, unit: 'KM' },
    duration: '',
    source: opts.source ?? 'fallback',
  };
}

export default function RentalCarsTab({
  cityCode,
  cityName,
  pickUpDate,
  dropOffDate,
  tripId,
}: RentalCarsTabProps) {
  const router = useRouter();
  const selectedTransfer = useTripPricing((s) => s.selectedTransfer);
  const removeTransfer = useTripPricing((s) => s.removeTransfer);
  const formatCurrency = useCurrencyStore((s) => s.format);

  function openSearch() {
    const qs = new URLSearchParams({
      cityCode,
      cityName,
      pickUpDate,
      dropOffDate,
    });
    if (tripId) qs.set('tripId', tripId);
    router.push(`/cars/search?${qs.toString()}`);
  }

  if (selectedTransfer && selectedTransfer.transferType === 'CAR_RENTAL') {
    const v = selectedTransfer.vehicle;
    const price = Number(selectedTransfer.quotation.monetaryAmount) || 0;
    const seats = v.seats?.[0]?.count ?? 4;
    const bags = v.baggages?.[0]?.count ?? 2;
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-1">
              {selectedTransfer.serviceProvider.name}
            </p>
            <h3 className="font-bold text-text-primary text-base line-clamp-1">
              {v.description}
            </h3>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {seats} seats
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {bags} bags
              </span>
              <span className="flex items-center gap-1">
                <Settings2 className="h-3.5 w-3.5" />
                {v.code === 'CAR' ? 'Automatic' : v.code}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={removeTransfer}
            aria-label="Remove car"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-end justify-between gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-border-default">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
              Total
            </p>
            <p className="text-xl font-extrabold text-primary-500">
              {formatCurrency(price, selectedTransfer.quotation.currencyCode || 'EUR')}
            </p>
          </div>
          <button
            type="button"
            onClick={openSearch}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-border-default px-3 py-2 text-xs font-bold text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openSearch}
      className="w-full rounded-2xl border-2 border-dashed border-neutral-300 dark:border-border-default bg-neutral-50/50 dark:bg-surface-elevated/50 px-6 py-10 sm:py-14 flex flex-col items-center gap-3 text-text-secondary hover:border-primary-400 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 hover:text-primary-600 transition-colors group"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-surface border border-neutral-200 dark:border-border-default group-hover:border-primary-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
        <Plus className="h-5 w-5 text-text-muted group-hover:text-primary-600 transition-colors" />
      </span>
      <span className="text-base font-bold">Add rental car</span>
      <span className="text-xs text-text-muted text-center max-w-xs">
        Compare cars in {cityName} — quota only used when you open the search.
      </span>
    </button>
  );
}
