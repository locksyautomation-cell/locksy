-- Array de IDs de marcas aceptadas por el concesionario.
-- Array vacío = acepta todas las marcas (sin restricción).
ALTER TABLE public.dealerships
ADD COLUMN IF NOT EXISTS accepted_brand_ids INTEGER[] DEFAULT '{}';
