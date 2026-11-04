-- =============================================================================
-- INSTALLATION COMPLÈTE EN UNE FOIS (projet Supabase NEUF uniquement)
-- Concaténation, dans l'ordre, des fichiers de supabase/migrations/.
-- Généré depuis ces fichiers : en cas de modification, ce sont eux qui font foi.
-- =============================================================================

-- >>> 20261104000000_initial_schema.sql
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

-- >>> 20261104010000_phase6.sql
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

-- >>> 20261104020000_phase7.sql
-- =============================================================================
-- Phase 7 : synchronisation Polar, notifications e-mail
-- =============================================================================

-- 1. ACTIVITIES : séances synchronisées depuis Polar (identifiant externe, pas de doublon)
ALTER TABLE public.activities DROP CONSTRAINT activities_source_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_source_check CHECK (source IN ('manual', 'fit', 'polar')),
  ADD COLUMN external_id TEXT;
CREATE UNIQUE INDEX activities_external_uniq ON public.activities (user_id, source, external_id)
  WHERE external_id IS NOT NULL;

-- 2. POLAR_CONNECTIONS : jetons d'accès Polar.
-- Données sensibles : AUCUN accès pour les utilisateurs (ni lecture ni écriture),
-- seul le serveur (service role) les manipule. Le jeton ne quitte jamais le serveur.
CREATE TABLE public.polar_connections (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  polar_user_id BIGINT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  -- Consentement explicite à l'envoi des données Polar au coach IA (licence Polar § 3.1.1)
  ai_consent_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT
);
ALTER TABLE public.polar_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.polar_connections FROM anon, authenticated;

-- 3. PROFILES : préférences de notification (désactivées par défaut : consentement RGPD)
ALTER TABLE public.profiles
  ADD COLUMN notify_weekly BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN notify_fatigue BOOLEAN NOT NULL DEFAULT FALSE,
  -- Colonne système : anti-répétition des alertes (non modifiable par l'utilisateur)
  ADD COLUMN last_fatigue_alert_at TIMESTAMPTZ;

-- L'utilisateur peut modifier ses préférences (s'ajoute aux colonnes autorisées en phase 3)
GRANT UPDATE (notify_weekly, notify_fatigue) ON public.profiles TO authenticated;

-- >>> 20261104030000_phase8.sql
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

-- >>> 20261104040000_trial_demo.sql
-- =============================================================================
-- Essai Premium et données de démonstration
-- =============================================================================

-- 1. ESSAI PREMIUM : subscription_tier = 'premium', subscription_status = 'trialing', trial_ends_at.
-- Accordé depuis le SQL Editor de Supabase (pas depuis l'application) :
--   SELECT public.grant_premium_trial('vous@exemple.fr', 30);
ALTER TABLE public.profiles ADD COLUMN trial_ends_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.grant_premium_trial(p_email TEXT, p_days INT DEFAULT 30)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID;
  v_status TEXT;
BEGIN
  IF p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'Durée d''essai invalide (1 à 365 jours)';
  END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(p_email);
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Aucun compte pour %', p_email;
  END IF;
  SELECT subscription_status INTO v_status FROM public.profiles WHERE id = v_user;
  -- Un abonnement Stripe actif n'est jamais écrasé par un essai
  IF v_status IN ('active', 'past_due') AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND subscription_tier <> 'free') THEN
    RAISE EXCEPTION 'Ce compte a déjà un abonnement payant';
  END IF;
  UPDATE public.profiles
  SET subscription_tier = 'premium', subscription_status = 'trialing', trial_ends_at = NOW() + make_interval(days => p_days)
  WHERE id = v_user;
  RETURN format('Essai Premium accordé à %s jusqu''au %s', p_email, to_char(NOW() + make_interval(days => p_days), 'DD/MM/YYYY'));
END;
$$;

-- Fin des essais échus (tâche planifiée quotidienne, voir /api/cron/daily)
CREATE OR REPLACE FUNCTION public.expire_premium_trials()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH expired AS (
    UPDATE public.profiles
    SET subscription_tier = 'free', subscription_status = 'active'
    WHERE subscription_status = 'trialing' AND trial_ends_at IS NOT NULL AND trial_ends_at < NOW()
    RETURNING 1
  )
  SELECT count(*)::INT FROM expired;
$$;

-- Réservées au serveur : ni les visiteurs ni les utilisateurs connectés ne peuvent s'accorder un essai
REVOKE ALL ON FUNCTION public.grant_premium_trial(TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_premium_trials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_premium_trial(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_premium_trials() TO service_role;

-- 2. DONNÉES DE DÉMONSTRATION : marquées pour pouvoir être supprimées sans toucher aux vraies données
ALTER TABLE public.activities DROP CONSTRAINT activities_source_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_source_check CHECK (source IN ('manual', 'fit', 'gpx', 'tcx', 'polar', 'demo'));
ALTER TABLE public.planned_workouts DROP CONSTRAINT planned_workouts_source_check;
ALTER TABLE public.planned_workouts
  ADD CONSTRAINT planned_workouts_source_check CHECK (source IN ('manual', 'ai', 'demo'));
ALTER TABLE public.daily_metrics ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- >>> 20261104050000_harden_function_privileges.sql
-- =============================================================================
-- Renforcement des privilèges des fonctions
-- Sur Supabase, les nouvelles fonctions du schéma public sont exécutables par anon
-- et authenticated par défaut (privilèges par défaut), même après REVOKE ... FROM PUBLIC.
-- Constaté sur le projet réel : on retire explicitement ce qui n'est pas nécessaire.
-- =============================================================================

-- Fonctions de l'espace coach : utiles aux utilisateurs connectés uniquement (filtrées par auth.uid())
REVOKE EXECUTE ON FUNCTION public.is_coach_of(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.coached_athletes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_coaches() FROM anon;

-- Fonctions de trigger : jamais appelées directement
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- Sports : catalogue étendu (24 sports, cf. src/lib/sports.ts) + séances enregistrées
-- en direct dans l'application (source 'live').
-- =============================================================================
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_sport_type_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_sport_type_check CHECK (sport_type IN ('run', 'trail', 'walk', 'hike', 'ride', 'mtb', 'gravel', 'ebike', 'virtual_ride', 'swim', 'open_water', 'rowing', 'kayak', 'ski_nordic', 'ski_touring', 'ski', 'elliptical', 'strength', 'hiit', 'yoga', 'climbing', 'team', 'racket', 'cardio'));
ALTER TABLE public.planned_workouts DROP CONSTRAINT IF EXISTS planned_workouts_sport_type_check;
ALTER TABLE public.planned_workouts
  ADD CONSTRAINT planned_workouts_sport_type_check CHECK (sport_type IN ('run', 'trail', 'walk', 'hike', 'ride', 'mtb', 'gravel', 'ebike', 'virtual_ride', 'swim', 'open_water', 'rowing', 'kayak', 'ski_nordic', 'ski_touring', 'ski', 'elliptical', 'strength', 'hiit', 'yoga', 'climbing', 'team', 'racket', 'cardio'));

ALTER TABLE public.activities DROP CONSTRAINT activities_source_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_source_check CHECK (source IN ('manual', 'fit', 'gpx', 'tcx', 'polar', 'demo', 'live'));

-- Meilleurs efforts de chaque séance (records, prédictions), calculés par l'application à partir des courbes.
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS best_efforts JSONB;

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
