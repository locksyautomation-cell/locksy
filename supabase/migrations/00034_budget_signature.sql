ALTER TABLE appointments ADD COLUMN IF NOT EXISTS budget_acceptance_token TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS budget_lines JSONB;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS budget_accepted_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS budget_accepted_ip TEXT;
