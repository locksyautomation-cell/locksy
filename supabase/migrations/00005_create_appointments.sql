CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES public.dealerships(id),
  client_id UUID NOT NULL REFERENCES public.users(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  locator TEXT NOT NULL UNIQUE,
  key_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendiente', 'en_curso', 'finalizada')) DEFAULT 'pendiente',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  description TEXT,
  dealer_observations TEXT,
  dealer_recommendations TEXT,
  budget_amount DECIMAL(10,2),
  budget_status TEXT CHECK (budget_status IN ('pending', 'accepted', 'rejected')),
  budget_url TEXT,
  budget_sent_at TIMESTAMPTZ,
  invoice_url TEXT,
  repair_order_url TEXT,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'not_required')) DEFAULT 'pending',
  stripe_payment_id TEXT,
  vehicle_in_dealership BOOLEAN DEFAULT FALSE,
  key_picked_up_at TIMESTAMPTZ,
  key_returned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_dealership ON appointments(dealership_id);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_locator ON appointments(locator);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sequence for locator codes
CREATE SEQUENCE appointment_locator_seq START 0 MINVALUE 0 MAXVALUE 9999 CYCLE;

-- RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read own appointments"
  ON public.appointments FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update own pending appointments"
  ON public.appointments FOR UPDATE
  USING (client_id = auth.uid() AND status = 'pendiente');

CREATE POLICY "Dealers can read dealership appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dealerships
      WHERE id = appointments.dealership_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Dealers can manage dealership appointments"
  ON public.appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dealerships
      WHERE id = appointments.dealership_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Dealers can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dealerships
      WHERE id = appointments.dealership_id AND user_id = auth.uid()
    )
  );
