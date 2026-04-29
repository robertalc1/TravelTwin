"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthModalStore } from "@/stores/authModalStore";

/**
 * /register is a fallback that hands off to the global AuthModal in
 * "register" view, then bounces back to the page the user was on.
 */
function RegisterRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = useAuthModalStore((s) => s.open);

  useEffect(() => {
    const next = searchParams.get("redirectTo") ?? "/";
    open("register", next);
    router.replace(next === "/register" ? "/" : next);
  }, [open, router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-secondary">
      <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      <p className="text-sm">Opening sign-up…</p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    }>
      <RegisterRedirect />
    </Suspense>
  );
}
