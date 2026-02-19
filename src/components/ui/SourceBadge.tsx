"use client";

import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/supabase/types";

const config: Record<DataSource, { label: string; dot: string; bg: string; text: string }> = {
  live: {
    label: "Live",
    dot: "bg-green-500",
    bg: "bg-green-50 dark:bg-green-500/10",
    text: "text-green-700 dark:text-green-400",
  },
  cached: {
    label: "Cached",
    dot: "bg-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  fallback: {
    label: "Reference",
    dot: "bg-orange-500",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-400",
  },
};

interface SourceBadgeProps {
  source: DataSource;
  lastUpdated?: string;
  className?: string;
}

export function SourceBadge({ source, lastUpdated, className }: SourceBadgeProps) {
  const c = config[source];

  let timeAgo = "";
  if (source === "cached" && lastUpdated) {
    const mins = Math.round((Date.now() - new Date(lastUpdated).getTime()) / 60000);
    timeAgo = mins < 1 ? "just now" : `${mins}m ago`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        c.bg,
        c.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
      {timeAgo && <span className="opacity-70">· {timeAgo}</span>}
    </span>
  );
}
