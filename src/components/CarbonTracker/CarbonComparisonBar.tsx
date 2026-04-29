import { Plane, Train, Car, Bus } from "lucide-react";
import type { CarbonResult } from "@/lib/carbon";

interface Props {
  carbon: CarbonResult;
}

/**
 * Horizontal bars comparing CO₂ across transport modes for the same route.
 * Bars are normalized to the worst (highest) value so visual scale stays useful.
 */
export function CarbonComparisonBar({ carbon }: Props) {
  const max = Math.max(carbon.flightCO2, carbon.carCO2, carbon.busCO2, carbon.trainCO2, 1);
  const rows = [
    { label: "Flight", value: carbon.flightCO2, icon: Plane, color: "bg-red-500" },
    { label: "Car", value: carbon.carCO2, icon: Car, color: "bg-orange-500" },
    { label: "Bus", value: carbon.busCO2, icon: Bus, color: "bg-amber-500" },
    { label: "Train", value: carbon.trainCO2, icon: Train, color: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-3">
      {rows.map(({ label, value, icon: Icon, color }) => {
        const pct = Math.max(2, Math.round((value / max) * 100));
        return (
          <div key={label} className="flex items-center gap-3">
            <Icon className="h-4 w-4 shrink-0 text-text-muted" />
            <span className="w-12 text-xs font-medium text-text-secondary">{label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-neutral-100 dark:bg-surface-elevated overflow-hidden">
              <div
                className={`h-full ${color} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-20 text-right text-xs font-mono tabular-nums text-text-primary">
              {value.toLocaleString()} kg
            </span>
          </div>
        );
      })}
    </div>
  );
}
