'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { getStopsLabel } from '@/lib/itineraryHelpers';
import type { StopDetail } from './types';

interface Props {
  stops: number;
  stopsDetails?: StopDetail[];
}

/** Badge showing "Direct" / "1 stop ⓘ" / "2 stops ⓘ" with layover tooltip. */
export default function StopsBadge({ stops, stopsDetails }: Props) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const { text, bgClass, textClass } = getStopsLabel(stops);

  const tooltipText = stopsDetails
    ?.map(s => `Layover at ${s.airport}: ${s.layoverDuration}`)
    .join(' · ') ?? '';

  const showInfo = stops > 0 && Boolean(tooltipText);

  return (
    <div className="relative inline-flex items-center justify-center">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium ${bgClass} ${textClass}`}
      >
        {text}
        {showInfo && (
          <button
            type="button"
            aria-label="Stop details"
            className="focus:outline-none"
            onMouseEnter={() => setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
          >
            <Info className="h-3 w-3" />
          </button>
        )}
      </span>

      {tooltipVisible && tooltipText && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
          {tooltipText}
          {/* Arrow */}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
