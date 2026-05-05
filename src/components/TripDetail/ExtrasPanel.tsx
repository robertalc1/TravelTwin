'use client';
import { Shield, Coffee, Sofa, Wifi, Clock, Luggage, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTripPricing, type ExtraItem } from '@/stores/tripPricingStore';
import { useCurrencyStore } from '@/stores/currencyStore';

interface ExtrasPanelProps {
  nights: number;
  adults?: number;
}

/**
 * Catalog of optional add-ons. Prices are flat per booking unless `perNight` is true,
 * in which case the actual price added to the cart is `unit * nights`.
 */
function buildCatalog(nights: number, adults: number) {
  const n = Math.max(1, nights);
  const a = Math.max(1, adults);
  const catalog: Array<{
    item: ExtraItem;
    icon: React.ElementType;
    accent: string;
  }> = [
    {
      item: {
        id: 'insurance',
        label: 'Travel insurance',
        description: 'Medical, cancellation & lost-luggage cover',
        price: 19 * a,
      },
      icon: Shield,
      accent: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      item: {
        id: 'breakfast',
        label: 'Breakfast included',
        description: `Buffet breakfast at hotel · ${n} night${n === 1 ? '' : 's'}`,
        price: 12 * n * a,
        perNight: true,
      },
      icon: Coffee,
      accent: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
    },
    {
      item: {
        id: 'lounge',
        label: 'Airport lounge access',
        description: 'Both directions · food & drinks included',
        price: 35 * a,
      },
      icon: Sofa,
      accent: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    },
    {
      item: {
        id: 'esim',
        label: 'eSIM data plan',
        description: '5GB data for the duration of your trip',
        price: 15,
      },
      icon: Wifi,
      accent: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    },
    {
      item: {
        id: 'late-checkout',
        label: 'Late check-out',
        description: 'Stay until 4pm on departure day',
        price: 25,
      },
      icon: Clock,
      accent: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      item: {
        id: 'extra-baggage',
        label: 'Extra checked bag',
        description: '23 kg per traveler, both flights',
        price: 40 * a,
      },
      icon: Luggage,
      accent: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20',
    },
  ];
  return catalog;
}

export default function ExtrasPanel({ nights, adults = 1 }: ExtrasPanelProps) {
  const formatCurrency = useCurrencyStore((s) => s.format);
  const currency = useTripPricing((s) => s.breakdown.currency);
  const extras = useTripPricing((s) => s.extras);
  const toggleExtra = useTripPricing((s) => s.toggleExtra);

  const catalog = buildCatalog(nights, adults);

  return (
    <section>
      <h2 className="text-xl font-bold text-secondary-500 mb-2">Add to your trip</h2>
      <p className="text-sm text-text-muted mb-4">
        Tap any add-on to include it. Your quote updates instantly.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {catalog.map(({ item, icon: Icon, accent }) => {
          const selected = extras.some((e) => e.id === item.id);
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => toggleExtra(item)}
              whileTap={{ scale: 0.98 }}
              className={`relative text-left rounded-2xl border p-4 transition-all ${
                selected
                  ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-900/15 ring-2 ring-primary-500/30'
                  : 'border-neutral-200 dark:border-border-default bg-white dark:bg-surface hover:border-primary-300'
              }`}
            >
              {selected && (
                <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="font-semibold text-secondary-500 text-sm">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
                  )}
                  <p className="mt-2 text-sm font-bold text-primary-500">
                    +{formatCurrency(item.price, currency)}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
