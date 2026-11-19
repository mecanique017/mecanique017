/**
 * Idées de repas sans IA (gratuit, hors ligne) : modèles de repas composés d'aliments courants,
 * quantités ajustées pour atteindre les calories et les protéines visées pour ce repas,
 * en respectant le régime alimentaire et les aliments à éviter.
 */
import type { Diet, Meal } from '@/types/database'
import { COMMON_FOODS, forQuantity, type Food } from './foods'

type Role = 'protein' | 'starch' | 'veg' | 'fat' | 'fruit' | 'fixed'
interface Slot {
  food: string
  role: Role
  /** quantité de départ (g) */
  g: number
  min: number
  max: number
}
interface Template {
  title: string
  meals: Meal[]
  slots: Slot[]
}

/** Contenu animal des aliments (pour les régimes) */
const ANIMAL: Record<string, 'meat' | 'fish' | 'egg' | 'dairy'> = {
  'Blanc de poulet cuit': 'meat',
  'Escalope de dinde cuite': 'meat',
  'Steak haché 5 % cuit': 'meat',
  'Jambon blanc': 'meat',
  'Saumon cuit': 'fish',
  'Cabillaud cuit': 'fish',
  'Thon au naturel (conserve)': 'fish',
  'Œuf entier': 'egg',
  'Skyr nature': 'dairy',
  'Fromage blanc 3 %': 'dairy',
  'Lait demi-écrémé': 'dairy',
  'Yaourt nature': 'dairy',
  Emmental: 'dairy',
  Mozzarella: 'dairy',
  'Whey (protéine en poudre)': 'dairy',
}

const allowed = (name: string, diet: Diet) => {
  const a = ANIMAL[name]
  if (!a) return true
  if (diet === 'vegan') return false
  if (diet === 'vegetarian') return a === 'egg' || a === 'dairy'
  if (diet === 'pescatarian') return a !== 'meat'
  return true
}

const T: Template[] = [
  // Petit-déjeuner
  { title: 'Porridge protéiné', meals: ['breakfast', 'snack'], slots: [
    { food: 'Flocons d’avoine', role: 'starch', g: 60, min: 30, max: 120 },
    { food: 'Skyr nature', role: 'protein', g: 150, min: 100, max: 300 },
    { food: 'Banane', role: 'fruit', g: 120, min: 0, max: 120 },
    { food: 'Amandes', role: 'fat', g: 15, min: 0, max: 30 },
  ] },
  { title: 'Tartines et œufs', meals: ['breakfast'], slots: [
    { food: 'Pain complet', role: 'starch', g: 80, min: 40, max: 160 },
    { food: 'Œuf entier', role: 'protein', g: 100, min: 50, max: 200 },
    { food: 'Orange', role: 'fruit', g: 160, min: 0, max: 160 },
    { food: 'Beurre', role: 'fat', g: 10, min: 0, max: 15 },
  ] },
  { title: 'Bol de céréales au soja', meals: ['breakfast', 'snack'], slots: [
    { food: 'Muesli sans sucre ajouté', role: 'starch', g: 60, min: 30, max: 120 },
    { food: 'Boisson au soja nature', role: 'protein', g: 250, min: 150, max: 400 },
    { food: 'Pomme', role: 'fruit', g: 150, min: 0, max: 150 },
    { food: 'Beurre de cacahuète', role: 'fat', g: 15, min: 0, max: 30 },
  ] },
  // Déjeuner / dîner
  { title: 'Poulet, riz, légumes', meals: ['lunch', 'dinner'], slots: [
    { food: 'Blanc de poulet cuit', role: 'protein', g: 130, min: 80, max: 220 },
    { food: 'Riz complet cuit', role: 'starch', g: 180, min: 80, max: 400 },
    { food: 'Légumes verts cuits (haricots, brocoli…)', role: 'veg', g: 200, min: 200, max: 200 },
    { food: 'Huile d’olive', role: 'fat', g: 10, min: 0, max: 15 },
  ] },
  { title: 'Saumon, pommes de terre, légumes', meals: ['lunch', 'dinner'], slots: [
    { food: 'Saumon cuit', role: 'protein', g: 125, min: 80, max: 200 },
    { food: 'Pommes de terre cuites à l’eau', role: 'starch', g: 250, min: 100, max: 500 },
    { food: 'Légumes verts cuits (haricots, brocoli…)', role: 'veg', g: 200, min: 200, max: 200 },
    { food: 'Huile de colza', role: 'fat', g: 5, min: 0, max: 15 },
  ] },
  { title: 'Pâtes au thon et tomates', meals: ['lunch', 'dinner'], slots: [
    { food: 'Thon au naturel (conserve)', role: 'protein', g: 100, min: 60, max: 200 },
    { food: 'Pâtes cuites', role: 'starch', g: 220, min: 100, max: 450 },
    { food: 'Tomate', role: 'veg', g: 150, min: 150, max: 150 },
    { food: 'Huile d’olive', role: 'fat', g: 10, min: 0, max: 15 },
  ] },
  { title: 'Steak haché, semoule, ratatouille', meals: ['lunch', 'dinner'], slots: [
    { food: 'Steak haché 5 % cuit', role: 'protein', g: 125, min: 80, max: 200 },
    { food: 'Semoule de blé cuite', role: 'starch', g: 200, min: 100, max: 400 },
    { food: 'Ratatouille', role: 'veg', g: 200, min: 200, max: 200 },
  ] },
  { title: 'Omelette, pain, salade', meals: ['lunch', 'dinner'], slots: [
    { food: 'Œuf entier', role: 'protein', g: 150, min: 100, max: 200 },
    { food: 'Pain complet', role: 'starch', g: 80, min: 40, max: 160 },
    { food: 'Salade verte', role: 'veg', g: 100, min: 100, max: 100 },
    { food: 'Emmental', role: 'fat', g: 20, min: 0, max: 40 },
    { food: 'Huile d’olive', role: 'fat', g: 10, min: 0, max: 15 },
  ] },
  { title: 'Lentilles, quinoa, légumes (végétal)', meals: ['lunch', 'dinner'], slots: [
    { food: 'Lentilles cuites', role: 'protein', g: 200, min: 120, max: 350 },
    { food: 'Quinoa cuit', role: 'starch', g: 150, min: 60, max: 300 },
    { food: 'Légumes verts cuits (haricots, brocoli…)', role: 'veg', g: 200, min: 200, max: 200 },
    { food: 'Huile d’olive', role: 'fat', g: 10, min: 0, max: 15 },
  ] },
  { title: 'Pois chiches, riz, carottes (végétal)', meals: ['lunch', 'dinner'], slots: [
    { food: 'Pois chiches cuits', role: 'protein', g: 180, min: 100, max: 300 },
    { food: 'Riz blanc cuit', role: 'starch', g: 150, min: 60, max: 350 },
    { food: 'Carotte crue râpée', role: 'veg', g: 100, min: 100, max: 100 },
    { food: 'Huile de colza', role: 'fat', g: 10, min: 0, max: 15 },
  ] },
  // Collations
  { title: 'Skyr et fruit', meals: ['snack'], slots: [
    { food: 'Skyr nature', role: 'protein', g: 150, min: 100, max: 300 },
    { food: 'Kiwi', role: 'fruit', g: 75, min: 0, max: 150 },
    { food: 'Noix', role: 'fat', g: 10, min: 0, max: 20 },
  ] },
  { title: 'Fromage blanc, flocons, banane', meals: ['snack'], slots: [
    { food: 'Fromage blanc 3 %', role: 'protein', g: 150, min: 100, max: 300 },
    { food: 'Flocons d’avoine', role: 'starch', g: 30, min: 0, max: 80 },
    { food: 'Banane', role: 'fruit', g: 120, min: 0, max: 120 },
  ] },
  { title: 'Banane et amandes (végétal)', meals: ['snack'], slots: [
    { food: 'Banane', role: 'fruit', g: 120, min: 120, max: 240 },
    { food: 'Amandes', role: 'fat', g: 25, min: 10, max: 40 },
    { food: 'Boisson au soja nature', role: 'protein', g: 250, min: 0, max: 400 },
  ] },
]

const byName = new Map(COMMON_FOODS.map((f) => [f.name, f]))
const round = (g: number, step = 10) => Math.max(0, Math.round(g / step) * step)

export interface MealIdea {
  title: string
  meal: Meal
  items: { food: Food; grams: number }[]
  kcal: number
  protein: number
}

/**
 * Idées pour un repas : quantités ajustées pour viser `kcal` et `protein` (g).
 * La source de protéines est réglée d'abord, puis le féculent comble l'énergie restante.
 */
export function mealIdeas(meal: Meal, goal: { kcal: number; protein: number }, diet: Diet, avoid = '', limit = 3): MealIdea[] {
  const words = avoid
    .toLowerCase()
    .split(/[,;/]|\s+et\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3)
  const ok = (name: string) => allowed(name, diet) && !words.some((w) => name.toLowerCase().includes(w))
  const ideas: MealIdea[] = []
  for (const t of T) {
    if (!t.meals.includes(meal) || !t.slots.every((s) => ok(s.food) || s.role === 'fat' || s.role === 'fruit')) continue
    const slots = t.slots.filter((s) => ok(s.food))
    const food = (s: Slot) => byName.get(s.food)!
    const qty = new Map(slots.map((s) => [s, s.g]))
    const total = () => {
      let k = 0
      let p = 0
      for (const s of slots) {
        const v = forQuantity(food(s), qty.get(s)!)
        k += v.kcal
        p += v.protein
      }
      return { k, p }
    }
    // 1. Protéines : la source principale vise l'objectif protéique du repas
    const prot = slots.find((s) => s.role === 'protein')
    if (prot) {
      const others = total().p - forQuantity(food(prot), qty.get(prot)!).protein
      const need = Math.max(0, goal.protein - others)
      qty.set(prot, Math.min(prot.max, Math.max(prot.min, round((need / Math.max(1, food(prot).protein)) * 100))))
    }
    // 2. Énergie : le féculent (sinon le fruit, puis le gras) comble l'écart, dans ses bornes
    for (const role of ['starch', 'fruit', 'fat'] as Role[]) {
      const s = slots.find((x) => x.role === role)
      if (!s) continue
      const gap = goal.kcal - total().k
      if (Math.abs(gap) < 40) break
      const g = qty.get(s)! + (gap / Math.max(1, food(s).kcal)) * 100
      qty.set(s, Math.min(s.max, Math.max(s.min, round(g, role === 'fat' ? 5 : 10))))
    }
    const items = slots.map((s) => ({ food: food(s), grams: qty.get(s)! })).filter((i) => i.grams > 0)
    const { k, p } = total()
    // Écart trop grand avec l'objectif : modèle inadapté (ex. collation de 900 kcal)
    if (goal.kcal > 0 && Math.abs(k - goal.kcal) / goal.kcal > 0.3) continue
    ideas.push({ title: t.title, meal, items, kcal: Math.round(k), protein: Math.round(p) })
  }
  // Les idées les plus proches de l'objectif d'abord
  return ideas.sort((a, b) => Math.abs(a.kcal - goal.kcal) + 10 * Math.abs(a.protein - goal.protein) - (Math.abs(b.kcal - goal.kcal) + 10 * Math.abs(b.protein - goal.protein))).slice(0, limit)
}

/** Prochain repas à préparer selon l'heure et ce qui est déjà noté. */
export function nextMeal(hour: number, logged: Set<Meal>): Meal {
  if (hour < 10 && !logged.has('breakfast')) return 'breakfast'
  if (hour < 15 && !logged.has('lunch')) return 'lunch'
  if (hour < 17) return 'snack'
  if (!logged.has('dinner')) return 'dinner'
  return 'snack'
}
