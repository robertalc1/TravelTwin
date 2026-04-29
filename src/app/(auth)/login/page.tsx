"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthModalStore } from "@/stores/authModalStore";

/**
 * /login is now a fallback that hands off to the global AuthModal.
 * Direct visits, OAuth error redirects, and external links all funnel here:
 * we open the modal in "login" view and bounce to home so the user keeps
 * the page they were on (or the home page if no referrer).
 */
function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = useAuthModalStore((s) => s.open);

  useEffect(() => {
    const next = searchParams.get("redirectTo") ?? "/";
    open("login", next);
    router.replace(next === "/login" ? "/" : next);
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
