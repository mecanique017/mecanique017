import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, Droplet, Loader2, Plus, Sparkles, Star, Trash2, TriangleAlert, CheckCircle2, Info } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { addDays, formatDayMonth, formatLongDay } from '@/lib/dates'
import { localDate } from '@/lib/training/load'
import { sportFamily, sportInfo } from '@/lib/sports'
import {
  activityKcal,
  ageFromBirthYear,
  bmi,
  dailyTargets,
  DIETS,
  GOALS,
  LIFESTYLES,
  MEALS,
  sumMacros,
  weeksToTarget,
  weightTrend,
  type Person,
  type Targets,
} from '@/lib/nutrition/calculator'
import { autoAdvice, type Tip } from '@/lib/nutrition/advice'
import { mealIdeas, nextMeal, type MealIdea } from '@/lib/nutrition/meals'
import { carbInsights, recipeAsFood } from '@/lib/nutrition/planner'
import { Kitchen } from '../components/Kitchen'
import type { Food } from '@/lib/nutrition/foods'
import type { Meal } from '@/types/database'
import { AddFood } from '../components/AddFood'
import { addFavorite, addFood, askCoach, copyMeal, deleteFood, loadNutrition, loadPerformanceData, recentFoods, saveFavorite, saveProfile, saveWeight, setWater, type AiAdvice, type Favorite, type NutritionProfile } from '../nutrition'
import { useData, useUser } from '../session'

/** Valeurs calculées pour le jour affiché */
interface Computed {
  person: Person
  targets: Targets
  totals: { kcal: number; protein: number; carbs: number; fat: number; fiber: number }
  sessions: { sport_type: string; duration_seconds: number; kcal: number }[]
  week: { days: number; kcal: number; protein: number; carbs: number; fat: number } | null
  trend: number | null
  tips: Tip[]
  weight: number
}

type Tab = 'journal' | 'coach' | 'cuisine' | 'poids' | 'objectif'
const TABS: { key: Tab; label: string }[] = [
  { key: 'journal', label: 'Journal' },
  { key: 'coach', label: 'Coach' },
  { key: 'cuisine', label: 'Cuisine' },
  { key: 'poids', label: 'Poids' },
  { key: 'objectif', label: 'Objectif' },
]
const nf = (n: number) => Math.round(n).toLocaleString('fr-FR')
const nf1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('fr-FR')

export function NutritionPage() {
  const user = useUser()
  const today = localDate(new Date())
  const [day, setDay] = useState(today)
  const [tab, setTab] = useState<Tab>('journal')
  const [adding, setAdding] = useState<Meal | null>(null)
  const { data, error, reload } = useData(() => loadNutrition(user.id, day), [user.id, day])

  const computed = useMemo((): Computed | null => {
    if (!data?.profile) return null
    const p = data.profile
    const lastWeight = data.weights.length ? data.weights[data.weights.length - 1].weight : data.baseWeight
    if (!lastWeight) return null
    const person: Person = {
      sex: p.sex,
      age: ageFromBirthYear(p.birth_year),
      heightCm: Number(p.height_cm),
      weightKg: lastWeight,
      lifestyle: p.lifestyle,
      goal: p.goal,
      rateKgWeek: Number(p.rate_kg_week),
      pregnant: p.pregnant,
    }
    const daySessions = data.activities.filter((a) => localDate(a.start_time) === day)
    const sessions = daySessions.map((a) => ({ ...a, kcal: activityKcal(a, lastWeight) }))
    const exercise = sessions.reduce((s, a) => s + a.kcal, 0)
    const targets = dailyTargets(person, exercise)
    const totals = sumMacros(data.today.map((l) => ({ kcal: Number(l.kcal), protein: Number(l.protein_g), carbs: Number(l.carbs_g), fat: Number(l.fat_g), fiber: l.fiber_g != null ? Number(l.fiber_g) : 0 })))
    // Moyenne des jours notés de la semaine (hors jour affiché s'il est en cours)
    const byDay = new Map<string, { kcal: number; protein: number; carbs: number; fat: number }>()
    for (const l of data.week) {
      if (l.day === today) continue
      const d = byDay.get(l.day) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      byDay.set(l.day, { kcal: d.kcal + Number(l.kcal), protein: d.protein + Number(l.protein_g), carbs: d.carbs + Number(l.carbs_g), fat: d.fat + Number(l.fat_g) })
    }
    const days = [...byDay.values()]
    const week = days.length
      ? { days: days.length, kcal: days.reduce((a, d) => a + d.kcal, 0) / days.length, protein: days.reduce((a, d) => a + d.protein, 0) / days.length, carbs: days.reduce((a, d) => a + d.carbs, 0) / days.length, fat: days.reduce((a, d) => a + d.fat, 0) / days.length }
      : null
    const trend = weightTrend(data.weights.filter((w) => w.day >= addDays(day, -28)))
    const hour = day === today ? new Date().getHours() : 23
    const tips = autoAdvice({
      goal: p.goal,
      diet: p.diet,
      weightKg: lastWeight,
      targets,
      today: totals,
      entries: data.today.length,
      hour,
      sessions: sessions.map((s) => ({ minutes: Math.round(s.duration_seconds / 60), family: sportFamily(s.sport_type) })),
      week,
      trend,
      rateKgWeek: Number(p.rate_kg_week),
    })
    return { person, targets, totals, sessions, week, trend, tips, weight: lastWeight }
  }, [data, day, today])

  if (error) return <p className="text-sm text-destructive">Chargement impossible : {error}</p>
  if (!data) return <p className="text-sm text-muted-foreground">Chargement…</p>

  if (!data.profile || !computed)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <p className="text-sm text-muted-foreground">
          Indiquez votre profil et votre objectif : KronoFit calcule vos besoins chaque jour (en tenant compte de vos séances), suit vos repas et vous conseille.
        </p>
        <GoalForm userId={user.id} profile={data.profile} weight={data.baseWeight} height={data.baseHeight} onSaved={reload} />
      </div>
    )

  const { targets, totals } = computed
  const isToday = day === today
  const yesterday = data.history.filter((l) => l.day === addDays(day, -1))

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold">Nutrition</h1>
        <button className="rounded-full p-2 hover:bg-accent" onClick={() => setDay(addDays(day, -1))} aria-label="Jour précédent">
          <ChevronLeft className="size-5" />
        </button>
        <span className="min-w-28 text-center text-sm font-medium first-letter:uppercase">{isToday ? 'Aujourd’hui' : formatLongDay(day)}</span>
        <button className="rounded-full p-2 hover:bg-accent disabled:opacity-30" onClick={() => setDay(addDays(day, 1))} disabled={isToday} aria-label="Jour suivant">
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1 rounded-xl border bg-card p-1" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={cn('rounded-lg py-2 text-[13px]', tab === t.key ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'journal' && (
        <>
          <Summary targets={targets} totals={totals} sessions={computed.sessions.map((s) => ({ label: sportInfo(s.sport_type).short, kcal: s.kcal }))} />
          <WaterCard
            ml={data.waterMl}
            targetL={targets.waterL}
            onChange={async (ml) => {
              await setWater(user.id, day, ml).catch(() => {})
              reload()
            }}
          />
          {MEALS.map((m) => {
            const items = data.today.filter((l) => l.meal === m.key)
            const kcal = items.reduce((a, l) => a + Number(l.kcal), 0)
            const prev = yesterday.filter((l) => l.meal === m.key)
            return (
              <section key={m.key} className="rounded-xl border bg-card">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <h2 className="flex-1 font-semibold">{m.label}</h2>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {nf(kcal)} / {nf(targets.kcal * m.share)} kcal
                  </span>
                </div>
                {items.length > 0 && (
                  <ul className="divide-y">
                    {items.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{l.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {nf(Number(l.quantity_g))} g · P {nf1(Number(l.protein_g))} · G {nf1(Number(l.carbs_g))} · L {nf1(Number(l.fat_g))}
                          </p>
                        </div>
                        <span className="text-sm font-medium tabular-nums">{nf(Number(l.kcal))}</span>
                        <button
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                          aria-label={`Supprimer ${l.name}`}
                          onClick={async () => {
                            await deleteFood(l.id).catch(() => {})
                            reload()
                          }}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2 px-4 py-2.5">
                  <Button variant="ghost" size="sm" onClick={() => setAdding(m.key)}>
                    <Plus className="size-4" /> Ajouter
                  </Button>
                  {!items.length && prev.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await copyMeal(user.id, prev, day).catch(() => {})
                        reload()
                      }}
                    >
                      <Copy className="size-4" /> Comme la veille ({nf(prev.reduce((a, l) => a + Number(l.kcal), 0))} kcal)
                    </Button>
                  )}
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const name = window.prompt('Nom du repas favori (ex. « Mon petit-déj habituel ») :', m.label)
                        if (!name?.trim()) return
                        await saveFavorite(user.id, name, m.key, items).catch(() => {})
                        reload()
                      }}
                    >
                      <Star className="size-4" /> En favori
                    </Button>
                  )}
                </div>
              </section>
            )
          })}
          <TipList tips={computed.tips.slice(0, 3)} />
          <Button variant="outline" className="w-full" onClick={() => setTab('coach')}>
            <Sparkles className="size-4" /> Conseils et idées de repas
          </Button>
        </>
      )}

      {tab === 'coach' && (
        <CoachTab computed={computed} profile={data.profile} entries={data.today} day={day} history={data.advice}
          onDone={reload}
          onAddIdea={async (idea) => {
            for (const it of idea.items) await addFood(user.id, day, idea.meal, it.food, it.grams)
            reload()
          }}
        />
      )}
      {tab === 'cuisine' && (
        <Kitchen
          userId={user.id}
          today={today}
          target={(() => {
            const t = dailyTargets(computed.person, 0)
            return { kcal: t.kcal, protein: t.protein }
          })()}
          diet={data.profile.diet}
          avoid={data.profile.allergies ?? ''}
          onChange={reload}
        />
      )}
      {tab === 'poids' && <WeightTab userId={user.id} today={today} weights={data.weights} person={computed.person} target={data.profile.target_weight != null ? Number(data.profile.target_weight) : null} trend={computed.trend} onSaved={reload} />}
      {tab === 'objectif' && (
        <div className="space-y-4">
          <Explanation targets={targets} person={computed.person} />
          <GoalForm userId={user.id} profile={data.profile} weight={computed.weight} height={data.baseHeight} onSaved={reload} />
        </div>
      )}

      {adding && (
        <AddFood
          meal={adding}
          recents={recentFoods(data.history)}
          favorites={data.favorites}
          recipes={data.recipes.map(recipeAsFood)}
          onAddFavorite={async (meal: Meal, fav: Favorite) => {
            await addFavorite(user.id, day, meal, fav)
            setAdding(null)
            reload()
          }}
          onClose={() => setAdding(null)}
          onAdd={async (meal: Meal, food: Food, grams: number) => {
            await addFood(user.id, day, meal, food, grams)
            setAdding(null)
            reload()
          }}
        />
      )}
      <p className="text-center text-[11px] text-muted-foreground">Repères généraux pour des adultes en bonne santé : ils ne remplacent pas l’avis d’un médecin ou d’un diététicien.</p>
    </div>
  )
}

function Ring({ value, max }: { value: number; max: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const pct = Math.min(1, value / Math.max(1, max))
  const over = value > max * 1.05
  return (
    <svg viewBox="0 0 120 120" className="size-32 shrink-0" aria-hidden>
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" className="text-muted" strokeWidth="10" opacity={0.25} />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={over ? '#f59e0b' : 'var(--brand, #e10600)'}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 60 60)"
      />
    </svg>
  )
}

function Summary({ targets, totals, sessions }: { targets: Targets; totals: { kcal: number; protein: number; carbs: number; fat: number }; sessions: { label: string; kcal: number }[] }) {
  const left = targets.kcal - totals.kcal
  const bars = [
    { label: 'Protéines', v: totals.protein, t: targets.protein, color: '#22c55e' },
    { label: 'Glucides', v: totals.carbs, t: targets.carbs, color: '#3b82f6' },
    { label: 'Lipides', v: totals.fat, t: targets.fat, color: '#f59e0b' },
  ]
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Bilan du jour">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Ring value={totals.kcal} max={targets.kcal} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{nf(Math.abs(left))}</span>
            <span className="text-[11px] text-muted-foreground">{left >= 0 ? 'kcal restantes' : 'kcal en trop'}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs">
                <span>{b.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {nf(b.v)} / {nf(b.t)} g
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted/40">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (b.v / Math.max(1, b.t)) * 100)}%`, background: b.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Mangé {nf(totals.kcal)} kcal sur {nf(targets.kcal)} · besoins {nf(targets.base)} hors sport
        {sessions.length > 0 && ` + ${sessions.map((s) => `${s.label} ${nf(s.kcal)}`).join(' + ')} kcal de sport`}
        {targets.adjustment !== 0 && ` ${targets.adjustment < 0 ? '−' : '+'} ${nf(Math.abs(targets.adjustment))} kcal pour l’objectif`}
      </p>
    </section>
  )
}

const tipIcon = { good: CheckCircle2, info: Info, warn: TriangleAlert }
function TipList({ tips }: { tips: Tip[] }) {
  if (!tips.length) return null
  return (
    <ul className="space-y-2">
      {tips.map((t, i) => {
        const Icon = tipIcon[t.level]
        return (
          <li key={i} className={cn('flex gap-3 rounded-xl border p-3', t.level === 'warn' ? 'border-amber-500/50 bg-amber-500/10' : t.level === 'good' ? 'border-green-600/40 bg-green-600/10' : 'bg-card')}>
            <Icon className={cn('mt-0.5 size-5 shrink-0', t.level === 'warn' ? 'text-amber-500' : t.level === 'good' ? 'text-green-500' : 'text-muted-foreground')} aria-hidden />
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-sm text-muted-foreground">{t.text}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function CoachTab({
  computed,
  profile,
  entries,
  day,
  history,
  onDone,
  onAddIdea,
}: {
  computed: Computed
  profile: NutritionProfile
  entries: { meal: string; name: string; quantity_g: number; kcal: number; protein_g: number }[]
  day: string
  history: { id: string; question: string | null; advice: AiAdvice; created_at: string }[]
  onDone: () => void
  onAddIdea: (idea: MealIdea) => Promise<void>
}) {
  const [question, setQuestion] = useState('')
  const [state, setState] = useState<{ busy: boolean; result: AiAdvice | null; msg: string | null }>({ busy: false, result: null, msg: null })
  const ask = async () => {
    setState({ busy: true, result: null, msg: null })
    const { person, targets, totals, sessions, week, trend } = computed
    const context = {
      objectif: GOALS.find((g) => g.key === profile.goal)?.label,
      profil: {
        sexe: person.sex === 'male' ? 'homme' : 'femme',
        age: person.age,
        taille_cm: person.heightCm,
        poids_kg: person.weightKg,
        poids_cible_kg: profile.target_weight,
        rythme_kg_semaine: person.rateKgWeek,
        activite_hors_sport: LIFESTYLES.find((l) => l.key === person.lifestyle)?.label,
        regime: DIETS.find((d) => d.key === profile.diet)?.label,
        allergies: profile.allergies || 'aucune',
        grossesse_ou_allaitement: profile.pregnant,
      },
      objectifs_du_jour: { kcal: targets.kcal, proteines_g: targets.protein, glucides_g: targets.carbs, lipides_g: targets.fat, fibres_g: targets.fiber, eau_l: targets.waterL, besoins_hors_sport: targets.base, sport_kcal: targets.exercise, ajustement_objectif: targets.adjustment, alertes: targets.warnings },
      consomme: { kcal: Math.round(totals.kcal), proteines_g: Math.round(totals.protein), glucides_g: Math.round(totals.carbs), lipides_g: Math.round(totals.fat), fibres_g: Math.round(totals.fiber) },
      repas: entries.slice(0, 40).map((e) => ({ repas: MEALS.find((m) => m.key === e.meal)?.label, aliment: e.name, quantite_g: Number(e.quantity_g), kcal: Number(e.kcal), proteines_g: Number(e.protein_g) })),
      seances: sessions.map((s) => ({ sport: sportInfo(s.sport_type).label, duree_min: Math.round(s.duration_seconds / 60), kcal: s.kcal })),
      moyenne_7_jours: week ? { jours_notes: week.days, kcal: Math.round(week.kcal), proteines_g: Math.round(week.protein) } : null,
      tendance_poids_kg_semaine: trend != null ? Math.round(trend * 100) / 100 : null,
      heure_locale: day === localDate(new Date()) ? new Date().getHours() : 'journée passée',
    }
    const r = await askCoach(day, question, context)
    if (r.ok) {
      setState({ busy: false, result: r.advice, msg: r.remaining <= 3 ? `Encore ${r.remaining} demande${r.remaining > 1 ? 's' : ''} aujourd’hui.` : null })
      setQuestion('')
      onDone()
    } else
      setState({
        busy: false,
        result: null,
        msg:
          r.reason === 'not_configured'
            ? 'Coach IA non activé (il nécessite une clé Anthropic payante). Les conseils automatiques et les idées de repas ci-dessus sont gratuits.'
            : r.reason === 'quota'
              ? 'Limite de 10 demandes par jour atteinte. Revenez demain !'
              : r.reason === 'refused'
                ? 'Le coach ne peut pas répondre à cette demande. Reformulez votre question.'
                : 'Le coach est indisponible pour le moment. Réessayez dans quelques minutes.',
      })
  }
  const last = state.result ?? history[0]?.advice ?? null
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="font-semibold">Conseils automatiques</h2>
        <TipList tips={computed.tips} />
        {!computed.tips.length && <p className="text-sm text-muted-foreground">Rien à signaler pour le moment : continuez à noter vos repas.</p>}
      </section>
      <MealIdeas computed={computed} profile={profile} entries={entries} day={day} onAdd={onAddIdea} />
      <PerformanceInsights userId={profile.user_id} weight={computed.weight} />
      <details className="space-y-3 rounded-xl border bg-card p-4" open={!!history.length}>
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <Sparkles className="size-4" style={{ color: 'var(--brand)' }} /> Coach IA <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
        </summary>
        <p className="mt-3 text-sm text-muted-foreground">Le coach IA analyse votre journée, votre semaine, vos séances et votre poids pour répondre à vos questions. Il nécessite une clé Anthropic (payante à l’usage) : les conseils automatiques et les idées de repas ci-dessus sont gratuits.</p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Votre question (facultatif) : que manger avant ma sortie de demain ? une idée de dîner riche en protéines ?"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          aria-label="Question pour le coach"
        />
        <Button onClick={ask} disabled={state.busy} className="w-full">
          {state.busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {state.busy ? 'Le coach réfléchit…' : 'Demander au coach'}
        </Button>
        {state.msg && <p role="status" className="text-sm text-muted-foreground">{state.msg}</p>}
        {last && <AdviceView advice={last} />}
      </details>
    </div>
  )
}

/** Idées de repas gratuites (sans IA) pour le prochain repas, ajoutables au journal en un geste. */
function MealIdeas({
  computed,
  profile,
  entries,
  day,
  onAdd,
}: {
  computed: Computed
  profile: NutritionProfile
  entries: { meal: string; kcal: number; protein_g: number }[]
  day: string
  onAdd: (idea: MealIdea) => Promise<void>
}) {
  const isToday = day === localDate(new Date())
  // Les collations peuvent être multiples : elles ne « ferment » pas un repas
  const logged = new Set<Meal>(entries.map((e) => e.meal as Meal).filter((m) => m !== 'snack'))
  const [meal, setMeal] = useState<Meal>(() => nextMeal(isToday ? new Date().getHours() : 8, logged))
  const [added, setAdded] = useState<string | null>(null)
  const { targets, totals } = computed
  // Part de ce qu'il reste à manger pour ce repas : répartie sur les repas non encore notés
  const remainingMeals = MEALS.filter((m) => !logged.has(m.key) || m.key === meal)
  const shareLeft = remainingMeals.reduce((a, m) => a + m.share, 0) || 1
  const mealShare = (MEALS.find((m) => m.key === meal)?.share ?? 0.3) / shareLeft
  const kcalLeft = targets.kcal - totals.kcal
  const wanted = Math.max(kcalLeft, 0) * (logged.has(meal) ? 1 : mealShare)
  // Un repas reste un repas : au plus ~40 % de la journée et 55 g de protéines (au-delà, mieux vaut une collation de plus)
  const cap = meal === 'snack' ? targets.kcal * 0.2 : targets.kcal * 0.4
  const goal = {
    kcal: Math.round(Math.min(wanted, cap)),
    protein: Math.round(Math.min(Math.max(0, targets.protein - totals.protein) * (logged.has(meal) ? 1 : mealShare), meal === 'snack' ? 30 : 55)),
  }
  const extra = Math.round(Math.max(kcalLeft, 0) - goal.kcal)
  const ideas = goal.kcal >= 150 ? mealIdeas(meal, { kcal: goal.kcal, protein: Math.max(goal.protein, 10) }, profile.diet, profile.allergies ?? '') : []
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Idées de repas</h2>
      <div className="flex gap-1 overflow-x-auto" role="radiogroup" aria-label="Repas à préparer">
        {MEALS.map((m) => (
          <button
            key={m.key}
            role="radio"
            aria-checked={meal === m.key}
            onClick={() => setMeal(m.key)}
            className={cn('whitespace-nowrap rounded-full border px-3 py-1.5 text-sm', meal === m.key && 'border-primary bg-primary/15 font-medium')}
          >
            {m.label}
          </button>
        ))}
      </div>
      {goal.kcal < 150 ? (
        <p className="text-sm text-muted-foreground">Objectif du jour atteint : pas besoin d’un repas de plus. Un fruit ou un yaourt si vous avez faim.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Pour ce repas : environ {nf(goal.kcal)} kcal et {nf(Math.max(goal.protein, 10))} g de protéines (ce qu’il vous reste, réparti sur les repas restants).
            {extra > 250 && remainingMeals.length <= 2 && ` Il vous restera environ ${nf(extra)} kcal : ajoutez une collation (par exemple après la séance ou en soirée).`}
          </p>
          {!ideas.length && <p className="text-sm text-muted-foreground">Aucune idée adaptée à ce repas avec votre régime : essayez un autre repas.</p>}
          {ideas.map((idea) => (
            <div key={idea.title} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-baseline gap-2">
                <p className="flex-1 font-medium">{idea.title}</p>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {nf(idea.kcal)} kcal · {nf(idea.protein)} g P
                </span>
              </div>
              <ul className="text-sm text-muted-foreground">
                {idea.items.map((i) => (
                  <li key={i.food.name}>
                    {nf(i.grams)} g · {i.food.name}
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="outline"
                disabled={added === idea.title}
                onClick={async () => {
                  setAdded(idea.title)
                  await onAdd(idea).catch(() => setAdded(null))
                }}
              >
                {added === idea.title ? <CheckCircle2 className="size-4" /> : <Plus className="size-4" />} {added === idea.title ? 'Ajouté au journal' : 'Ajouter au journal'}
              </Button>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

function AdviceView({ advice }: { advice: AiAdvice }) {
  return (
    <div className="space-y-3 border-t pt-3">
      {advice.alerte && (
        <p className="flex gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-amber-500" /> {advice.alerte}
        </p>
      )}
      <p className="text-sm">{advice.resume}</p>
      <ul className="space-y-2">
        {advice.conseils.map((c, i) => (
          <li key={i} className="text-sm">
            <span className="font-semibold">{c.titre}.</span> <span className="text-muted-foreground">{c.detail}</span>
          </li>
        ))}
      </ul>
      {advice.idees_repas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Idées de repas</p>
          {advice.idees_repas.map((r, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {r.repas} · ~{nf(r.kcal)} kcal · {nf(r.proteines_g)} g de protéines
              </p>
              <p className="text-muted-foreground">{r.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WeightTab({
  userId,
  today,
  weights,
  person,
  target,
  trend,
  onSaved,
}: {
  userId: string
  today: string
  weights: { day: string; weight: number }[]
  person: Person
  target: number | null
  trend: number | null
  onSaved: () => void
}) {
  const todayLog = weights.find((w) => w.day === today)
  const [value, setValue] = useState(todayLog ? String(todayLog.weight) : '')
  const [msg, setMsg] = useState<string | null>(null)
  const weeks = weeksToTarget(person, target)
  const data = weights.map((w) => ({ day: w.day, poids: w.weight }))
  return (
    <div className="space-y-4">
      <form
        className="flex items-end gap-2 rounded-xl border bg-card p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const w = Number(value.replace(',', '.'))
          if (!(w >= 30 && w <= 300)) return setMsg('Poids entre 30 et 300 kg.')
          try {
            await saveWeight(userId, today, w)
            setMsg('Pesée enregistrée.')
            onSaved()
          } catch {
            setMsg('Enregistrement impossible.')
          }
        }}
      >
        <Field id="weight" label="Poids du jour (kg)" type="text" inputMode="decimal" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} className="flex-1" />
        <Button type="submit">Enregistrer</Button>
      </form>
      {msg && <p role="status" className="text-sm">{msg}</p>}
      <p className="text-xs text-muted-foreground">Conseil : pesez-vous le matin, à jeun, après être passé aux toilettes. Le poids varie de ±1 kg d’un jour à l’autre (eau, sel) : c’est la tendance qui compte.</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-lg font-bold">{nf1(person.weightKg)} kg</p>
          <p className="text-[11px] text-muted-foreground">IMC {nf1(bmi(person.weightKg, person.heightCm))}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-lg font-bold">{trend != null ? `${trend > 0 ? '+' : ''}${nf1(trend)}` : '—'}</p>
          <p className="text-[11px] text-muted-foreground">kg / semaine</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-lg font-bold">{target ? `${nf1(target)} kg` : '—'}</p>
          <p className="text-[11px] text-muted-foreground">{weeks ? `objectif ≈ ${weeks} sem.` : 'objectif'}</p>
        </div>
      </div>
      {data.length >= 2 ? (
        <div className="h-64 rounded-xl border bg-card p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tickFormatter={(d: string) => formatDayMonth(d)} tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} tickFormatter={(v: number) => nf1(v)} />
              <Tooltip formatter={(v) => [`${nf1(Number(v))} kg`, 'Poids']} labelFormatter={(d) => formatDayMonth(String(d))} contentStyle={{ background: '#111', border: '1px solid #333' }} />
              {target && <ReferenceLine y={target} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'objectif', fill: '#22c55e', fontSize: 11, position: 'insideTopRight' }} />}
              <Line type="monotone" dataKey="poids" stroke="var(--brand, #e10600)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">La courbe apparaît dès la deuxième pesée.</p>
      )}
    </div>
  )
}

function Explanation({ targets, person }: { targets: Targets; person: Person }) {
  const pct = (g: number, k: number) => Math.round(((g * k) / Math.max(1, targets.kcal)) * 100)
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4 text-sm">
      <h2 className="font-semibold">Vos besoins aujourd’hui</h2>
      {targets.warnings.map((w, i) => (
        <p key={i} className="flex gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-2.5">
          <TriangleAlert className="size-4 shrink-0 text-amber-500" /> {w}
        </p>
      ))}
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Métabolisme de base (Mifflin-St Jeor)</dt>
        <dd className="text-right tabular-nums">{nf(targets.bmr)} kcal</dd>
        <dt className="text-muted-foreground">Avec l’activité de la vie courante</dt>
        <dd className="text-right tabular-nums">{nf(targets.base)} kcal</dd>
        <dt className="text-muted-foreground">Séances du jour</dt>
        <dd className="text-right tabular-nums">+ {nf(targets.exercise)} kcal</dd>
        <dt className="text-muted-foreground">Ajustement pour l’objectif</dt>
        <dd className="text-right tabular-nums">
          {targets.adjustment < 0 ? '−' : '+'} {nf(Math.abs(targets.adjustment))} kcal
        </dd>
        <dt className="font-semibold">Objectif du jour</dt>
        <dd className="text-right font-semibold tabular-nums">{nf(targets.kcal)} kcal</dd>
      </dl>
      <p className="text-muted-foreground">
        Protéines {targets.protein} g ({nf1(targets.protein / person.weightKg)} g/kg, {pct(targets.protein, 4)} %) · glucides {targets.carbs} g ({pct(targets.carbs, 4)} %) · lipides {targets.fat} g ({pct(targets.fat, 9)} %) · fibres {targets.fiber} g · eau ≈ {nf1(targets.waterL)} L
      </p>
      <p className="text-xs text-muted-foreground">Les séances enregistrées ou importées sont ajoutées automatiquement : les jours d’entraînement, vous pouvez manger plus.</p>
    </section>
  )
}

function GoalForm({ userId, profile, weight, height, onSaved }: { userId: string; profile: NutritionProfile | null; weight: number | null; height: number | null; onSaved: () => void }) {
  const [f, setF] = useState({
    sex: profile?.sex ?? ('male' as 'male' | 'female'),
    birth_year: profile ? String(profile.birth_year) : '',
    height_cm: profile ? String(profile.height_cm) : height ? String(height) : '',
    weight: weight ? String(weight) : '',
    lifestyle: profile?.lifestyle ?? 'light',
    goal: profile?.goal ?? 'maintain',
    rate: profile ? String(profile.rate_kg_week) : '0.5',
    target: profile?.target_weight != null ? String(profile.target_weight) : '',
    diet: profile?.diet ?? 'omnivore',
    allergies: profile?.allergies ?? '',
    pregnant: profile?.pregnant ?? false,
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const n = (s: string) => Number(s.replace(',', '.'))
  const year = new Date().getFullYear()
  const showRate = f.goal === 'lose' || f.goal === 'gain'
  return (
    <form
      className="space-y-4 rounded-xl border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const by = n(f.birth_year)
        const h = n(f.height_cm)
        const w = n(f.weight)
        if (!(by >= year - 100 && by <= year - 14)) return setMsg('Année de naissance invalide (14 ans minimum).')
        if (!(h >= 100 && h <= 250)) return setMsg('Taille entre 100 et 250 cm.')
        if (!(w >= 30 && w <= 300)) return setMsg('Poids entre 30 et 300 kg.')
        const t = f.target ? n(f.target) : null
        if (t != null && !(t >= 30 && t <= 300)) return setMsg('Poids visé entre 30 et 300 kg.')
        setBusy(true)
        try {
          await saveProfile({
            user_id: userId,
            sex: f.sex,
            birth_year: by,
            height_cm: h,
            lifestyle: f.lifestyle,
            goal: f.goal,
            rate_kg_week: n(f.rate),
            target_weight: t,
            diet: f.diet,
            allergies: f.allergies.trim() || null,
            pregnant: f.sex === 'female' && f.pregnant,
          })
          // Le poids saisi devient la pesée du jour (référence des calculs)
          await saveWeight(userId, localDate(new Date()), w)
          setMsg('Objectif enregistré.')
          onSaved()
        } catch {
          setMsg('Enregistrement impossible. Vérifiez les valeurs.')
        }
        setBusy(false)
      }}
    >
      <h2 className="font-semibold">Mon profil et mon objectif</h2>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Objectif</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {GOALS.map((g) => (
            <label key={g.key} className={cn('flex cursor-pointer gap-2 rounded-xl border p-3', f.goal === g.key && 'border-primary bg-primary/10')}>
              <input type="radio" name="goal" className="mt-1" checked={f.goal === g.key} onChange={() => setF({ ...f, goal: g.key })} />
              <span>
                <span className="block text-sm font-medium">{g.label}</span>
                <span className="block text-xs text-muted-foreground">{g.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <SelectField id="sex" label="Sexe" value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value as 'male' | 'female' })}>
          <option value="male">Homme</option>
          <option value="female">Femme</option>
        </SelectField>
        <Field id="birth" label="Année de naissance" type="number" inputMode="numeric" value={f.birth_year} onChange={(e) => setF({ ...f, birth_year: e.target.value })} required />
        <Field id="height" label="Taille (cm)" type="number" inputMode="numeric" value={f.height_cm} onChange={(e) => setF({ ...f, height_cm: e.target.value })} required />
        <Field id="nweight" label="Poids actuel (kg)" type="text" inputMode="decimal" step="0.1" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} required />
        {showRate && (
          <SelectField id="rate" label={f.goal === 'lose' ? 'Perte par semaine' : 'Prise par semaine'} value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })}>
            <option value="0.25">0,25 kg (doux)</option>
            <option value="0.5">0,5 kg (conseillé)</option>
            {f.goal === 'lose' && <option value="0.75">0,75 kg (soutenu)</option>}
            {f.goal === 'lose' && <option value="1">1 kg (maximum)</option>}
          </SelectField>
        )}
        <Field id="target" label="Poids visé (kg, facultatif)" type="text" inputMode="decimal" step="0.1" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />
      </div>
      <SelectField id="lifestyle" label="Activité en dehors du sport" value={f.lifestyle} onChange={(e) => setF({ ...f, lifestyle: e.target.value as typeof f.lifestyle })} hint={LIFESTYLES.find((l) => l.key === f.lifestyle)?.hint}>
        {LIFESTYLES.map((l) => (
          <option key={l.key} value={l.key}>
            {l.label}
          </option>
        ))}
      </SelectField>
      <div className="grid grid-cols-2 gap-3">
        <SelectField id="diet" label="Régime" value={f.diet} onChange={(e) => setF({ ...f, diet: e.target.value as typeof f.diet })}>
          {DIETS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </SelectField>
        <Field id="allergies" label="Allergies / aliments évités" value={f.allergies} maxLength={300} onChange={(e) => setF({ ...f, allergies: e.target.value })} />
      </div>
      {f.sex === 'female' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.pregnant} onChange={(e) => setF({ ...f, pregnant: e.target.checked })} /> Enceinte ou allaitante
        </label>
      )}
      {msg && <p role="status" className="text-sm">{msg}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy && <Loader2 className="size-4 animate-spin" />} Enregistrer
      </Button>
    </form>
  )
}

/** Hydratation : boutons rapides (verre 250 ml, gourde 500 ml) et objectif du jour (plus élevé les jours de sport). */
function WaterCard({ ml, targetL, onChange }: { ml: number; targetL: number; onChange: (ml: number) => Promise<void> }) {
  const [value, setValue] = useState(ml)
  const [prev, setPrev] = useState(ml)
  if (ml !== prev) {
    setPrev(ml)
    setValue(ml)
  }
  const target = Math.round(targetL * 1000)
  const pct = Math.min(100, (value / Math.max(1, target)) * 100)
  const change = (v: number) => {
    const next = Math.max(0, v)
    setValue(next)
    onChange(next)
  }
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Hydratation">
      <div className="flex items-center gap-3">
        <Droplet className="size-5 shrink-0 text-sky-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Hydratation</span>
            <span className="tabular-nums text-muted-foreground">
              {nf1(value / 1000)} / {nf1(target / 1000)} L
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted/40">
            <div className="h-full rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => change(value - 250)} disabled={value <= 0} aria-label="Retirer un verre">
          −
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => change(value + 250)}>
          + Verre (250 ml)
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => change(value + 500)}>
          + Gourde (500 ml)
        </Button>
      </div>
    </section>
  )
}

/** Ce que disent les données : glucides de la veille ↔ vitesse des séances d'endurance. */
function PerformanceInsights({ userId, weight }: { userId: string; weight: number }) {
  const today = localDate(new Date())
  const { data } = useData(() => loadPerformanceData(userId, today), [userId, today])
  if (!data) return null
  const { insights, missing } = carbInsights(data.sessions, data.carbs, weight)
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Nutrition et performance</h2>
      {insights.length ? (
        insights.map((i) => (
          <p key={i.sport} className="text-sm">
            {i.text}
          </p>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          KronoFit compare vos repas de la veille à la vitesse de vos séances d’endurance (45 min et plus). Encore {missing || 6} séance{(missing || 6) > 1 ? 's' : ''} avec les repas de la veille notés pour obtenir une première analyse.
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">Analyse de vos 90 derniers jours ; la vitesse dépend aussi du parcours, du vent et de la fatigue : c’est une tendance, pas une règle.</p>
    </section>
  )
}
