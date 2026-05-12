'use client';

import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';

/** Hard timer (ms) from component mount. After this elapses, the modal blocks
 *  the page and asks the user to reload — guarantees prices stay fresh and
 *  prevents an idle tab from quietly burning RapidAPI quota across hours. */
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExpired(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  if (!expired) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="rounded-2xl bg-white dark:bg-surface max-w-md w-full p-6 sm:p-8 text-center shadow-2xl">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
          <CountdownTile label="Hours" value="00" />
          <span className="text-2xl font-bold text-text-muted self-start mt-3">:</span>
          <CountdownTile label="Minutes" value="00" />
          <span className="text-2xl font-bold text-text-muted self-start mt-3">:</span>
          <CountdownTile label="Seconds" value="00" />
        </div>
        <h2
          id="session-timeout-title"
          className="text-xl sm:text-2xl font-bold text-text-primary mb-2"
        >
          Session timed out
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          To make sure you&apos;re always seeing the latest prices, you need to
          refresh the page to continue.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded-xl bg-primary-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-primary-600 transition-colors inline-flex items-center justify-center gap-2"
        >
          <RotateCw className="h-4 w-4" />
          Reload
        </button>
      </div>
    </div>
  );
}
