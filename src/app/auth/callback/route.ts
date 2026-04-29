import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * OAuth + magic-link callback. Supabase redirects here with `?code=...` after
 * the provider (Google / Facebook) finishes the consent flow.
 *
 * We exchange the short-lived code for a session cookie, then bounce the user
 * to `?next=...` (defaulting to /). On failure we send them home with an
 * `auth_error` flag so the UI can surface a banner if needed.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/?auth_error=oauth_failed`);
}
