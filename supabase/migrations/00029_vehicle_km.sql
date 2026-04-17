-- Add vehicle_km column to store the mileage entered by the client when signing the repair order
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS vehicle_km INTEGER;
