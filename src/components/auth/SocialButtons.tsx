"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "facebook";

/**
 * Trigger the Supabase OAuth dance for a given provider.
 * The provider's app credentials live in the Supabase Dashboard, not in code.
 *
 * `redirectTo` must match one of the URLs whitelisted in
 * Supabase → Authentication → URL Configuration → Redirect URLs.
 * We send users to production by default. Add localhost there too if you
 * want to test the flow locally.
 *
 * Per-provider scope notes:
 *  - Google: Supabase already requests `openid email profile` by default.
 *  - Facebook: must declare scopes explicitly or the IdP rejects with
 *    "Invalid Scopes". `public_profile` returns id+name+picture; `email`
 *    is needed for Supabase to populate user.email.
 */
const PROD_CALLBACK = "https://travel-twin.vercel.app/auth/callback";

const PROVIDER_SCOPES: Partial<Record<Provider, string>> = {
  facebook: "email,public_profile",
};

async function startOAuth(provider: Provider): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const scopes = PROVIDER_SCOPES[provider];
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: PROD_CALLBACK,
        ...(scopes ? { scopes } : {}),
      },
    });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "OAuth failed" };
  }
}

function GoogleLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 13.1A6.6 6.6 0 0 1 5.49 11c0-.73.13-1.43.35-2.09V6.07H2.18A11 11 0 0 0 1 11c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 4.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 12 0C7.7 0 3.99 2.47 2.18 6.07l3.66 2.84C6.71 6.31 9.14 4.38 12 4.38z" fill="#EA4335" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/**
 * Social login row. The buttons stay clickable regardless of any sibling
 * email/password form state — the only "busy" gate is internal, just to
 * suppress double-clicks during the brief moment between click and the
 * browser navigating to the OAuth provider.
 */
export function SocialButtons() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(provider: Provider) {
    if (busy) return;
    setError(null);
    setBusy(provider);
    const { error: oauthErr } = await startOAuth(provider);
    if (oauthErr) {
      setError(oauthErr);
      setBusy(null);
    }
    // On success the browser is already navigating to the OAuth provider.
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => handle("google")}
        aria-busy={busy === "google"}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 dark:border-border-default bg-white dark:bg-surface-elevated px-4 py-3 text-sm font-medium text-neutral-800 dark:text-text-primary hover:bg-neutral-50 dark:hover:bg-surface transition-colors"
      >
        {busy === "google" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <GoogleLogo />
        )}
        <span>Continue with Google</span>
      </button>

      <button
        type="button"
        onClick={() => handle("facebook")}
        aria-busy={busy === "facebook"}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1568d8] transition-colors"
      >
        {busy === "facebook" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <FacebookLogo />
        )}
        <span>Continue with Facebook</span>
      </button>

      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
