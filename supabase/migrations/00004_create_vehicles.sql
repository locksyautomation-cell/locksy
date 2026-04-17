CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  displacement TEXT,
  plate TEXT NOT NULL,
  chassis_number VARCHAR(17),
  registration_date DATE,
  tech_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_client ON vehicles(client_id);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own vehicles"
  ON public.vehicles FOR ALL
  USING (client_id = auth.uid());

CREATE POLICY "Dealers can read client vehicles"
  ON public.vehicles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dealership_clients dc
      JOIN public.dealerships d ON dc.dealership_id = d.id
      WHERE dc.client_id = vehicles.client_id
      AND d.user_id = auth.uid()
      AND dc.active = true
    )
  );
