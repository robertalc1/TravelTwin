'use client';
import { Users, Briefcase, Clock, MapPin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TransferOffer } from '@/app/api/amadeus/transfers/route';

interface TransferCardProps {
  offer: TransferOffer;
  onSelect: (offer: TransferOffer) => void;
  isSelected?: boolean;
}

function parseDuration(duration: string): string {
  const hours = duration.match(/(\d+)H/)?.[1];
  const mins = duration.match(/(\d+)M/)?.[1];
  if (hours && mins) return `${hours}h ${mins}min`;
  if (hours) return `${hours}h`;
  return `${mins ?? 0}min`;
}

const VEHICLE_ICONS: Record<string, string> = {
  CAR: '🚗',
  VAN: '🚐',
  MINIBUS: '🚐',
  BUS: '🚌',
  TAXI: '🚕',
};

export default function TransferCard({ offer, onSelect, isSelected }: TransferCardProps) {
  const seats = offer.vehicle.seats[0]?.count ?? 3;
  const bags = offer.vehicle.baggages[0]?.count ?? 2;
  const price = parseFloat(offer.quotation.monetaryAmount);
  const currencySymbol = offer.quotation.currencyCode === 'EUR' ? '€'
    : offer.quotation.currencyCode === 'USD' ? '$'
    : `${offer.quotation.currencyCode} `;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-surface rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${
        isSelected
          ? 'border-primary-500 shadow-md'
          : 'border-neutral-200 dark:border-border-default hover:border-primary-500/50'
      }`}
      onClick={() => onSelect(offer)}
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
            {currencySymbol}{price.toFixed(0)}
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
          <span>{parseDuration(offer.duration)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary sm:ml-auto">
          <MapPin className="h-4 w-4" />
          <span>{offer.distance.value} {offer.distance.unit.toLowerCase()}</span>
        </div>
      </div>

      <button
        type="button"
        className={`w-full mt-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
          isSelected
            ? 'bg-primary-500 text-white'
            : 'bg-primary-50 dark:bg-primary-900/20 text-primary-500 hover:bg-primary-500 hover:text-white'
        }`}
      >
        {isSelected ? '✓ Selected' : 'Select Transfer'}
      </button>
    </motion.div>
  );
}
