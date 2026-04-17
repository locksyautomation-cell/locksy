-- Fix locator uniqueness: must be unique per dealership, not globally.
-- Two dealerships without a prefix would both generate #0001, #0002, etc.

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_locator_key;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_locator_dealership_unique UNIQUE (dealership_id, locator);
