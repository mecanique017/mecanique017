-- Meilleurs efforts de chaque séance (records, prédictions), calculés par l'application à partir des courbes.
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS best_efforts JSONB;
