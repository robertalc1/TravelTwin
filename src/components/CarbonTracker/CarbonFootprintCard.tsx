import { Leaf, TreePine, Info } from "lucide-react";
import type { CarbonResult } from "@/lib/carbon";
import { CarbonComparisonBar } from "./CarbonComparisonBar";

interface Props {
  carbon: CarbonResult;
  passengers: number;
  /** Optional explanatory copy under the score, e.g. comparison to average. */
  caption?: string;
}

/**
 * Full-width card with eco score, breakdown, and offset suggestion.
 * Used inside trip detail page (tab “Carbon”).
 */
export function CarbonFootprintCard({ carbon, passengers, caption }: Props) {
  const treeMonths = Math.round(carbon.flightCO2 / 22); // ~22 kg CO₂/tree/year → / 12

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
            <Leaf className="h-4 w-4" />
            Carbon footprint
          </div>
          <h3 className="text-2xl font-bold text-secondary-500">
            {carbon.flightCO2.toLocaleString()} kg CO₂
          </h3>
          <p className="text-sm text-text-secondary">
            Round-trip total · {passengers} traveler{passengers !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted uppercase tracking-wide">Eco score</div>
          <div
            className={`text-3xl font-extrabold ${
              carbon.ecoScore >= 60 ? "text-emerald-500"
                : carbon.ecoScore >= 30 ? "text-amber-500"
                : "text-red-500"
            }`}
          >
            {carbon.ecoScore}
          </div>
        </div>
      </div>

      {caption && <p className="text-sm text-text-secondary mb-4">{caption}</p>}

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
          Compared to alternatives
        </p>
        <CarbonComparisonBar carbon={carbon} />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-border-default">
        <div className="flex items-start gap-3">
          <TreePine className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-text-muted">Equivalent to</p>
            <p className="text-sm font-semibold text-text-primary">
              {treeMonths} tree-months
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-text-muted">Offset cost</p>
            <p className="text-sm font-semibold text-text-primary">
              ≈ €{carbon.offsetEur.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-text-muted leading-relaxed">
        Based on DEFRA 2024 emission factors with ICAO RFI = 1.9 to account for
        non-CO₂ aviation effects. Offset estimate uses €15 / tonne market price.
      </p>
    </div>
  );
}
