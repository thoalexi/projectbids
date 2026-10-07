DROP POLICY IF EXISTS "Owners view payment readiness on their projects" ON public.bid_payments;
GRANT EXECUTE ON FUNCTION public.expire_past_due_projects() TO anon;

CREATE OR REPLACE FUNCTION public.finalize_paid_bid(p_payment_intent_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE payment_row public.bid_payments%ROWTYPE;
DECLARE project_row public.projects%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO payment_row
  FROM public.bid_payments
  WHERE stripe_payment_intent_id = p_payment_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO project_row FROM public.projects WHERE id = payment_row.project_id FOR UPDATE;

  IF project_row.status = 'awarded' AND project_row.accepted_bid_id = payment_row.bid_id THEN
    UPDATE public.bid_payments SET status = 'paid', failure_message = NULL, updated_at = now() WHERE id = payment_row.id;
    RETURN true;
  END IF;

  IF project_row.status <> 'open' OR project_row.pending_bid_id <> payment_row.bid_id OR project_row.desired_date < CURRENT_DATE THEN
    RETURN false;
  END IF;

  UPDATE public.projects
  SET status = 'awarded', accepted_bid_id = payment_row.bid_id, pending_bid_id = NULL, payment_status = 'paid'
  WHERE id = payment_row.project_id;

  UPDATE public.bid_payments
  SET status = CASE WHEN bid_id = payment_row.bid_id THEN 'paid' ELSE 'closed' END,
      failure_message = NULL,
      updated_at = now()
  WHERE project_id = payment_row.project_id AND status IN ('ready', 'payment_pending', 'failed');

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_paid_bid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_paid_bid(text) TO service_role;