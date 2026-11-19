import { useState } from 'react'
import { ChefHat, Loader2, Plus, RefreshCw, ShoppingCart, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { MEALS } from '@/lib/nutrition/calculator'
import { recipeValues, shoppingList, weekMenu, type MenuDay, type RecipeItem } from '@/lib/nutrition/planner'
import type { Diet } from '@/types/database'
import { AddFood } from './AddFood'
import { deleteRecipe, loadKitchen, saveRecipe, saveShoppingList, type Recipe } from '../nutrition'
import { useData } from '../session'

const nf = (n: number) => Math.round(n).toLocaleString('fr-FR')
const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const mondayOf = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/** Onglet Cuisine : menu de la semaine + liste de courses, recettes maison. */
export function Kitchen({ userId, today, target, diet, avoid }: { userId: string; today: string; target: { kcal: number; protein: number }; diet: Diet; avoid: string }) {
  const { data, error, reload } = useData(() => loadKitchen(userId), [userId])
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return <p className="text-sm text-muted-foreground">Chargement…</p>
  return (
    <div className="space-y-4">
      <WeekPlan userId={userId} today={today} target={target} diet={diet} avoid={avoid} saved={data.list} onSaved={reload} />
      <Recipes userId={userId} recipes={data.recipes} onSaved={reload} />
    </div>
  )
}

function WeekPlan({
  userId,
  today,
  target,
  diet,
  avoid,
  saved,
  onSaved,
}: {
  userId: string
  today: string
  target: { kcal: number; protein: number }
  diet: Diet
  avoid: string
  saved: { weekStart: string; menu: MenuDay[]; checked: string[] } | null
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState<string[]>(saved?.checked ?? [])
  const [open, setOpen] = useState<string | null>(null)
  const menu = saved?.menu ?? null
  const list = menu ? shoppingList(menu) : []
  const generate = async () => {
    setBusy(true)
    // Semaine en cours si on est avant jeudi, sinon la suivante
    const monday = mondayOf(today)
    const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7
    const start = weekday >= 3 ? new Date(Date.parse(`${monday}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10) : monday
    await saveShoppingList(userId, start, weekMenu(start, target, diet, avoid), []).catch(() => {})
    setChecked([])
    setBusy(false)
    onSaved()
  }
  const toggle = (name: string) => {
    const next = checked.includes(name) ? checked.filter((c) => c !== name) : [...checked, name]
    setChecked(next)
    if (saved) saveShoppingList(userId, saved.weekStart, saved.menu, next).catch(() => {})
  }
  const categories = [...new Set(list.map((l) => l.category))]
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="size-5" aria-hidden />
        <h2 className="flex-1 font-semibold">Menu de la semaine et courses</h2>
        <Button size="sm" variant={menu ? 'ghost' : 'default'} onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {menu ? 'Nouveau menu' : 'Créer mon menu'}
        </Button>
      </div>
      {!menu ? (
        <p className="text-sm text-muted-foreground">
          KronoFit compose 7 jours de repas adaptés à votre objectif ({nf(target.kcal)} kcal et {nf(target.protein)} g de protéines un jour sans sport) et à votre régime, puis fait la liste de courses.
        </p>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {menu.map((d) => (
              <li key={d.day}>
                <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm" onClick={() => setOpen(open === d.day ? null : d.day)} aria-expanded={open === d.day}>
                  <span className="font-medium first-letter:uppercase">{dayFmt.format(new Date(`${d.day}T12:00:00Z`))}</span>
                  <span className="text-xs text-muted-foreground">{nf(d.meals.reduce((a, m) => a + m.kcal, 0))} kcal</span>
                </button>
                {open === d.day && (
                  <div className="space-y-2 px-3 pb-3">
                    {d.meals.map((m) => (
                      <div key={m.meal} className="text-sm">
                        <p>
                          <span className="text-muted-foreground">{MEALS.find((x) => x.key === m.meal)?.label} · </span>
                          {m.title} <span className="text-xs text-muted-foreground">({nf(m.kcal)} kcal, {nf(m.protein)} g P)</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{m.items.map((i) => `${nf(i.grams)} g ${i.name.toLowerCase()}`).join(', ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div>
            <p className="mb-2 flex justify-between text-sm font-medium">
              <span>Liste de courses</span>
              <span className="text-xs text-muted-foreground">
                {checked.filter((c) => list.some((l) => l.name === c)).length} / {list.length}
              </span>
            </p>
            {categories.map((c) => (
              <div key={c} className="mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c}</p>
                <ul>
                  {list
                    .filter((l) => l.category === c)
                    .map((l) => (
                      <li key={l.name}>
                        <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                          <input type="checkbox" className="size-4" checked={checked.includes(l.name)} onChange={() => toggle(l.name)} />
                          <span className={cn('flex-1', checked.includes(l.name) && 'text-muted-foreground line-through')}>{l.name}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">{l.label}</span>
                        </label>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function Recipes({ userId, recipes, onSaved }: { userId: string; recipes: Recipe[]; onSaved: () => void }) {
  const [editing, setEditing] = useState<{ id?: string; name: string; portions: string; items: RecipeItem[] } | null>(null)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const v = editing ? recipeValues(editing.items, Number(editing.portions) || 1) : null
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <ChefHat className="size-5" aria-hidden />
        <h2 className="flex-1 font-semibold">Mes recettes</h2>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing({ name: '', portions: '4', items: [] })}>
            <Plus className="size-4" /> Nouvelle recette
          </Button>
        )}
      </div>
      {!editing && !recipes.length && <p className="text-sm text-muted-foreground">Saisissez une recette une fois (ingrédients et nombre de parts) : elle apparaît ensuite dans « Ajouter un aliment », avec les calories par part.</p>}
      {!editing && (
        <ul className="divide-y">
          {recipes.map((r) => {
            const rv = recipeValues(r.items, r.portions)
            return (
              <li key={r.id} className="flex items-center gap-2 py-2">
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditing({ id: r.id, name: r.name, portions: String(r.portions), items: r.items })}>
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.portions} parts · {nf(rv.perPortion.kcal)} kcal et {nf(rv.perPortion.protein)} g de protéines par part ({nf(rv.portionGrams)} g)
                  </p>
                </button>
                <button
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                  aria-label={`Supprimer ${r.name}`}
                  onClick={async () => {
                    if (!confirm(`Supprimer la recette « ${r.name} » ?`)) return
                    await deleteRecipe(r.id).catch(() => {})
                    onSaved()
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {editing && v && (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            const portions = Math.round(Number(editing.portions))
            if (!editing.name.trim()) return setMsg('Donnez un nom à la recette.')
            if (!(portions >= 1 && portions <= 50)) return setMsg('Nombre de parts entre 1 et 50.')
            if (!editing.items.length) return setMsg('Ajoutez au moins un ingrédient.')
            try {
              await saveRecipe(userId, { id: editing.id, name: editing.name, portions, items: editing.items })
              setEditing(null)
              setMsg(null)
              onSaved()
            } catch {
              setMsg('Enregistrement impossible.')
            }
          }}
        >
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <Field id="r-name" label="Nom de la recette" value={editing.name} maxLength={80} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Field id="r-portions" label="Parts" type="text" inputMode="numeric" value={editing.portions} onChange={(e) => setEditing({ ...editing, portions: e.target.value })} />
          </div>
          <ul className="divide-y rounded-lg border">
            {editing.items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{it.name}</span>
                <span className="tabular-nums text-muted-foreground">{nf(it.grams)} g</span>
                <button type="button" className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label={`Retirer ${it.name}`} onClick={() => setEditing({ ...editing, items: editing.items.filter((_, j) => j !== i) })}>
                  <X className="size-4" />
                </button>
              </li>
            ))}
            {!editing.items.length && <li className="px-3 py-2 text-sm text-muted-foreground">Aucun ingrédient.</li>}
          </ul>
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Ingrédient
          </Button>
          {editing.items.length > 0 && (
            <p className="rounded-lg bg-muted/30 p-3 text-sm">
              Par part ({nf(v.portionGrams)} g) : <strong>{nf(v.perPortion.kcal)} kcal</strong> · protéines {nf(v.perPortion.protein)} g · glucides {nf(v.perPortion.carbs)} g · lipides {nf(v.perPortion.fat)} g
            </p>
          )}
          {msg && <p role="status" className="text-sm">{msg}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Enregistrer la recette
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
          </div>
          {adding && (
            <AddFood
              meal="lunch"
              ingredientMode
              recents={[]}
              onClose={() => setAdding(false)}
              onAdd={async (_meal, food, grams) => {
                setEditing({ ...editing, items: [...editing.items, { name: food.name, grams, per100: { kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat, fiber: food.fiber ?? null } }] })
                setAdding(false)
              }}
            />
          )}
        </form>
      )}
    </section>
  )
}
