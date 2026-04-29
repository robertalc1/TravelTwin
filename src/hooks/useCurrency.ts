"use client";

import { useEffect } from "react";
import { useCurrencyStore } from "@/stores/currencyStore";

/**
 * Subscribe to currency state and trigger an FX rate refresh on first mount.
 * Components that just need to format amounts should use this hook instead of
 * touching the store directly — it ensures rates are loaded.
 */
export function useCurrency() {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const convert = useCurrencyStore((s) => s.convert);
  const format = useCurrencyStore((s) => s.format);
  const loadRates = useCurrencyStore((s) => s.loadRates);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  return { currency, setCurrency, convert, format };
}
