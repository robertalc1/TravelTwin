'use client';
import { useState, useEffect, useCallback } from 'react';
import TransferCard from '@/components/Transfers/TransferCard';
import type { TransferOffer } from '@/app/api/amadeus/transfers/route';

interface TransfersTabProps {
  startLocationCode: string;        // arrival airport IATA
  endLatitude: number;
  endLongitude: number;
  endCityName: string;
  endCountryCode?: string;
  startDateTime: string;            // ISO "2026-06-01T10:00:00"
  adults: number;
  onTransferSelect: (offer: TransferOffer) => void;
  selectedTransferId?: string;
}

export default function TransfersTab({
  startLocationCode,
  endLatitude,
  endLongitude,
  endCityName,
  endCountryCode = 'FR',
  startDateTime,
  adults,
  onTransferSelect,
  selectedTransferId,
}: TransfersTabProps) {
  const [offers, setOffers] = useState<TransferOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startLocationCode,
        endGeoCode: `${endLatitude},${endLongitude}`,
        endCityName,
        endCountryCode,
        endName: endCityName,
        endAddressLine: `${endCityName} City Center`,
        startDateTime,
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
  }, [startLocationCode, endLatitude, endLongitude, endCityName, endCountryCode, startDateTime, adults]);

  useEffect(() => {
    if (startLocationCode && endLatitude && endLongitude && startDateTime) {
      fetchOffers();
    }
  }, [startLocationCode, endLatitude, endLongitude, startDateTime, fetchOffers]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-44 bg-neutral-100 dark:bg-surface-elevated rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-4">🚗</p>
        <p className="text-text-muted">No transfer options available for this route.</p>
        <button
          type="button"
          onClick={fetchOffers}
          className="mt-4 text-primary-500 hover:underline text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-text-muted">
        <p>
          From <span className="font-semibold text-text-primary">{startLocationCode}</span> to{' '}
          <span className="font-semibold text-text-primary">{endCityName}</span>
        </p>
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
            onSelect={onTransferSelect}
            isSelected={selectedTransferId === offer.id}
          />
        ))}
      </div>
    </div>
  );
}
