'use client';
import { Car, Users, Briefcase, Snowflake, Settings2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrencyStore } from '@/stores/currencyStore';
import type { NormalizedCar } from '@/app/api/cars/search/route';

interface RentalCarCardProps {
  car: NormalizedCar;
  nights: number;
  onSelect: (car: NormalizedCar) => void;
  isSelected: boolean;
}

export default function RentalCarCard({ car, nights, onSelect, isSelected }: RentalCarCardProps) {
  const formatCurrency = useCurrencyStore((s) => s.format);
  const pricePerDay =
    car.pricePerDay > 0 ? car.pricePerDay : nights > 0 ? car.totalPrice / nights : car.totalPrice;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`relative rounded-2xl border bg-white dark:bg-surface overflow-hidden transition-all ${
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-500/40 shadow-lg'
          : 'border-neutral-200 dark:border-border-default hover:border-primary-300 hover:shadow-md'
      }`}
    >
      <div className="relative h-36 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-surface-elevated dark:to-surface flex items-center justify-center overflow-hidden">
        {car.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={car.pictureUrl}
            alt={`${car.vendor} ${car.vehicleType}`}
            className="h-full w-full object-contain p-3"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Car className="h-16 w-16 text-neutral-300 dark:text-neutral-600" />
        )}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {car.vendorLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={car.vendorLogo}
              alt={car.vendor}
              className="h-6 max-w-[80px] object-contain bg-white rounded px-1 py-0.5 shadow"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-xs font-semibold bg-white dark:bg-surface px-2 py-1 rounded shadow text-text-primary">
              {car.vendor}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-text-primary truncate">{car.vehicleType}</p>
            <p className="text-xs text-text-muted">
              {car.vendor}
              {car.partner && car.partner !== car.vendor && ` · via ${car.partner}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-text-primary">
              {formatCurrency(Math.round(car.totalPrice), car.currency)}
            </p>
            <p className="text-[10px] text-text-muted">total · {nights} {nights === 1 ? 'day' : 'days'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>{car.seatCount} seats</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            <span>{car.bagCount} bags</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            <span>{car.transmission}</span>
          </div>
          {car.airConditioning && (
            <div className="flex items-center gap-1.5">
              <Snowflake className="h-3.5 w-3.5" />
              <span>A/C</span>
            </div>
          )}
        </div>

        {(car.pickUpLocationName || car.dropOffLocationName) && (
          <div className="flex items-start gap-1.5 text-[11px] text-text-muted mb-3">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="truncate">
              {car.pickUpLocationName || car.dropOffLocationName}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-text-muted">
            {formatCurrency(Math.round(pricePerDay), car.currency)}<span className="opacity-60">/day</span>
          </p>
          <button
            type="button"
            onClick={() => onSelect(car)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              isSelected
                ? 'bg-primary-500 text-white'
                : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-500/20'
            }`}
          >
            {isSelected ? 'Selected' : 'Select Car'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
