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
