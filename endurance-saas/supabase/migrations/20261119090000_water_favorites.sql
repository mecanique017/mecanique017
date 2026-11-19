-- =============================================================================
-- Base toujours active (ping quotidien), hydratation, repas favoris
-- =============================================================================

-- Requête minimale appelée chaque jour par GitHub Actions : l'offre gratuite de Supabase
-- met le projet en pause après 7 jours sans activité. Ne renvoie aucune donnée.
CREATE OR REPLACE FUNCTION public.kronofit_ping()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$ SELECT TRUE $$;
GRANT EXECUTE ON FUNCTION public.kronofit_ping() TO anon, authenticated;

-- Hydratation : total bu dans la journée (ml)
CREATE TABLE public.water_logs (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  ml INT NOT NULL DEFAULT 0 CHECK (ml BETWEEN 0 AND 15000),
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hydratation : la sienne" ON public.water_logs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Repas favoris : liste d'aliments (nom, quantité, valeurs pour 100 g)
CREATE TABLE public.meal_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  meal TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX meal_favorites_user_idx ON public.meal_favorites (user_id, created_at DESC);
ALTER TABLE public.meal_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Repas favoris : les siens" ON public.meal_favorites
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
