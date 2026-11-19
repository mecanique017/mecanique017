-- =============================================================================
-- Matériel : chaussures, vélos et leurs pièces d'usure, kilomètres et alertes
-- =============================================================================
CREATE TABLE public.gear (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Pièce d'un vélo (chaîne, pneus…) : ses km sont ceux du vélo depuis son montage
  parent_id UUID REFERENCES public.gear(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('shoes', 'bike', 'chain', 'tyres', 'brake_pads', 'cassette', 'other')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  -- Sports pour lesquels cet équipement est choisi automatiquement (chaussures, vélos)
  sports TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  start_km NUMERIC(8,1) NOT NULL DEFAULT 0 CHECK (start_km >= 0),
  limit_km NUMERIC(8,1) CHECK (limit_km > 0),
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retired BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Pièces : rattachées à un vélo ; chaussures et vélos : jamais rattachés
  CHECK (NOT (kind IN ('chain', 'tyres', 'brake_pads', 'cassette') AND parent_id IS NULL)),
  CHECK (NOT (kind IN ('shoes', 'bike') AND parent_id IS NOT NULL))
);
CREATE INDEX gear_user_idx ON public.gear (user_id);
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matériel : le sien" ON public.gear
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.activities ADD COLUMN gear_id UUID REFERENCES public.gear(id) ON DELETE SET NULL;
CREATE INDEX activities_gear_idx ON public.activities (gear_id) WHERE gear_id IS NOT NULL;

-- Équipement par défaut attribué automatiquement à chaque nouvelle séance (enregistrée,
-- saisie ou importée) selon le sport, s'il n'est pas déjà choisi.
CREATE OR REPLACE FUNCTION public.activities_default_gear()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.gear_id IS NULL THEN
    SELECT g.id INTO NEW.gear_id
    FROM public.gear g
    WHERE g.user_id = NEW.user_id AND g.parent_id IS NULL AND NOT g.retired
      AND g.is_default AND NEW.sport_type = ANY (g.sports)
    ORDER BY g.created_at DESC
    LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER activities_default_gear BEFORE INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.activities_default_gear();

-- Kilomètres de chaque équipement de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.gear_usage()
RETURNS TABLE (gear_id UUID, km NUMERIC, activities BIGINT, last_used TIMESTAMPTZ)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT g.id,
         g.start_km + COALESCE(SUM(a.distance_meters) / 1000.0, 0),
         COUNT(a.id),
         MAX(a.start_time)
  FROM public.gear g
  LEFT JOIN public.activities a
    ON a.user_id = g.user_id
   AND a.gear_id = COALESCE(g.parent_id, g.id)
   AND (g.parent_id IS NULL OR a.start_time >= g.installed_at)
  WHERE g.user_id = (SELECT auth.uid())
  GROUP BY g.id
$$;
GRANT EXECUTE ON FUNCTION public.gear_usage() TO authenticated;
