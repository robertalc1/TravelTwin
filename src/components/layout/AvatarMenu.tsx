"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Heart, Loader2, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarMenuProps {
  email: string;
  displayName: string;
  variant: "transparent" | "solid";
}

/**
 * Avatar trigger + dropdown panel.
 *
 *   transparent → home page hero (white-on-translucent)
 *   solid       → every other page (neutral fill)
 *
 * Uses initials of `displayName` for the avatar bubble; max 2 letters.
 * Sign out posts to /auth/logout (which clears the cookie + bounces to /).
 */
export function AvatarMenu({ email, displayName, variant }: AvatarMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = displayName
    .split(/\s+/)
    .filter((p: string) => p.length > 0)
    .slice(0, 2)
    .map((p: string) => p[0]!.toUpperCase())
    .join("") || "?";

  // Close on outside click and on Escape.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/auth/logout", { method: "POST" });
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const triggerClass = cn(
    "flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-colors",
    variant === "transparent"
      ? "bg-white/20 text-white hover:bg-white/30"
      : "bg-neutral-100 text-text-primary hover:bg-neutral-200 dark:bg-surface-elevated dark:hover:bg-surface"
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white text-[11px] font-bold tracking-tight">
          {initials}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-surface shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden z-50"
          >
            {/* Header — avatar + name + email */}
            <div className="flex items-center gap-3 px-4 py-4 bg-neutral-50 dark:bg-surface-elevated">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-white text-sm font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-text-primary truncate">{displayName}</p>
                <p className="text-xs text-text-secondary truncate">{email}</p>
              </div>
            </div>

            <div className="py-1">
              <MenuItem href="/profile" icon={UserIcon} label="My Profile" onClick={() => setOpen(false)} />
              <MenuItem href="/trips" icon={Calendar} label="My Trips" onClick={() => setOpen(false)} />
              <MenuItem href="/favorites" icon={Heart} label="Favorites" onClick={() => setOpen(false)} />
            </div>

            <div className="h-px bg-neutral-100 dark:bg-border-default" />

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
              {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-neutral-50 dark:hover:bg-surface-elevated transition-colors"
    >
      <Icon className="h-4 w-4 text-text-secondary" />
      <span>{label}</span>
    </Link>
  );
}
