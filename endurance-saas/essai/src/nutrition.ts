/**
 * Nutrition : lecture / écriture Supabase, recherche Open Food Facts, appel du coach IA.
 */
import type { Database, Json, Meal } from '@/types/database'
import { addDays } from '@/lib/dates'
import { fromOpenFoodFacts, forQuantity, type Food, type OffProduct, type Per100 } from '@/lib/nutrition/foods'
import type { MenuDay, RecipeItem } from '@/lib/nutrition/planner'
import { supabase } from './supabase'

export type NutritionProfile = Database['public']['Tables']['nutrition_profiles']['Row']
export type FoodLog = Database['public']['Tables']['food_logs']['Row']
export type WeightLog = Database['public']['Tables']['weight_logs']['Row']

export interface AiAdvice {
  resume: string
  conseils: { titre: string; detail: string }[]
  idees_repas: { repas: string; description: string; kcal: number; proteines_g: number }[]
  alerte: string | null
}

/** Bornes UTC d'une journée locale (YYYY-MM-DD) */
const dayRange = (day: string) => {
  const start = new Date(`${day}T00:00:00`)
  return [start.toISOString(), new Date(start.getTime() + 86_400_000).toISOString()] as const
}

export async function loadNutrition(userId: string, day: string) {
  const weekStart = addDays(day, -6)
  const [fromWeek] = dayRange(weekStart)
  const [, toDay] = dayRange(day)
  const [profile, base, logs, weights, acts, advice, water, favs, recipes] = await Promise.all([
    supabase.from('nutrition_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('weight, age, height').eq('id', userId).single(),
    supabase.from('food_logs').select('*').eq('user_id', userId).gte('day', addDays(day, -59)).lte('day', day).order('created_at'),
    supabase.from('weight_logs').select('*').eq('user_id', userId).gte('day', addDays(day, -120)).lte('day', day).order('day'),
    supabase
      .from('activities')
      .select('id, title, sport_type, start_time, duration_seconds, distance_meters, avg_watts, elevation_gain_meters')
      .eq('user_id', userId)
      .gte('start_time', fromWeek)
      .lt('start_time', toDay)
      .order('start_time'),
    supabase.from('nutrition_advice').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    supabase.from('water_logs').select('ml').eq('user_id', userId).eq('day', day).maybeSingle(),
    supabase.from('meal_favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    supabase.from('recipes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ])
  for (const r of [profile, base, logs, weights, acts, advice, water, favs, recipes]) if (r.error) throw r.error
  const all = (logs.data ?? []) as FoodLog[]
  return {
    profile: profile.data as NutritionProfile | null,
    baseWeight: base.data?.weight != null ? Number(base.data.weight) : null,
    baseHeight: base.data?.height != null ? Number(base.data.height) : null,
    today: all.filter((l) => l.day === day),
    week: all.filter((l) => l.day >= weekStart),
    history: all,
    weights: ((weights.data ?? []) as WeightLog[]).map((w) => ({ ...w, weight: Number(w.weight) })),
    activities: acts.data ?? [],
    waterMl: water.data?.ml ?? 0,
    favorites: (favs.data ?? []) as unknown as Favorite[],
    recipes: (recipes.data ?? []) as unknown as Recipe[],
    advice: (advice.data ?? []) as unknown as { id: string; day: string; question: string | null; advice: AiAdvice; created_at: string }[],
  }
}

/** Aliments récents (dernière version de chaque nom), pour un ajout en un geste. */
export function recentFoods(history: FoodLog[], limit = 12): (Food & { lastQty: number; meal: Meal })[] {
  const seen = new Map<string, Food & { lastQty: number; meal: Meal }>()
  for (const l of [...history].reverse()) {
    const key = `${l.name}|${l.brand ?? ''}`
    if (seen.has(key)) continue
    const p = (l.per100 ?? null) as Per100 | null
    const k = Number(l.quantity_g) / 100
    seen.set(key, {
      name: l.name,
      brand: l.brand,
      barcode: l.barcode,
      kcal: p?.kcal ?? Number(l.kcal) / k,
      protein: p?.protein ?? Number(l.protein_g) / k,
      carbs: p?.carbs ?? Number(l.carbs_g) / k,
      fat: p?.fat ?? Number(l.fat_g) / k,
      fiber: p?.fiber ?? (l.fiber_g != null ? Number(l.fiber_g) / k : null),
      portion: Number(l.quantity_g),
      portionLabel: 'dernière quantité',
      lastQty: Number(l.quantity_g),
      meal: l.meal,
    })
    if (seen.size >= limit) break
  }
  return [...seen.values()]
}

export async function addFood(userId: string, day: string, meal: Meal, food: Food, grams: number) {
  const v = forQuantity(food, grams)
  const { error } = await supabase.from('food_logs').insert({
    user_id: userId,
    day,
    meal,
    name: food.name.slice(0, 160),
    brand: food.brand ?? null,
    barcode: food.barcode ?? null,
    quantity_g: Math.round(grams * 10) / 10,
    kcal: v.kcal,
    protein_g: v.protein,
    carbs_g: v.carbs,
    fat_g: v.fat,
    fiber_g: v.fiber,
    per100: { kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat, fiber: food.fiber ?? null },
  })
  if (error) throw error
}

export async function deleteFood(id: string) {
  const { error } = await supabase.from('food_logs').delete().eq('id', id)
  if (error) throw error
}

/** Copie les aliments d'un repas d'un autre jour (« comme hier »). */
export async function copyMeal(userId: string, from: FoodLog[], day: string) {
  if (!from.length) return
  const { error } = await supabase.from('food_logs').insert(
    from.map(({ meal, name, brand, barcode, quantity_g, kcal, protein_g, carbs_g, fat_g, fiber_g, per100 }) => ({
      user_id: userId,
      day,
      meal,
      name,
      brand,
      barcode,
      quantity_g,
      kcal,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      per100,
    })),
  )
  if (error) throw error
}

export async function saveWeight(userId: string, day: string, weight: number) {
  const { error } = await supabase.from('weight_logs').upsert({ user_id: userId, day, weight }, { onConflict: 'user_id,day' })
  if (error) throw error
  // Le poids du profil sert aussi aux calculs d'entraînement (puissance / kg, dépense)
  await supabase.from('profiles').update({ weight }).eq('id', userId)
}

export async function saveProfile(p: Database['public']['Tables']['nutrition_profiles']['Insert']) {
  const { error } = await supabase.from('nutrition_profiles').upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

const OFF_FIELDS = 'code,product_name,product_name_fr,brands,nutriments,serving_quantity'

/** Recherche de produits de marque (Open Food Facts, base libre et collaborative). */
export async function searchOpenFoodFacts(q: string, signal?: AbortSignal): Promise<Food[]> {
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=24&langs=fr&fields=${OFF_FIELDS}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Recherche indisponible')
  const json = (await res.json()) as { hits?: OffProduct[] }
  return (json.hits ?? []).map(fromOpenFoodFacts).filter((f): f is Food => !!f)
}

/** Produit par code-barres (null si inconnu ou sans valeurs nutritionnelles). */
export async function productByBarcode(code: string): Promise<Food | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Recherche indisponible')
  const json = (await res.json()) as { status?: number; product?: OffProduct }
  return json.product ? fromOpenFoodFacts({ ...json.product, code }) : null
}

export type CoachResult = { ok: true; advice: AiAdvice; remaining: number } | { ok: false; reason: 'not_configured' | 'quota' | 'refused' | 'error' }

export async function askCoach(day: string, question: string, context: unknown): Promise<CoachResult> {
  const { data, error } = await supabase.functions.invoke('nutrition-coach', { body: { day, question, context } })
  if (error) {
    // Erreur HTTP : le corps indique la raison (clé absente, quota…)
    let reason: string | undefined
    try {
      const ctx = (error as { context?: Response }).context
      reason = ctx ? ((await ctx.json()) as { error?: string }).error : undefined
    } catch {
      reason = undefined
    }
    return { ok: false, reason: reason === 'not_configured' || reason === 'quota' || reason === 'refused' ? reason : 'error' }
  }
  return { ok: true, advice: (data as { advice: AiAdvice }).advice, remaining: (data as { remaining: number }).remaining }
}

export interface FavoriteItem {
  name: string
  brand?: string | null
  barcode?: string | null
  grams: number
  per100: Per100
}
export interface Favorite {
  id: string
  name: string
  meal: Meal
  items: FavoriteItem[]
}

/** Enregistre les aliments d'un repas comme « repas favori ». */
export async function saveFavorite(userId: string, name: string, meal: Meal, logs: FoodLog[]) {
  const items: FavoriteItem[] = logs.map((l) => {
    const k = Number(l.quantity_g) / 100
    const p = (l.per100 ?? null) as Per100 | null
    return {
      name: l.name,
      brand: l.brand,
      barcode: l.barcode,
      grams: Number(l.quantity_g),
      per100: p ?? { kcal: Number(l.kcal) / k, protein: Number(l.protein_g) / k, carbs: Number(l.carbs_g) / k, fat: Number(l.fat_g) / k, fiber: l.fiber_g != null ? Number(l.fiber_g) / k : null },
    }
  })
  const { error } = await supabase.from('meal_favorites').insert({ user_id: userId, name: name.trim().slice(0, 80), meal, items: items as unknown as Json })
  if (error) throw error
}

export async function deleteFavorite(id: string) {
  const { error } = await supabase.from('meal_favorites').delete().eq('id', id)
  if (error) throw error
}

/** Ajoute tous les aliments d'un favori au repas choisi. */
export async function addFavorite(userId: string, day: string, meal: Meal, fav: Favorite) {
  for (const it of fav.items) await addFood(userId, day, meal, { name: it.name, brand: it.brand, barcode: it.barcode, ...it.per100 }, it.grams)
}

/** Hydratation : nouveau total de la journée (ml). */
export async function setWater(userId: string, day: string, ml: number) {
  const { error } = await supabase.from('water_logs').upsert({ user_id: userId, day, ml: Math.max(0, Math.min(15000, Math.round(ml))) }, { onConflict: 'user_id,day' })
  if (error) throw error
}

// --- Cuisine : recettes, menu de la semaine, liste de courses ---------------------------------
export type Recipe = { id: string; name: string; portions: number; items: RecipeItem[] }

export async function loadKitchen(userId: string) {
  const [r, l] = await Promise.all([
    supabase.from('recipes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('shopping_lists').select('*').eq('user_id', userId).maybeSingle(),
  ])
  if (r.error) throw r.error
  if (l.error) throw l.error
  return {
    recipes: (r.data ?? []) as unknown as Recipe[],
    list: l.data ? { weekStart: l.data.week_start, menu: l.data.menu as unknown as MenuDay[], checked: l.data.checked } : null,
  }
}

export async function saveRecipe(userId: string, r: { id?: string; name: string; portions: number; items: RecipeItem[] }) {
  const row = { user_id: userId, name: r.name.trim().slice(0, 80), portions: r.portions, items: r.items as unknown as Json }
  const { error } = r.id ? await supabase.from('recipes').update(row).eq('id', r.id) : await supabase.from('recipes').insert(row)
  if (error) throw error
}

export async function deleteRecipe(id: string) {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

export async function saveShoppingList(userId: string, weekStart: string, menu: MenuDay[], checked: string[]) {
  const { error } = await supabase
    .from('shopping_lists')
    .upsert({ user_id: userId, week_start: weekStart, menu: menu as unknown as Json, checked, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

/** Glucides par jour (90 derniers jours) et séances d'endurance, pour l'analyse nutrition ↔ performance. */
export async function loadPerformanceData(userId: string, today: string) {
  const from = addDays(today, -90)
  const [logs, acts] = await Promise.all([
    supabase.from('food_logs').select('day, carbs_g').eq('user_id', userId).gte('day', from),
    supabase.from('activities').select('sport_type, start_time, duration_seconds, distance_meters').eq('user_id', userId).gte('start_time', `${from}T00:00:00Z`),
  ])
  if (logs.error) throw logs.error
  if (acts.error) throw acts.error
  const carbs = new Map<string, number>()
  for (const l of logs.data ?? []) carbs.set(l.day, (carbs.get(l.day) ?? 0) + Number(l.carbs_g))
  const day = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso))
  return {
    carbs,
    sessions: (acts.data ?? []).map((a) => ({ sport_type: a.sport_type, start_day: day(a.start_time), duration_seconds: a.duration_seconds, distance_meters: a.distance_meters != null ? Number(a.distance_meters) : null })),
  }
}
