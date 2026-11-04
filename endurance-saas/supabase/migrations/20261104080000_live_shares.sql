-- Suivi en direct partagé : l'athlète publie sa position ; un proche la consulte avec un lien secret (sans compte).
CREATE TABLE public.live_shares (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT CHECK (char_length(display_name) <= 60),
  sport TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'ended')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  accuracy REAL,
  distance_meters REAL NOT NULL DEFAULT 0,
  moving_seconds INT NOT NULL DEFAULT 0,
  track JSONB NOT NULL DEFAULT '[]'::jsonb,
  CHECK (jsonb_typeof(track) = 'array' AND jsonb_array_length(track) <= 600)
);
CREATE INDEX live_shares_user_idx ON public.live_shares (user_id, updated_at DESC);
ALTER TABLE public.live_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestion de ses partages en direct" ON public.live_shares
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Lecture publique par le seul jeton (122 bits aléatoires) ; expire 24 h après la dernière mise à jour.
CREATE OR REPLACE FUNCTION public.get_live_share(p_token UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'display_name', s.display_name, 'sport', s.sport, 'status', s.status,
    'started_at', s.started_at, 'updated_at', s.updated_at,
    'lat', s.lat, 'lng', s.lng, 'accuracy', s.accuracy,
    'distance_meters', s.distance_meters, 'moving_seconds', s.moving_seconds, 'track', s.track)
  FROM public.live_shares s
  WHERE s.token = p_token AND s.updated_at > NOW() - INTERVAL '24 hours'
$$;
REVOKE ALL ON FUNCTION public.get_live_share(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_share(UUID) TO anon, authenticated;
