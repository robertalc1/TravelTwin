'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import TransportCard from './TransportCard';
import AddAccommodationsCard from './AddAccommodationsCard';
import TimelineRail from './TimelineRail';
import type { TransportLeg, ItineraryStop } from './types';

interface Props {
  legs: TransportLeg[];
  stops: ItineraryStop[];
}

/**
 * Full itinerary section — 2-column layout:
 *   Left (flex-1):  TransportCard rows + AddAccommodations between them
 *   Right (280px):  TimelineRail bullets aligned to each card row (desktop only)
 *
 * Each leg + its timeline bullet share a flex row so they stay vertically aligned
 * regardless of card content height. The connector line is drawn using flex-1
 * on the bullet's vertical rule, spanning into the accommodations gap row.
 */
export default function ItinerarySection({ legs: initialLegs, stops: initialStops }: Props) {
  const router = useRouter();
  // Allow removing non-first legs at runtime
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const visibleLegs = initialLegs.filter(l => !removedIds.has(l.id));
  const visibleStops = initialStops.filter((_, i) => !removedIds.has(initialLegs[i]?.id ?? ''));

  if (visibleLegs.length === 0) return null;

  function handleChangeFlight(leg: TransportLeg) {
    const params = new URLSearchParams({
      from: leg.from.iataCode ?? '',
      to: leg.to.iataCode ?? '',
    });
    router.push(`/flights?${params.toString()}`);
  }

  return (
    <section>
      <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
        Your itinerary
      </h2>

      {visibleLegs.map((leg, i) => {
        const stop = visibleStops[i];
        const isFirstLeg = i === 0;
        const isLastLeg = i === visibleLegs.length - 1;
        // Dates for the AddAccommodations card below this leg
        const nextLeg = visibleLegs[i + 1];
        const checkIn = leg.arrival.isoDateTime.split('T')[0];
        const checkOut = nextLeg?.departure.isoDateTime.split('T')[0] ?? checkIn;

        return (
          <div key={leg.id}>
            {/* One "row" — transport card (left) + timeline entry (right) */}
            <div className="flex gap-6 lg:gap-8">
              {/* ── Left: Transport card ── */}
              <motion.div
                className="min-w-0 flex-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.35 }}
              >
                <TransportCard
                  leg={leg}
                  isFirst={isFirstLeg}
                  onChangeFlight={() => handleChangeFlight(leg)}
                  onRemove={() => setRemovedIds(prev => new Set([...prev, leg.id]))}
                />
              </motion.div>

              {/* ── Right: Timeline bullet (desktop only) ── */}
              {stop && (
                <div className="hidden w-[280px] shrink-0 lg:flex">
                  <TimelineRail stop={stop} index={i} isLast={isLastLeg} />
                </div>
              )}
            </div>

            {/* Accommodations gap between legs (continues the timeline line) */}
            {!isLastLeg && (
              <div className="flex gap-6 lg:gap-8">
                <div className="min-w-0 flex-1">
                  <AddAccommodationsCard
                    destinationCity={leg.to.city}
                    checkIn={checkIn}
                    checkOut={checkOut}
                  />
                </div>
                {/* Spacer on the right keeps the timeline line going — the TimelineRail
                    above draws its flex-1 line, which naturally extends through this row */}
                <div className="hidden w-[280px] shrink-0 lg:block" />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
