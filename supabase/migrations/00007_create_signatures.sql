CREATE TABLE public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES public.users(id),
  signer_name TEXT NOT NULL,
  signer_dni TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('key_pickup', 'key_return')),
  signature_url TEXT NOT NULL,
  accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, type)
);

-- RLS
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Appointment participants can read signatures"
  ON public.signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = signatures.appointment_id
      AND (
        a.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.dealerships d
          WHERE d.id = a.dealership_id AND d.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Signers can create signatures"
  ON public.signatures FOR INSERT
  WITH CHECK (signer_id = auth.uid());
