CREATE TABLE public.dealership_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(dealership_id, client_id)
);

CREATE INDEX idx_dc_dealership ON dealership_clients(dealership_id);
CREATE INDEX idx_dc_client ON dealership_clients(client_id);

-- RLS
ALTER TABLE public.dealership_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read own links"
  ON public.dealership_clients FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Dealers can read their clients"
  ON public.dealership_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dealerships
      WHERE id = dealership_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Dealers can update client links"
  ON public.dealership_clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dealerships
      WHERE id = dealership_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all links"
  ON public.dealership_clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy on public.users that requires dealership_clients to exist
CREATE POLICY "Dealers can read their clients"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dealership_clients dc
      JOIN public.dealerships d ON dc.dealership_id = d.id
      WHERE dc.client_id = public.users.id
      AND d.user_id = auth.uid()
      AND dc.active = true
    )
  );
