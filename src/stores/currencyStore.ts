import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  CURRENCY_LIST,
  type CurrencyCode,
  convertAmount,
  formatAmount,
  getRates,
} from "@/lib/currencyService";

interface CurrencyStore {
  currency: CurrencyCode;
  rates: Record<string, number>;
  loading: boolean;
  setCurrency: (c: CurrencyCode) => void;
  loadRates: () => Promise<void>;
  convert: (amount: number, from?: string) => number;
  format: (amount: number, from?: string) => string;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: "EUR",
      rates: { EUR: 1 },
      loading: false,

      setCurrency: (c) => set({ currency: c }),

      loadRates: async () => {
        if (get().loading) return;
        set({ loading: true });
        try {
          const rates = await getRates();
          set({ rates, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      convert: (amount, from = "EUR") => {
        const { currency, rates } = get();
        return convertAmount(amount, from, currency, rates);
      },

      format: (amount, from = "EUR") => {
        const { currency, rates } = get();
        const converted = convertAmount(amount, from, currency, rates);
        return formatAmount(converted, currency);
      },
    }),
    {
      name: "currency-store",
      storage: createJSONStorage(() => localStorage),
      // Don't persist the rates table — it's refreshed via loadRates() per session.
      partialize: (state) => ({ currency: state.currency }),
    }
  )
);

export { CURRENCY_LIST };
export type { CurrencyCode };
