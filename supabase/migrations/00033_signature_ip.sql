ALTER TABLE appointments ADD COLUMN IF NOT EXISTS order_accepted_ip TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS order_return_accepted_ip TEXT;
