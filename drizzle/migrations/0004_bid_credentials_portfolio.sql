ALTER TABLE public.bids
  ADD COLUMN insured boolean NOT NULL DEFAULT false,
  ADD COLUMN website text,
  ADD COLUMN google_url text,
  ADD COLUMN yelp_url text,
  ADD COLUMN thumbtack_url text,
  ADD COLUMN portfolio_images jsonb NOT NULL DEFAULT '[]'::jsonb;