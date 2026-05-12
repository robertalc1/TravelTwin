"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useCurrencyStore } from "@/stores/currencyStore";

/**
 * Applies the locale-default currency on first mount of each [locale] layout.
 * Respects `currencyManuallySet` from the store, so users who picked a
 * currency by hand keep their choice across language switches.
 */
export default function LocaleCurrencySync() {
  const locale = useLocale();
  const applyLocaleDefault = useCurrencyStore((s) => s.applyLocaleDefault);

  useEffect(() => {
    applyLocaleDefault(locale);
  }, [locale, applyLocaleDefault]);

  return null;
}
