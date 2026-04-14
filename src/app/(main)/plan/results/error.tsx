"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PlanResultsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[plan/results] Error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
        <p className="text-text-secondary mb-6">
          We couldn{"'"}t load your trip results. This usually happens when session data expires.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-xl border border-neutral-200 bg-white px-5 py-3 font-semibold text-text-primary hover:bg-neutral-50 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl bg-primary-500 px-5 py-3 font-bold text-white hover:bg-primary-600 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
