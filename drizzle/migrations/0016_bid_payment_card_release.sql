ALTER TABLE public.bid_payments ADD COLUMN IF NOT EXISTS card_released_at timestamptz;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;