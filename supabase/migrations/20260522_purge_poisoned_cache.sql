-- Purge cached empty hotel-search results so cities that previously returned
-- 0 hotels (e.g. HER / Heraklion) get a fresh upstream lookup. Paired with the
-- code-side TTL drop in src/app/api/hotels/search/route.ts which caches empty
-- results for only 1h instead of 24h going forward.
--
-- Run once in Supabase Dashboard → SQL Editor.

-- 1. Drop cached empty hotel-search results (any city, any dates).
DELETE FROM public.api_cache
WHERE cache_key LIKE 'hotelsSearch:%'
  AND (
    data::text = '[]'
    OR data::text LIKE '%"hotels":[]%'
  );

-- 2. Also wipe the AI plan-trip cache so the next planner run uses the new
--    Claude model id (claude-sonnet-4-6) instead of any stale entries that
--    referenced the now-retired claude-sonnet-4-20250514 model.
DELETE FROM public.api_cache
WHERE cache_key LIKE 'planTrip:%'
   OR cache_key LIKE 'plan-trip:%';
