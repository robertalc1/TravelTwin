-- Allow signed-in users to write their own bookings into saved_trips and
-- read/delete them again. Bookings made via /booking/simulate currently
-- fail silently because either:
--   (a) RLS rejects the insert (no auth.uid() policy), or
--   (b) the status CHECK constraint doesn't include 'booked'.
-- Both halves below are idempotent (DROP IF EXISTS … ; CREATE …) so it's
-- safe to run regardless of which one is actually the blocker — and safe
-- to re-run.
--
-- Run once in Supabase Dashboard → SQL Editor.

------------------------------------------------------------
-- 1) RLS — let auth.uid() = user_id own rows
------------------------------------------------------------
ALTER TABLE public.saved_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_trips_owner_select" ON public.saved_trips;
CREATE POLICY "saved_trips_owner_select"
  ON public.saved_trips
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_trips_owner_insert" ON public.saved_trips;
CREATE POLICY "saved_trips_owner_insert"
  ON public.saved_trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_trips_owner_update" ON public.saved_trips;
CREATE POLICY "saved_trips_owner_update"
  ON public.saved_trips
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_trips_owner_delete" ON public.saved_trips;
CREATE POLICY "saved_trips_owner_delete"
  ON public.saved_trips
  FOR DELETE
  USING (auth.uid() = user_id);

------------------------------------------------------------
-- 2) CHECK constraint — allow the three statuses the app uses
------------------------------------------------------------
ALTER TABLE public.saved_trips
  DROP CONSTRAINT IF EXISTS saved_trips_status_check;

ALTER TABLE public.saved_trips
  ADD CONSTRAINT saved_trips_status_check
  CHECK (status IN ('planning', 'booked', 'completed'));
