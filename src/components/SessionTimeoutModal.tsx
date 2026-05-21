'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Home } from 'lucide-react';

/** Hard timer (ms) from component mount. After this elapses, the modal blocks
 *  the page and ships the user back to the homepage so the next view loads
 *  fresh live offers. Keeps idle tabs from burning Tripadvisor quota across
 *  hours. */
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/** SessionStorage keys we clear on timeout so the homepage re-fetches and
 *  plan/trip detail pages don't show stale package data. The geo cache stays
 *  put — re-detecting the IP on every reload is wasteful. */
const STALE_KEYS = [
  'planResults_v2',
  'homepage_destinations',
  'bookingTrip',
  'currentBookingMeta',
  'lastBookingRef',
];

interface TileProps {
  label: string;
  value: string;
}

function CountdownTile({ label, value }: TileProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-xl bg-neutral-100 dark:bg-surface-elevated px-4 py-3 min-w-[64px]">
        <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tabular-nums">
          {value}
        </p>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
    </div>
  );
}

export default function SessionTimeoutModal() {
  const locale = useLocale();
  const [expired, setExpired] = useState(false);
  const isRo = locale === 'ro';

  useEffect(() => {
    const t = setTimeout(() => setExpired(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  if (!expired) return null;

  const labels = {
    hours: isRo ? 'Ore' : 'Hours',
    minutes: isRo ? 'Minute' : 'Minutes',
    seconds: isRo ? 'Secunde' : 'Seconds',
    title: isRo ? 'Sesiune expirată' : 'Session timed out',
    body: isRo
      ? 'Ca să-ți arătăm cele mai noi oferte live, te ducem înapoi la pagina principală.'
      : 'To make sure you see the latest live deals, we will take you back to the homepage.',
    button: isRo ? 'Înapoi la pagina principală' : 'Back to homepage',
  };

  function goHome() {
    try {
      for (const key of STALE_KEYS) {
        sessionStorage.removeItem(key);
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith('trip_') || k.startsWith('booking_') || k.startsWith('flightView_'))) {
          sessionStorage.removeItem(k);
        }
      }
    } catch { /* ignore quota errors */ }
    window.location.href = `/${locale}`;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="rounded-2xl bg-white dark:bg-surface max-w-md w-full p-6 sm:p-8 text-center shadow-2xl">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
          <CountdownTile label={labels.hours} value="00" />
          <span className="text-2xl font-bold text-text-muted self-start mt-3">:</span>
          <CountdownTile label={labels.minutes} value="00" />
          <span className="text-2xl font-bold text-text-muted self-start mt-3">:</span>
          <CountdownTile label={labels.seconds} value="00" />
        </div>
        <h2
          id="session-timeout-title"
          className="text-xl sm:text-2xl font-bold text-text-primary mb-2"
        >
          {labels.title}
        </h2>
        <p className="text-sm text-text-secondary mb-6">{labels.body}</p>
        <button
          type="button"
          onClick={goHome}
          className="w-full rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-primary-600 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Home className="h-4 w-4" />
          {labels.button}
        </button>
      </div>
    </div>
  );
}
