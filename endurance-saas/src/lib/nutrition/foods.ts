/**
 * Aliments courants (valeurs moyennes pour 100 g, ordre de grandeur des tables de composition
 * françaises Ciqual). Disponibles hors ligne et sans attente ; les produits de marque viennent
 * d'Open Food Facts (recherche ou code-barres).
 * Format : [nom, kcal, protéines, glucides, lipides, fibres, portion (g), libellé de portion]
 */
export interface Per100 {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number | null
}
export interface Food extends Per100 {
  name: string
  brand?: string | null
  barcode?: string | null
  portion?: number
  portionLabel?: string
  category?: string
}

type Row = [string, number, number, number, number, number, number, string]

const DATA: Record<string, Row[]> = {
  'Féculents': [
    ['Pâtes cuites', 157, 5.8, 30.6, 0.9, 1.8, 200, 'assiette'],
    ['Riz blanc cuit', 130, 2.7, 28.2, 0.3, 0.4, 180, 'assiette'],
    ['Riz complet cuit', 123, 2.7, 25.6, 1, 1.8, 180, 'assiette'],
    ['Semoule de blé cuite', 112, 3.8, 23.2, 0.2, 1.4, 180, 'assiette'],
    ['Quinoa cuit', 120, 4.4, 21.3, 1.9, 2.8, 180, 'assiette'],
    ['Pommes de terre cuites à l’eau', 80, 1.9, 17, 0.1, 1.7, 200, '2 moyennes'],
    ['Patate douce cuite', 86, 1.6, 17.5, 0.1, 3, 200, 'portion'],
    ['Frites', 290, 3.4, 36, 14, 3.5, 150, 'portion moyenne'],
    ['Lentilles cuites', 116, 9, 16.3, 0.4, 7.9, 200, 'assiette'],
    ['Pois chiches cuits', 139, 7.5, 18.6, 2.4, 6, 150, 'portion'],
    ['Haricots rouges cuits', 113, 8.2, 13.8, 0.5, 8.3, 150, 'portion'],
    ['Flocons d’avoine', 372, 13.5, 58.7, 7, 10, 50, '5 c. à soupe'],
    ['Muesli sans sucre ajouté', 366, 10, 60, 7.5, 8, 50, 'bol'],
    ['Céréales petit-déjeuner (type corn-flakes)', 378, 7, 84, 0.9, 3, 40, 'bol'],
  ],
  'Pains et viennoiseries': [
    ['Baguette', 270, 9, 55.6, 1.2, 2.9, 50, '1/5 de baguette'],
    ['Pain complet', 247, 9.2, 45, 2.4, 7.2, 40, 'tranche'],
    ['Pain de mie', 264, 8.4, 47.5, 4, 3.5, 25, 'tranche'],
    ['Biscotte', 405, 11, 72, 7, 4, 10, 'biscotte'],
    ['Croissant', 416, 8.3, 45.3, 21.7, 2, 60, 'croissant'],
    ['Pain au chocolat', 424, 7.5, 47, 22.5, 2.4, 70, 'pain au chocolat'],
    ['Galette de riz', 384, 8, 81, 2.8, 4, 9, 'galette'],
  ],
  'Viandes, poissons, œufs': [
    ['Blanc de poulet cuit', 150, 30, 0, 3, 0, 120, 'filet'],
    ['Escalope de dinde cuite', 135, 29, 0, 1.8, 0, 120, 'escalope'],
    ['Steak haché 5 % cuit', 158, 26, 0, 5.6, 0, 100, 'steak'],
    ['Steak haché 15 % cuit', 236, 24, 0, 15, 0, 100, 'steak'],
    ['Bœuf (rumsteck) grillé', 165, 29, 0, 5.4, 0, 150, 'pièce'],
    ['Côte de porc grillée', 220, 27, 0, 12.5, 0, 150, 'côte'],
    ['Jambon blanc', 110, 20, 1, 3, 0, 40, 'tranche'],
    ['Saucisse de Toulouse cuite', 290, 17, 1, 24, 0, 100, 'saucisse'],
    ['Saumon cuit', 206, 25, 0, 11.7, 0, 125, 'pavé'],
    ['Cabillaud cuit', 95, 21, 0, 1, 0, 150, 'filet'],
    ['Thon au naturel (conserve)', 110, 26, 0, 0.8, 0, 100, 'boîte égouttée'],
    ['Sardines à l’huile égouttées', 210, 24, 0, 12.5, 0, 90, 'boîte'],
    ['Crevettes cuites', 99, 21, 0.5, 1.3, 0, 100, 'portion'],
    ['Œuf entier', 140, 12.5, 0.6, 9.8, 0, 50, 'œuf moyen'],
    ['Blanc d’œuf', 48, 10.6, 0.7, 0.2, 0, 33, 'blanc'],
  ],
  'Produits laitiers et alternatives': [
    ['Lait demi-écrémé', 46, 3.3, 4.8, 1.6, 0, 250, 'bol / verre'],
    ['Lait entier', 65, 3.2, 4.7, 3.6, 0, 250, 'bol / verre'],
    ['Boisson au soja nature', 39, 3.3, 1.5, 2, 0.5, 250, 'verre'],
    ['Yaourt nature', 60, 4.2, 5.2, 2.4, 0, 125, 'pot'],
    ['Fromage blanc 0 %', 46, 7.6, 3.8, 0.2, 0, 100, '1/2 pot'],
    ['Fromage blanc 3 %', 75, 7, 4, 3.2, 0, 100, '1/2 pot'],
    ['Skyr nature', 62, 10.5, 4, 0.2, 0, 150, 'pot'],
    ['Emmental', 382, 28.5, 0.5, 29.5, 0, 30, 'portion'],
    ['Comté', 409, 27, 0.5, 33.5, 0, 30, 'portion'],
    ['Camembert', 264, 20, 0.5, 20.5, 0, 30, 'portion'],
    ['Mozzarella', 252, 18.5, 1, 19.5, 0, 60, '1/2 boule'],
    ['Beurre', 745, 0.7, 0.6, 82, 0, 10, 'noix'],
    ['Crème fraîche 30 %', 292, 2.3, 3, 30, 0, 15, 'c. à soupe'],
  ],
  'Légumes': [
    ['Légumes verts cuits (haricots, brocoli…)', 30, 2.2, 3.5, 0.3, 3, 200, 'assiette'],
    ['Salade verte', 15, 1.3, 1.4, 0.2, 1.5, 80, 'bol'],
    ['Tomate', 19, 0.8, 2.9, 0.3, 1.2, 120, 'tomate'],
    ['Carotte crue râpée', 36, 0.8, 6.6, 0.3, 2.7, 100, 'portion'],
    ['Courgette cuite', 18, 1.1, 2.2, 0.4, 1.4, 200, 'portion'],
    ['Ratatouille', 60, 1.2, 5.4, 3.6, 2, 200, 'portion'],
    ['Soupe de légumes', 35, 1, 5, 1.2, 1.3, 250, 'bol'],
    ['Avocat', 169, 1.6, 0.8, 17.5, 4.9, 80, '1/2 avocat'],
  ],
  'Fruits': [
    ['Pomme', 54, 0.3, 11.6, 0.3, 2.4, 150, 'pomme'],
    ['Banane', 90, 1.1, 20, 0.3, 2, 120, 'banane'],
    ['Orange', 46, 0.9, 9.2, 0.2, 2.1, 160, 'orange'],
    ['Fraises', 32, 0.7, 6, 0.3, 2, 150, 'barquette 1/2'],
    ['Raisin', 72, 0.7, 16.3, 0.2, 1, 125, 'grappe'],
    ['Kiwi', 58, 1.1, 10.4, 0.6, 2.7, 75, 'kiwi'],
    ['Compote sans sucre ajouté', 60, 0.3, 13, 0.2, 1.6, 100, 'gourde / pot'],
    ['Abricots secs', 271, 3.4, 59, 0.5, 7.3, 30, '5 abricots'],
    ['Dattes', 287, 2.2, 66, 0.3, 7.5, 25, '3 dattes'],
    ['Jus d’orange', 45, 0.7, 9.4, 0.2, 0.2, 200, 'verre'],
  ],
  'Matières grasses, oléagineux': [
    ['Huile d’olive', 900, 0, 0, 100, 0, 10, 'c. à soupe'],
    ['Huile de colza', 900, 0, 0, 100, 0, 10, 'c. à soupe'],
    ['Amandes', 634, 21.4, 7.8, 53.4, 12.4, 30, 'poignée'],
    ['Noix', 698, 15, 7, 65, 6.7, 20, '5 cerneaux'],
    ['Beurre de cacahuète', 627, 24.6, 13, 51, 7, 20, 'c. à soupe'],
    ['Mayonnaise', 703, 1.4, 1.5, 77, 0, 15, 'c. à soupe'],
  ],
  'Plats et snacks': [
    ['Pizza margherita', 245, 10.5, 30, 8.8, 2, 300, '1/2 pizza'],
    ['Burger (type fast-food)', 255, 13, 25, 11.5, 1.5, 220, 'burger'],
    ['Sandwich jambon-beurre', 270, 11.5, 33, 9.8, 1.8, 200, 'sandwich'],
    ['Lasagnes bolognaise', 145, 7.5, 13, 7, 1, 300, 'part'],
    ['Quiche lorraine', 260, 9, 17, 17.5, 0.8, 150, 'part'],
    ['Taboulé', 155, 3.5, 22, 5.6, 2, 200, 'portion'],
    ['Chocolat noir 70 %', 570, 8, 33, 42, 11, 20, '2 carrés'],
    ['Biscuits secs (type petit-beurre)', 440, 7.5, 74, 12, 2.5, 25, '3 biscuits'],
    ['Barre de céréales', 410, 6, 68, 12, 4, 25, 'barre'],
    ['Chips', 536, 6.5, 50, 34, 4.5, 30, 'petit paquet'],
    ['Confiture', 245, 0.4, 60, 0.1, 1, 20, 'c. à soupe'],
    ['Miel', 320, 0.4, 80, 0, 0, 15, 'c. à soupe'],
    ['Sucre', 400, 0, 100, 0, 0, 5, 'morceau / c. à café'],
  ],
  'Sport': [
    ['Boisson d’effort (préparée)', 32, 0, 8, 0, 0, 500, 'bidon'],
    ['Gel énergétique', 260, 0, 64, 0, 0, 32, 'gel'],
    ['Barre énergétique', 360, 6, 68, 6, 3, 40, 'barre'],
    ['Whey (protéine en poudre)', 380, 75, 8, 5.5, 0, 30, 'dose'],
    ['Boisson de récupération (préparée)', 75, 5, 12, 0.5, 0, 350, 'shaker'],
  ],
  'Boissons': [
    ['Soda sucré (type cola)', 42, 0, 10.6, 0, 0, 330, 'canette'],
    ['Bière blonde', 43, 0.4, 3.4, 0, 0, 250, 'demi'],
    ['Vin rouge', 85, 0.1, 2.6, 0, 0, 125, 'verre'],
    ['Café sucré (1 sucre)', 22, 0.1, 5.3, 0, 0, 100, 'tasse'],
  ],
}

export const COMMON_FOODS: Food[] = Object.entries(DATA).flatMap(([category, rows]) =>
  rows.map(([name, kcal, protein, carbs, fat, fiber, portion, portionLabel]) => ({ name, kcal, protein, carbs, fat, fiber, portion, portionLabel, category })),
)

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Recherche dans les aliments courants (tous les mots doivent apparaître). */
export function searchCommonFoods(q: string, limit = 20): Food[] {
  const words = norm(q).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return COMMON_FOODS.filter((f) => {
    const n = norm(`${f.name} ${f.category}`)
    return words.every((w) => n.includes(w))
  }).slice(0, limit)
}

/** Valeurs pour une quantité donnée (g). */
export function forQuantity(f: Per100, grams: number) {
  const k = grams / 100
  const r = (v: number) => Math.round(v * k * 10) / 10
  return { kcal: Math.round(f.kcal * k), protein: r(f.protein), carbs: r(f.carbs), fat: r(f.fat), fiber: f.fiber != null ? r(f.fiber) : null }
}

/** Contrôle de cohérence : l'énergie annoncée doit correspondre aux macros (±25 %). */
export function plausible(f: Per100) {
  const fromMacros = f.protein * 4 + f.carbs * 4 + f.fat * 9
  if (f.kcal <= 0 || f.kcal > 950) return false
  if (fromMacros === 0) return f.kcal < 60
  return Math.abs(fromMacros - f.kcal) / f.kcal < 0.25 || Math.abs(fromMacros - f.kcal) < 25
}

export interface OffProduct {
  code?: string
  product_name?: string
  product_name_fr?: string
  brands?: string | string[]
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
}

const num = (v: unknown) => (v == null || v === '' ? null : Number(v))

/** Produit Open Food Facts → aliment (null si les valeurs nutritionnelles manquent). */
export function fromOpenFoodFacts(p: OffProduct): Food | null {
  const n = p.nutriments ?? {}
  let kcal = num(n['energy-kcal_100g'])
  if (kcal == null) {
    const kj = num(n['energy_100g'])
    if (kj != null) kcal = kj / 4.184
  }
  const protein = num(n['proteins_100g'])
  const carbs = num(n['carbohydrates_100g'])
  const fat = num(n['fat_100g'])
  const name = (p.product_name_fr || p.product_name || '').trim()
  if (!name || kcal == null || protein == null || carbs == null || fat == null) return null
  const serving = num(p.serving_quantity)
  return {
    name: name.slice(0, 160),
    brand: (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim().slice(0, 120) || null,
    barcode: p.code && /^\d{6,14}$/.test(p.code) ? p.code : null,
    kcal: Math.round(kcal),
    protein,
    carbs,
    fat,
    fiber: num(n['fiber_100g']),
    portion: serving && serving > 0 && serving < 2000 ? serving : 100,
    portionLabel: serving ? 'portion indiquée' : '100 g',
  }
}
