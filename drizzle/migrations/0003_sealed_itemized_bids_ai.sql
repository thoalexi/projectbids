ALTER TABLE public.projects
  ADD COLUMN budget_min numeric,
  ADD COLUMN budget_max numeric,
  ADD COLUMN ai_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN comparison jsonb,
  ADD COLUMN comparison_bid_hash text;

ALTER TABLE public.bids
  ADD COLUMN materials numeric,
  ADD COLUMN labor numeric,
  ADD COLUMN disposal numeric,
  ADD COLUMN duration_days integer,
  ADD COLUMN earliest_start date,
  ADD COLUMN warranty text;

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check CHECK (status IN ('draft','open','awarded'));

-- Drafts visible only to owner
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.projects;
CREATE POLICY "Live projects are public" ON public.projects FOR SELECT USING (status <> 'draft');
CREATE POLICY "Owners see own drafts" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- Sealed bids
DROP POLICY IF EXISTS "Bids are viewable by everyone" ON public.bids;
CREATE POLICY "Contractors see own bids" ON public.bids FOR SELECT TO authenticated USING (auth.uid() = contractor_id);
CREATE POLICY "Owners see bids on their projects" ON public.bids FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = bids.project_id AND p.owner_id = auth.uid()));

-- Public bid count as computed column
CREATE OR REPLACE FUNCTION public.bid_count(p public.projects)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*)::int FROM public.bids WHERE project_id = p.id $$;
GRANT EXECUTE ON FUNCTION public.bid_count(public.projects) TO anon, authenticated;

-- Max 5 bids
CREATE OR REPLACE FUNCTION public.enforce_bid_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.bids WHERE project_id = NEW.project_id) >= 5 THEN
    RAISE EXCEPTION 'Bidding is full for this project';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER enforce_bid_limit BEFORE INSERT ON public.bids FOR EACH ROW EXECUTE FUNCTION public.enforce_bid_limit();

CREATE OR REPLACE FUNCTION public.lock_project_details_after_bids()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.title, NEW.category, NEW.description, NEW.location, NEW.desired_date, NEW.image_url, NEW.answers, NEW.budget_min, NEW.budget_max, NEW.ai_questions)
     IS DISTINCT FROM (OLD.title, OLD.category, OLD.description, OLD.location, OLD.desired_date, OLD.image_url, OLD.answers, OLD.budget_min, OLD.budget_max, OLD.ai_questions)
     AND (OLD.status = 'awarded' OR EXISTS (SELECT 1 FROM public.bids WHERE project_id = OLD.id)) THEN
    RAISE EXCEPTION 'Project details can only be edited before any bids arrive';
  END IF;
  RETURN NEW;
END; $function$;