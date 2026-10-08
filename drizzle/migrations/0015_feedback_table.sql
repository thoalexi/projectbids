CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  message text NOT NULL,
  page text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_message_length CHECK (char_length(message) BETWEEN 1 AND 2000),
  CONSTRAINT feedback_email_length CHECK (email IS NULL OR char_length(email) <= 255),
  CONSTRAINT feedback_email_shape CHECK (email IS NULL OR email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT feedback_status_allowed CHECK (status IN ('open', 'resolved'))
);
COMMENT ON COLUMN public.feedback.email IS 'Optional reply address; null when the submitter left it blank.';

GRANT INSERT ON public.feedback TO anon;
GRANT INSERT, SELECT, UPDATE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Admins read feedback" ON public.feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update feedback" ON public.feedback FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));