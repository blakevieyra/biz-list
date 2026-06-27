-- Fix discovery_radius check constraint to include all valid values used by the app
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_discovery_radius_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_discovery_radius_check
    CHECK (discovery_radius = ANY (ARRAY['5','10','25','50','city','county','state','nation','nationwide']));
