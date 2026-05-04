'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useCurrencyStore } from '@/stores/currencyStore';
import { Users, Briefcase, Clock, MapPin, Star, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TransferOffer } from '@/app/api/amadeus/transfers/route';

const TransferRouteMap = dynamic(() => import('./TransferRouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-2xl bg-neutral-100 dark:bg-surface-elevated animate-pulse flex items-center justify-center">
      <div className="h-6 w-6 rounded-full border-[3px] border-neutral-200 border-t-primary-500 animate-spin" />
    </div>
  ),
});

interface TransferCardProps {
  offer: TransferOffer;
  onSelect: (offer: TransferOffer) => void;
  isSelected?: boolean;
  // Coords used by the route map. If absent, the map button is hidden.
  originName?: string;
  originLat?: number;
  originLng?: number;
  destinationName?: string;
  destinationLat?: number;
  destinationLng?: number;
}

function parseDuration(duration: string): { label: string; minutes: number } {
  const hours = parseInt(duration.match(/(\d+)H/)?.[1] ?? '0', 10);
  const mins = parseInt(duration.match(/(\d+)M/)?.[1] ?? '0', 10);
  const total = hours * 60 + mins;
  if (hours && mins) return { label: `${hours}h ${mins}min`, minutes: total };
  if (hours) return { label: `${hours}h`, minutes: total };
  return { label: `${mins}min`, minutes: total };
}

const VEHICLE_ICONS: Record<string, string> = {
  CAR: '🚗',
  VAN: '🚐',
  MINIBUS: '🚐',
  BUS: '🚌',
  TAXI: '🚕',
};

export default function TransferCard({
  offer,
  onSelect,
  isSelected,
  originName,
  originLat,
  originLng,
  destinationName,
  destinationLat,
  destinationLng,
}: TransferCardProps) {
  const formatCurrency = useCurrencyStore((s) => s.format);
  const [showMap, setShowMap] = useState(false);
  const seats = offer.vehicle.seats[0]?.count ?? 3;
  const bags = offer.vehicle.baggages[0]?.count ?? 2;
  const price = parseFloat(offer.quotation.monetaryAmount);
  const fromCurrency = offer.quotation.currencyCode || 'EUR';
  const { label: durationLabel, minutes: durationMinutes } = parseDuration(offer.duration);

  const canShowMap =
    typeof originLat === 'number' &&
    typeof originLng === 'number' &&
    typeof destinationLat === 'number' &&
    typeof destinationLng === 'number';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-surface rounded-2xl border-2 p-5 transition-all hover:shadow-lg ${
        isSelected
          ? 'border-primary-500 shadow-md'
          : 'border-neutral-200 dark:border-border-default hover:border-primary-500/50'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
            {VEHICLE_ICONS[offer.vehicle.code] || '🚗'}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-text-primary text-base truncate">
              {offer.vehicle.description}
            </h3>
            <p className="text-text-muted text-sm truncate">{offer.serviceProvider.name}</p>
            {offer.serviceProvider.rating && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-text-secondary">{offer.serviceProvider.rating}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-primary-500">
            {formatCurrency(price, fromCurrency)}
          </p>
          {offer.quotation.isEstimated && (
            <span className="text-xs text-text-muted">estimated</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-border-default flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Users className="h-4 w-4" />
          <span>{seats} seats</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Briefcase className="h-4 w-4" />
          <span>{bags} bags</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Clock className="h-4 w-4" />
          <span>{durationLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary sm:ml-auto">
          <MapPin className="h-4 w-4" />
          <span>{offer.distance.value} {offer.distance.unit.toLowerCase()}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(offer)}
        className={`w-full mt-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
          isSelected
            ? 'bg-primary-500 text-white'
            : 'bg-primary-50 dark:bg-primary-900/20 text-primary-500 hover:bg-primary-500 hover:text-white'
        }`}
      >
        {isSelected ? '✓ Selected' : 'Select Transfer'}
      </button>

      {canShowMap && (
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="text-xs text-primary-500 hover:underline mt-3 flex items-center gap-1"
        >
          <MapIcon className="h-3 w-3" />
          {showMap ? 'Hide map' : 'Show route on map'}
        </button>
      )}

      <AnimatePresence initial={false}>
        {showMap && canShowMap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4">
              <TransferRouteMap
                originName={originName ?? 'Pickup'}
                originLat={originLat!}
                originLng={originLng!}
                destinationName={destinationName ?? 'Drop-off'}
                destinationLat={destinationLat!}
                destinationLng={destinationLng!}
                durationMinutes={durationMinutes || Math.round(offer.distance.value * 1.5)}
                distanceKm={offer.distance.value}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
