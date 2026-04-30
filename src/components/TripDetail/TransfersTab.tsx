'use client';
import { useState, useEffect, useCallback } from 'react';
import TransferCard from '@/components/Transfers/TransferCard';
import type { TransferOffer } from '@/app/api/amadeus/transfers/route';
import { useTripPricing } from '@/stores/tripPricingStore';
import { useToastStore } from '@/stores/toastStore';
import { getAirportCoord } from '@/lib/airportCoordinates';

interface TransfersTabProps {
  startLocationCode: string;
  endLatitude: number;
  endLongitude: number;
  endCityName: string;
  endCountryCode?: string;
  startDateTime: string;
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

  const selectTransferInStore = useTripPricing((s) => s.selectTransfer);
  const showToast = useToastStore((s) => s.show);
  const selectedTransferStore = useTripPricing((s) => s.selectedTransfer);

  const airport = getAirportCoord(startLocationCode);
  const originLat = airport?.lat;
  const originLng = airport?.lng;
  const originName = airport ? `${airport.name} (${startLocationCode})` : `${startLocationCode} Airport`;

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

  const handleSelect = (offer: TransferOffer) => {
    const price = parseFloat(offer.quotation.monetaryAmount);
    selectTransferInStore(offer, price);
    onTransferSelect(offer);
    const sym = offer.quotation.currencyCode === 'EUR' ? '€' : offer.quotation.currencyCode === 'USD' ? '$' : `${offer.quotation.currencyCode} `;
    showToast(`Transfer added · ${sym}${Math.round(price)}`, 'success');
  };

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
            onSelect={handleSelect}
            isSelected={selectedTransferId === offer.id || selectedTransferStore?.id === offer.id}
            originName={originName}
            originLat={originLat}
            originLng={originLng}
            destinationName={endCityName}
            destinationLat={endLatitude}
            destinationLng={endLongitude}
          />
        ))}
      </div>
    </div>
  );
}
