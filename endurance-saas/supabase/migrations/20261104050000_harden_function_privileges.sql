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
