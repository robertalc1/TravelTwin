'use client';
import { Star, MapPin, Wifi, UtensilsCrossed, Dumbbell, Waves } from 'lucide-react';
import { motion } from 'framer-motion';
import { getHotelImage } from '@/lib/hotelImages';

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  SWIMMING_POOL: <Waves className="h-3.5 w-3.5" />,
  RESTAURANT: <UtensilsCrossed className="h-3.5 w-3.5" />,
  FITNESS_CENTER: <Dumbbell className="h-3.5 w-3.5" />,
  WIFI: <Wifi className="h-3.5 w-3.5" />,
};

export interface HotelOfferData {
  hotel: {
    hotelId: string;
    name: string;
    rating?: string;
    cityCode: string;
    address?: { lines?: string[]; cityName?: string };
    amenities?: string[];
    media?: { uri: string }[];
  };
  offers: {
    id?: string;
    price: { currency: string; total: string; base?: string };
    room?: { typeEstimated?: { beds?: number; bedType?: string } };
    policies?: { cancellations?: { amount?: string; deadline?: string }[] };
    checkInDate: string;
    checkOutDate: string;
  }[];
}

interface HotelCardProps {
  hotelOffer: HotelOfferData;
  onSelect: (hotel: HotelOfferData) => void;
  nights?: number;
}

function prettyAmenity(amenity: string): string {
  return amenity
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HotelCard({ hotelOffer, onSelect, nights = 1 }: HotelCardProps) {
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
  const isFreeCancel = bestOffer?.policies?.cancellations?.[0]?.amount === '0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-surface rounded-2xl overflow-hidden border border-neutral-200 dark:border-border-default hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick={() => onSelect(hotelOffer)}
    >
      <div className="relative h-48 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackImage;
          }}
        />
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-surface/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
          {Array.from({ length: Math.min(stars, 5) }).map((_, i) => (
            <Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
          ))}
        </div>
        {isFreeCancel && (
          <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-medium rounded-lg px-2 py-1">
            Free Cancel
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-text-primary text-base line-clamp-1 group-hover:text-primary-500 transition-colors">
          {hotel.name}
        </h3>

        <div className="flex items-center gap-1 mt-1 text-text-muted text-sm">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="line-clamp-1">
            {hotel.address?.lines?.[0] || hotel.address?.cityName || hotel.cityCode}
          </span>
        </div>

        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {hotel.amenities.slice(0, 4).map((amenity) => (
              <span
                key={amenity}
                className="flex items-center gap-1 text-xs text-text-secondary bg-neutral-100 dark:bg-surface-elevated rounded-md px-2 py-1"
              >
                {AMENITY_ICONS[amenity]}
                {prettyAmenity(amenity)}
              </span>
            ))}
          </div>
        )}

        {bestOffer?.room?.typeEstimated?.beds && (
          <p className="text-xs text-text-muted mt-2">
            {bestOffer.room.typeEstimated.beds} {bestOffer.room.typeEstimated.bedType?.toLowerCase()} bed
          </p>
        )}

        <div className="flex items-end justify-between mt-4 pt-3 border-t border-neutral-100 dark:border-border-default">
          <div>
            <p className="text-xs text-text-muted">per night from</p>
            <p className="text-2xl font-bold text-primary-500">
              {currencySym}{pricePerNight > 0 ? pricePerNight.toFixed(0) : '—'}
            </p>
          </div>
          <button
            type="button"
            className="bg-primary-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
          >
            View Deal
          </button>
        </div>
      </div>
    </motion.div>
  );
}
