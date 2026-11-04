-- =============================================================================
-- Phase 8 : espace coach (suivi d'athlètes avec consentement)
-- =============================================================================

-- 1. COACH_ATHLETES : relation coach → athlète
-- pending : invitation envoyée (token haché), active : acceptée par l'athlète, revoked : terminée.
CREATE TABLE public.coach_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invite_token_hash TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  accepted_at TIMESTAMPTZ,
  CHECK (athlete_id IS NULL OR athlete_id <> coach_id),
  CHECK (status = 'pending' OR athlete_id IS NOT NULL)
);
-- Une seule relation active par couple coach / athlète
CREATE UNIQUE INDEX coach_athletes_active_uniq ON public.coach_athletes (coach_id, athlete_id) WHERE status = 'active';
CREATE INDEX coach_athletes_athlete_idx ON public.coach_athletes (athlete_id) WHERE status = 'active';

ALTER TABLE public.coach_athletes ENABLE ROW LEVEL SECURITY;
-- Lecture : le coach et l'athlète concernés. Écritures : serveur uniquement (invitation, acceptation, fin).
CREATE POLICY "Lecture de ses relations coach" ON public.coach_athletes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = coach_id OR (SELECT auth.uid()) = athlete_id);
REVOKE INSERT, UPDATE, DELETE ON public.coach_athletes FROM anon, authenticated;
-- Le hash du jeton n'a pas à être lu par les utilisateurs
REVOKE SELECT ON public.coach_athletes FROM anon, authenticated;
GRANT SELECT (id, coach_id, athlete_id, invited_email, status, created_at, expires_at, accepted_at)
  ON public.coach_athletes TO authenticated;

-- 2. Fonction d'autorisation : l'utilisateur courant est-il coach (actif) de cet athlète ?
-- SECURITY DEFINER : évite la récursion RLS et reste rapide (index partiel ci-dessus).
CREATE OR REPLACE FUNCTION public.is_coach_of(athlete UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coach_athletes
    WHERE coach_id = (SELECT auth.uid()) AND athlete_id = athlete AND status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_coach_of(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_coach_of(UUID) TO authenticated;

-- 3. Lecture par le coach des données d'entraînement de ses athlètes (pas de facturation)
CREATE POLICY "Coach : lecture des séances" ON public.activities
  FOR SELECT TO authenticated USING (public.is_coach_of(user_id));
CREATE POLICY "Coach : lecture du bien-être" ON public.daily_metrics
  FOR SELECT TO authenticated USING (public.is_coach_of(user_id));
CREATE POLICY "Coach : lecture des analyses" ON public.coach_insights
  FOR SELECT TO authenticated USING (public.is_coach_of(user_id));

-- 4. Le coach peut programmer des séances à son athlète (et seulement celles-là, les siennes)
ALTER TABLE public.planned_workouts
  ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE POLICY "Coach : lecture du programme" ON public.planned_workouts
  FOR SELECT TO authenticated USING (public.is_coach_of(user_id));
CREATE POLICY "Coach : ajout au programme" ON public.planned_workouts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_coach_of(user_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "Coach : modification de ses séances" ON public.planned_workouts
  FOR UPDATE TO authenticated
  USING (public.is_coach_of(user_id) AND created_by = (SELECT auth.uid()))
  WITH CHECK (public.is_coach_of(user_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY "Coach : suppression de ses séances" ON public.planned_workouts
  FOR DELETE TO authenticated
  USING (public.is_coach_of(user_id) AND created_by = (SELECT auth.uid()));

-- 5. Profil des athlètes vu par le coach : colonnes sportives uniquement
-- (pas de politique SELECT sur profiles : le coach ne voit ni Stripe ni l'abonnement).
CREATE OR REPLACE FUNCTION public.coached_athletes()
RETURNS TABLE (
  relation_id UUID, athlete_id UUID, full_name TEXT, sport_discipline TEXT,
  ftp INT, hr_max INT, hr_rest INT, lactate_threshold_hr INT, vma NUMERIC, accepted_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ca.id, p.id, p.full_name, p.sport_discipline, p.ftp, p.hr_max, p.hr_rest,
         p.lactate_threshold_hr, p.vma, ca.accepted_at
  FROM public.coach_athletes ca
  JOIN public.profiles p ON p.id = ca.athlete_id
  WHERE ca.coach_id = (SELECT auth.uid()) AND ca.status = 'active'
  ORDER BY p.full_name;
$$;
REVOKE ALL ON FUNCTION public.coached_athletes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coached_athletes() TO authenticated;

-- 6. Nom des coachs vu par l'athlète (pour afficher « Suivi par … »)
CREATE OR REPLACE FUNCTION public.my_coaches()
RETURNS TABLE (relation_id UUID, coach_id UUID, full_name TEXT, accepted_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ca.id, p.id, p.full_name, ca.accepted_at
  FROM public.coach_athletes ca
  JOIN public.profiles p ON p.id = ca.coach_id
  WHERE ca.athlete_id = (SELECT auth.uid()) AND ca.status = 'active';
$$;
REVOKE ALL ON FUNCTION public.my_coaches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_coaches() TO authenticated;

-- 7. Activités : formats de fichier importés (.gpx, .tcx en plus du .fit)
ALTER TABLE public.activities DROP CONSTRAINT activities_source_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_source_check CHECK (source IN ('manual', 'fit', 'gpx', 'tcx', 'polar'));
