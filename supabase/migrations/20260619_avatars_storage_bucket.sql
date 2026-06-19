-- ─────────────────────────────────────────────────────────────────────────
-- Avatar uploads — Supabase Storage bucket + RLS policies
-- ─────────────────────────────────────────────────────────────────────────
-- Profile photos live in a PUBLIC bucket `avatars`, one folder per user:
--   avatars/<auth.uid()>/avatar.<ext>
--
-- The profiles.avatar_url column (already present) stores the public URL.
--
-- Policies:
--  - anyone can READ (public bucket, so photos render without signed URLs)
--  - a user may INSERT/UPDATE/DELETE only inside their own <uid>/ folder
--
-- Idempotent: safe to re-run.
-- Run this in the Supabase SQL Editor (Supabase Free does not auto-apply
-- migration files).
-- ─────────────────────────────────────────────────────────────────────────

-- 1) The bucket (public read).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2) Policies on storage.objects. Drop-then-create so re-runs don't error.
drop policy if exists "avatars_public_read"  on storage.objects;
drop policy if exists "avatars_insert_own"   on storage.objects;
drop policy if exists "avatars_update_own"   on storage.objects;
drop policy if exists "avatars_delete_own"   on storage.objects;

create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
