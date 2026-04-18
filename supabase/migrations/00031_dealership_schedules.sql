CREATE TABLE IF NOT EXISTS dealership_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=lunes, 1=martes, 2=miércoles, 3=jueves, 4=viernes, 5=sábado, 6=domingo
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  morning_start TIME,   -- "09:00" — null si cerrado
  morning_end   TIME,   -- "14:00"
  afternoon_start TIME, -- "16:00" — null si jornada continua o cerrado
  afternoon_end   TIME, -- "20:00"
  UNIQUE(dealership_id, day_of_week)
);
