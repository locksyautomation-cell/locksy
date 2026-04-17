-- Allow dealerships to work with both vehicle types
-- Drop the existing CHECK constraint on vehicle_type (name may vary)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name   = 'dealerships'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause ILIKE '%vehicle_type%'
  LOOP
    EXECUTE 'ALTER TABLE public.dealerships DROP CONSTRAINT ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.dealerships
  ADD CONSTRAINT dealerships_vehicle_type_check
  CHECK (vehicle_type IN ('motos', 'coches', 'ambos'));
