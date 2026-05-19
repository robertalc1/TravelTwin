"use client";

import { useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { useAuthModalStore } from "@/stores/authModalStore";

/**
 * Returns a guard that runs `action` only when the user is authenticated.
 * If not authenticated, opens the login modal and stores `redirectTo` so the
 * user lands back on the originating page after a successful sign-in.
 *
 * Usage:
 *   const requireAuth = useRequireAuth();
 *   <button onClick={() => requireAuth(() => router.push("/plan"), "/plan")} />
 */
export function useRequireAuth() {
  const { user, loading } = useUser();
  const openAuthModal = useAuthModalStore((s) => s.open);

  const guard = useCallback(
    (action: () => void, redirectTo?: string) => {
      if (loading) return;
      if (user) {
        action();
        return;
      }
      openAuthModal("login", redirectTo);
    },
    [user, loading, openAuthModal],
  );

  return guard;
}
