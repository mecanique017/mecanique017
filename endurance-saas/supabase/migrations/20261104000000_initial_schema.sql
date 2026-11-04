-- =============================================================================
-- Endurance SaaS — schéma initial
-- À exécuter dans Supabase (SQL Editor) ou via `supabase db push`.
-- =============================================================================

-- gen_random_uuid() est natif (PostgreSQL 13+) : pas besoin de l'extension uuid-ossp.

-- -----------------------------------------------------------------------------
-- 1. PROFILES (profils athlètes et paramètres physiologiques)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name TEXT,
  avatar_url TEXT,
  sport_discipline TEXT NOT NULL DEFAULT 'running'
    CHECK (sport_discipline IN ('running', 'cycling', 'triathlon')),
  age INT CHECK (age BETWEEN 5 AND 120),
  weight NUMERIC(5,2) CHECK (weight > 0),          -- kg
  height NUMERIC(5,2) CHECK (height > 0),          -- cm
  hr_max INT NOT NULL DEFAULT 190 CHECK (hr_max BETWEEN 100 AND 250),
  hr_rest INT NOT NULL DEFAULT 60 CHECK (hr_rest BETWEEN 25 AND 120),
  ftp INT NOT NULL DEFAULT 250 CHECK (ftp > 0),    -- W (vélo)
  vma NUMERIC(4,2) NOT NULL DEFAULT 16.0 CHECK (vma > 0), -- km/h
  lactate_threshold_hr INT NOT NULL DEFAULT 165 CHECK (lactate_threshold_hr BETWEEN 80 AND 250),
  -- Champs de facturation : modifiables UNIQUEMENT côté serveur (service role)
  stripe_customer_id TEXT UNIQUE,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  subscription_status TEXT NOT NULL DEFAULT 'active',
  CHECK (hr_rest < lactate_threshold_hr AND lactate_threshold_hr <= hr_max)
);

-- -----------------------------------------------------------------------------
-- 2. DAILY METRICS (récupération & charge d'entraînement)
-- -----------------------------------------------------------------------------
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hrv INT CHECK (hrv > 0),                         -- ms
  resting_hr INT CHECK (resting_hr BETWEEN 25 AND 150),
  sleep_score INT CHECK (sleep_score BETWEEN 0 AND 100),
  perceived_fatigue INT CHECK (perceived_fatigue BETWEEN 1 AND 10),
  atl NUMERIC(6,2) NOT NULL DEFAULT 0,             -- Fatigue (7 j)
  ctl NUMERIC(6,2) NOT NULL DEFAULT 0,             -- Forme (42 j)
  tsb NUMERIC(6,2) NOT NULL DEFAULT 0,             -- CTL - ATL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- -----------------------------------------------------------------------------
-- 3. ACTIVITIES (séances réalisées / importées)
-- -----------------------------------------------------------------------------
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sport_type TEXT NOT NULL CHECK (sport_type IN ('run', 'ride', 'swim')),
  start_time TIMESTAMPTZ NOT NULL,
  duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
  distance_meters NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (distance_meters >= 0),
  elevation_gain_meters NUMERIC(8,2) NOT NULL DEFAULT 0,
  avg_hr INT CHECK (avg_hr BETWEEN 25 AND 250),
  max_hr INT CHECK (max_hr BETWEEN 25 AND 250),
  avg_watts INT CHECK (avg_watts >= 0),
  max_watts INT CHECK (max_watts >= 0),
  tss NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (tss >= 0),
  intensity_factor NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (intensity_factor >= 0),
  fit_file_path TEXT,
  raw_telemetry JSONB,                             -- [{time, hr, watts, speed, lat, lng}, ...]
  rpe_score INT CHECK (rpe_score BETWEEN 1 AND 10),
  athlete_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX activities_user_start_idx ON public.activities (user_id, start_time DESC);

-- -----------------------------------------------------------------------------
-- 4. PLANNED WORKOUTS (séances du programme)
-- -----------------------------------------------------------------------------
CREATE TABLE public.planned_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sport_type TEXT NOT NULL CHECK (sport_type IN ('run', 'ride', 'swim')),
  target_duration_seconds INT CHECK (target_duration_seconds > 0),
  target_tss INT CHECK (target_tss >= 0),
  workout_structure JSONB,                         -- échauffement, intervalles, retour au calme
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX planned_workouts_user_date_idx ON public.planned_workouts (user_id, scheduled_date);

-- -----------------------------------------------------------------------------
-- 5. COACH INSIGHTS (analyses IA)
-- -----------------------------------------------------------------------------
CREATE TABLE public.coach_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  fatigue_alert BOOLEAN NOT NULL DEFAULT FALSE,
  suggested_adjustments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX coach_insights_user_created_idx ON public.coach_insights (user_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_insights ENABLE ROW LEVEL SECURITY;

-- PROFILES : lecture + modification de son propre profil uniquement.
-- Création par trigger, suppression en cascade depuis auth.users.
CREATE POLICY "Lecture de son profil" ON public.profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "Modification de son profil" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- Sécurité facturation : un utilisateur ne doit PAS pouvoir s'attribuer
-- 'premium' lui-même. On restreint l'UPDATE aux colonnes non sensibles.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (
  full_name, avatar_url, sport_discipline, age, weight, height,
  hr_max, hr_rest, ftp, vma, lactate_threshold_hr
) ON public.profiles TO authenticated;

-- Autres tables : chaque utilisateur gère ses propres lignes.
-- WITH CHECK empêche d'insérer/déplacer une ligne vers un autre user_id.
CREATE POLICY "Gestion de ses daily_metrics" ON public.daily_metrics
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Gestion de ses activités" ON public.activities
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Gestion de ses séances prévues" ON public.planned_workouts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Gestion de ses coach_insights" ON public.coach_insights
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Création automatique du profil à l'inscription.
-- SECURITY DEFINER + search_path vide : recommandations Supabase (pas de détournement de schéma).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mise à jour automatique de profiles.updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
