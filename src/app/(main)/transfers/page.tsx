'use client';

import { useState } from 'react';
import { Car, Search, Loader2 } from 'lucide-react';
import TransferCard from '@/components/Transfers/TransferCard';
import type { TransferOffer } from '@/app/api/amadeus/transfers/route';

interface CityCoord {
  city: string;
  lat: number;
  lon: number;
  countryCode: string;
}

const POPULAR_DEST: Record<string, CityCoord> = {
  PAR: { city: 'Paris', lat: 48.8566, lon: 2.3522, countryCode: 'FR' },
  LON: { city: 'London', lat: 51.5074, lon: -0.1278, countryCode: 'GB' },
  ROM: { city: 'Rome', lat: 41.9028, lon: 12.4964, countryCode: 'IT' },
  BCN: { city: 'Barcelona', lat: 41.3851, lon: 2.1734, countryCode: 'ES' },
  AMS: { city: 'Amsterdam', lat: 52.3676, lon: 4.9041, countryCode: 'NL' },
  IST: { city: 'Istanbul', lat: 41.0082, lon: 28.9784, countryCode: 'TR' },
  OTP: { city: 'Bucharest', lat: 44.4268, lon: 26.1025, countryCode: 'RO' },
  BER: { city: 'Berlin', lat: 52.52, lon: 13.405, countryCode: 'DE' },
};

export default function TransfersPage() {
  const [airportCode, setAirportCode] = useState('CDG');
  const [destCode, setDestCode] = useState('PAR');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState('10:00');
  const [adults, setAdults] = useState(2);
  const [offers, setOffers] = useState<TransferOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [source, setSource] = useState<string>('');

  async function handleSearch() {
    const dest = POPULAR_DEST[destCode] ?? POPULAR_DEST.PAR;
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({
        startLocationCode: airportCode.toUpperCase(),
        endGeoCode: `${dest.lat},${dest.lon}`,
        endCityName: dest.city,
        endCountryCode: dest.countryCode,
        endName: dest.city,
        endAddressLine: `${dest.city} City Center`,
        startDateTime: `${date}T${time}:00`,
        adults: String(adults),
      });
      const res = await fetch(`/api/amadeus/transfers?${params}`);
      const data: { data?: TransferOffer[]; source?: string } = await res.json();
      setOffers(data.data || []);
      setSource(data.source || '');
    } catch {
      setOffers([]);
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
            backgroundImage: 'url(https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1920&h=600&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative mx-auto max-w-[1280px] px-4 lg:px-8 py-12 lg:py-16">
          <div className="flex items-center gap-3 mb-2">
            <Car className="h-7 w-7" />
            <h1 className="text-3xl md:text-4xl font-extrabold">Airport Transfers</h1>
          </div>
          <p className="text-white/90 mb-8 max-w-xl">
            Reliable, prebooked transfers from the airport to your hotel — no taxi-line surprises.
          </p>

          <div className="bg-white dark:bg-surface text-text-primary rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-text-muted mb-1">From (Airport)</label>
              <input
                type="text"
                value={airportCode}
                onChange={(e) => setAirportCode(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="CDG"
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-text-muted mb-1">To (City)</label>
              <select
                value={destCode}
                onChange={(e) => setDestCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
              >
                {Object.entries(POPULAR_DEST).map(([code, c]) => (
                  <option key={code} value={code}>{c.city}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-text-muted mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-text-muted mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated text-text-primary text-sm focus:border-primary-500 outline-none"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading || !airportCode}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
            </div>

            <div className="md:col-span-5 flex items-center gap-3">
              <label className="text-xs font-semibold text-text-muted">Passengers</label>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                  className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-border-default text-text-primary"
                >−</button>
                <span className="text-sm font-semibold w-8 text-center">{adults}</span>
                <button
                  type="button"
                  onClick={() => setAdults(Math.min(9, adults + 1))}
                  className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-border-default text-text-primary"
                >+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 lg:px-8 py-10">
        {!hasSearched && !loading && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🚗</p>
            <h2 className="text-xl font-bold text-text-primary mb-2">Find your transfer</h2>
            <p className="text-text-muted">Enter airport, destination and date to see available options.</p>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 bg-neutral-100 dark:bg-surface-elevated rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && hasSearched && offers.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-muted">No transfers found. Try different dates or airports.</p>
          </div>
        )}

        {!loading && offers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <p className="text-sm text-text-muted">{offers.length} transfer options</p>
              {source === 'fallback' && (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                  Estimated prices
                </span>
              )}
              {source === 'live' && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                  Live prices
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map((offer) => (
                <TransferCard
                  key={offer.id}
                  offer={offer}
                  onSelect={() => { /* booking flow placeholder */ }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
