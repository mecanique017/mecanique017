-- =============================================================================
-- Rappels par notification (Web Push) : abonnements, préférences, envoi horaire
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Abonnements du navigateur / de l'appli installée (un par appareil)
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE CHECK (endpoint LIKE 'https://%'),
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions (user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Abonnements : les siens" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Heures des rappels (heure de Paris, null = désactivé)
CREATE TABLE public.reminder_prefs (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  weigh_hour INT CHECK (weigh_hour BETWEEN 0 AND 23),
  meals_hour INT CHECK (meals_hour BETWEEN 0 AND 23),
  planned_hour INT CHECK (planned_hour BETWEEN 0 AND 23),
  inactivity_days INT CHECK (inactivity_days BETWEEN 2 AND 14),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.reminder_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rappels : les siens" ON public.reminder_prefs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Journal des envois (un rappel de chaque type par jour au plus) : serveur uniquement
CREATE TABLE public.reminder_log (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  day DATE NOT NULL,
  PRIMARY KEY (user_id, kind, day)
);
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reminder_log FROM anon, authenticated;

-- Coffre (Vault) : secrets lus et écrits uniquement par la fonction serveur (clé de service)
CREATE OR REPLACE FUNCTION public.kronofit_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$ SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = secret_name LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.kronofit_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kronofit_secret(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.kronofit_secret_set(secret_name TEXT, secret_value TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = secret_name) THEN
    PERFORM vault.update_secret((SELECT id FROM vault.secrets WHERE name = secret_name), secret_value);
  ELSE
    PERFORM vault.create_secret(secret_value, secret_name);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.kronofit_secret_set(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kronofit_secret_set(TEXT, TEXT) TO service_role;

-- Secret partagé entre la tâche planifiée et la fonction d'envoi, généré dans la base
SELECT vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'kronofit_cron_secret')
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'kronofit_cron_secret');

-- Toutes les heures (à la minute 3) : la fonction envoie les rappels de l'heure en cours
SELECT cron.schedule(
  'kronofit-reminders',
  '3 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hzuuuqumapzkfqdddbyw.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'kronofit_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  $$
);
