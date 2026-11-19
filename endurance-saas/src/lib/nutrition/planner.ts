/**
 * Menu de la semaine, liste de courses, recettes maison et lien nutrition ↔ performance
 * (logique pure, sans IA).
 */
import type { Diet, Meal } from '@/types/database'
import { sportFamily } from '@/lib/sports'
import { COMMON_FOODS, type Food, type Per100 } from './foods'
import { MEALS } from './calculator'
import { mealIdeas } from './meals'

export interface MenuItem {
  name: string
  grams: number
}
export interface MenuMeal {
  meal: Meal
  title: string
  kcal: number
  protein: number
  items: MenuItem[]
}
export interface MenuDay {
  day: string // YYYY-MM-DD
  meals: MenuMeal[]
}

const addDaysIso = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Menu de 7 jours : chaque repas vise sa part des objectifs du jour (sans sport), en faisant
 * tourner les idées pour varier d'un jour à l'autre.
 */
export function weekMenu(start: string, target: { kcal: number; protein: number }, diet: Diet, avoid = ''): MenuDay[] {
  const pools = new Map<Meal, ReturnType<typeof mealIdeas>>()
  for (const m of MEALS) {
    const goal = { kcal: Math.round(target.kcal * m.share), protein: Math.round(Math.min(target.protein * m.share * 1.05, m.key === 'snack' ? 30 : 55)) }
    pools.set(m.key, mealIdeas(m.key, { kcal: goal.kcal, protein: Math.max(goal.protein, 10) }, diet, avoid, 6))
  }
  return Array.from({ length: 7 }, (_, i) => ({
    day: addDaysIso(start, i),
    meals: MEALS.flatMap((m) => {
      const pool = pools.get(m.key) ?? []
      if (!pool.length) return []
      const idea = pool[(i + (m.key === 'dinner' ? 1 : 0)) % pool.length] // déjeuner et dîner différents le même jour
      return [{ meal: m.key, title: idea.title, kcal: idea.kcal, protein: idea.protein, items: idea.items.map((it) => ({ name: it.food.name, grams: it.grams })) }]
    }),
  }))
}

export interface ShoppingLine {
  name: string
  category: string
  grams: number
  /** quantité lisible (« 12 œufs », « 1,2 kg ») */
  label: string
}

const byName = new Map(COMMON_FOODS.map((f) => [f.name, f]))

/** Féculents comptés cuits dans les repas, achetés secs (poids sec ≈ poids cuit × facteur). */
const DRY: Record<string, [string, number]> = {
  'Pâtes cuites': ['Pâtes (sèches)', 0.4],
  'Riz blanc cuit': ['Riz blanc (cru)', 0.38],
  'Riz complet cuit': ['Riz complet (cru)', 0.4],
  'Semoule de blé cuite': ['Semoule (sèche)', 0.45],
  'Quinoa cuit': ['Quinoa (cru)', 0.38],
  'Lentilles cuites': ['Lentilles (sèches)', 0.4],
}

/** Liste de courses : quantités cumulées de la semaine, rangées par rayon. */
export function shoppingList(menu: MenuDay[]): ShoppingLine[] {
  const total = new Map<string, number>()
  for (const d of menu)
    for (const m of d.meals)
      for (const it of m.items) {
        const [name, k] = DRY[it.name] ?? [it.name, 1]
        total.set(name, (total.get(name) ?? 0) + it.grams * k)
      }
  const cooked = new Map(Object.entries(DRY).map(([c, [raw]]) => [raw, c]))
  const lines = [...total.entries()].map(([name, g]) => {
    let grams = g
    const f = byName.get(cooked.get(name) ?? name)
    grams = Math.round(grams / 10) * 10 || Math.round(grams)
    let label = grams >= 1000 ? `${(Math.round(grams / 100) / 10).toLocaleString('fr-FR')} kg` : `${Math.round(grams)} g`
    if (f?.portion && f.portionLabel && /^(œuf|banane|pomme|orange|kiwi|tomate|tranche|pot|steak|filet|pavé|escalope|boîte)/i.test(f.portionLabel)) {
      const n = Math.ceil(grams / f.portion - 0.15)
      label = `${n} × ${f.portionLabel} (${label})`
    }
    return { name, category: f?.category ?? 'Autres', grams, label }
  })
  return lines.sort((a, b) => a.category.localeCompare(b.category, 'fr') || a.name.localeCompare(b.name, 'fr'))
}

export interface RecipeItem {
  name: string
  grams: number
  per100: Per100
}

/** Valeurs d'une recette : pour 100 g et pour une part. */
export function recipeValues(items: RecipeItem[], portions: number) {
  const grams = items.reduce((a, i) => a + i.grams, 0)
  const sum = (k: keyof Per100) => items.reduce((a, i) => a + ((Number(i.per100[k] ?? 0) * i.grams) / 100), 0)
  const total = { kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'), fiber: sum('fiber') }
  const k = grams > 0 ? 100 / grams : 0
  const per100: Per100 = { kcal: Math.round(total.kcal * k), protein: total.protein * k, carbs: total.carbs * k, fat: total.fat * k, fiber: total.fiber * k }
  const p = Math.max(1, portions)
  return { grams, per100, portionGrams: Math.round(grams / p), perPortion: { kcal: Math.round(total.kcal / p), protein: total.protein / p, carbs: total.carbs / p, fat: total.fat / p } }
}

/** Recette → aliment utilisable dans le journal (portion = 1 part). */
export function recipeAsFood(r: { name: string; portions: number; items: RecipeItem[] }): Food {
  const v = recipeValues(r.items, r.portions)
  return { name: r.name, ...v.per100, portion: v.portionGrams, portionLabel: '1 part', category: 'Mes recettes' }
}

export interface PerfSession {
  sport_type: string
  start_day: string // YYYY-MM-DD (jour local)
  duration_seconds: number
  distance_meters: number | null
}

export interface PerfInsight {
  sport: 'run' | 'ride'
  pairs: number
  threshold: number // g de glucides / kg la veille
  diff: number // écart de vitesse (%) entre les séances après « beaucoup » et « peu » de glucides
  text: string
}

/**
 * Lien glucides de la veille ↔ vitesse des séances d'endurance (≥ 45 min), sport par sport.
 * La vitesse est comparée à la vitesse médiane du sport sur la période (pour neutraliser
 * les différences de parcours). Il faut au moins 6 séances avec la veille notée.
 */
export function carbInsights(sessions: PerfSession[], carbsByDay: Map<string, number>, weightKg: number): { insights: PerfInsight[]; missing: number } {
  const out: PerfInsight[] = []
  let best = 0
  for (const fam of ['run', 'ride'] as const) {
    const list = sessions.filter((s) => sportFamily(s.sport_type) === fam && s.duration_seconds >= 2700 && (s.distance_meters ?? 0) > 1000)
    const speeds = list.map((s) => (s.distance_meters ?? 0) / s.duration_seconds).sort((a, b) => a - b)
    if (!speeds.length) continue
    const median = speeds[Math.floor(speeds.length / 2)]
    const pairs = list
      .map((s) => ({ carbs: carbsByDay.get(addDaysIso(s.start_day, -1)), rel: (s.distance_meters ?? 0) / s.duration_seconds / median }))
      .filter((p): p is { carbs: number; rel: number } => p.carbs != null)
      .map((p) => ({ gkg: p.carbs / weightKg, rel: p.rel }))
    best = Math.max(best, pairs.length)
    if (pairs.length < 6) continue
    const sorted = [...pairs].sort((a, b) => a.gkg - b.gkg)
    const threshold = sorted[Math.floor(sorted.length / 2)].gkg
    const high = pairs.filter((p) => p.gkg >= threshold)
    const low = pairs.filter((p) => p.gkg < threshold)
    if (!high.length || !low.length) continue
    const avg = (xs: { rel: number }[]) => xs.reduce((a, x) => a + x.rel, 0) / xs.length
    const diff = (avg(high) / avg(low) - 1) * 100
    const t = threshold.toFixed(1).replace('.', ',')
    const label = fam === 'run' ? 'courses' : 'sorties vélo'
    const text =
      Math.abs(diff) < 1.5
        ? `Sur tes ${pairs.length} ${label}, la quantité de glucides de la veille ne change pas ta vitesse de façon nette.`
        : diff > 0
          ? `Tes ${label} sont en moyenne ${diff.toFixed(1).replace('.', ',')} % plus rapides quand tu as mangé au moins ${t} g de glucides par kg la veille (${pairs.length} séances analysées).`
          : `Tes ${label} sont en moyenne ${(-diff).toFixed(1).replace('.', ',')} % plus rapides les lendemains de jours à moins de ${t} g de glucides par kg (${pairs.length} séances) : regarde aussi l'heure et la digestion du dernier repas.`
    out.push({ sport: fam, pairs: pairs.length, threshold, diff, text })
  }
  return { insights: out, missing: out.length ? 0 : Math.max(0, 6 - best) }
}
