ALTER TABLE public.contractor_verifications
  ADD COLUMN IF NOT EXISTS licensed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS license_images jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS licensed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_number text;