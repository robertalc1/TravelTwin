"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthModal } from "@/stores/authModalStore";

/**
 * Bridges URL params to the auth modal.
 *
 *   /?auth=login         → opens the login view
 *   /?auth=register      → opens the register view
 *   /?auth=login&next=/x → opens login + remembers /x to navigate after success
 *
 * After reading the params we strip them from the URL via `router.replace`
 * so the bookmark/back-button experience stays clean.
 *
 * Mounted globally inside the (main) layout so any page inherits the behavior.
 */
function Inner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = useAuthModal((s) => s.open);

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth !== "login" && auth !== "register") return;

    const next = searchParams.get("next");
    open(auth, next ?? undefined);

    const cleaned = new URLSearchParams(searchParams.toString());
    cleaned.delete("auth");
    cleaned.delete("next");
    const qs = cleaned.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  }, [searchParams, pathname, router, open]);

  return null;
}

export function AuthModalUrlSync() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
