import { create } from 'zustand';
import type { HotelOfferData } from '@/components/Hotels/HotelCard';
import type { TransferOffer } from '@/app/api/amadeus/transfers/route';

export interface ExtraItem {
  id: string;
  label: string;
  description?: string;
  price: number;          // total price for the trip (already multiplied by nights/adults if needed)
  perNight?: boolean;     // metadata only — used by UI
  icon?: string;          // emoji or lucide name (kept as string for serialisation)
}

interface PricingBreakdown {
  flightPrice: number;
  hotelPrice: number;
  transferPrice: number;
  extrasPrice: number;
  currency: string;
  hotelLabel?: string;     // shown when no full HotelOfferData is selected (default seed)
  transferLabel?: string;  // shown when no full TransferOffer is selected (default seed)
}

interface TripPricingStore {
  tripId: string | null;
  breakdown: PricingBreakdown;
  selectedHotel: HotelOfferData | null;
  selectedTransfer: TransferOffer | null;
  extras: ExtraItem[];

  initTrip: (tripId: string, flightPrice: number, currency?: string) => void;
  setFlightPrice: (price: number, currency?: string) => void;

  /** Seed a default hotel without a full HotelOfferData (used for the initial package hotel). */
  seedHotel: (label: string, price: number) => void;
  selectHotel: (hotel: HotelOfferData, price: number) => void;
  removeHotel: () => void;

  /** Seed a default transfer estimate (used for the auto-computed airport→hotel transfer). */
  seedTransfer: (label: string, price: number) => void;
  selectTransfer: (transfer: TransferOffer, price: number) => void;
  removeTransfer: () => void;

  toggleExtra: (item: ExtraItem) => void;
  hasExtra: (id: string) => boolean;

  getTotalPrice: () => number;
  getBreakdownText: () => string;
  reset: () => void;
}

const EMPTY_BREAKDOWN: PricingBreakdown = {
  flightPrice: 0,
  hotelPrice: 0,
  transferPrice: 0,
  extrasPrice: 0,
  currency: 'EUR',
};

function recomputeExtrasPrice(extras: ExtraItem[]): number {
  return extras.reduce((sum, e) => sum + (e.price || 0), 0);
}

export const useTripPricing = create<TripPricingStore>((set, get) => ({
  tripId: null,
  breakdown: { ...EMPTY_BREAKDOWN },
  selectedHotel: null,
  selectedTransfer: null,
  extras: [],

  initTrip: (tripId, flightPrice, currency = 'EUR') => {
    const current = get();
    if (current.tripId === tripId) {
      // Same trip — only refresh flight price, keep selections + extras
      set({ breakdown: { ...current.breakdown, flightPrice, currency } });
      return;
    }
    // New trip — reset everything
    set({
      tripId,
      breakdown: { ...EMPTY_BREAKDOWN, flightPrice, currency },
      selectedHotel: null,
      selectedTransfer: null,
      extras: [],
    });
  },

  setFlightPrice: (price, currency = 'EUR') =>
    set((state) => ({ breakdown: { ...state.breakdown, flightPrice: price, currency } })),

  seedHotel: (label, price) =>
    set((state) => {
      // Don't overwrite a user-picked hotel
      if (state.selectedHotel) return state;
      return {
        breakdown: { ...state.breakdown, hotelPrice: price, hotelLabel: label },
      };
    }),

  selectHotel: (hotel, price) =>
    set((state) => ({
      selectedHotel: hotel,
      breakdown: { ...state.breakdown, hotelPrice: price, hotelLabel: hotel.hotel.name },
    })),

  removeHotel: () =>
    set((state) => ({
      selectedHotel: null,
      breakdown: { ...state.breakdown, hotelPrice: 0, hotelLabel: undefined },
    })),

  seedTransfer: (label, price) =>
    set((state) => {
      if (state.selectedTransfer) return state;
      return {
        breakdown: { ...state.breakdown, transferPrice: price, transferLabel: label },
      };
    }),

  selectTransfer: (transfer, price) =>
    set((state) => ({
      selectedTransfer: transfer,
      breakdown: { ...state.breakdown, transferPrice: price, transferLabel: transfer.vehicle.description },
    })),

  removeTransfer: () =>
    set((state) => ({
      selectedTransfer: null,
      breakdown: { ...state.breakdown, transferPrice: 0, transferLabel: undefined },
    })),

  toggleExtra: (item) =>
    set((state) => {
      const exists = state.extras.find((e) => e.id === item.id);
      const next = exists
        ? state.extras.filter((e) => e.id !== item.id)
        : [...state.extras, item];
      return {
        extras: next,
        breakdown: { ...state.breakdown, extrasPrice: recomputeExtrasPrice(next) },
      };
    }),

  hasExtra: (id) => get().extras.some((e) => e.id === id),

  getTotalPrice: () => {
    const { flightPrice, hotelPrice, transferPrice, extrasPrice } = get().breakdown;
    return flightPrice + hotelPrice + transferPrice + extrasPrice;
  },

  getBreakdownText: () => {
    const { flightPrice, hotelPrice, transferPrice, extrasPrice, currency } = get().breakdown;
    const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : `${currency} `;
    const parts: string[] = [];
    if (flightPrice > 0) parts.push(`Flight: ${sym}${flightPrice}`);
    if (hotelPrice > 0) parts.push(`Hotel: ${sym}${hotelPrice}`);
    if (transferPrice > 0) parts.push(`Transfer: ${sym}${transferPrice}`);
    if (extrasPrice > 0) parts.push(`Extras: ${sym}${extrasPrice}`);
    return parts.join(' + ');
  },

  reset: () =>
    set({
      tripId: null,
      breakdown: { ...EMPTY_BREAKDOWN },
      selectedHotel: null,
      selectedTransfer: null,
      extras: [],
    }),
}));
