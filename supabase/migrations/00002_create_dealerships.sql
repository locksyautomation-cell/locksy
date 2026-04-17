CREATE TABLE public.dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  logo_url TEXT,
  slug TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_dealerships_user ON dealerships(user_id);
CREATE UNIQUE INDEX idx_dealerships_slug ON dealerships(slug);

CREATE TRIGGER update_dealerships_updated_at
  BEFORE UPDATE ON public.dealerships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.dealerships ENABLE ROW LEVEL SECURITY;

-- Public can read basic info (for registration links)
CREATE POLICY "Public can read dealership basic info"
  ON public.dealerships FOR SELECT
  USING (true);

CREATE POLICY "Dealers can update own dealership"
  ON public.dealerships FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage dealerships"
  ON public.dealerships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );
