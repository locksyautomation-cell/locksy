-- ================================================================
-- ADD payment_method TO appointments
-- Run manually in Supabase SQL Editor
-- ================================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;
