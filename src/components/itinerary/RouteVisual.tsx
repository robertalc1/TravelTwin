import { Plane, Bus, Train } from 'lucide-react';
import StopsBadge from './StopsBadge';
import type { TransportLeg, TransportIcon } from './types';

// Map icon name → Lucide component
const ICON_COMPONENTS: Record<TransportIcon, React.ElementType> = {
  plane: Plane,
  bus: Bus,
  train: Train,
};

interface Props {
  leg: TransportLeg;
}

/**
 * Displays the route in 3 columns:
 *   [departure city / time / date] — [dashed line + icon + badge] — [arrival city / time / date]
 */
export default function RouteVisual({ leg }: Props) {
  return (
    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
      {/* Departure */}
      <div className="text-left">
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{leg.from.city}</p>
        <p className="mt-1 text-2xl font-semibold leading-none text-gray-900 dark:text-gray-100">
          {leg.departure.time || leg.departure.date}
        </p>
        {leg.departure.time && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{leg.departure.date}</p>
        )}
      </div>

      {/* Center: dashed line + transport icon(s) + stops badge */}
      <div className="flex min-w-[140px] flex-col items-center gap-2 sm:min-w-[180px]">
        {/* Dashed line with icon centered on it */}
        <div className="relative flex w-full items-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-600" />
          </div>
          {/* Icon floats above the line on a white "island" */}
          <div className="relative mx-auto flex items-center gap-0.5 bg-white px-2 dark:bg-gray-900">
            {leg.transportIcons.map((icon, i) => {
              const Icon = ICON_COMPONENTS[icon];
              // Plane rotated to look like it's flying right-up; others upright
              const cls = icon === 'plane'
                ? 'h-4 w-4 text-gray-400 dark:text-gray-500 -rotate-45'
                : 'h-4 w-4 text-gray-400 dark:text-gray-500';
              return <Icon key={i} className={cls} />;
            })}
          </div>
        </div>

        {/* Stops badge */}
        <StopsBadge stops={leg.stops} stopsDetails={leg.stopsDetails} />
      </div>

      {/* Arrival */}
      <div className="text-right">
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{leg.to.city}</p>
        <p className="mt-1 text-2xl font-semibold leading-none text-gray-900 dark:text-gray-100">
          {leg.arrival.time || leg.arrival.date}
        </p>
        {leg.arrival.time && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{leg.arrival.date}</p>
        )}
      </div>
    </div>
  );
}
