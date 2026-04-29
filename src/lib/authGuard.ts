import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Server-side auth guard for API routes that require an authenticated user.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (auth instanceof NextResponse) return auth;
 *   const userId = auth.user.id;
 *
 * Returns the supabase client + user when valid; otherwise returns a 401
 * NextResponse the route can return verbatim.
 */
export type AuthContext = {
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized — sign in to access this resource." },
      { status: 401 }
    );
  }
  return { user, supabase };
}

/**
 * Soft check — returns user if logged in, null otherwise.
 * Use for routes that work for both anonymous and authenticated users
 * but want to attribute the request when possible.
 */
export async function getOptionalUser(): Promise<{
  user: User | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}
