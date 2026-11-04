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
