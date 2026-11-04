-- =============================================================================
-- Phase 6 : quotas IA non contournables, puissance normalisée, origine des séances
-- =============================================================================

-- 1. AI_USAGE : journal des appels IA (quotas mensuels).
-- Correctif : le quota comptait les lignes de coach_insights, que l'utilisateur peut
-- supprimer (politique FOR ALL) → supprimer ses analyses remettait le compteur à zéro.
-- Ce journal est en LECTURE SEULE pour l'utilisateur ; seul le serveur (service role) écrit.
CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('coach_analysis', 'training_plan')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ai_usage_user_kind_created_idx ON public.ai_usage (user_id, kind, created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture de sa consommation IA" ON public.ai_usage
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.ai_usage FROM anon, authenticated;

-- Reprise de l'historique : les analyses déjà faites comptent dans le quota du mois
INSERT INTO public.ai_usage (user_id, kind, created_at)
SELECT user_id, 'coach_analysis', created_at FROM public.coach_insights;

-- 2. ACTIVITIES : puissance normalisée et origine
ALTER TABLE public.activities
  ADD COLUMN normalized_power INT CHECK (normalized_power >= 0),
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'fit'));

-- Séances importées avant cette migration : NP et origine reprises de raw_telemetry
UPDATE public.activities
SET source = 'fit',
    normalized_power = NULLIF(raw_telemetry ->> 'normalizedPower', '')::INT
WHERE raw_telemetry ? 'points';

-- 3. PLANNED_WORKOUTS : origine (saisie manuelle ou plan généré par le coach IA)
ALTER TABLE public.planned_workouts
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai'));
