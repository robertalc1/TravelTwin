'use client';
import { useState, useEffect, useCallback } from 'react';
import RentalCarCard from '@/components/Cars/RentalCarCard';
import { useTripPricing } from '@/stores/tripPricingStore';
import { useToastStore } from '@/stores/toastStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import type { NormalizedCar } from '@/app/api/cars/search/route';
import type { TransferOffer } from '@/app/api/amadeus/transfers/route';

interface RentalCarsTabProps {
  cityCode: string;
  cityName: string;
  pickUpDate: string;
  dropOffDate: string;
  onCarSelect?: (car: NormalizedCar) => void;
}

interface CarsApiResponse {
  cars: NormalizedCar[];
  source: 'live' | 'cached' | 'fallback' | 'error';
  count: number;
  cityName?: string;
  warning?: string;
}

function carToTransferOffer(car: NormalizedCar): TransferOffer {
  return {
    id: car.id,
    transferType: 'CAR_RENTAL',
    vehicle: {
      code: 'CAR',
      description: `${car.vendor} · ${car.vehicleType} (${car.transmission})`,
      seats: [{ count: car.seatCount }],
      baggages: [{ count: car.bagCount, size: 'M' }],
      imageURL: car.pictureUrl,
    },
    serviceProvider: {
      name: car.vendor,
      logoUrl: car.vendorLogo,
    },
    quotation: {
      monetaryAmount: String(Math.round(car.totalPrice)),
      currencyCode: car.currency,
      isEstimated: car.source !== 'live',
    },
    distance: { value: 0, unit: 'KM' },
    duration: '',
    source: car.source === 'cached' ? 'cached' : car.source === 'live' ? 'live' : 'fallback',
  };
}

export default function RentalCarsTab({
  cityCode,
  cityName,
  pickUpDate,
  dropOffDate,
  onCarSelect,
}: RentalCarsTabProps) {
  const [cars, setCars] = useState<NormalizedCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [warning, setWarning] = useState<string>('');
  const [sortBy, setSortBy] = useState<'price' | 'seats'>('price');

  const selectTransferInStore = useTripPricing((s) => s.selectTransfer);
  const selectedTransferStore = useTripPricing((s) => s.selectedTransfer);
  const showToast = useToastStore((s) => s.show);
  const formatCurrency = useCurrencyStore((s) => s.format);

  const days = Math.max(
    1,
    Math.ceil((new Date(dropOffDate).getTime() - new Date(pickUpDate).getTime()) / 86_400_000),
  );

  const fetchCars = useCallback(async () => {
    setLoading(true);
    setWarning('');
    try {
      const params = new URLSearchParams({
        cityCode,
        pickUpDate,
        dropOffDate,
      });
      const res = await fetch(`/api/cars/search?${params}`);
      const data: CarsApiResponse = await res.json();
      setCars(data.cars || []);
      setSource(data.source || '');
      if (data.warning) setWarning(data.warning);
    } catch {
      setCars([]);
      setWarning('Failed to load rental cars. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [cityCode, pickUpDate, dropOffDate]);

  useEffect(() => {
    if (cityCode && pickUpDate && dropOffDate) {
      fetchCars();
    }
  }, [cityCode, pickUpDate, dropOffDate, fetchCars]);

  const handleSelect = (car: NormalizedCar) => {
    const wrapped = carToTransferOffer(car);
    selectTransferInStore(wrapped, Math.round(car.totalPrice));
    onCarSelect?.(car);
    showToast(
      `Car added · ${formatCurrency(Math.round(car.totalPrice), car.currency)}`,
      'success',
    );
  };

  const sorted = [...cars].sort((a, b) => {
    if (sortBy === 'price') return a.totalPrice - b.totalPrice;
    return b.seatCount - a.seatCount;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-72 bg-neutral-100 dark:bg-surface-elevated rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (cars.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-4">🚙</p>
        <p className="text-text-muted">
          {warning || `No rental cars available in ${cityName} for these dates.`}
        </p>
        <button
          type="button"
          onClick={fetchCars}
          className="mt-4 text-primary-500 hover:underline text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'price' | 'seats')}
          className="text-sm border border-neutral-200 dark:border-border-default rounded-xl px-3 py-2 bg-white dark:bg-surface text-text-primary"
        >
          <option value="price">Sort by Price</option>
          <option value="seats">Sort by Seats</option>
        </select>

        <p className="text-sm text-text-muted ml-auto">
          {cars.length} cars · {days} {days === 1 ? 'day' : 'days'} in {cityName}
        </p>

        {source === 'live' && (
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
            Live prices
          </span>
        )}
        {source === 'cached' && (
          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
            Cached
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((car) => (
          <RentalCarCard
            key={car.id}
            car={car}
            nights={days}
            onSelect={handleSelect}
            isSelected={selectedTransferStore?.id === car.id}
          />
        ))}
      </div>
    </div>
  );
}
