'use client';

import { useState } from 'react';
import { Car, ExternalLink } from 'lucide-react';
import { buildRentalcarsUrl } from '@/lib/rentalcarsLink';

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

  const cityName =
    POPULAR_DEST.find((c) => c.iata === cityCode)?.city || cityCode;
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(dropOffDate).getTime() - new Date(pickUpDate).getTime()) /
        86_400_000,
    ),
  );

  const partnerUrl = buildRentalcarsUrl({
    iata: cityCode.toUpperCase(),
    pickUpDate,
    dropOffDate,
  });

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
            Pick a city and dates — we pre-fill the search on Rentalcars.com so
            you can compare 900+ local suppliers in seconds.
          </p>

          <div className="bg-white dark:bg-surface text-text-primary rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Pick-up city
              </label>
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
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Pick-up date
              </label>
              <input
                type="date"
                value={pickUpDate}
                onChange={(e) => setPickUpDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Drop-off date
              </label>
              <input
                type="date"
                value={dropOffDate}
                onChange={(e) => setDropOffDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
              />
            </div>
            <div className="flex items-end">
              <a
                href={partnerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl py-2.5 transition-colors"
              >
                Search on Rentalcars
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-5xl mb-4">🚙</p>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            {cityName} · {days} {days === 1 ? 'day' : 'days'}
          </h2>
          <p className="text-text-muted mb-6 leading-relaxed">
            We partner with Rentalcars.com to bring you live offers from Hertz,
            Avis, Europcar and 900+ local suppliers. Click search above — your
            city, pickup, and drop-off dates are already filled in.
          </p>
          <a
            href={partnerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-500 text-primary-600 dark:text-primary-400 px-5 py-2.5 font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            Continue to Rentalcars.com
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
