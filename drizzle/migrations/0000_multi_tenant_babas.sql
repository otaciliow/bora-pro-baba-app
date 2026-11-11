CREATE TYPE public.player_position AS ENUM ('goalkeeper','defender','midfielder','forward');
CREATE TYPE public.group_role AS ENUM ('admin','player');
CREATE TYPE public.member_status AS ENUM ('pending','approved');
CREATE TYPE public.payment_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  phone text,
  primary_position public.player_position,
  rating numeric NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  pix_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.group_role NOT NULL DEFAULT 'player',
  status public.member_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  match_date timestamptz NOT NULL,
  location text,
  max_players int NOT NULL DEFAULT 20,
  is_open boolean NOT NULL DEFAULT true
);
CREATE TABLE public.match_presences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE (match_id, user_id)
);
CREATE TABLE public.monthly_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  receipt_url text,
  status public.payment_status NOT NULL DEFAULT 'pending'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.groups, public.group_members, public.matches, public.match_presences, public.monthly_payments TO authenticated;
GRANT ALL ON public.profiles, public.groups, public.group_members, public.matches, public.match_presences, public.monthly_payments TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_presences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group uuid, _user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members WHERE group_id=_group AND user_id=_user AND status='approved') $$;
CREATE OR REPLACE FUNCTION public.is_group_admin(_group uuid, _user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members WHERE group_id=_group AND user_id=_user AND role='admin' AND status='approved') $$;
CREATE OR REPLACE FUNCTION public.shares_group(_a uuid, _b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members m1 JOIN group_members m2 ON m1.group_id=m2.group_id
    WHERE m1.user_id=_a AND m2.user_id=_b AND m1.status='approved') $$;

-- profiles
CREATE POLICY "own or groupmates read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_group(auth.uid(), id));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- groups
CREATE POLICY "members read group" ON public.groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid()));
CREATE POLICY "admins update group" ON public.groups FOR UPDATE TO authenticated USING (public.is_group_admin(id, auth.uid()));

-- group_members
CREATE POLICY "read memberships" ON public.group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_member(group_id, auth.uid()));
CREATE POLICY "admins manage members" ON public.group_members FOR UPDATE TO authenticated USING (public.is_group_admin(group_id, auth.uid()));
CREATE POLICY "admins remove members" ON public.group_members FOR DELETE TO authenticated USING (public.is_group_admin(group_id, auth.uid()));

-- matches
CREATE POLICY "members read matches" ON public.matches FOR SELECT TO authenticated USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "admins insert matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (public.is_group_admin(group_id, auth.uid()));
CREATE POLICY "admins update matches" ON public.matches FOR UPDATE TO authenticated USING (public.is_group_admin(group_id, auth.uid()));
CREATE POLICY "admins delete matches" ON public.matches FOR DELETE TO authenticated USING (public.is_group_admin(group_id, auth.uid()));

-- presences
CREATE POLICY "members read presences" ON public.match_presences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND public.is_group_member(m.group_id, auth.uid())));
CREATE POLICY "confirm own presence" ON public.match_presences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.is_open AND public.is_group_member(m.group_id, auth.uid())));
CREATE POLICY "remove own presence" ON public.match_presences FOR DELETE TO authenticated USING (user_id = auth.uid());

-- payments
CREATE POLICY "read payments" ON public.monthly_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));
CREATE POLICY "submit own payment" ON public.monthly_payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "admins review payments" ON public.monthly_payments FOR UPDATE TO authenticated USING (public.is_group_admin(group_id, auth.uid()));

-- onboarding: reads signup metadata and creates profile + group/membership
CREATE OR REPLACE FUNCTION public.complete_onboarding() RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  meta jsonb;
  g_id uuid;
  code text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = uid;
  INSERT INTO profiles(id, name, phone) VALUES (uid, coalesce(meta->>'name',''), meta->>'phone')
    ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE user_id = uid) THEN
    IF meta->>'onboarding' = 'create' AND coalesce(meta->>'group_name','') <> '' THEN
      LOOP
        code := upper(substr(md5(random()::text), 1, 6));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM groups WHERE invite_code = code);
      END LOOP;
      INSERT INTO groups(name, slug, invite_code, pix_key)
        VALUES (meta->>'group_name',
                trim(both '-' from regexp_replace(lower(meta->>'group_name'), '[^a-z0-9]+', '-', 'g')) || '-' || lower(code),
                code, meta->>'pix_key')
        RETURNING id INTO g_id;
      INSERT INTO group_members(group_id, user_id, role, status) VALUES (g_id, uid, 'admin', 'approved');
    ELSIF meta->>'onboarding' = 'join' THEN
      SELECT id INTO g_id FROM groups WHERE invite_code = upper(trim(meta->>'invite_code'));
      IF g_id IS NOT NULL THEN
        INSERT INTO group_members(group_id, user_id, role, status) VALUES (g_id, uid, 'player', 'pending');
      END IF;
    END IF;
  END IF;
  RETURN (SELECT coalesce(json_agg(json_build_object('group_id', gm.group_id, 'group_name', g.name, 'invite_code', CASE WHEN gm.role='admin' THEN g.invite_code END, 'role', gm.role, 'status', gm.status)), '[]'::json)
          FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = uid);
END $$;

CREATE OR REPLACE FUNCTION public.invite_code_exists(_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM groups WHERE invite_code = upper(trim(_code))) $$;
GRANT EXECUTE ON FUNCTION public.invite_code_exists(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_onboarding() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;