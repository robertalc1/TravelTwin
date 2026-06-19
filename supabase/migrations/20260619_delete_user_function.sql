-- ─────────────────────────────────────────────────────────────────────────
-- Self-service account deletion (no service-role key required)
-- ─────────────────────────────────────────────────────────────────────────
-- The browser uses the anon key, which can't touch auth.users. Instead we
-- expose a SECURITY DEFINER function that runs with the function owner's
-- privileges (postgres) and deletes ONLY the calling user (auth.uid()).
--
-- The client calls it with:  supabase.rpc('delete_user')
-- then signs out and is redirected home.
--
-- Idempotent: safe to re-run (CREATE OR REPLACE).
-- Run this in the Supabase SQL Editor (Supabase Free does not auto-apply
-- migration files).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Remove the user's own rows first. (If these tables already cascade on
  -- auth.users delete via FK, these statements are harmless no-ops.)
  delete from public.favorites    where user_id = uid;
  delete from public.saved_trips  where user_id = uid;
  delete from public.profiles     where id      = uid;

  -- Finally delete the auth identity itself.
  delete from auth.users where id = uid;
end;
$$;

-- Only logged-in users may call it; never anon/public.
revoke all     on function public.delete_user() from public, anon;
grant  execute on function public.delete_user() to authenticated;
