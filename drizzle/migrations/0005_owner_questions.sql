ALTER TABLE public.projects ADD COLUMN owner_questions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bids ADD COLUMN question_answers jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE OR REPLACE FUNCTION public.lock_project_details_after_bids()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.title, NEW.category, NEW.description, NEW.location, NEW.desired_date, NEW.image_url, NEW.answers, NEW.budget_min, NEW.budget_max, NEW.ai_questions, NEW.owner_questions)
     IS DISTINCT FROM (OLD.title, OLD.category, OLD.description, OLD.location, OLD.desired_date, OLD.image_url, OLD.answers, OLD.budget_min, OLD.budget_max, OLD.ai_questions, OLD.owner_questions)
     AND (OLD.status = 'awarded' OR EXISTS (SELECT 1 FROM public.bids WHERE project_id = OLD.id)) THEN
    RAISE EXCEPTION 'Project details can only be edited before any bids arrive';
  END IF;
  RETURN NEW;
END; $function$;