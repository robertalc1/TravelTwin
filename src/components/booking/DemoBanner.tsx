import { AlertTriangle } from "lucide-react";

/**
 * Persistent banner shown on every step of /booking/simulate.
 * Required because the form collects card-shaped input even though the flow
 * is non-functional — users must be told no real charge happens.
 */
export function DemoBanner() {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-red-800 dark:text-red-200"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="text-sm leading-snug">
        <strong className="font-bold uppercase tracking-wide">Demo only</strong>
        {" — "}This is a simulation built for academic demonstration. No payment
        is processed and no card data is stored. Use only test cards (e.g.
        <span className="font-mono"> 4242 4242 4242 4242</span>).
      </div>
    </div>
  );
}
