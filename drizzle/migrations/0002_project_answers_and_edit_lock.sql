ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.lock_project_details_after_bids()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.title, NEW.category, NEW.description, NEW.location, NEW.desired_date, NEW.image_url, NEW.answers)
     IS DISTINCT FROM (OLD.title, OLD.category, OLD.description, OLD.location, OLD.desired_date, OLD.image_url, OLD.answers)
     AND (OLD.status <> 'open' OR EXISTS (SELECT 1 FROM public.bids WHERE project_id = OLD.id)) THEN
    RAISE EXCEPTION 'Project details can only be edited before any bids arrive';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER lock_project_details_after_bids
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.lock_project_details_after_bids();