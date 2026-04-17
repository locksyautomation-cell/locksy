-- Allow appointments to survive dealership deletion (set null instead of error)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_dealership_id_fkey,
  ALTER COLUMN dealership_id DROP NOT NULL,
  ADD CONSTRAINT appointments_dealership_id_fkey
    FOREIGN KEY (dealership_id) REFERENCES public.dealerships(id) ON DELETE SET NULL;

-- Add dealership_deleted notification type
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'status_change',
    'budget_sent',
    'repair_completed',
    'appointment_accepted',
    'appointment_rejected',
    'invoice',
    'dealership_deleted'
  ));
