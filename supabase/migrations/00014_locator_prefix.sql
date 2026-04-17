-- Add locator prefix (2 uppercase letters, unique per dealership) and sequence counter
ALTER TABLE public.dealerships
  ADD COLUMN IF NOT EXISTS locator_prefix TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS locator_sequence INTEGER DEFAULT 0;

-- Ensure no two dealerships share the same prefix
ALTER TABLE public.dealerships
  DROP CONSTRAINT IF EXISTS dealerships_locator_prefix_unique;

ALTER TABLE public.dealerships
  ADD CONSTRAINT dealerships_locator_prefix_unique UNIQUE (locator_prefix);
