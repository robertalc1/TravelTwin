"use client";

import { useEffect } from "react";
import { useCurrencyStore } from "@/stores/currencyStore";
import type { CurrencyCode } from "@/lib/currencyService";

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  RO: "RON",
  GB: "GBP",
  US: "USD",
  CH: "CHF",
  SE: "SEK",
};

const GEO_DONE_KEY = "geo-currency-done";

export default function CurrencyAutoDetect() {
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const loadRates = useCurrencyStore((s) => s.loadRates);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(GEO_DONE_KEY)) return;

    fetch("/api/geolocation")
      .then((r) => r.json())
      .then((data: { country?: string }) => {
        const cc = data.country?.toUpperCase();
        const currency: CurrencyCode = (cc && COUNTRY_CURRENCY[cc]) ? COUNTRY_CURRENCY[cc]! : "EUR";
        setCurrency(currency);
        loadRates();
      })
      .catch(() => { /* ignore — keep default EUR */ })
      .finally(() => {
        localStorage.setItem(GEO_DONE_KEY, "1");
      });
  }, [setCurrency, loadRates]);

  return null;
}
