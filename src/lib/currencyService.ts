/**
 * Free FX rates from open.er-api.com (no API key, daily refresh upstream).
 * We cache the response in localStorage for 1 hour to limit traffic and to
 * make the first paint instant when the user navigates between pages.
 */

export type CurrencyCode = "EUR" | "USD" | "RON" | "GBP" | "CHF" | "SEK";

export const CURRENCY_LIST: ReadonlyArray<{ code: CurrencyCode; symbol: string; label: string }> = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "RON", symbol: "lei", label: "Romanian Leu" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona" },
];

const STORAGE_KEY = "fx-rates-eur-base";
const TTL_MS = 60 * 60 * 1000;

interface CachedRates {
  ts: number;
  rates: Record<string, number>;
}

/**
 * Fetch latest rates with EUR as base. Returns the cached copy when fresh.
 * Falls back to a hard-coded snapshot if the network call fails — this keeps
 * the UI working offline rather than crashing.
 */
export async function getRates(): Promise<Record<string, number>> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedRates;
        if (Date.now() - parsed.ts < TTL_MS) return parsed.rates;
      }
    } catch { /* ignore parse errors */ }
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR");
    if (!res.ok) throw new Error("FX fetch failed");
    const data = await res.json();
    const rates = data.rates as Record<string, number>;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), rates }));
      } catch { /* storage full / private mode */ }
    }
    return rates;
  } catch {
    return FALLBACK_RATES;
  }
}

/** Snapshot from 2026-04 — used only when network fails. */
const FALLBACK_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  RON: 4.97,
  GBP: 0.86,
  CHF: 0.97,
  SEK: 11.4,
};

/**
 * Convert an amount denominated in `from` to the target currency, given the
 * EUR-based rate table. Returns the amount unchanged when from === to.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  // amount → EUR → target
  return (amount / fromRate) * toRate;
}

/**
 * Format a number as a localized currency string. Uses Intl when supported.
 */
export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    const meta = CURRENCY_LIST.find((c) => c.code === currency);
    const symbol = meta?.symbol ?? currency;
    return `${symbol} ${Math.round(amount).toLocaleString()}`;
  }
}
