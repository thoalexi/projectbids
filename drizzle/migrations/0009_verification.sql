CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.contractor_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  business_name text NOT NULL,
  trade text,
  website text,
  google_url text,
  yelp_url text,
  thumbtack_url text,
  insured boolean NOT NULL DEFAULT false,
  insurance_details text,
  portfolio_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'payment_required',
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_payment_intent_id text,
  admin_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_verifications_status_check CHECK (status IN ('payment_required','pending_review','approved','rejected'))
);
GRANT SELECT ON public.contractor_verifications TO authenticated;
GRANT ALL ON public.contractor_verifications TO service_role;
ALTER TABLE public.contractor_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contractors see own application" ON public.contractor_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins see all applications" ON public.contractor_verifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_verified_contractor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.contractor_verifications WHERE user_id = _user_id AND status = 'approved') $$;
CREATE OR REPLACE FUNCTION public.is_verified_homeowner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (SELECT count(*) FROM public.projects WHERE owner_id = _user_id AND status = 'awarded') >= 2 $$;
CREATE OR REPLACE FUNCTION public.owner_verified(p public.projects)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_verified_homeowner(p.owner_id) $$;
CREATE OR REPLACE FUNCTION public.contractor_verified(b public.bids)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_verified_contractor(b.contractor_id) $$;
GRANT EXECUTE ON FUNCTION public.is_verified_contractor(uuid), public.is_verified_homeowner(uuid), public.owner_verified(public.projects), public.contractor_verified(public.bids) TO anon, authenticated;

ALTER TABLE public.projects ADD COLUMN contractor_requirement text NOT NULL DEFAULT 'all';
ALTER TABLE public.projects ADD CONSTRAINT projects_contractor_requirement_check CHECK (contractor_requirement IN ('all','verified_only'));

CREATE OR REPLACE FUNCTION public.enforce_bid_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.project_id AND desired_date < CURRENT_DATE) THEN
    RAISE EXCEPTION 'This project has passed its done-by date';
  END IF;
  IF (SELECT count(*) FROM public.bids WHERE project_id = NEW.project_id) >= 5 THEN
    RAISE EXCEPTION 'Bidding is full for this project';
  END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.project_id AND contractor_requirement = 'verified_only')
     AND NOT public.is_verified_contractor(NEW.contractor_id) THEN
    RAISE EXCEPTION 'This homeowner only accepts bids from Verified Pros';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lock_project_details_after_bids()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.title, NEW.category, NEW.description, NEW.location, NEW.desired_date, NEW.image_url, NEW.answers, NEW.budget_min, NEW.budget_max, NEW.ai_questions, NEW.owner_questions, NEW.contractor_requirement)
     IS DISTINCT FROM (OLD.title, OLD.category, OLD.description, OLD.location, OLD.desired_date, OLD.image_url, OLD.answers, OLD.budget_min, OLD.budget_max, OLD.ai_questions, OLD.owner_questions, OLD.contractor_requirement)
     AND (OLD.status = 'awarded' OR EXISTS (SELECT 1 FROM public.bids WHERE project_id = OLD.id)) THEN
    RAISE EXCEPTION 'Project details can only be edited before any bids arrive';
  END IF;
  RETURN NEW;
END; $function$;