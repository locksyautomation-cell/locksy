-- Create contact_message_replies table for storing admin replies to contact messages
CREATE TABLE IF NOT EXISTS public.contact_message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up replies by message
CREATE INDEX IF NOT EXISTS contact_message_replies_message_id_idx
  ON public.contact_message_replies(message_id);

-- RLS: only admins can read/write replies
ALTER TABLE public.contact_message_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage replies"
  ON public.contact_message_replies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
