-- Fix: /booking/simulate fails to sync with
--   "Could not find the 'days' column of 'saved_trips' in the schema cache"
--
-- Root cause: the saved_trips table drifted from the app's SavedTrip
-- contract. The app writes/reads:
--   destination, origin, days, outbound_flight, return_flight,
--   hotel, total_cost, budget, status
-- but the table only had legacy columns:
--   name (NOT NULL), destination_city (NOT NULL), departure_city (NOT NULL),
--   duration_days (NOT NULL), flight_outbound, flight_return, flight_type, notes
--
-- This migration is NON-DESTRUCTIVE: it ADDS the columns the app expects and
-- RELAXES the legacy NOT NULL constraints so inserts stop failing. No column
-- is dropped and no data is lost. Idempotent — safe to re-run.
--
-- Run once in Supabase Dashboard → SQL Editor.

------------------------------------------------------------
-- 1) Add the columns the app actually writes/reads
------------------------------------------------------------
ALTER TABLE public.saved_trips
  ADD COLUMN IF NOT EXISTS destination     text,
  ADD COLUMN IF NOT EXISTS origin          text,
  ADD COLUMN IF NOT EXISTS days            integer,
  ADD COLUMN IF NOT EXISTS outbound_flight jsonb,
  ADD COLUMN IF NOT EXISTS return_flight   jsonb;

------------------------------------------------------------
-- 2) Relax legacy NOT NULLs the app never populates, so the
--    insert isn't rejected for a missing legacy column.
------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='saved_trips' AND column_name='name')
  THEN ALTER TABLE public.saved_trips ALTER COLUMN name DROP NOT NULL; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='saved_trips' AND column_name='destination_city')
  THEN ALTER TABLE public.saved_trips ALTER COLUMN destination_city DROP NOT NULL; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='saved_trips' AND column_name='departure_city')
  THEN ALTER TABLE public.saved_trips ALTER COLUMN departure_city DROP NOT NULL; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='saved_trips' AND column_name='duration_days')
  THEN ALTER TABLE public.saved_trips ALTER COLUMN duration_days DROP NOT NULL; END IF;
END $$;

------------------------------------------------------------
-- 3) Status CHECK — include every value the app may write.
------------------------------------------------------------
ALTER TABLE public.saved_trips DROP CONSTRAINT IF EXISTS saved_trips_status_check;
ALTER TABLE public.saved_trips
  ADD CONSTRAINT saved_trips_status_check
  CHECK (status IN ('planning', 'planned', 'booked', 'completed', 'cancelled'));

-- RLS owner policies (auth.uid() = user_id) already exist on this table, so
-- they are intentionally not re-created here.
