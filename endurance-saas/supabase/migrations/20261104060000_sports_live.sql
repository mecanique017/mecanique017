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
