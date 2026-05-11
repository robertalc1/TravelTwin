'use client';

import { useState } from 'react';
import { Car, Search, Loader2 } from 'lucide-react';
import RentalCarCard from '@/components/Cars/RentalCarCard';
import type { NormalizedCar } from '@/app/api/cars/search/route';

interface CityOption {
  iata: string;
  city: string;
}

const POPULAR_DEST: CityOption[] = [
  { iata: 'OTP', city: 'Bucharest' },
  { iata: 'CDG', city: 'Paris' },
  { iata: 'LHR', city: 'London' },
  { iata: 'FCO', city: 'Rome' },
  { iata: 'BCN', city: 'Barcelona' },
  { iata: 'AMS', city: 'Amsterdam' },
  { iata: 'IST', city: 'Istanbul' },
  { iata: 'BER', city: 'Berlin' },
  { iata: 'MAD', city: 'Madrid' },
  { iata: 'ATH', city: 'Athens' },
  { iata: 'HER', city: 'Heraklion' },
  { iata: 'DXB', city: 'Dubai' },
];

interface CarsApiResponse {
  cars: NormalizedCar[];
  source: 'live' | 'cached' | 'fallback' | 'error';
  count: number;
  cityName?: string;
  warning?: string;
}

export default function CarRentalPage() {
  const [cityCode, setCityCode] = useState('OTP');
  const [pickUpDate, setPickUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [dropOffDate, setDropOffDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().slice(0, 10);
  });

  const [cars, setCars] = useState<NormalizedCar[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [source, setSource] = useState<string>('');
  const [warning, setWarning] = useState<string>('');

  const cityName =
    POPULAR_DEST.find((c) => c.iata === cityCode)?.city || cityCode;

  const days = Math.max(
    1,
    Math.ceil(
      (new Date(dropOffDate).getTime() - new Date(pickUpDate).getTime()) / 86_400_000,
    ),
  );

  async function handleSearch() {
    setLoading(true);
    setHasSearched(true);
    setWarning('');
    try {
      const params = new URLSearchParams({
        cityCode: cityCode.toUpperCase(),
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
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1920&h=600&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative mx-auto max-w-[1280px] px-4 lg:px-8 py-12 lg:py-16">
          <div className="flex items-center gap-3 mb-2">
            <Car className="h-7 w-7" />
            <h1 className="text-3xl md:text-4xl font-extrabold">Car Rental</h1>
          </div>
          <p className="text-white/90 mb-8 max-w-xl">
            Compare real rental car offers from Tripadvisor — Hertz, Avis, Europcar and more,
            picked up at the airport or in city centre.
          </p>

          <div className="bg-white dark:bg-surface text-text-primary rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Pick-up city</label>
              <select
                value={cityCode}
                onChange={(e) => setCityCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
              >
                {POPULAR_DEST.map((c) => (
                  <option key={c.iata} value={c.iata}>
                    {c.city} ({c.iata})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Pick-up date</label>
              <input
                type="date"
                value={pickUpDate}
                onChange={(e) => setPickUpDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Drop-off date</label>
              <input
                type="date"
                value={dropOffDate}
                onChange={(e) => setDropOffDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search Cars
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        {!hasSearched && !loading && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🚙</p>
            <h2 className="text-xl font-bold text-text-primary mb-2">Find your rental car</h2>
            <p className="text-text-muted">
              Pick a city and dates to see live offers from Tripadvisor partners.
            </p>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-72 bg-neutral-100 dark:bg-surface-elevated rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && hasSearched && cars.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-muted">
              {warning || `No rental cars found in ${cityName} for the selected dates.`}
            </p>
          </div>
        )}

        {!loading && cars.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <p className="text-sm text-text-muted">
                {cars.length} cars in {cityName} · {days} {days === 1 ? 'day' : 'days'}
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
              {cars.map((car) => (
                <RentalCarCard
                  key={car.id}
                  car={car}
                  nights={days}
                  onSelect={() => {
                    /* booking flow placeholder */
                  }}
                  isSelected={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
