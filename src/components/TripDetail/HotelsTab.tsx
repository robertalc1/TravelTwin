'use client';
import { useRouter } from 'next/navigation';
import { Plus, Star, MapPin, Pencil, X } from 'lucide-react';
import { useTripPricing } from '@/stores/tripPricingStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import { getHotelImage } from '@/lib/hotelImages';

interface HotelsTabProps {
  /** IATA city code (e.g. "BER") — used to scope the search page. */
  destinationCityCode: string;
  /** Pretty city name (e.g. "Berlin") — shown in the CTA + sub-page header. */
  destinationCity: string;
  checkInDate: string;
  checkOutDate: string;
  /** Trip id the user is editing — passed to the search page so "Select Stay"
   *  on the hotel detail can navigate back here with the selection saved. */
  tripId?: string;
}

export default function HotelsTab({
  destinationCityCode,
  destinationCity,
  checkInDate,
  checkOutDate,
  tripId,
}: HotelsTabProps) {
  const router = useRouter();
  const selectedHotel = useTripPricing((s) => s.selectedHotel);
  const removeHotel = useTripPricing((s) => s.removeHotel);
  const formatCurrency = useCurrencyStore((s) => s.format);

  function openSearch() {
    const qs = new URLSearchParams({
      cityCode: destinationCityCode,
      cityName: destinationCity,
      checkIn: checkInDate,
      checkOut: checkOutDate,
    });
    if (tripId) qs.set('tripId', tripId);
    router.push(`/hotels?${qs.toString()}`);
  }

  function openSelectedHotel() {
    if (!selectedHotel || !tripId) return;
    const total = selectedHotel.offers[0]?.price.total ?? '';
    const qs = new URLSearchParams({
      cityCode: destinationCityCode,
      checkIn: checkInDate,
      checkOut: checkOutDate,
    });
    if (total) qs.set('total', total);
    if (selectedHotel.hotel.name) qs.set('name', selectedHotel.hotel.name);
    router.push(
      `/plan/trip/${encodeURIComponent(tripId)}/hotel/${encodeURIComponent(
        selectedHotel.hotel.hotelId,
      )}?${qs.toString()}`,
    );
  }

  // Show the picked hotel inline instead of the CTA. The user can swap or
  // clear it without leaving the trip page.
  if (selectedHotel) {
    const hotel = selectedHotel.hotel;
    const offer = selectedHotel.offers[0];
    const total = parseFloat(offer?.price.total ?? '0');
    const stars = parseInt(hotel.rating || '3', 10) || 3;
    const apiImage = hotel.media?.[0]?.uri;
    const fallbackImage = getHotelImage(
      hotel.name,
      hotel.address?.cityName ?? hotel.cityCode,
      stars,
    );
    const imageUrl = apiImage || fallbackImage;
    const canOpen = Boolean(tripId);

    return (
      <div
        role={canOpen ? 'button' : undefined}
        tabIndex={canOpen ? 0 : undefined}
        onClick={canOpen ? openSelectedHotel : undefined}
        onKeyDown={
          canOpen
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openSelectedHotel();
                }
              }
            : undefined
        }
        className={`rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface overflow-hidden ${
          canOpen ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
        }`}
      >
        <div className="flex flex-col md:flex-row">
          <div className="relative h-44 md:h-auto md:w-56 md:shrink-0">
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
          <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {Array.from({ length: Math.min(stars, 5) }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
                <h3 className="font-bold text-text-primary text-base line-clamp-1">
                  {hotel.name}
                </h3>
                {hotel.address?.lines?.[0] && (
                  <p className="flex items-center gap-1 text-xs text-text-muted mt-1 truncate">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{hotel.address.lines[0]}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeHotel();
                }}
                aria-label="Remove hotel"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-end justify-between gap-3 mt-auto pt-3 border-t border-neutral-100 dark:border-border-default">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
                  Total for your stay
                </p>
                <p className="text-xl font-extrabold text-primary-500">
                  {total > 0 ? formatCurrency(total, offer?.price.currency || 'EUR') : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openSearch();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-border-default px-3 py-2 text-xs font-bold text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Change
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openSearch}
      className="w-full rounded-2xl border-2 border-dashed border-neutral-300 dark:border-border-default bg-neutral-50/50 dark:bg-surface-elevated/50 px-6 py-10 sm:py-14 flex flex-col items-center gap-3 text-text-secondary hover:border-primary-400 hover:bg-primary-50/40 dark:hover:bg-primary-900/10 hover:text-primary-600 transition-colors group"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-surface border border-neutral-200 dark:border-border-default group-hover:border-primary-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
        <Plus className="h-5 w-5 text-text-muted group-hover:text-primary-600 transition-colors" />
      </span>
      <span className="text-base font-bold">Add accommodation</span>
      <span className="text-xs text-text-muted text-center max-w-xs">
        Browse hotels in {destinationCity} — no quota used until you open this.
      </span>
    </button>
  );
}

