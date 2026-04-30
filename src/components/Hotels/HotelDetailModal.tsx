'use client';
import { useEffect } from 'react';
import { X, Star, MapPin, Calendar, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHotelImage } from '@/lib/hotelImages';
import type { HotelOfferData } from './HotelCard';

interface HotelDetailModalProps {
  hotelOffer: HotelOfferData;
  nights: number;
  onClose: () => void;
  onAddToTrip: (hotel: HotelOfferData) => void;
  isSelected?: boolean;
}

function prettyAmenity(amenity: string): string {
  return amenity
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HotelDetailModal({
  hotelOffer,
  nights,
  onClose,
  onAddToTrip,
  isSelected,
}: HotelDetailModalProps) {
  const { hotel, offers } = hotelOffer;
  const bestOffer = offers[0];
  const stars = parseInt(hotel.rating || '3', 10) || 3;
  const apiImage = hotel.media?.[0]?.uri;
  const fallbackImage = getHotelImage(hotel.name, hotel.address?.cityName ?? hotel.cityCode, stars);
  const imageUrl = apiImage || fallbackImage;

  const totalPrice = bestOffer ? parseFloat(bestOffer.price.total) : 0;
  const pricePerNight = nights > 0 && totalPrice > 0 ? totalPrice / nights : 0;
  const currencySym = bestOffer?.price.currency === 'EUR' ? '€'
    : bestOffer?.price.currency === 'USD' ? '$'
    : `${bestOffer?.price.currency ?? ''} `;
  const cancellation = bestOffer?.policies?.cancellations?.[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white dark:bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/90 dark:bg-surface-elevated/90 backdrop-blur flex items-center justify-center hover:bg-white shadow"
          >
            <X className="h-4 w-4 text-text-primary" />
          </button>

          <div className="relative h-56 sm:h-72 bg-neutral-100 dark:bg-neutral-800 overflow-hidden rounded-t-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={hotel.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImage;
              }}
            />
            <div className="absolute top-4 left-4 bg-white/95 dark:bg-surface/95 backdrop-blur rounded-lg px-2.5 py-1 flex items-center gap-1">
              {Array.from({ length: Math.min(stars, 5) }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">{hotel.name}</h2>
              <div className="flex items-center gap-1 mt-1 text-text-muted text-sm">
                <MapPin className="h-4 w-4" />
                <span>
                  {hotel.address?.lines?.join(', ') || hotel.address?.cityName || hotel.cityCode}
                </span>
              </div>
            </div>

            {bestOffer && (
              <div className="bg-neutral-50 dark:bg-surface-elevated rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <Calendar className="h-4 w-4" /> Check-in
                  </span>
                  <span className="font-semibold text-text-primary">{bestOffer.checkInDate}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <Calendar className="h-4 w-4" /> Check-out
                  </span>
                  <span className="font-semibold text-text-primary">{bestOffer.checkOutDate}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-neutral-200 dark:border-border-default">
                  <span className="text-text-secondary">Nights</span>
                  <span className="font-semibold text-text-primary">{nights}</span>
                </div>
              </div>
            )}

            {hotel.amenities && hotel.amenities.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-2 uppercase tracking-wider">
                  Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.map((a) => (
                    <span
                      key={a}
                      className="text-xs text-text-secondary bg-neutral-100 dark:bg-surface-elevated rounded-full px-3 py-1.5"
                    >
                      {prettyAmenity(a)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cancellation && (
              <div className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-text-secondary">
                  {cancellation.amount === '0'
                    ? `Free cancellation${cancellation.deadline ? ` until ${cancellation.deadline.split('T')[0]}` : ''}`
                    : `Cancellation fee: ${currencySym}${cancellation.amount}`}
                </p>
              </div>
            )}

            <div className="flex items-end justify-between pt-4 border-t border-neutral-200 dark:border-border-default">
              <div>
                <p className="text-xs text-text-muted">Total for {nights} nights</p>
                <p className="text-3xl font-bold text-primary-500">
                  {currencySym}{totalPrice > 0 ? totalPrice.toFixed(0) : '—'}
                </p>
                {pricePerNight > 0 && (
                  <p className="text-xs text-text-muted">{currencySym}{pricePerNight.toFixed(0)} per night</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onAddToTrip(hotelOffer)}
                className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                  isSelected
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {isSelected ? '✓ Added to Trip' : 'Add to Trip'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
