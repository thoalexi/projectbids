ALTER TABLE public.bid_payments ADD CONSTRAINT bid_payments_setup_intent_unique UNIQUE (stripe_setup_intent_id);

CREATE OR REPLACE FUNCTION public.prevent_unpaid_project_award()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'awarded' AND OLD.status IS DISTINCT FROM 'awarded' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bid_payments bp
      WHERE bp.project_id = NEW.id AND bp.bid_id = NEW.accepted_bid_id AND bp.status = 'paid'
    ) THEN
      RAISE EXCEPTION 'The hired-job fee must be paid before this project can be awarded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_unpaid_project_award
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.prevent_unpaid_project_award();

CREATE OR REPLACE FUNCTION public.finalize_paid_bid(p_payment_intent_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE payment_row public.bid_payments%ROWTYPE;
DECLARE project_row public.projects%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO payment_row FROM public.bid_payments WHERE stripe_payment_intent_id = p_payment_intent_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO project_row FROM public.projects WHERE id = payment_row.project_id FOR UPDATE;
  IF project_row.status = 'awarded' AND project_row.accepted_bid_id = payment_row.bid_id THEN
    UPDATE public.bid_payments SET status = 'paid', failure_message = NULL, updated_at = now() WHERE id = payment_row.id;
    RETURN true;
  END IF;
  IF project_row.status <> 'open' OR project_row.pending_bid_id <> payment_row.bid_id OR project_row.desired_date < CURRENT_DATE THEN RETURN false; END IF;

  UPDATE public.bid_payments SET status = 'paid', failure_message = NULL, updated_at = now() WHERE id = payment_row.id;
  UPDATE public.projects SET status = 'awarded', accepted_bid_id = payment_row.bid_id, pending_bid_id = NULL, payment_status = 'paid' WHERE id = payment_row.project_id;
  UPDATE public.bid_payments SET status = 'closed', updated_at = now() WHERE project_id = payment_row.project_id AND bid_id <> payment_row.bid_id AND status IN ('ready', 'failed');
  RETURN true;
END;
$$;