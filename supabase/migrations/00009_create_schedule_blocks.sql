CREATE TABLE public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blocks_dealership_date ON schedule_blocks(dealership_id, block_date);

-- RLS
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Public can read (clients need to see blocked slots when booking)
CREATE POLICY "Anyone can read schedule blocks"
  ON public.schedule_blocks FOR SELECT
  USING (true);

CREATE POLICY "Dealers can manage own blocks"
  ON public.schedule_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dealerships
      WHERE id = schedule_blocks.dealership_id AND user_id = auth.uid()
    )
  );
