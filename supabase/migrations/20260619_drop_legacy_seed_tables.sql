-- Cleanup: drop the legacy Brazilian seed tables from the original template.
--
-- These tables (flights ~272k rows, hotels ~40k rows, user_searches) were
-- only ever read by /api/recommendations and /api/searches — two endpoints
-- that the UI never called. Those endpoints have been deleted from the code,
-- so the tables are now pure dead weight.
--
-- Live flights/hotels/restaurants come from Tripadvisor and are cached in
-- the api_cache table, which is unaffected by this migration.
--
-- Safe to run once in Supabase Dashboard → SQL Editor. CASCADE drops any
-- leftover FKs/indexes that belong to these tables.

DROP TABLE IF EXISTS public.flights CASCADE;
DROP TABLE IF EXISTS public.hotels CASCADE;
DROP TABLE IF EXISTS public.user_searches CASCADE;
