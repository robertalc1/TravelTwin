'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTripPricing, type ExtraItem } from '@/stores/tripPricingStore';
import { useCurrencyStore } from '@/stores/currencyStore';

interface ExtrasPanelProps {
  nights: number;
  adults?: number;
}

/** Microsoft Fluent 3D emoji (premium, glossy — replaces flat 2D line icons). */
const FLUENT_3D = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

/**
 * Renders a 3D emoji image with a graceful fallback to the native Unicode
 * glyph if the CDN image fails to load — so the card never shows a broken icon.
 */
function Emoji3D({ src, char }: { src: string; char: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span aria-hidden className="text-[28px] leading-none sm:text-[32px]">
        {char}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      width={64}
      height={64}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className="h-8 w-8 select-none sm:h-9 sm:w-9 [filter:drop-shadow(0_2px_4px_rgb(0_0_0/0.12))]"
    />
  );
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
    emoji: string;
    char: string;
  }> = [
    {
      item: {
        id: 'insurance',
        label: 'Travel insurance',
        description: 'Medical, cancellation & lost-luggage cover',
        price: 19 * a,
      },
      emoji: `${FLUENT_3D}/Shield/3D/shield_3d.png`,
      char: '🛡️',
    },
    {
      item: {
        id: 'breakfast',
        label: 'Breakfast included',
        description: `Buffet breakfast at hotel · ${n} night${n === 1 ? '' : 's'}`,
        price: 12 * n * a,
        perNight: true,
      },
      emoji: `${FLUENT_3D}/Hot beverage/3D/hot_beverage_3d.png`,
      char: '☕',
    },
    {
      item: {
        id: 'lounge',
        label: 'Airport lounge access',
        description: 'Both directions · food & drinks included',
        price: 35 * a,
      },
      emoji: `${FLUENT_3D}/Couch and lamp/3D/couch_and_lamp_3d.png`,
      char: '🛋️',
    },
    {
      item: {
        id: 'esim',
        label: 'eSIM data plan',
        description: '5GB data for the duration of your trip',
        price: 15,
      },
      emoji: `${FLUENT_3D}/Antenna bars/3D/antenna_bars_3d.png`,
      char: '📶',
    },
    {
      item: {
        id: 'late-checkout',
        label: 'Late check-out',
        description: 'Stay until 4pm on departure day',
        price: 25,
      },
      emoji: `${FLUENT_3D}/Alarm clock/3D/alarm_clock_3d.png`,
      char: '⏰',
    },
    {
      item: {
        id: 'extra-baggage',
        label: 'Extra checked bag',
        description: '23 kg per traveler, both flights',
        price: 40 * a,
      },
      emoji: `${FLUENT_3D}/Luggage/3D/luggage_3d.png`,
      char: '🧳',
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
  const selectedCount = extras.length;
  const selectedSum = extras.reduce((acc, e) => acc + e.price, 0);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-secondary-500 dark:text-white">Add to your trip</h2>
          <p className="mt-0.5 text-sm text-text-muted">Optional extras — tap to add or remove.</p>
        </div>
        {selectedCount > 0 && (
          <motion.span
            key={selectedSum}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
          >
            {selectedCount} added · +{formatCurrency(selectedSum, currency)}
          </motion.span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {catalog.map(({ item, emoji, char }) => {
          const selected = extras.some((e) => e.id === item.id);
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => toggleExtra(item)}
              whileTap={{ scale: 0.98 }}
              aria-pressed={selected}
              className={`group relative flex h-full min-h-[112px] flex-col rounded-2xl border p-3.5 text-left transition-all duration-200 sm:p-4 ${
                selected
                  ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/30 dark:bg-primary-900/15'
                  : 'border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-border-default dark:bg-surface dark:hover:border-primary-700'
              }`}
            >
              {/* Top row: 3D emoji + add / selected affordance */}
              <div className="mb-2.5 flex items-start justify-between">
                <Emoji3D src={emoji} char={char} />
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[15px] font-bold leading-none transition-colors ${
                    selected
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-neutral-300 text-neutral-400 group-hover:border-primary-400 group-hover:text-primary-500 dark:border-border-default'
                  }`}
                >
                  {selected ? <Check className="h-3.5 w-3.5" /> : '+'}
                </span>
              </div>

              {/* Label + description */}
              <p className="text-sm font-semibold leading-snug text-secondary-500 dark:text-white">
                {item.label}
              </p>
              {item.description && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-muted">
                  {item.description}
                </p>
              )}

              {/* Price pinned to the bottom so every card aligns */}
              <p className="mt-auto pt-2.5 text-sm font-bold text-primary-500">
                +{formatCurrency(item.price, currency)}
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
