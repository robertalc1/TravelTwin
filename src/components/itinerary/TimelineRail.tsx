import type { ItineraryStop } from './types';

interface Props {
  stop: ItineraryStop;
  /** Index in the legs array — used to decide whether to show connecting line below */
  index: number;
  isLast: boolean;
}

/**
 * A single timeline bullet + label. Meant to be rendered alongside its
 * corresponding TransportCard in the same flex row.
 *
 * The connecting vertical line extends downward to span the accommodations
 * card gap, ensuring visual continuity between bullets.
 */
export default function TimelineRail({ stop, isLast }: Props) {
  const label = stop.isReturn
    ? `Return to ${stop.city}`
    : stop.daysCount > 0
      ? `${stop.daysCount} Days in ${stop.city}`
      : `Depart from ${stop.city}`;

  return (
    /* self-stretch makes this container fill the full height of the flex row */
    <div className="flex items-start gap-3 self-stretch pt-5">
      {/* Bullet + vertical connector */}
      <div className="relative flex flex-col items-center self-stretch">
        <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gray-900 dark:bg-gray-100" />
        {/* Line fills remaining row height so it connects to the next bullet */}
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-700" />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{label}</p>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{stop.arrivalDate}</p>
      </div>
    </div>
  );
}
