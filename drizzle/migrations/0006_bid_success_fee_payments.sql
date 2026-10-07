CREATE TABLE public.bid_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL UNIQUE REFERENCES public.bids(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live')),
  stripe_customer_id text,
  stripe_setup_intent_id text,
  stripe_payment_method_id text,
  stripe_payment_intent_id text,
  fee_amount_cents integer NOT NULL CHECK (fee_amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'card_required' CHECK (status IN ('card_required', 'ready', 'payment_pending', 'paid', 'failed', 'closed', 'expired')),
  failure_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bid_payments TO authenticated;
GRANT ALL ON public.bid_payments TO service_role;
ALTER TABLE public.bid_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors view own bid payments" ON public.bid_payments FOR SELECT TO authenticated USING (auth.uid() = contractor_id);
CREATE POLICY "Owners view payment readiness on their projects" ON public.bid_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = bid_payments.project_id AND p.owner_id = auth.uid()));
CREATE INDEX bid_payments_contractor_idx ON public.bid_payments(contractor_id);
CREATE INDEX bid_payments_project_idx ON public.bid_payments(project_id);
CREATE INDEX bid_payments_payment_intent_idx ON public.bid_payments(stripe_payment_intent_id);

ALTER TABLE public.projects ADD COLUMN pending_bid_id uuid REFERENCES public.bids(id);
ALTER TABLE public.projects ADD COLUMN payment_status text NOT NULL DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'paid', 'failed'));
ALTER TABLE public.projects ADD COLUMN expired_at timestamptz;

CREATE OR REPLACE FUNCTION public.expire_past_due_projects()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.projects
  SET expired_at = now()
  WHERE status = 'open' AND expired_at IS NULL AND desired_date < CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  UPDATE public.bid_payments bp
  SET status = 'expired', updated_at = now()
  FROM public.projects p
  WHERE p.id = bp.project_id AND p.expired_at IS NOT NULL AND bp.status IN ('card_required', 'ready', 'failed');
  RETURN affected;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_past_due_projects() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_past_due_projects() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_bid_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.project_id AND desired_date < CURRENT_DATE) THEN
    RAISE EXCEPTION 'This project has passed its done-by date';
  END IF;
  IF (SELECT count(*) FROM public.bids WHERE project_id = NEW.project_id) >= 5 THEN
    RAISE EXCEPTION 'Bidding is full for this project';
  END IF;
  RETURN NEW;
END;
$$;