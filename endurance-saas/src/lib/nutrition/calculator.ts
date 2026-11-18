/**
 * Calculateur nutritionnel (logique pure, réutilisable côté serveur).
 *
 *  - Métabolisme de base : équation de Mifflin-St Jeor (la plus fiable chez l'adulte).
 *  - Dépense hors sport = métabolisme de base × niveau d'activité de la vie courante.
 *  - Le sport est ajouté séance par séance (puissance mesurée, sinon distance ou durée),
 *    comme sur les montres GPS : une journée sans entraînement demande moins qu'une sortie de 3 h.
 *  - Objectif : déficit ou surplus plafonné (jamais sous le métabolisme de base, ni sous un
 *    minimum absolu), protéines en g/kg selon l'objectif, lipides en % de l'énergie, glucides
 *    pour le reste — et relevés pour les sports d'endurance selon le volume d'entraînement.
 * Ces repères ne remplacent pas l'avis d'un médecin ou d'un diététicien.
 */
import type { Diet, Lifestyle, Meal, NutritionGoal } from '@/types/database'
import { sportFamily } from '@/lib/sports'

export const KCAL_PER_KG = 7700 // énergie approximative d'un kg de masse grasse

export const GOALS: { key: NutritionGoal; label: string; hint: string }[] = [
  { key: 'lose', label: 'Perte de poids', hint: 'Déficit modéré, protéines élevées pour garder le muscle' },
  { key: 'recomp', label: 'Sèche / recomposition', hint: 'Perdre du gras en gardant (ou gagnant) du muscle' },
  { key: 'maintain', label: 'Maintien', hint: 'Garder son poids, manger équilibré' },
  { key: 'muscle', label: 'Prise de muscle', hint: 'Léger surplus + musculation, prise de gras limitée' },
  { key: 'gain', label: 'Prise de poids', hint: 'Surplus calorique pour remonter un poids trop bas' },
  { key: 'performance', label: 'Performance endurance', hint: 'Énergie et glucides adaptés à l’entraînement' },
]

export const LIFESTYLES: { key: Lifestyle; label: string; hint: string; factor: number }[] = [
  { key: 'sedentary', label: 'Sédentaire', hint: 'Travail de bureau, peu de marche', factor: 1.2 },
  { key: 'light', label: 'Peu actif', hint: 'Debout une partie du temps, marche quotidienne', factor: 1.375 },
  { key: 'active', label: 'Actif', hint: 'Métier physique (artisan, mécanicien, serveur…)', factor: 1.55 },
  { key: 'very_active', label: 'Très actif', hint: 'Travail de force (BTP, manutention)', factor: 1.725 },
]

export const MEALS: { key: Meal; label: string; share: number }[] = [
  { key: 'breakfast', label: 'Petit-déjeuner', share: 0.25 },
  { key: 'lunch', label: 'Déjeuner', share: 0.35 },
  { key: 'dinner', label: 'Dîner', share: 0.3 },
  { key: 'snack', label: 'Collations', share: 0.1 },
]

export const DIETS: { key: Diet; label: string }[] = [
  { key: 'omnivore', label: 'Omnivore' },
  { key: 'pescatarian', label: 'Pesco-végétarien' },
  { key: 'vegetarian', label: 'Végétarien' },
  { key: 'vegan', label: 'Végétalien (vegan)' },
]

export interface Person {
  sex: 'male' | 'female'
  age: number
  heightCm: number
  weightKg: number
  lifestyle: Lifestyle
  goal: NutritionGoal
  /** kg par semaine visés (perte ou prise) */
  rateKgWeek: number
  pregnant?: boolean
}

export interface Macros {
  kcal: number
  protein: number // g
  carbs: number // g
  fat: number // g
}

export interface Targets extends Macros {
  bmr: number
  /** dépense hors sport */
  base: number
  /** dépense des séances du jour */
  exercise: number
  /** dépense totale estimée */
  tdee: number
  /** ajustement lié à l'objectif (négatif = déficit) */
  adjustment: number
  fiber: number // g
  waterL: number
  /** messages de sécurité (objectif bloqué, minimum appliqué…) */
  warnings: string[]
}

export const ageFromBirthYear = (year: number, now = new Date()) => now.getFullYear() - year
export const bmi = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2

/** Métabolisme de base (kcal/j), Mifflin-St Jeor. */
export function bmr(p: Pick<Person, 'sex' | 'age' | 'heightCm' | 'weightKg'>) {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
}

export interface ActivityForEnergy {
  sport_type: string
  duration_seconds: number
  distance_meters?: number | null
  avg_watts?: number | null
  elevation_gain_meters?: number | null
}

/**
 * Dépense d'une séance (kcal), au-delà du métabolisme de repos déjà compté :
 *  - vélo avec capteur de puissance : travail mécanique en kJ ≈ kcal dépensées (rendement ~24 %) ;
 *  - course : ~1 kcal/kg/km (+ dénivelé) ; marche / rando : ~0,5 kcal/kg/km + dénivelé ;
 *  - sinon : équivalent métabolique (MET) selon le sport et la vitesse, moins 1 MET de repos.
 */
export function activityKcal(a: ActivityForEnergy, weightKg: number): number {
  const hours = Math.max(0, a.duration_seconds) / 3600
  if (!hours) return 0
  const km = (a.distance_meters ?? 0) / 1000
  const dPlus = a.elevation_gain_meters ?? 0
  const fam = sportFamily(a.sport_type)
  const restHour = weightKg // 1 MET ≈ 1 kcal/kg/h, déjà compté dans le métabolisme
  if (fam === 'ride' && a.avg_watts && a.avg_watts > 0) return Math.round((a.avg_watts * a.duration_seconds) / 1000)
  if (fam === 'run' && km > 0) {
    if (a.sport_type === 'walk' || a.sport_type === 'hike') return Math.round(Math.max(0, weightKg * (0.5 * km + dPlus / 100) - 0.3 * restHour * hours))
    return Math.round(weightKg * (km + dPlus / 100) * 0.95)
  }
  let met = OTHER_MET[a.sport_type] ?? 6
  if (fam === 'ride') {
    const v = km ? km / hours : 20
    met = a.sport_type === 'virtual_ride' ? 7 : v < 16 ? 4 : v < 19 ? 6 : v < 22 ? 7 : v < 25 ? 8 : v < 28 ? 9 : 10
    if (a.sport_type === 'mtb') met += 1.5
    if (a.sport_type === 'ebike') met = Math.max(3, met / 2)
  } else if (fam === 'swim') met = 7
  else if (fam === 'run') met = a.sport_type === 'walk' ? 3.5 : a.sport_type === 'hike' ? 6 : 9
  return Math.round(Math.max(0, met - 1) * weightKg * hours)
}

/** Équivalents métaboliques (Compendium des activités physiques, valeurs moyennes). */
const OTHER_MET: Record<string, number> = {
  rowing: 7, kayak: 5, ski_nordic: 9, ski_touring: 8, ski: 5.5, elliptical: 6, strength: 5, hiit: 8,
  yoga: 2.5, climbing: 7, team: 7, racket: 7, cardio: 7,
}

const PROTEIN_G_KG: Record<NutritionGoal, number> = { lose: 2.0, recomp: 2.2, maintain: 1.6, muscle: 2.0, gain: 1.8, performance: 1.6 }
const FAT_SHARE: Record<NutritionGoal, number> = { lose: 0.3, recomp: 0.28, maintain: 0.3, muscle: 0.27, gain: 0.3, performance: 0.25 }

/** Rythme conseillé (kg/semaine) : 0,5 à 1 % du poids pour une perte, 0,25 à 0,5 kg pour une prise. */
export function safeRate(p: Person) {
  if (p.goal === 'lose') return Math.min(p.rateKgWeek, Math.round(p.weightKg * 0.01 * 100) / 100)
  if (p.goal === 'gain') return Math.min(p.rateKgWeek, 0.5)
  return p.rateKgWeek
}

/**
 * Objectifs du jour.
 * @param exerciseKcal dépense des séances (du jour, ou moyenne quotidienne de la semaine)
 */
export function dailyTargets(p: Person, exerciseKcal = 0): Targets {
  const warnings: string[] = []
  const b = bmr(p)
  const factor = LIFESTYLES.find((l) => l.key === p.lifestyle)?.factor ?? 1.375
  const base = b * factor
  const tdee = base + exerciseKcal
  const minAbs = p.sex === 'male' ? 1500 : 1200
  const imc = bmi(p.weightKg, p.heightCm)
  let goal = p.goal

  // Garde-fous : pas de déficit pour un mineur, une grossesse ou un IMC déjà bas
  if ((goal === 'lose' || goal === 'recomp') && (p.age < 18 || p.pregnant || imc < 18.5)) {
    warnings.push(
      p.pregnant
        ? 'Grossesse ou allaitement : aucun déficit calorique n’est proposé. Parlez-en à votre sage-femme ou à votre médecin.'
        : p.age < 18
          ? 'Moins de 18 ans : aucun déficit calorique n’est proposé, la croissance a besoin d’énergie.'
          : `IMC de ${imc.toFixed(1)} (sous 18,5) : une perte de poids n’est pas recommandée. Objectif ramené au maintien.`,
    )
    goal = 'maintain'
  }

  let adjustment = 0
  if (goal === 'lose') {
    const rate = safeRate({ ...p, goal })
    if (rate < p.rateKgWeek) warnings.push(`Rythme ramené à ${rate.toFixed(2).replace('.', ',')} kg/semaine (1 % du poids au maximum) pour préserver le muscle.`)
    adjustment = -Math.min((rate * KCAL_PER_KG) / 7, 0.25 * tdee)
  } else if (goal === 'recomp') adjustment = -0.12 * tdee
  else if (goal === 'muscle') adjustment = Math.min(0.1 * tdee, 350)
  else if (goal === 'gain') adjustment = (safeRate({ ...p, goal }) * KCAL_PER_KG) / 7

  let kcal = tdee + adjustment
  const floor = Math.max(minAbs, b)
  if (kcal < floor && adjustment < 0) {
    warnings.push(`Apport relevé à ${Math.round(floor)} kcal : descendre plus bas fatigue, fait perdre du muscle et freine la récupération.`)
    kcal = floor
    adjustment = kcal - tdee
  }

  // Protéines : sur un poids de référence plafonné (IMC 27) pour ne pas surestimer en cas de surpoids
  const refWeight = Math.min(p.weightKg, 27 * (p.heightCm / 100) ** 2)
  const protein = PROTEIN_G_KG[goal] * refWeight
  let fat = (FAT_SHARE[goal] * kcal) / 9
  fat = Math.max(fat, 0.7 * refWeight)
  let carbs = (kcal - protein * 4 - fat * 9) / 4
  if (carbs < 0) {
    fat = Math.max(0, (kcal - protein * 4) / 9)
    carbs = 0
  }

  const exerciseHours = exerciseKcal / Math.max(1, 8 * p.weightKg)
  return {
    bmr: Math.round(b),
    base: Math.round(base),
    exercise: Math.round(exerciseKcal),
    tdee: Math.round(tdee),
    adjustment: Math.round(adjustment),
    kcal: Math.round(kcal / 10) * 10,
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    fiber: p.sex === 'male' ? 35 : 28,
    waterL: Math.round((0.033 * p.weightKg + 0.6 * exerciseHours) * 10) / 10,
    warnings,
  }
}

/** Semaines nécessaires pour atteindre le poids visé au rythme choisi. */
export function weeksToTarget(p: Person, targetWeight: number | null) {
  if (!targetWeight) return null
  const rate = safeRate(p)
  if (!rate) return null
  const diff = p.weightKg - targetWeight
  if ((p.goal === 'lose' || p.goal === 'recomp') && diff > 0) return Math.ceil(diff / rate)
  if ((p.goal === 'gain' || p.goal === 'muscle') && diff < 0) return Math.ceil(-diff / (p.goal === 'muscle' ? 0.25 : rate))
  return null
}

export interface FoodEntry extends Macros {
  meal: Meal
  fiber?: number | null
}

export function sumMacros(entries: (Macros & { fiber?: number | null })[]) {
  return entries.reduce<Macros & { fiber: number }>(
    (a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat, fiber: a.fiber + (e.fiber ?? 0) }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )
}

/**
 * Tendance du poids (kg/semaine) par régression linéaire sur les pesées, plus robuste que
 * « dernière − première » (le poids varie de ±1 kg d'un jour à l'autre avec l'eau).
 */
export function weightTrend(logs: { day: string; weight: number }[]) {
  if (logs.length < 3) return null
  const t0 = Date.parse(logs[0].day)
  const xs = logs.map((l) => (Date.parse(l.day) - t0) / 86_400_000)
  const span = xs[xs.length - 1] - xs[0]
  if (span < 6) return null
  const ys = logs.map((l) => Number(l.weight))
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = ys.reduce((a, b) => a + b, 0) / ys.length
  let num = 0
  let den = 0
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return den ? (num / den) * 7 : null
}
