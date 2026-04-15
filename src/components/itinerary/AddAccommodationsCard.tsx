'use client';

import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  destinationCity: string;
  /** ISO date string e.g. "2026-05-15" */
  checkIn: string;
  /** ISO date string e.g. "2026-05-22" */
  checkOut: string;
}

/**
 * Empty-state card shown between transport legs.
 * Clicking navigates to /hotels with pre-filled search params.
 */
export default function AddAccommodationsCard({ destinationCity, checkIn, checkOut }: Props) {
  const router = useRouter();

  function handleClick() {
    const params = new URLSearchParams({
      city: destinationCity,
      checkIn,
      checkOut,
    });
    router.push(`/hotels?${params.toString()}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="my-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-base font-medium text-orange-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
    >
      Add accommodations
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
