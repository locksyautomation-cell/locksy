-- ================================================================
-- 00025: DATA VALIDATION CONSTRAINTS
-- Restricciones a nivel de base de datos para prevenir datos inválidos
-- introducidos manualmente desde el dashboard de Supabase
-- ================================================================


-- ============================================================
-- TABLA: users
-- ============================================================
ALTER TABLE public.users
  ADD CONSTRAINT users_email_format
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT users_phone_min_length
    CHECK (phone IS NULL OR length(trim(phone)) >= 6),
  ADD CONSTRAINT users_dni_format
    CHECK (dni IS NULL OR dni ~ '^[0-9]{8}[A-Za-z]$'),
  ADD CONSTRAINT users_postal_code_format
    CHECK (postal_code IS NULL OR postal_code ~ '^[0-9]{5}$');


-- ============================================================
-- TABLA: dealerships
-- ============================================================
ALTER TABLE public.dealerships
  ADD CONSTRAINT dealerships_email_format
    CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT dealerships_billing_email_format
    CHECK (billing_email IS NULL OR billing_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT dealerships_phone_min_length
    CHECK (phone IS NULL OR length(trim(phone)) >= 6),
  ADD CONSTRAINT dealerships_postal_code_format
    CHECK (postal_code IS NULL OR postal_code ~ '^[0-9]{5}$'),
  ADD CONSTRAINT dealerships_locator_prefix_format
    CHECK (locator_prefix IS NULL OR locator_prefix ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT dealerships_locator_sequence_min
    CHECK (locator_sequence IS NULL OR locator_sequence >= 0),
  ADD CONSTRAINT dealerships_iban_length
    CHECK (iban IS NULL OR length(trim(iban)) BETWEEN 15 AND 34);


-- ============================================================
-- TABLA: vehicles
-- ============================================================
-- Limpiar bastidores con longitud incorrecta o caracteres no permitidos (se ponen a NULL)
UPDATE public.vehicles SET chassis_number = NULL WHERE chassis_number IS NOT NULL AND (length(chassis_number) != 17 OR chassis_number !~ '^[A-Za-z0-9]{17}$');
-- Limpiar matrículas con menos de 2 caracteres (se ponen a vacío seguro)
UPDATE public.vehicles SET plate = 'XX' WHERE length(trim(plate)) < 2;
-- Limpiar marcas/modelos vacíos
UPDATE public.vehicles SET brand = 'Desconocida' WHERE length(trim(brand)) = 0;
UPDATE public.vehicles SET model = 'Desconocido' WHERE length(trim(model)) = 0;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_chassis_number_format
    CHECK (chassis_number IS NULL OR chassis_number ~ '^[A-Za-z0-9]{17}$'),
  ADD CONSTRAINT vehicles_plate_min_length
    CHECK (length(trim(plate)) >= 2),
  ADD CONSTRAINT vehicles_brand_not_empty
    CHECK (length(trim(brand)) > 0),
  ADD CONSTRAINT vehicles_model_not_empty
    CHECK (length(trim(model)) > 0);


-- ============================================================
-- TABLA: appointments
-- ============================================================
UPDATE public.appointments SET budget_amount = NULL WHERE budget_amount < 0;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_budget_amount_positive
    CHECK (budget_amount IS NULL OR budget_amount >= 0);

-- manual_vehicle_cc solo existe si se ejecutó la migración 00012
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'manual_vehicle_cc'
  ) THEN
    UPDATE public.appointments SET manual_vehicle_cc = NULL
      WHERE manual_vehicle_cc IS NOT NULL AND manual_vehicle_cc !~ '^[0-9]+$';

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints
      WHERE constraint_name = 'appointments_manual_vehicle_cc_numeric'
    ) THEN
      ALTER TABLE public.appointments
        ADD CONSTRAINT appointments_manual_vehicle_cc_numeric
          CHECK (manual_vehicle_cc IS NULL OR manual_vehicle_cc ~ '^[0-9]+$');
    END IF;
  END IF;
END $$;


-- ============================================================
-- TABLA: schedule_blocks
-- ============================================================
ALTER TABLE public.schedule_blocks
  ADD CONSTRAINT schedule_blocks_time_order
    CHECK (end_time > start_time);


-- ============================================================
-- TABLA: attachments
-- ============================================================
UPDATE public.attachments SET file_size = NULL WHERE file_size IS NOT NULL AND file_size <= 0;
UPDATE public.attachments SET file_name = 'archivo' WHERE length(trim(file_name)) = 0;

ALTER TABLE public.attachments
  ADD CONSTRAINT attachments_file_size_positive
    CHECK (file_size IS NULL OR file_size > 0),
  ADD CONSTRAINT attachments_file_name_not_empty
    CHECK (length(trim(file_name)) > 0);


-- ============================================================
-- TABLA: signatures
-- ============================================================
UPDATE public.signatures SET accepted_terms = FALSE WHERE accepted_terms IS NULL;
ALTER TABLE public.signatures
  ALTER COLUMN accepted_terms SET DEFAULT FALSE,
  ALTER COLUMN accepted_terms SET NOT NULL;


-- ============================================================
-- TABLA: notifications
-- ============================================================
UPDATE public.notifications SET read = FALSE WHERE read IS NULL;
ALTER TABLE public.notifications
  ALTER COLUMN read SET NOT NULL;


-- ============================================================
-- TABLA: contact_requests
-- ============================================================
ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_email_format
    CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');


-- ============================================================
-- TABLA: repair_orders
-- ============================================================
UPDATE public.repair_orders SET invoice_amount = NULL WHERE invoice_amount < 0;

ALTER TABLE public.repair_orders
  ADD CONSTRAINT repair_orders_invoice_amount_positive
    CHECK (invoice_amount IS NULL OR invoice_amount >= 0);


-- ============================================================
-- TABLA: locksy_invoices
-- ============================================================
UPDATE public.locksy_invoices SET amount = NULL WHERE amount < 0;
UPDATE public.locksy_invoices SET concept = 'Sin concepto' WHERE length(trim(concept)) = 0;

ALTER TABLE public.locksy_invoices
  ADD CONSTRAINT locksy_invoices_amount_positive
    CHECK (amount IS NULL OR amount >= 0),
  ADD CONSTRAINT locksy_invoices_concept_not_empty
    CHECK (length(trim(concept)) > 0);


-- ============================================================
-- TABLA: vehicle_brands
-- ============================================================
DELETE FROM public.vehicle_brands WHERE length(trim(name)) = 0;

ALTER TABLE public.vehicle_brands
  ADD CONSTRAINT vehicle_brands_name_not_empty
    CHECK (length(trim(name)) > 0);


-- ============================================================
-- TABLA: vehicle_models
-- ============================================================
DELETE FROM public.vehicle_models WHERE length(trim(name)) = 0;

ALTER TABLE public.vehicle_models
  ADD CONSTRAINT vehicle_models_name_not_empty
    CHECK (length(trim(name)) > 0);
