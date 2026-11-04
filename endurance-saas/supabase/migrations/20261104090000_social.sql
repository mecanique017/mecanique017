-- =============================================================================
-- KronoFit — Social : profils publics, abonnements, bravos, commentaires, photos,
-- clubs, défis mensuels. Les autres utilisateurs ne lisent JAMAIS les tables
-- directement : tout passe par des fonctions qui appliquent la visibilité et ne
-- renvoient que le tracé « public » (200 m masqués au départ et à l'arrivée).
-- =============================================================================

-- 1. Profils et séances : champs publics, visibilité ----------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE CHECK (username ~ '^[a-z0-9_.]{3,20}$'),
  ADD COLUMN IF NOT EXISTS bio TEXT CHECK (char_length(bio) <= 280),
  ADD COLUMN IF NOT EXISTS city TEXT CHECK (char_length(city) <= 60),
  ADD COLUMN IF NOT EXISTS default_visibility TEXT NOT NULL DEFAULT 'followers' CHECK (default_visibility IN ('public', 'followers', 'private'));
GRANT UPDATE (username, bio, city, default_visibility) ON public.profiles TO authenticated;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'followers' CHECK (visibility IN ('public', 'followers', 'private')),
  ADD COLUMN IF NOT EXISTS public_route JSONB;

-- 2. Abonnements ----------------------------------------------------------------
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX follows_followee_idx ON public.follows (followee_id);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir ses abonnements et abonnés" ON public.follows FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (follower_id, followee_id));
CREATE POLICY "S'abonner" ON public.follows FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = follower_id);
CREATE POLICY "Se désabonner ou retirer un abonné" ON public.follows FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) IN (follower_id, followee_id));

-- 3. Règle unique de visibilité d'une séance ------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_activity(p_activity UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.id = p_activity AND (
      a.user_id = (SELECT auth.uid())
      OR a.visibility = 'public'
      OR (a.visibility = 'followers' AND EXISTS (
        SELECT 1 FROM public.follows f WHERE f.follower_id = (SELECT auth.uid()) AND f.followee_id = a.user_id))
    )
  )
$$;

-- 4. Bravos et commentaires -----------------------------------------------------
CREATE TABLE public.kudos (
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, user_id)
);
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir les bravos des séances visibles" ON public.kudos FOR SELECT TO authenticated
  USING (public.can_view_activity(activity_id));
CREATE POLICY "Donner un bravo" ON public.kudos FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND public.can_view_activity(activity_id));
CREATE POLICY "Retirer son bravo" ON public.kudos FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX comments_activity_idx ON public.comments (activity_id, created_at);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir les commentaires des séances visibles" ON public.comments FOR SELECT TO authenticated
  USING (public.can_view_activity(activity_id));
CREATE POLICY "Commenter" ON public.comments FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND public.can_view_activity(activity_id));
CREATE POLICY "Supprimer son commentaire ou ceux de sa séance" ON public.comments FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND a.user_id = (SELECT auth.uid())));

-- 5. Photos (Supabase Storage, compartiment privé) --------------------------------
CREATE TABLE public.activity_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX activity_photos_activity_idx ON public.activity_photos (activity_id);
ALTER TABLE public.activity_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir les photos des séances visibles" ON public.activity_photos FOR SELECT TO authenticated
  USING (public.can_view_activity(activity_id));
CREATE POLICY "Ajouter une photo à sa séance" ON public.activity_photos FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND a.user_id = (SELECT auth.uid())));
CREATE POLICY "Supprimer ses photos" ON public.activity_photos FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('activity-photos', 'activity-photos', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
-- Chemin : {user_id}/{activity_id}/{fichier}
CREATE POLICY "Photos : dépôt dans son dossier" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Photos : suppression des siennes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "Photos : lecture si la séance est visible" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-photos' AND public.can_view_activity(((storage.foldername(name))[2])::uuid));

-- 6. Clubs ----------------------------------------------------------------------
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 60),
  description TEXT CHECK (char_length(description) <= 500),
  sport_family TEXT CHECK (sport_family IN ('run', 'ride', 'swim', 'other')),
  city TEXT CHECK (char_length(city) <= 60),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.club_members (
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, user_id)
);
CREATE INDEX club_members_user_idx ON public.club_members (user_id);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clubs visibles par tous les inscrits" ON public.clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Créer un club" ON public.clubs FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY "Modifier son club" ON public.clubs FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY "Supprimer son club" ON public.clubs FOR DELETE TO authenticated USING ((SELECT auth.uid()) = owner_id);
CREATE POLICY "Voir ses adhésions" ON public.club_members FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Rejoindre un club" ON public.club_members FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id AND role = 'member');
CREATE POLICY "Quitter un club ou exclure (créateur)" ON public.club_members FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.owner_id = (SELECT auth.uid())));

-- Le créateur devient administrateur de son club
CREATE OR REPLACE FUNCTION public.club_owner_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role) VALUES (NEW.id, NEW.owner_id, 'admin') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clubs_owner_membership AFTER INSERT ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.club_owner_membership();

-- 7. Défis mensuels -------------------------------------------------------------
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) <= 80),
  description TEXT CHECK (char_length(description) <= 300),
  month DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
  sport_family TEXT CHECK (sport_family IN ('run', 'ride', 'swim', 'other')),
  metric TEXT NOT NULL CHECK (metric IN ('distance', 'duration', 'elevation', 'sessions')),
  goal NUMERIC NOT NULL CHECK (goal > 0), -- m, s, m, séances
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.challenge_participants (
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id)
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Défis visibles par tous les inscrits" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Voir ses participations" ON public.challenge_participants FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Participer à un défi" ON public.challenge_participants FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Quitter un défi" ON public.challenge_participants FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- 8. Fonctions de lecture « sociales » (seules portes d'accès aux données des autres) --
CREATE OR REPLACE FUNCTION public.athlete_card(p_user UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('id', p.id, 'username', p.username, 'name', coalesce(p.full_name, p.username, 'Athlète KronoFit'),
    'avatar_url', p.avatar_url, 'city', p.city)
  FROM public.profiles p WHERE p.id = p_user
$$;

/** Fil : mes séances et celles des personnes que je suis, visibles pour moi. */
CREATE OR REPLACE FUNCTION public.get_feed(p_before TIMESTAMPTZ DEFAULT NULL, p_limit INT DEFAULT 20)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH me AS (SELECT (SELECT auth.uid()) AS id),
  feed AS (
    SELECT a.* FROM public.activities a, me
    WHERE (a.user_id = me.id OR (a.visibility IN ('public', 'followers') AND EXISTS (
            SELECT 1 FROM public.follows f WHERE f.follower_id = me.id AND f.followee_id = a.user_id)))
      AND (p_before IS NULL OR a.start_time < p_before)
    ORDER BY a.start_time DESC
    LIMIT least(greatest(p_limit, 1), 50)
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id, 'user', public.athlete_card(f.user_id), 'mine', f.user_id = (SELECT auth.uid()),
    'title', f.title, 'sport_type', f.sport_type, 'start_time', f.start_time, 'visibility', f.visibility,
    'duration_seconds', f.duration_seconds, 'distance_meters', f.distance_meters, 'elevation_gain_meters', f.elevation_gain_meters,
    'route', CASE WHEN f.user_id = (SELECT auth.uid()) THEN f.raw_telemetry -> 'route' ELSE f.public_route END,
    'kudos', (SELECT count(*) FROM public.kudos k WHERE k.activity_id = f.id),
    'kudoed', EXISTS (SELECT 1 FROM public.kudos k WHERE k.activity_id = f.id AND k.user_id = (SELECT auth.uid())),
    'comments', (SELECT count(*) FROM public.comments c WHERE c.activity_id = f.id),
    'photos', (SELECT coalesce(jsonb_agg(ph.path ORDER BY ph.created_at), '[]'::jsonb) FROM public.activity_photos ph WHERE ph.activity_id = f.id)
  ) ORDER BY f.start_time DESC), '[]'::jsonb) FROM feed f
$$;

/** Une séance d'un autre athlète (si visible) : chiffres, tracé public, bravos, commentaires, photos. */
CREATE OR REPLACE FUNCTION public.get_shared_activity(p_activity UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'id', a.id, 'user', public.athlete_card(a.user_id), 'mine', a.user_id = (SELECT auth.uid()),
    'title', a.title, 'sport_type', a.sport_type, 'start_time', a.start_time, 'visibility', a.visibility,
    'duration_seconds', a.duration_seconds, 'distance_meters', a.distance_meters, 'elevation_gain_meters', a.elevation_gain_meters,
    'avg_hr', a.avg_hr, 'avg_watts', a.avg_watts, 'athlete_notes', a.athlete_notes,
    'route', CASE WHEN a.user_id = (SELECT auth.uid()) THEN a.raw_telemetry -> 'route' ELSE a.public_route END,
    'kudos', (SELECT count(*) FROM public.kudos k WHERE k.activity_id = a.id),
    'kudoed', EXISTS (SELECT 1 FROM public.kudos k WHERE k.activity_id = a.id AND k.user_id = (SELECT auth.uid())),
    'kudoers', (SELECT coalesce(jsonb_agg(public.athlete_card(k.user_id)), '[]'::jsonb) FROM (SELECT user_id FROM public.kudos WHERE activity_id = a.id ORDER BY created_at DESC LIMIT 30) k),
    'comment_list', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'body', c.body, 'created_at', c.created_at, 'user', public.athlete_card(c.user_id),
        'mine', c.user_id = (SELECT auth.uid())) ORDER BY c.created_at), '[]'::jsonb) FROM public.comments c WHERE c.activity_id = a.id),
    'photos', (SELECT coalesce(jsonb_agg(ph.path ORDER BY ph.created_at), '[]'::jsonb) FROM public.activity_photos ph WHERE ph.activity_id = a.id))
  FROM public.activities a WHERE a.id = p_activity AND public.can_view_activity(a.id)
$$;

/** Recherche d'athlètes (nom, pseudo, ville). */
CREATE OR REPLACE FUNCTION public.search_athletes(p_query TEXT)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(public.athlete_card(p.id) || jsonb_build_object(
    'following', EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = (SELECT auth.uid()) AND f.followee_id = p.id))), '[]'::jsonb)
  FROM (SELECT id FROM public.profiles
        WHERE id <> (SELECT auth.uid()) AND char_length(trim(p_query)) >= 2
          AND (username ILIKE '%' || trim(p_query) || '%' OR full_name ILIKE '%' || trim(p_query) || '%' OR city ILIKE '%' || trim(p_query) || '%')
        ORDER BY full_name NULLS LAST LIMIT 20) p
$$;

/** Profil public d'un athlète : carte, compteurs, séances visibles récentes. */
CREATE OR REPLACE FUNCTION public.get_athlete(p_user UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.athlete_card(p.id) || jsonb_build_object(
    'bio', p.bio, 'me', p.id = (SELECT auth.uid()),
    'following', EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = (SELECT auth.uid()) AND f.followee_id = p.id),
    'followers', (SELECT count(*) FROM public.follows f WHERE f.followee_id = p.id),
    'followees', (SELECT count(*) FROM public.follows f WHERE f.follower_id = p.id),
    'activities', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'sport_type', a.sport_type, 'start_time', a.start_time,
        'distance_meters', a.distance_meters, 'duration_seconds', a.duration_seconds) ORDER BY a.start_time DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.activities x WHERE x.user_id = p.id AND public.can_view_activity(x.id) ORDER BY x.start_time DESC LIMIT 20) a))
  FROM public.profiles p WHERE p.id = p_user
$$;

/** Classement d'un club sur une période (séances non privées des membres). */
CREATE OR REPLACE FUNCTION public.club_leaderboard(p_club UUID, p_from TIMESTAMPTZ)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('user', public.athlete_card(m.user_id), 'role', m.role,
      'distance', coalesce(s.distance, 0), 'duration', coalesce(s.duration, 0), 'sessions', coalesce(s.sessions, 0))
      ORDER BY coalesce(s.distance, 0) DESC), '[]'::jsonb)
  FROM public.club_members m
  LEFT JOIN LATERAL (
    SELECT sum(a.distance_meters) AS distance, sum(a.duration_seconds) AS duration, count(*) AS sessions
    FROM public.activities a WHERE a.user_id = m.user_id AND a.visibility <> 'private' AND a.start_time >= p_from
  ) s ON true
  WHERE m.club_id = p_club
$$;

CREATE OR REPLACE FUNCTION public.list_clubs()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'description', c.description, 'sport_family', c.sport_family,
    'city', c.city, 'owner', c.owner_id = (SELECT auth.uid()),
    'members', (SELECT count(*) FROM public.club_members m WHERE m.club_id = c.id),
    'member', EXISTS (SELECT 1 FROM public.club_members m WHERE m.club_id = c.id AND m.user_id = (SELECT auth.uid())))
    ORDER BY c.created_at), '[]'::jsonb) FROM public.clubs c
$$;

/** Défis du mois : ma progression et le classement des participants. */
CREATE OR REPLACE FUNCTION public.challenge_board(p_month DATE)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH ch AS (SELECT * FROM public.challenges WHERE month = date_trunc('month', p_month)::date),
  progress AS (
    SELECT ch.id AS challenge_id, cp.user_id,
      CASE ch.metric
        WHEN 'distance' THEN coalesce(sum(a.distance_meters), 0)
        WHEN 'duration' THEN coalesce(sum(a.duration_seconds), 0)
        WHEN 'elevation' THEN coalesce(sum(a.elevation_gain_meters), 0)
        ELSE count(a.id) END AS value
    FROM ch JOIN public.challenge_participants cp ON cp.challenge_id = ch.id
    LEFT JOIN public.activities a ON a.user_id = cp.user_id AND a.visibility <> 'private'
      AND a.start_time >= ch.month AND a.start_time < (ch.month + INTERVAL '1 month')
      AND (ch.sport_family IS NULL OR
           (ch.sport_family = 'run' AND a.sport_type IN ('run', 'trail', 'walk', 'hike')) OR
           (ch.sport_family = 'ride' AND a.sport_type IN ('ride', 'mtb', 'gravel', 'ebike', 'virtual_ride')) OR
           (ch.sport_family = 'swim' AND a.sport_type IN ('swim', 'open_water')))
    GROUP BY ch.id, ch.metric, cp.user_id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', ch.id, 'title', ch.title, 'description', ch.description, 'sport_family', ch.sport_family, 'metric', ch.metric, 'goal', ch.goal,
    'joined', EXISTS (SELECT 1 FROM public.challenge_participants cp WHERE cp.challenge_id = ch.id AND cp.user_id = (SELECT auth.uid())),
    'participants', (SELECT count(*) FROM public.challenge_participants cp WHERE cp.challenge_id = ch.id),
    'mine', (SELECT p.value FROM progress p WHERE p.challenge_id = ch.id AND p.user_id = (SELECT auth.uid())),
    'leaders', (SELECT coalesce(jsonb_agg(jsonb_build_object('user', public.athlete_card(p.user_id), 'value', p.value) ORDER BY p.value DESC), '[]'::jsonb)
                FROM (SELECT * FROM progress p2 WHERE p2.challenge_id = ch.id ORDER BY p2.value DESC LIMIT 10) p)
  ) ORDER BY ch.created_at), '[]'::jsonb) FROM ch
$$;

-- Droits : fonctions réservées aux utilisateurs connectés
DO $$
DECLARE fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY['can_view_activity(uuid)', 'athlete_card(uuid)', 'get_feed(timestamptz, int)', 'get_shared_activity(uuid)',
    'search_athletes(text)', 'get_athlete(uuid)', 'club_leaderboard(uuid, timestamptz)', 'list_clubs()', 'challenge_board(date)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.club_owner_membership() FROM PUBLIC, anon, authenticated;

-- 9. Défis officiels des prochains mois ------------------------------------------
INSERT INTO public.challenges (title, description, month, sport_family, metric, goal)
SELECT t.title, t.description, m.month, t.sport_family, t.metric, t.goal
FROM (VALUES
  ('100 km de course', 'Courez 100 km dans le mois (course, trail, marche, rando).', 'run', 'distance', 100000),
  ('500 km à vélo', 'Roulez 500 km dans le mois.', 'ride', 'distance', 500000),
  ('2 000 m de dénivelé', 'Cumulez 2 000 m de dénivelé positif, tous sports.', NULL, 'elevation', 2000),
  ('20 séances', 'Bougez 20 fois dans le mois, tous sports.', NULL, 'sessions', 20)
) AS t(title, description, sport_family, metric, goal)
CROSS JOIN (SELECT date_trunc('month', NOW())::date + (n || ' month')::interval AS month FROM generate_series(0, 2) n) m;
