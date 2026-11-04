import { Activity, Bike, CircleDot, Dumbbell, Flame, Flower2, Footprints, HeartPulse, Monitor, Mountain, MountainSnow, PersonStanding, Sailboat, Ship, Snowflake, Trophy, Waves, Zap } from 'lucide-react'

/**
 * Catalogue unique des sports (base de données, formulaires, icônes, imports).
 * `family` regroupe les sports pour l'affichage (allure en min/km pour la famille course)
 * et pour le plan IA ; `gps` = sport d'extérieur où l'enregistrement en direct suit la position.
 */
export const SPORTS = [
  { key: 'run', label: 'Course à pied', short: 'Course', icon: Footprints, family: 'run', gps: true },
  { key: 'trail', label: 'Trail', short: 'Trail', icon: Mountain, family: 'run', gps: true },
  { key: 'walk', label: 'Marche', short: 'Marche', icon: PersonStanding, family: 'run', gps: true },
  { key: 'hike', label: 'Randonnée', short: 'Rando', icon: MountainSnow, family: 'run', gps: true },
  { key: 'ride', label: 'Vélo de route', short: 'Vélo', icon: Bike, family: 'ride', gps: true },
  { key: 'mtb', label: 'VTT', short: 'VTT', icon: Bike, family: 'ride', gps: true },
  { key: 'gravel', label: 'Gravel', short: 'Gravel', icon: Bike, family: 'ride', gps: true },
  { key: 'ebike', label: 'Vélo électrique', short: 'VAE', icon: Zap, family: 'ride', gps: true },
  { key: 'virtual_ride', label: 'Home trainer', short: 'Home trainer', icon: Monitor, family: 'ride', gps: false },
  { key: 'swim', label: 'Natation (piscine)', short: 'Natation', icon: Waves, family: 'swim', gps: false },
  { key: 'open_water', label: 'Natation en eau libre', short: 'Eau libre', icon: Waves, family: 'swim', gps: true },
  { key: 'rowing', label: 'Aviron', short: 'Aviron', icon: Ship, family: 'other', gps: true },
  { key: 'kayak', label: 'Canoë-kayak / paddle', short: 'Kayak', icon: Sailboat, family: 'other', gps: true },
  { key: 'ski_nordic', label: 'Ski de fond', short: 'Ski de fond', icon: Snowflake, family: 'other', gps: true },
  { key: 'ski_touring', label: 'Ski de randonnée', short: 'Ski rando', icon: MountainSnow, family: 'other', gps: true },
  { key: 'ski', label: 'Ski alpin / snowboard', short: 'Ski', icon: Snowflake, family: 'other', gps: true },
  { key: 'elliptical', label: 'Elliptique', short: 'Elliptique', icon: Activity, family: 'other', gps: false },
  { key: 'strength', label: 'Musculation', short: 'Muscu', icon: Dumbbell, family: 'other', gps: false },
  { key: 'hiit', label: 'HIIT / CrossFit', short: 'HIIT', icon: Flame, family: 'other', gps: false },
  { key: 'yoga', label: 'Yoga / mobilité', short: 'Yoga', icon: Flower2, family: 'other', gps: false },
  { key: 'climbing', label: 'Escalade', short: 'Escalade', icon: Mountain, family: 'other', gps: false },
  { key: 'team', label: 'Sport collectif', short: 'Collectif', icon: Trophy, family: 'other', gps: false },
  { key: 'racket', label: 'Sport de raquette', short: 'Raquette', icon: CircleDot, family: 'other', gps: false },
  { key: 'cardio', label: 'Cardio (autre)', short: 'Cardio', icon: HeartPulse, family: 'other', gps: false },
] as const

export type Sport = (typeof SPORTS)[number]
export type SportKey = Sport['key']
export type SportFamily = Sport['family']

export const SPORT_KEYS = SPORTS.map((s) => s.key) as [SportKey, ...SportKey[]]
export const SPORT_BY_KEY = Object.fromEntries(SPORTS.map((s) => [s.key, s])) as Record<SportKey, Sport>

/** Sport inconnu (ancienne valeur) → « Cardio (autre) » plutôt qu'une erreur d'affichage. */
export const sportInfo = (key: string): Sport => SPORT_BY_KEY[key as SportKey] ?? SPORT_BY_KEY.cardio
export const sportFamily = (key: string): SportFamily => sportInfo(key).family

/** Options groupées pour les listes déroulantes (<optgroup>). */
export const SPORT_GROUPS: { label: string; sports: Sport[] }[] = [
  { label: 'Course & marche', sports: SPORTS.filter((s) => s.family === 'run') },
  { label: 'Vélo', sports: SPORTS.filter((s) => s.family === 'ride') },
  { label: 'Natation', sports: SPORTS.filter((s) => s.family === 'swim') },
  { label: 'Autres sports', sports: SPORTS.filter((s) => s.family === 'other') },
]
