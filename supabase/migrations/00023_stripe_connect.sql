-- Add Stripe Connect account ID to dealerships
ALTER TABLE public.dealerships
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete BOOLEAN DEFAULT FALSE;
