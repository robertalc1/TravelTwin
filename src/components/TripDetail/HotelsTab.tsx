'use client';
import { useState, useEffect, useCallback } from 'react';
import HotelCard, { type HotelOfferData } from '@/components/Hotels/HotelCard';
import HotelDetailModal from '@/components/Hotels/HotelDetailModal';
import { useTripPricing } from '@/stores/tripPricingStore';
import { useToastStore } from '@/stores/toastStore';
import { useCurrencyStore } from '@/stores/currencyStore';

interface HotelsTabProps {
  destinationCityCode: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  onHotelSelect: (hotel: HotelOfferData) => void;
  selectedHotel?: HotelOfferData | null;
}

interface HotelListItem {
  hotelId: string;
  name?: string;
}

export default function HotelsTab({
  destinationCityCode,
  checkInDate,
  checkOutDate,
  adults,
  onHotelSelect,
  selectedHotel,
}: HotelsTabProps) {
  const [hotels, setHotels] = useState<HotelOfferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForModal, setSelectedForModal] = useState<HotelOfferData | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'rating'>('price');
  const [filterStars, setFilterStars] = useState<number>(0);

  const selectHotelInStore = useTripPricing((s) => s.selectHotel);
  const selectedHotelStore = useTripPricing((s) => s.selectedHotel);
  const showToast = useToastStore((s) => s.show);
  const formatCurrency = useCurrencyStore((s) => s.format);

  const handleAddToTrip = (h: HotelOfferData) => {
    const offer = h.offers[0];
    const total = parseFloat(offer?.price.total ?? '0');
    selectHotelInStore(h, total);
    onHotelSelect(h);
    showToast(`Hotel added · ${formatCurrency(total, offer?.price.currency || 'EUR')}`, 'success');
  };

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listRes = await fetch(
        `/api/amadeus/hotels/list?cityCode=${encodeURIComponent(destinationCityCode)}&radius=5`
      );
      const listData: { data?: HotelListItem[] } = await listRes.json();

      if (!listData.data || listData.data.length === 0) {
        setError('No hotels found for this destination');
        setHotels([]);
        return;
      }

      const hotelIds = listData.data.slice(0, 8).map((h) => h.hotelId).filter(Boolean).join(',');
      const offersRes = await fetch(
        `/api/amadeus/hotels/offers?hotelIds=${hotelIds}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}&cityCode=${encodeURIComponent(destinationCityCode)}`
      );
      const offersData: { data?: HotelOfferData[] } = await offersRes.json();

      setHotels(offersData.data || []);
    } catch {
      setError('Failed to load hotels. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [destinationCityCode, checkInDate, checkOutDate, adults]);

  useEffect(() => {
    if (destinationCityCode && checkInDate && checkOutDate) {
      fetchHotels();
    }
  }, [destinationCityCode, checkInDate, checkOutDate, fetchHotels]);

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const filtered = hotels
    .filter((h) => filterStars === 0 || parseInt(h.hotel.rating || '0', 10) >= filterStars)
    .sort((a, b) => {
      if (sortBy === 'price') {
        return parseFloat(a.offers[0]?.price.total || '999999') - parseFloat(b.offers[0]?.price.total || '999999');
      }
      return parseInt(b.hotel.rating || '0', 10) - parseInt(a.hotel.rating || '0', 10);
    });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 bg-neutral-100 dark:bg-surface-elevated rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">{error}</p>
        <button
          type="button"
          onClick={fetchHotels}
          className="mt-4 text-primary-500 hover:underline text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'price' | 'rating')}
          className="text-sm border border-neutral-200 dark:border-border-default rounded-xl px-3 py-2 bg-white dark:bg-surface text-text-primary"
        >
          <option value="price">Sort by Price</option>
          <option value="rating">Sort by Stars</option>
        </select>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-muted">Min stars:</span>
          {[0, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStars(s)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                filterStars === s
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 dark:bg-surface-elevated text-text-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {s === 0 ? 'All' : `${s}★`}
            </button>
          ))}
        </div>

        <p className="text-sm text-text-muted ml-auto">
          {filtered.length} hotels · {nights} nights
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">🏨</p>
          <p className="text-text-muted">No hotels match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((h) => (
            <HotelCard
              key={h.hotel.hotelId}
              hotelOffer={h}
              nights={nights}
              onSelect={(sel) => setSelectedForModal(sel)}
            />
          ))}
        </div>
      )}

      {selectedForModal && (
        <HotelDetailModal
          hotelOffer={selectedForModal}
          nights={nights}
          onClose={() => setSelectedForModal(null)}
          onAddToTrip={(h) => {
            handleAddToTrip(h);
            setSelectedForModal(null);
          }}
          isSelected={
            selectedHotel?.hotel?.hotelId === selectedForModal.hotel.hotelId ||
            selectedHotelStore?.hotel?.hotelId === selectedForModal.hotel.hotelId
          }
        />
      )}
    </div>
  );
}
