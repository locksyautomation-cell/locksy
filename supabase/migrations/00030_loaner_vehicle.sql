-- Vehículo de sustitución
ALTER TABLE dealerships ADD COLUMN IF NOT EXISTS loaner_vehicle_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS loaner_vehicle_requested BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS loaner_vehicle_status TEXT DEFAULT NULL;
-- loaner_vehicle_status: NULL = no solicitado / 'pending' = pendiente / 'accepted' = aceptado / 'rejected' = rechazado
