-- Añade número de factura correlativo a locksy_invoices
ALTER TABLE public.locksy_invoices
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Contador global de facturas LOCKSY en locksy_config
INSERT INTO public.locksy_config (key, value)
VALUES ('invoice_counter', '0')
ON CONFLICT (key) DO NOTHING;

-- Numerar todas las facturas existentes en orden cronológico (LOCK-YYYY-NNNN)
DO $$
DECLARE
  rec   RECORD;
  cnt   INTEGER := 0;
  yr    TEXT;
BEGIN
  FOR rec IN
    SELECT id, EXTRACT(YEAR FROM COALESCE(sent_at, created_at))::TEXT AS invoice_year
    FROM   public.locksy_invoices
    WHERE  invoice_number IS NULL
    ORDER  BY COALESCE(sent_at, created_at) ASC
  LOOP
    cnt  := cnt + 1;
    yr   := rec.invoice_year;
    UPDATE public.locksy_invoices
       SET invoice_number = 'LOCK-' || yr || '-' || LPAD(cnt::TEXT, 4, '0')
     WHERE id = rec.id;
  END LOOP;

  -- Actualizar el contador al valor más alto usado
  IF cnt > 0 THEN
    UPDATE public.locksy_config
       SET value = cnt::TEXT
     WHERE key = 'invoice_counter';
  END IF;
END $$;

-- Bucket de storage para facturas LOCKSY (crear manualmente en Supabase Dashboard):
-- Storage > New bucket > nombre: "locksy-invoices" > Public: true
