CREATE UNIQUE INDEX groups_singleton ON public.groups ((true));
COMMENT ON TABLE public.groups IS 'Single baba: only one row allowed (groups_singleton).';

CREATE TABLE public.guest_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.guest_invites TO authenticated;
GRANT ALL ON public.guest_invites TO service_role;
ALTER TABLE public.guest_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read invites" ON public.guest_invites FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND public.is_group_member(m.group_id, auth.uid())));
CREATE POLICY "members create own invites" ON public.guest_invites FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.is_open AND public.is_group_member(m.group_id, auth.uid())));
CREATE POLICY "members delete own invites" ON public.guest_invites FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TABLE public.match_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  invite_id uuid REFERENCES public.guest_invites(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 60),
  position public.player_position NOT NULL,
  rating numeric(3,1) NOT NULL DEFAULT 5.0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.match_guests TO authenticated;
GRANT ALL ON public.match_guests TO service_role;
ALTER TABLE public.match_guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read guests" ON public.match_guests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND public.is_group_member(m.group_id, auth.uid())));
CREATE POLICY "host or admin removes guest" ON public.match_guests FOR DELETE TO authenticated
  USING (invited_by = auth.uid() OR EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND public.is_group_admin(m.group_id, auth.uid())));

CREATE OR REPLACE FUNCTION public.get_guest_invite(_token text)
RETURNS TABLE (match_date timestamptz, location text, is_open boolean, host_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.match_date::timestamptz, m.location, m.is_open, p.name
  FROM public.guest_invites i
  JOIN public.matches m ON m.id = i.match_id
  JOIN public.profiles p ON p.id = i.created_by
  WHERE i.token = _token
$$;

CREATE OR REPLACE FUNCTION public.register_guest(_token text, _name text, _position public.player_position)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv public.guest_invites; _open boolean; _id uuid;
BEGIN
  SELECT * INTO _inv FROM public.guest_invites WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid invite'; END IF;
  SELECT is_open INTO _open FROM public.matches WHERE id = _inv.match_id;
  IF NOT _open THEN RAISE EXCEPTION 'match closed'; END IF;
  INSERT INTO public.match_guests (match_id, invite_id, invited_by, name, position, rating)
  VALUES (_inv.match_id, _inv.id, _inv.created_by, trim(_name), _position, 5.0)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.get_guest_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_guest(text, text, public.player_position) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_guest(text, text, public.player_position) TO anon, authenticated;