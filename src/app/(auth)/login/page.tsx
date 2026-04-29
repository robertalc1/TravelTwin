"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthModalStore } from "@/stores/authModalStore";

/**
 * /login is a no-flash fallback that hands off to the global AuthModal.
 *
 * Direct visits (typed URL, old bookmarks, OAuth error redirects) land here.
 * We open the modal in "login" view, store the optional `?redirectTo=` so
 * the modal can navigate there after success, then replace the URL with `/`.
 *
 * IMPORTANT: we always replace with `/`, never with `next`. Otherwise an
 * unauthenticated request to a protected path would re-trigger the auth
 * middleware and bounce back here in an infinite loop.
 */
function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = useAuthModalStore((s) => s.open);

  useEffect(() => {
    const next = searchParams.get("redirectTo") ?? undefined;
    open("login", next);
    router.replace("/");
  }, [open, router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-secondary">
      <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      <p className="text-sm">Opening sign-in…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    }>
      <LoginRedirect />
    </Suspense>
  );
}
