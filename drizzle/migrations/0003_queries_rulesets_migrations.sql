-- =============================================================================
-- Supabase SQL Queries and Functions Log
-- Database structure, SQL functions (RPCs), and RLS policies for Bora pro Baba
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table Schema & Alterations
-- -----------------------------------------------------------------------------

-- Stores athlete monthly fee records
CREATE TABLE IF NOT EXISTS public.monthly_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reference_month DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add status column to match_guests if it does not exist yet
ALTER TABLE public.match_guests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Optional: update legacy guests to 'approved' so they do not disappear from the current list
UPDATE public.match_guests SET status = 'approved' WHERE status IS NULL;


-- -----------------------------------------------------------------------------
-- 2. Remote Procedure Calls (RPCs)
-- -----------------------------------------------------------------------------

-- Fetches the active group associated with the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_user_group()
RETURNS SETOF public.groups
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT g.*
  FROM public.groups g
  JOIN public.group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = auth.uid()
    AND gm.status = 'approved'
  LIMIT 1;
$$;

-- Updates the default monthly fee (monthly_fee) for a specific group (Admin only)
CREATE OR REPLACE FUNCTION public.update_group_monthly_fee(
  _group_id UUID,
  _monthly_fee NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify if caller is group admin
  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    UPDATE public.groups
    SET monthly_fee = _monthly_fee
    WHERE id = _group_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: User is not an admin of this group.';
  END IF;
END;
$$;

-- Updates the PIX key (pix_key) registered for the group (Admin only)
CREATE OR REPLACE FUNCTION public.update_group_pix(
  _group_id UUID,
  _pix_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    UPDATE public.groups
    SET pix_key = _pix_key
    WHERE id = _group_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: User is not an admin of this group.';
  END IF;
END;
$$;

-- Updates an athlete's rating score (0.0 to 10.0) used for team drawing algorithms
CREATE OR REPLACE FUNCTION public.update_athlete_rating(
  _target_user_id UUID,
  _new_rating NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET rating = _new_rating
  WHERE id = _target_user_id;
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies
-- -----------------------------------------------------------------------------

-- Enable RLS on monthly_payments
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own payments or admins to view all group payments
CREATE POLICY "Users can view own payments or group admins view all"
ON public.monthly_payments
FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = monthly_payments.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

-- Allow users to submit their payment records
CREATE POLICY "Users can insert own monthly payments"
ON public.monthly_payments
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- Allow admins to approve or reject payments
CREATE POLICY "Group admins can update payment status"
ON public.monthly_payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = monthly_payments.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  )
);

-- Allow visitors to access match invite tokens
CREATE POLICY "Permitir leitura pública de guest_invites"
ON public.guest_invites
FOR SELECT
USING (true);

-- Allow anyone to insert visitors on the match list
CREATE POLICY "Permitir inserção pública em match_guests"
ON public.match_guests
FOR INSERT
WITH CHECK (true);

-- Ensure UPDATE policies allow changing the guest status
CREATE POLICY "Permitir atualização em match_guests para autenticados"
ON public.match_guests
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Ensure DELETE policies allow removing the guest if declined
CREATE POLICY "Permitir exclusão em match_guests para autenticados"
ON public.match_guests
FOR DELETE
USING (true);