"use client";

import { useAuthModal } from "@/stores/authModalStore";

/**
 * Auth entry points for the Footer. Kept as a tiny client island so the
 * Footer itself can stay a Server Component.
 */
export function FooterAuthLinks() {
  const open = useAuthModal((s) => s.open);
  return (
    <>
      <li>
        <button
          type="button"
          onClick={() => open("login")}
          className="text-body-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Sign In
        </button>
      </li>
      <li>
        <button
          type="button"
          onClick={() => open("register")}
          className="text-body-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Create Account
        </button>
      </li>
    </>
  );
}
