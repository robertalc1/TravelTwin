"use client";

import { useEffect } from "react";
import { useCurrencyStore } from "@/stores/currencyStore";
import type { CurrencyCode } from "@/lib/currencyService";

// Keys are lowercase full country names — what ip-api.com / ipapi.co return
const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  "romania": "RON",
  "united kingdom": "GBP",
  "united states": "USD",
  "switzerland": "CHF",
  "sweden": "SEK",
};

// v2 forces re-detection for users who got the broken v1 (which always set EUR)
const GEO_DONE_KEY = "geo-currency-v2";

export default function CurrencyAutoDetect() {
  // Auto-detect must NOT override an explicit user choice — use setCurrencyAuto
  // which respects the `currencyManuallySet` flag from the store.
  const setCurrencyAuto = useCurrencyStore((s) => s.setCurrencyAuto);
  const loadRates = useCurrencyStore((s) => s.loadRates);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Always load exchange rates so all price conversions work
    loadRates();

    if (localStorage.getItem(GEO_DONE_KEY)) return;

    fetch("/api/geolocation")
      .then((r) => r.json())
      .then((data: { country?: string }) => {
        const cc = data.country?.toLowerCase().trim();
        const currency: CurrencyCode = (cc && COUNTRY_CURRENCY[cc]) ? COUNTRY_CURRENCY[cc]! : "EUR";
        setCurrencyAuto(currency);
        loadRates();
      })
      .catch(() => { /* ignore — keep default EUR */ })
      .finally(() => {
        localStorage.setItem(GEO_DONE_KEY, "1");
      });
  }, [setCurrencyAuto, loadRates]);

  return null;
}
