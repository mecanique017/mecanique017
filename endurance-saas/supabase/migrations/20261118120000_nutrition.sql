-- =============================================================================
-- Nutrition : objectif, journal alimentaire, poids, conseils du coach IA
-- =============================================================================

-- Profil nutritionnel (1 ligne par utilisateur). Poids, taille et âge restent dans profiles.
CREATE TABLE public.nutrition_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
  birth_year INT NOT NULL CHECK (birth_year BETWEEN 1900 AND 2100),
  height_cm NUMERIC(5,1) NOT NULL CHECK (height_cm BETWEEN 100 AND 250),
  -- Activité hors sport (le sport est ajouté à partir des séances enregistrées)
  lifestyle TEXT NOT NULL DEFAULT 'light' CHECK (lifestyle IN ('sedentary', 'light', 'active', 'very_active')),
  goal TEXT NOT NULL DEFAULT 'maintain'
    CHECK (goal IN ('lose', 'recomp', 'maintain', 'muscle', 'gain', 'performance')),
  -- Rythme visé en kg par semaine (perte ou prise)
  rate_kg_week NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (rate_kg_week BETWEEN 0 AND 1),
  target_weight NUMERIC(5,2) CHECK (target_weight BETWEEN 30 AND 300),
  -- Grossesse / allaitement : aucun déficit calorique n'est proposé
  pregnant BOOLEAN NOT NULL DEFAULT FALSE,
  diet TEXT NOT NULL DEFAULT 'omnivore' CHECK (diet IN ('omnivore', 'vegetarian', 'vegan', 'pescatarian')),
  allergies TEXT CHECK (char_length(allergies) <= 300),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profil nutritionnel : le sien" ON public.nutrition_profiles
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Journal alimentaire : valeurs déjà calculées pour la quantité consommée
CREATE TABLE public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  meal TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  brand TEXT CHECK (char_length(brand) <= 120),
  barcode TEXT CHECK (barcode ~ '^[0-9]{6,14}$'),
  quantity_g NUMERIC(7,1) NOT NULL CHECK (quantity_g > 0 AND quantity_g <= 5000),
  kcal NUMERIC(7,1) NOT NULL CHECK (kcal >= 0 AND kcal <= 20000),
  protein_g NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  fiber_g NUMERIC(6,1) CHECK (fiber_g >= 0),
  -- Valeurs pour 100 g (pour réutiliser l'aliment avec une autre quantité)
  per100 JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX food_logs_user_day_idx ON public.food_logs (user_id, day DESC);
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Journal alimentaire : le sien" ON public.food_logs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Pesées (1 par jour)
CREATE TABLE public.weight_logs (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  weight NUMERIC(5,2) NOT NULL CHECK (weight BETWEEN 30 AND 300),
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pesées : les siennes" ON public.weight_logs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Conseils du coach IA (écrits uniquement par la fonction serveur)
CREATE TABLE public.nutrition_advice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  question TEXT,
  advice JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX nutrition_advice_user_idx ON public.nutrition_advice (user_id, created_at DESC);
ALTER TABLE public.nutrition_advice ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conseils nutrition : lecture des siens" ON public.nutrition_advice
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Conseils nutrition : suppression des siens" ON public.nutrition_advice
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
REVOKE INSERT, UPDATE ON public.nutrition_advice FROM anon, authenticated;

-- Quota IA : nouveau type de consommation
ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_kind_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_kind_check
  CHECK (kind IN ('coach_analysis', 'training_plan', 'nutrition_coach'));
