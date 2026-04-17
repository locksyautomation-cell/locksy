-- Añadir columnas nif_cif y repair_statuses a la tabla dealerships
ALTER TABLE public.dealerships
  ADD COLUMN IF NOT EXISTS nif_cif TEXT,
  ADD COLUMN IF NOT EXISTS repair_statuses JSONB DEFAULT '["En espera", "En reparación", "Reparación finalizada"]'::jsonb;

-- Permitir que admins actualicen usuarios (necesario para editar clientes desde el panel admin)
CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
