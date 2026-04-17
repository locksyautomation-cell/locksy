-- ================================================================
-- DEALER PANEL UPDATES — run manually in Supabase SQL Editor
-- ================================================================

-- 1. Allow appointments without a registered client/vehicle (manual entry)
ALTER TABLE public.appointments
  ALTER COLUMN client_id DROP NOT NULL,
  ALTER COLUMN vehicle_id DROP NOT NULL;

-- 2. Add manual client/vehicle fields for appointments without accounts
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS repair_status TEXT,
  ADD COLUMN IF NOT EXISTS manual_first_name TEXT,
  ADD COLUMN IF NOT EXISTS manual_last_name TEXT,
  ADD COLUMN IF NOT EXISTS manual_nif_cif TEXT,
  ADD COLUMN IF NOT EXISTS manual_phone TEXT,
  ADD COLUMN IF NOT EXISTS manual_address TEXT,
  ADD COLUMN IF NOT EXISTS manual_vehicle_brand TEXT,
  ADD COLUMN IF NOT EXISTS manual_vehicle_model TEXT,
  ADD COLUMN IF NOT EXISTS manual_vehicle_cc TEXT,
  ADD COLUMN IF NOT EXISTS manual_vehicle_plate TEXT;

-- 3. Add billing fields to dealerships
ALTER TABLE public.dealerships
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS billing_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_nif_cif TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- 4. Create repair_orders table
CREATE TABLE IF NOT EXISTS public.repair_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  dealership_id UUID REFERENCES public.dealerships(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  vehicle_in_dealership BOOLEAN DEFAULT false,
  repair_status TEXT,
  budget_url TEXT,
  invoice_url TEXT,
  invoice_amount NUMERIC,
  observations TEXT,
  recommendations TEXT,
  payment_received BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_repair_orders_updated_at
  BEFORE UPDATE ON public.repair_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can manage own repair orders"
  ON public.repair_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dealerships
      WHERE id = dealership_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can read own repair orders"
  ON public.repair_orders FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Admins can manage all repair orders"
  ON public.repair_orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
