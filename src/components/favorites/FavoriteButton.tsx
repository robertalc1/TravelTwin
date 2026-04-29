"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useAuthModal } from "@/stores/authModalStore";
import { useToastStore } from "@/stores/toastStore";

export interface FavoriteButtonProps {
  /** A stable identity for the destination (e.g. IATA code or city name). */
  cityName: string;
  /** Optional metadata persisted alongside the favorite. */
  metadata?: Record<string, unknown>;
  /** Visual size; defaults to "md". */
  size?: "sm" | "md" | "lg";
  /** Optional className applied to the root button. */
  className?: string;
  /** Use a filled background pill (overlays on photos). Default: false. */
  filled?: boolean;
}

const SIZES = {
  sm: { btn: "h-8 w-8", icon: "h-4 w-4" },
  md: { btn: "h-10 w-10", icon: "h-5 w-5" },
  lg: { btn: "h-12 w-12", icon: "h-6 w-6" },
} as const;

/**
 * Heart toggle button with optimistic state, auth gating, and toast feedback.
 *
 * Flow:
 *   - On mount: query the favorites table once to set initial state
 *     (skipped silently if user is not signed in)
 *   - On click while signed-out: open the login modal — never silent fail
 *   - On click while signed-in: optimistic toggle, write/delete row, toast
 */
export function FavoriteButton({
  cityName,
  metadata,
  size = "md",
  className = "",
  filled = false,
}: FavoriteButtonProps) {
  const { user, loading: userLoading } = useUser();
  const openAuthModal = useAuthModal((s) => s.open);
  const showToast = useToastStore((s) => s.show);

  const [isFav, setIsFav] = useState(false);
  const [working, setWorking] = useState(false);

  // Hydrate from DB on mount (only when signed in).
  useEffect(() => {
    if (!user || !cityName) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("city_name", cityName)
        .limit(1)
        .maybeSingle();
      if (!cancelled) setIsFav(Boolean(data));
    })();
    return () => { cancelled = true; };
  }, [user, cityName]);

  async function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (working) return;
    if (!user) {
      openAuthModal("login");
      return;
    }

    const next = !isFav;
    setIsFav(next);          // optimistic
    setWorking(true);
    try {
      if (next) {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city_name: cityName, city_data: metadata ?? null }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast("Added to favorites", "success");
      } else {
        const res = await fetch(
          `/api/favorites?city_name=${encodeURIComponent(cityName)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showToast("Removed from favorites", "info");
      }
    } catch {
      setIsFav(!next);       // rollback
      showToast("Couldn’t update favorite — try again", "error");
    } finally {
      setWorking(false);
    }
  }

  const dims = SIZES[size];
  const baseClass = filled
    ? "bg-white/95 dark:bg-surface/95 backdrop-blur shadow ring-1 ring-black/5"
    : "bg-transparent hover:bg-neutral-100 dark:hover:bg-surface-elevated";

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={userLoading || working}
      aria-pressed={isFav}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      whileTap={{ scale: 0.9 }}
      className={`inline-flex items-center justify-center rounded-full transition-colors ${dims.btn} ${baseClass} ${className}`}
    >
      {working ? (
        <Loader2 className={`${dims.icon} animate-spin text-text-secondary`} />
      ) : (
        <Heart
          className={`${dims.icon} transition-colors ${
            isFav ? "fill-red-500 text-red-500" : "text-text-secondary"
          }`}
        />
      )}
    </motion.button>
  );
}
