import { Leaf, Flame, Cloud } from "lucide-react";
import type { CarbonResult } from "@/lib/carbon";

interface Props {
  carbon: CarbonResult;
  className?: string;
}

/**
 * Compact badge for use on package / flight cards.
 * Color-coded by ecoScore: green (eco), amber (mid), red (high).
 */
export function CarbonFootprintBadge({ carbon, className = "" }: Props) {
  const tone =
    carbon.ecoScore >= 60
      ? { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", icon: Leaf }
      : carbon.ecoScore >= 30
      ? { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", icon: Cloud }
      : { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800", icon: Flame };

  const Icon = tone.icon;
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border ${tone.bg} ${tone.text} ${tone.border} px-2.5 py-1 text-xs font-medium ${className}`}
      title={`Estimated round-trip CO₂: ${carbon.flightCO2} kg per traveler`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{carbon.flightCO2} kg CO₂</span>
      {carbon.isEcoTrip && <span className="font-bold">· Eco</span>}
    </div>
  );
}
