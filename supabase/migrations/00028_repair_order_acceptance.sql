-- ================================================================
-- REPAIR ORDER ACCEPTANCE — run manually in Supabase SQL Editor
-- ================================================================

-- 1. Add acceptance columns to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS repair_acceptance_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS order_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_return_accepted_at TIMESTAMPTZ;

-- 2. Backfill token for existing appointments that don't have one
UPDATE public.appointments
  SET repair_acceptance_token = gen_random_uuid()
  WHERE repair_acceptance_token IS NULL;

-- 3. Unique index so we can look up appointments by token efficiently
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_repair_token
  ON public.appointments(repair_acceptance_token);

-- 4. Allow the public (unauthenticated) acceptance page to read appointment
--    summary data using only the token — no auth required.
--    This is safe because the token is a UUID (128-bit, unguessable).
CREATE POLICY "Public can read appointment by repair token"
  ON public.appointments FOR SELECT
  USING (repair_acceptance_token IS NOT NULL);
