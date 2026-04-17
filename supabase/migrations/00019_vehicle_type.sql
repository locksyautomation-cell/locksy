-- Añadir tipo de vehículo a la tabla de concesionarios
ALTER TABLE public.dealerships
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT
  CHECK (vehicle_type IN ('motos', 'coches'));

-- Añadir tipo de vehículo a la tabla de marcas de vehículos
ALTER TABLE public.vehicle_brands
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT
  CHECK (vehicle_type IN ('motos', 'coches'));

-- Las marcas ya existentes (migración 00016) son marcas de motos — clasificarlas como 'motos'
UPDATE public.vehicle_brands
  SET vehicle_type = 'motos'
  WHERE vehicle_type IS NULL;
