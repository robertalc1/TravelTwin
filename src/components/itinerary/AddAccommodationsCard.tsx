'use client';

import { ChevronRight, BedDouble, Pencil, X, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTripPricing } from '@/stores/tripPricingStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import { getHotelImage } from '@/lib/hotelImages';

interface Props {
  /** Pretty city name (e.g. "Belgrade") — shown in copy + passed to the search URL. */
  destinationCity: string;
  /** IATA code (e.g. "BEG") — required to scope the search to a city. */
  cityCode: string;
  /** ISO date string e.g. "2026-05-15" */
  checkIn: string;
  /** ISO date string e.g. "2026-05-22" */
  checkOut: string;
  /** Trip id so the hotel detail page knows which trip to save the choice into. */
  tripId: string;
}

/**
 * Itinerary-row accommodation slot. Two render modes:
 *
 * 1. Empty CTA — dashed-border "Add accommodations" button, shown when no
 *    hotel is selected in the trip pricing store.
 * 2. Selected summary — compact card with image, name, nights, breakfast/
 *    discount badges and Change/Remove controls (tryp.com style).
 */
export default function AddAccommodationsCard({
  destinationCity,
  cityCode,
  checkIn,
  checkOut,
  tripId,
}: Props) {
  const router = useRouter();
  const selectedHotel = useTripPricing((s) => s.selectedHotel);
  const removeHotel = useTripPricing((s) => s.removeHotel);
  const formatCurrency = useCurrencyStore((s) => s.format);

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
    ),
  );

  function openSearch() {
    const qs = new URLSearchParams({
      cityCode,
      cityName: destinationCity,
      checkIn,
      checkOut,
      tripId,
    });
    router.push(`/hotels/search?${qs.toString()}`);
  }

  if (selectedHotel) {
    const hotel = selectedHotel.hotel;
    const offer = selectedHotel.offers[0];
    const total = parseFloat(offer?.price.total ?? '0');
    const base = parseFloat(offer?.price.base ?? '0');
    const stars = parseInt(hotel.rating || '3', 10) || 3;
    const apiImage = hotel.media?.[0]?.uri;
    const fallbackImage = getHotelImage(
      hotel.name,
      hotel.address?.cityName ?? hotel.cityCode,
      stars,
    );
    const imageUrl = apiImage || fallbackImage;
    const breakfastIncluded = (hotel.amenities || []).some((a) =>
      /breakfast/i.test(a),
    );
    // Discount = base * 0.85 by default in /api/hotels/search; compute the
    // implied savings only when base is meaningfully smaller than total.
    const discountPct =
      base > 0 && base < total ? Math.round(((total - base) / total) * 100) : 0;
    const perNight = nights > 0 ? total / nights : 0;

    return (
      <div className="my-3 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-neutral-100 dark:border-border-default">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
            <BedDouble className="h-4 w-4 text-primary-500" />
            Accommodation
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-500 px-3 py-1 text-xs font-bold text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Change
            </button>
            <button
              type="button"
              onClick={removeHotel}
              aria-label="Remove accommodation"
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-3 flex items-start gap-3">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-surface-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={hotel.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImage;
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-text-primary text-sm sm:text-base line-clamp-1">
              {hotel.name}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {nights} {nights === 1 ? 'Night' : 'Nights'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {discountPct > 0 && (
                <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-[11px] font-bold text-orange-700 dark:text-orange-300">
                  {discountPct}% Discount
                </span>
              )}
              {breakfastIncluded && (
                <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-300">
                  Breakfast included
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-0.5 justify-end">
              {Array.from({ length: Math.min(stars, 5) }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3 w-3 text-yellow-400 fill-yellow-400"
                />
              ))}
            </div>
            {total > 0 && (
              <p className="text-sm font-extrabold text-primary-500 mt-1">
                {formatCurrency(total, offer?.price.currency || 'EUR')}
              </p>
            )}
            {perNight > 0 && (
              <p className="text-[11px] text-text-muted">
                {formatCurrency(Math.round(perNight), offer?.price.currency || 'EUR')}/night
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openSearch}
      className="my-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-base font-medium text-orange-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
    >
      Add accommodations
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
