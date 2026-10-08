CREATE TABLE public.hire_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.hire_contacts TO authenticated;
GRANT ALL ON public.hire_contacts TO service_role;
ALTER TABLE public.hire_contacts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_hire_party(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.bids b ON b.id = p.accepted_bid_id
    WHERE p.id = _project_id AND p.status = 'awarded'
      AND (p.owner_id = _user_id OR b.contractor_id = _user_id)
  )
$$;

CREATE POLICY "Hire parties read contacts" ON public.hire_contacts FOR SELECT TO authenticated
  USING (public.is_hire_party(project_id, auth.uid()));
CREATE POLICY "Hire parties add own contact" ON public.hire_contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_hire_party(project_id, auth.uid()));
CREATE POLICY "Hire parties update own contact" ON public.hire_contacts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_hire_party(project_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_hire_party(project_id, auth.uid()));