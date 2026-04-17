-- Ampliar CHECK de status en appointments para incluir solicitudes pendientes de aprobación y rechazadas
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pendiente', 'en_curso', 'finalizada', 'pendiente_aprobacion', 'rechazada'));

-- Ampliar CHECK de type en notifications para incluir los nuevos tipos de aprobación
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('status_change', 'budget_sent', 'repair_completed', 'appointment_accepted', 'appointment_rejected'));
