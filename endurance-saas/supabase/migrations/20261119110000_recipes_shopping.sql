-- =============================================================================
-- Recettes maison et menu de la semaine / liste de courses
-- =============================================================================
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  portions INT NOT NULL DEFAULT 4 CHECK (portions BETWEEN 1 AND 50),
  -- Ingrédients : [{ name, grams, per100: { kcal, protein, carbs, fat, fiber } }]
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX recipes_user_idx ON public.recipes (user_id, created_at DESC);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recettes : les siennes" ON public.recipes
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Menu de la semaine et cases cochées de la liste de courses (une liste par utilisateur)
CREATE TABLE public.shopping_lists (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  menu JSONB NOT NULL DEFAULT '[]',
  checked TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Liste de courses : la sienne" ON public.shopping_lists
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
