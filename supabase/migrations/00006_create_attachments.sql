CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video', 'audio', 'budget', 'invoice', 'other')),
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_appointment ON attachments(appointment_id);

-- RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Appointment participants can read attachments"
  ON public.attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = attachments.appointment_id
      AND (
        a.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.dealerships d
          WHERE d.id = a.dealership_id AND d.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Appointment participants can add attachments"
  ON public.attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = attachments.appointment_id
      AND (
        a.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.dealerships d
          WHERE d.id = a.dealership_id AND d.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Uploaders can delete own attachments"
  ON public.attachments FOR DELETE
  USING (uploaded_by = auth.uid());
