-- forum_interests was typed as forum_category[] but is used to store free-form
-- event interest strings (Networking, Fundraiser, etc.) that don't match the enum.
-- Convert to text[] so any string can be stored.
ALTER TABLE public.profiles
  ALTER COLUMN forum_interests TYPE text[]
  USING forum_interests::text[];
