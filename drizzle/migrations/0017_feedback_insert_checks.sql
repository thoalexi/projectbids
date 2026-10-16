DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(message)) BETWEEN 1 AND 2000
  AND (email IS NULL OR char_length(email) <= 255)
  AND char_length(page) BETWEEN 1 AND 500
  AND status = 'new'
  AND (user_id IS NULL OR user_id = auth.uid())
);