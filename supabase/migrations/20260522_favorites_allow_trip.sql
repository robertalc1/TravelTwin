-- Allow item_type='trip' (and 'road-trip' for safety) in favorites.
-- The original CHECK constraint only permitted 'city' | 'attraction' | 'hotel',
-- which made every trip-favorite POST fail with:
--   new row for relation "favorites" violates check constraint
--   "favorites_item_type_check"
--
-- Run this once in Supabase Dashboard → SQL Editor.

ALTER TABLE public.favorites
  DROP CONSTRAINT IF EXISTS favorites_item_type_check;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_item_type_check
  CHECK (item_type IN ('city', 'attraction', 'hotel', 'trip'));
