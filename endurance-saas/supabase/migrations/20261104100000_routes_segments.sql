-- =============================================================================
-- KronoFit — Parcours à suivre et segments chronométrés avec classements.
-- =============================================================================

-- Parcours (itinéraires) : tracé à suivre pendant l'enregistrement
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  sport_family TEXT NOT NULL DEFAULT 'run' CHECK (sport_family IN ('run', 'ride', 'swim', 'other')),
  points JSONB NOT NULL CHECK (jsonb_typeof(points) = 'array' AND jsonb_array_length(points) BETWEEN 2 AND 5000),
  distance_meters REAL NOT NULL DEFAULT 0,
  elevation_gain_meters REAL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX routes_user_idx ON public.routes (user_id, created_at DESC);
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir ses parcours et les parcours publics" ON public.routes FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR visibility = 'public');
CREATE POLICY "Créer ses parcours" ON public.routes FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Modifier ses parcours" ON public.routes FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Supprimer ses parcours" ON public.routes FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Segments : portion de parcours chronométrée (visible par tous les inscrits)
CREATE TABLE public.segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  sport_family TEXT NOT NULL CHECK (sport_family IN ('run', 'ride', 'swim', 'other')),
  points JSONB NOT NULL CHECK (jsonb_typeof(points) = 'array' AND jsonb_array_length(points) BETWEEN 2 AND 600),
  distance_meters REAL NOT NULL CHECK (distance_meters >= 100),
  min_lat DOUBLE PRECISION NOT NULL, max_lat DOUBLE PRECISION NOT NULL,
  min_lng DOUBLE PRECISION NOT NULL, max_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX segments_bbox_idx ON public.segments (min_lat, max_lat, min_lng, max_lng);
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Segments visibles par tous les inscrits" ON public.segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Créer un segment" ON public.segments FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = creator_id);
CREATE POLICY "Supprimer son segment" ON public.segments FOR DELETE TO authenticated USING ((SELECT auth.uid()) = creator_id);

-- Passages chronométrés sur un segment (un par séance et par segment)
CREATE TABLE public.segment_efforts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  elapsed_seconds INT NOT NULL CHECK (elapsed_seconds > 0),
  start_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (segment_id, activity_id)
);
CREATE INDEX segment_efforts_board_idx ON public.segment_efforts (segment_id, elapsed_seconds);
ALTER TABLE public.segment_efforts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir ses passages" ON public.segment_efforts FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Enregistrer un passage de sa séance" ON public.segment_efforts FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND a.user_id = (SELECT auth.uid())));
CREATE POLICY "Supprimer ses passages" ON public.segment_efforts FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

/** Segments dont l'emprise croise une zone (recherche des segments traversés par une séance). */
CREATE OR REPLACE FUNCTION public.segments_in_box(p_min_lat DOUBLE PRECISION, p_max_lat DOUBLE PRECISION, p_min_lng DOUBLE PRECISION, p_max_lng DOUBLE PRECISION)
RETURNS SETOF public.segments LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT * FROM public.segments s
  WHERE s.max_lat >= p_min_lat AND s.min_lat <= p_max_lat AND s.max_lng >= p_min_lng AND s.min_lng <= p_max_lng
  LIMIT 200
$$;

/** Classement d'un segment : meilleur temps de chaque athlète (séances non privées), et le mien. */
CREATE OR REPLACE FUNCTION public.segment_leaderboard(p_segment UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH best AS (
    SELECT DISTINCT ON (e.user_id) e.user_id, e.elapsed_seconds, e.start_time, e.activity_id
    FROM public.segment_efforts e JOIN public.activities a ON a.id = e.activity_id
    WHERE e.segment_id = p_segment AND (a.visibility <> 'private' OR e.user_id = (SELECT auth.uid()))
    ORDER BY e.user_id, e.elapsed_seconds
  ), ranked AS (SELECT b.*, rank() OVER (ORDER BY b.elapsed_seconds) AS rank FROM best b)
  SELECT jsonb_build_object(
    'segment', (SELECT jsonb_build_object('id', s.id, 'name', s.name, 'sport_family', s.sport_family, 'distance_meters', s.distance_meters,
        'points', s.points, 'creator', public.athlete_card(s.creator_id), 'mine', s.creator_id = (SELECT auth.uid())) FROM public.segments s WHERE s.id = p_segment),
    'leaders', (SELECT coalesce(jsonb_agg(jsonb_build_object('rank', r.rank, 'user', public.athlete_card(r.user_id), 'elapsed', r.elapsed_seconds,
        'date', r.start_time, 'activity_id', CASE WHEN public.can_view_activity(r.activity_id) THEN r.activity_id END) ORDER BY r.rank), '[]'::jsonb)
      FROM (SELECT * FROM ranked ORDER BY rank LIMIT 25) r),
    'me', (SELECT jsonb_build_object('rank', r.rank, 'elapsed', r.elapsed_seconds, 'date', r.start_time) FROM ranked r WHERE r.user_id = (SELECT auth.uid())),
    'my_efforts', (SELECT count(*) FROM public.segment_efforts e WHERE e.segment_id = p_segment AND e.user_id = (SELECT auth.uid())),
    'athletes', (SELECT count(*) FROM best))
$$;

REVOKE ALL ON FUNCTION public.segments_in_box(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.segments_in_box(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
REVOKE ALL ON FUNCTION public.segment_leaderboard(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.segment_leaderboard(UUID) TO authenticated;
