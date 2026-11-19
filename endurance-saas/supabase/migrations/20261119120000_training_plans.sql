-- =============================================================================
-- Plans d'entraînement générés (sans IA) : objectif, date, séances par semaine
-- =============================================================================
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal TEXT NOT NULL CHECK (goal IN ('5k', '10k', 'half', 'marathon', 'run_fitness', 'ride100', 'ride160', 'ride_fitness')),
  race_date DATE NOT NULL,
  sessions_per_week INT NOT NULL CHECK (sessions_per_week BETWEEN 2 AND 7),
  days INT[] NOT NULL DEFAULT '{}', -- jours d'entraînement (0 = lundi … 6 = dimanche)
  start_volume NUMERIC(6,1), -- km/semaine (course) ou heures/semaine (vélo) au départ
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX training_plans_user_idx ON public.training_plans (user_id, created_at DESC);
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans : les siens" ON public.training_plans
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER TABLE public.planned_workouts ADD COLUMN plan_id UUID REFERENCES public.training_plans(id) ON DELETE CASCADE;
CREATE INDEX planned_workouts_plan_idx ON public.planned_workouts (plan_id) WHERE plan_id IS NOT NULL;
ALTER TABLE public.planned_workouts DROP CONSTRAINT planned_workouts_source_check;
ALTER TABLE public.planned_workouts ADD CONSTRAINT planned_workouts_source_check CHECK (source IN ('manual', 'ai', 'demo', 'plan'));
