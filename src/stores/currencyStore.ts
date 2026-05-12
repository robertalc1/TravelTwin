import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  CURRENCY_LIST,
  type CurrencyCode,
  convertAmount,
  formatAmount,
  getRates,
} from "@/lib/currencyService";

/**
 * Per the i18n plan: locale drives the default currency (EN → EUR, RO → RON)
 * BUT only when the user hasn't already picked a currency by hand. The
 * `currencyManuallySet` flag distinguishes "auto" from "explicit" choices.
 */
export const LOCALE_DEFAULT_CURRENCY: Record<string, CurrencyCode> = {
  en: "EUR",
  ro: "RON",
};

interface CurrencyStore {
  currency: CurrencyCode;
  /** True after the user explicitly picks a currency (via CurrencySelector). */
  currencyManuallySet: boolean;
  rates: Record<string, number>;
  loading: boolean;
  /** Sets currency from a user action — flips `currencyManuallySet` to true. */
  setCurrency: (c: CurrencyCode) => void;
  /** Sets currency from an automatic detection (geolocation, locale default).
   *  Does NOT flip `currencyManuallySet` — respects the user's explicit choice. */
  setCurrencyAuto: (c: CurrencyCode) => void;
  /** Applies the default currency for a locale unless the user manually set one. */
  applyLocaleDefault: (locale: string) => void;
  loadRates: () => Promise<void>;
  convert: (amount: number, from?: string) => number;
  format: (amount: number, from?: string) => string;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: "EUR",
      currencyManuallySet: false,
      rates: { EUR: 1 },
      loading: false,

      setCurrency: (c) => set({ currency: c, currencyManuallySet: true }),

      setCurrencyAuto: (c) => {
        if (get().currencyManuallySet) return;
        set({ currency: c });
      },

      applyLocaleDefault: (locale) => {
        if (get().currencyManuallySet) return;
        const fallback = LOCALE_DEFAULT_CURRENCY[locale] ?? "EUR";
        set({ currency: fallback });
      },

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
      partialize: (state) => ({
        currency: state.currency,
        currencyManuallySet: state.currencyManuallySet,
      }),
    }
  )
);

export { CURRENCY_LIST };
export type { CurrencyCode };
