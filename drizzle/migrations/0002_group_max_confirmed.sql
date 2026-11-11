ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS max_confirmed int NOT NULL DEFAULT 24 CHECK (max_confirmed BETWEEN 4 AND 40);
ALTER TABLE public.matches ALTER COLUMN max_players SET DEFAULT 24;