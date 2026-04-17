-- Add vehicle_type column to vehicles table
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT
  CHECK (vehicle_type IN ('motos', 'coches'));

-- Classify existing vehicles based on their brand matching the vehicle_brands catalog
UPDATE public.vehicles v
SET vehicle_type = 'motos'
WHERE vehicle_type IS NULL
  AND EXISTS (
    SELECT 1 FROM public.vehicle_brands vb
    WHERE LOWER(vb.name) = LOWER(v.brand)
      AND vb.vehicle_type = 'motos'
  );

UPDATE public.vehicles v
SET vehicle_type = 'coches'
WHERE vehicle_type IS NULL
  AND EXISTS (
    SELECT 1 FROM public.vehicle_brands vb
    WHERE LOWER(vb.name) = LOWER(v.brand)
      AND vb.vehicle_type = 'coches'
  );

-- Any remaining unmatched vehicles default to 'motos'
-- (covers custom/unlisted brands that were registered before the catalog split)
UPDATE public.vehicles
SET vehicle_type = 'motos'
WHERE vehicle_type IS NULL;
