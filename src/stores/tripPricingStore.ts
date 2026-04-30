import { create } from 'zustand';
import type { HotelOfferData } from '@/components/Hotels/HotelCard';
import type { TransferOffer } from '@/app/api/amadeus/transfers/route';

interface PricingBreakdown {
  flightPrice: number;
  hotelPrice: number;
  transferPrice: number;
  currency: string;
}

interface TripPricingStore {
  tripId: string | null;
  breakdown: PricingBreakdown;
  selectedHotel: HotelOfferData | null;
  selectedTransfer: TransferOffer | null;

  initTrip: (tripId: string, flightPrice: number, currency?: string) => void;
  setFlightPrice: (price: number, currency?: string) => void;
  selectHotel: (hotel: HotelOfferData, price: number) => void;
  removeHotel: () => void;
  selectTransfer: (transfer: TransferOffer, price: number) => void;
  removeTransfer: () => void;
  getTotalPrice: () => number;
  getBreakdownText: () => string;
  reset: () => void;
}

const EMPTY_BREAKDOWN: PricingBreakdown = {
  flightPrice: 0,
  hotelPrice: 0,
  transferPrice: 0,
  currency: 'EUR',
};

export const useTripPricing = create<TripPricingStore>((set, get) => ({
  tripId: null,
  breakdown: { ...EMPTY_BREAKDOWN },
  selectedHotel: null,
  selectedTransfer: null,

  initTrip: (tripId, flightPrice, currency = 'EUR') => {
    const current = get();
    if (current.tripId === tripId) {
      // Same trip — only refresh flight price, keep selections
      set({ breakdown: { ...current.breakdown, flightPrice, currency } });
      return;
    }
    // New trip — reset selections
    set({
      tripId,
      breakdown: { ...EMPTY_BREAKDOWN, flightPrice, currency },
      selectedHotel: null,
      selectedTransfer: null,
    });
  },

  setFlightPrice: (price, currency = 'EUR') =>
    set((state) => ({ breakdown: { ...state.breakdown, flightPrice: price, currency } })),

  selectHotel: (hotel, price) =>
    set((state) => ({
      selectedHotel: hotel,
      breakdown: { ...state.breakdown, hotelPrice: price },
    })),

  removeHotel: () =>
    set((state) => ({
      selectedHotel: null,
      breakdown: { ...state.breakdown, hotelPrice: 0 },
    })),

  selectTransfer: (transfer, price) =>
    set((state) => ({
      selectedTransfer: transfer,
      breakdown: { ...state.breakdown, transferPrice: price },
    })),

  removeTransfer: () =>
    set((state) => ({
      selectedTransfer: null,
      breakdown: { ...state.breakdown, transferPrice: 0 },
    })),

  getTotalPrice: () => {
    const { flightPrice, hotelPrice, transferPrice } = get().breakdown;
    return flightPrice + hotelPrice + transferPrice;
  },

  getBreakdownText: () => {
    const { flightPrice, hotelPrice, transferPrice, currency } = get().breakdown;
    const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : `${currency} `;
    const parts: string[] = [];
    if (flightPrice > 0) parts.push(`Flight: ${sym}${flightPrice}`);
    if (hotelPrice > 0) parts.push(`Hotel: ${sym}${hotelPrice}`);
    if (transferPrice > 0) parts.push(`Transfer: ${sym}${transferPrice}`);
    return parts.join(' + ');
  },

  reset: () =>
    set({
      tripId: null,
      breakdown: { ...EMPTY_BREAKDOWN },
      selectedHotel: null,
      selectedTransfer: null,
    }),
}));
