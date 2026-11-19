import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Check, Feather, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { addDays, formatLongDay } from '@/lib/dates'
import { getTrainingLoad, localDate } from '@/lib/training/load'
import { sportFamily } from '@/lib/sports'
import { defaultDays, generatePlan, lighten, PLAN_GOALS, type Step } from '@/lib/training/plan'
import type { Json, PlanGoal } from '@/types/database'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const nf = (n: number) => Math.round(n).toLocaleString('fr-FR')
const minutes = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')}` : `${Math.round(s / 60)} min`)

async function loadPlan(userId: string, today: string) {
  const [plan, profile, recent, series] = await Promise.all([
    supabase.from('training_plans').select('*').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('profiles').select('vma, ftp').eq('id', userId).single(),
    supabase.from('activities').select('sport_type, duration_seconds, distance_meters').eq('user_id', userId).gte('start_time', `${addDays(today, -28)}T00:00:00Z`),
    getTrainingLoad(supabase, userId).catch(() => []),
  ])
  const sessions = plan.data
    ? ((await supabase.from('planned_workouts').select('*').eq('plan_id', plan.data.id).order('scheduled_date')).data ?? [])
    : []
  const acts = recent.data ?? []
  const runKm = acts.filter((a) => sportFamily(a.sport_type) === 'run').reduce((t, a) => t + Number(a.distance_meters ?? 0) / 1000, 0) / 4
  const rideH = acts.filter((a) => sportFamily(a.sport_type) === 'ride').reduce((t, a) => t + a.duration_seconds / 3600, 0) / 4
  const last = series[series.length - 1]
  return { plan: plan.data, sessions, vma: Number(profile.data?.vma ?? 15), ftp: Number(profile.data?.ftp ?? 200), runKm, rideH, tsb: last ? last.tsb : null }
}

export function PlanPage() {
  const user = useUser()
  const today = localDate(new Date())
  const { data, error, reload } = useData(() => loadPlan(user.id, today), [user.id, today])
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return <p className="text-sm text-muted-foreground">Chargement…</p>
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Plan d’entraînement</h1>
      {data.plan ? <ActivePlan data={data} today={today} onChange={reload} /> : <PlanForm userId={user.id} today={today} data={data} onCreated={reload} />}
    </div>
  )
}

type Loaded = Awaited<ReturnType<typeof loadPlan>>

function PlanForm({ userId, today, data, onCreated }: { userId: string; today: string; data: Loaded; onCreated: () => void }) {
  const [goal, setGoal] = useState<PlanGoal>('10k')
  const g = PLAN_GOALS.find((x) => x.key === goal)!
  const [date, setDate] = useState(addDays(today, 7 * 10 + ((6 - ((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7)) % 7)))
  const [perWeek, setPerWeek] = useState(3)
  const [days, setDays] = useState<number[]>(defaultDays(3))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const isFitness = goal.endsWith('fitness')
  const raceDate = isFitness ? addDays(today, 8 * 7) : date
  const volume = g.sport === 'run' ? data.runKm : data.rideH
  const preview = useMemo(
    () => generatePlan({ goal, raceDate, start: today, sessionsPerWeek: perWeek, days, currentVolume: volume, vma: data.vma, ftp: data.ftp }),
    [goal, raceDate, today, perWeek, days, volume, data.vma, data.ftp],
  )
  const weeksAvail = Math.round((Date.parse(raceDate) - Date.parse(today)) / (7 * 86_400_000))

  const create = async () => {
    if (!isFitness && weeksAvail < 3) return setMsg('Choisissez une date dans au moins 3 semaines.')
    if (days.length !== perWeek) return setMsg(`Choisissez ${perWeek} jours d’entraînement.`)
    setBusy(true)
    const { data: plan, error } = await supabase
      .from('training_plans')
      .insert({ user_id: userId, goal, race_date: raceDate, sessions_per_week: perWeek, days, start_volume: Math.round(volume * 10) / 10 })
      .select('id')
      .single()
    if (error || !plan) {
      setBusy(false)
      return setMsg('Création impossible. Réessayez.')
    }
    const rows = preview.sessions.map((s) => ({
      user_id: userId,
      plan_id: plan.id,
      scheduled_date: s.date,
      title: s.title,
      description: s.description,
      sport_type: s.sport,
      target_duration_seconds: s.seconds,
      target_tss: s.tss,
      workout_structure: { steps: s.steps } as unknown as Json,
      source: 'plan' as const,
    }))
    const { error: e2 } = await supabase.from('planned_workouts').insert(rows)
    setBusy(false)
    if (e2) {
      await supabase.from('training_plans').delete().eq('id', plan.id)
      return setMsg('Création impossible. Réessayez.')
    }
    onCreated()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        KronoFit construit votre programme semaine par semaine (foncier, développement, affûtage), avec des allures et puissances calculées à partir de votre profil. Les séances arrivent dans le calendrier et peuvent être suivies en séance guidée.
      </p>
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Objectif</legend>
          <div className="grid grid-cols-2 gap-2">
            {PLAN_GOALS.map((x) => (
              <button key={x.key} type="button" onClick={() => setGoal(x.key)} className={cn('rounded-xl border p-2.5 text-left text-sm', goal === x.key && 'border-primary bg-primary/10 font-medium')}>
                {x.label}
                <span className="block text-[11px] text-muted-foreground">{x.sport === 'run' ? 'Course' : 'Vélo'}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          {!isFitness && <Field id="p-date" label="Date de l’objectif" type="date" min={addDays(today, 21)} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />}
          <SelectField
            id="p-per"
            label="Séances par semaine"
            value={String(perWeek)}
            onChange={(e) => {
              const n = Number(e.target.value)
              setPerWeek(n)
              setDays(defaultDays(n))
            }}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Jours d’entraînement ({days.length}/{perWeek}) · sortie longue le dernier</legend>
          <div className="flex gap-1">
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                aria-pressed={days.includes(i)}
                onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}
                className={cn('flex-1 rounded-lg border py-2 text-xs', days.includes(i) && 'border-primary bg-primary text-primary-foreground font-semibold')}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-muted-foreground">
          Repères utilisés : {g.sport === 'run' ? `VMA ${data.vma.toLocaleString('fr-FR')} km/h · ${nf(data.runKm)} km/semaine ces 4 dernières semaines` : `FTP ${data.ftp} W · ${data.rideH.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h/semaine ces 4 dernières semaines`}.{' '}
          <Link to="/dashboard/profile" className="underline underline-offset-2">
            Modifier dans le profil
          </Link>
        </p>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 font-semibold">
          Aperçu : {preview.weeks} semaine{preview.weeks > 1 ? 's' : ''}, {preview.sessions.length} séances
        </h2>
        <ul className="space-y-1 text-sm">
          {preview.sessions.slice(0, 7).map((s) => (
            <li key={s.date + s.title} className="flex gap-2">
              <span className="w-24 shrink-0 text-muted-foreground first-letter:uppercase">{formatLongDay(s.date).split(' ').slice(0, 3).join(' ')}</span>
              <span className={cn('min-w-0 flex-1', s.quality && 'font-medium')}>{s.title}</span>
              <span className="tabular-nums text-muted-foreground">{minutes(s.seconds)}</span>
            </li>
          ))}
        </ul>
        {preview.sessions.length > 7 && <p className="mt-1 text-xs text-muted-foreground">… puis {preview.sessions.length - 7} autres séances jusqu’au {formatLongDay(raceDate)}.</p>}
      </section>
      {msg && <p role="status" className="text-sm">{msg}</p>}
      <Button className="w-full" size="lg" onClick={create} disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} Créer mon plan
      </Button>
    </div>
  )
}

function ActivePlan({ data, today, onChange }: { data: Loaded; today: string; onChange: () => void }) {
  const plan = data.plan!
  const g = PLAN_GOALS.find((x) => x.key === plan.goal)!
  const [busy, setBusy] = useState(false)
  const daysLeft = Math.round((Date.parse(plan.race_date) - Date.parse(today)) / 86_400_000)
  const done = data.sessions.filter((s) => s.is_completed).length
  const todays = data.sessions.filter((s) => s.scheduled_date === today)
  const monday = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7))
  const week = data.sessions.filter((s) => s.scheduled_date >= monday && s.scheduled_date <= addDays(monday, 6))
  const nextWeek = data.sessions.filter((s) => s.scheduled_date > addDays(monday, 6) && s.scheduled_date <= addDays(monday, 13))
  const tired = data.tsb != null && data.tsb < -20

  const lightenSession = async (s: (typeof data.sessions)[number]) => {
    const l = lighten({ sport: s.sport_type, seconds: s.target_duration_seconds ?? 3600 }, { vma: data.vma, ftp: data.ftp })
    await supabase
      .from('planned_workouts')
      .update({ title: l.title, description: l.description, target_duration_seconds: l.seconds, target_tss: l.tss, workout_structure: { steps: l.steps } as unknown as Json })
      .eq('id', s.id)
    onChange()
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-primary/50 bg-primary/10 p-4">
        <p className="text-sm text-muted-foreground">Objectif</p>
        <p className="text-xl font-bold">{g.label}</p>
        <p className="text-sm">
          {plan.goal.endsWith('fitness') ? `Programme de 8 semaines, fin le ${formatLongDay(plan.race_date)}` : daysLeft > 0 ? `Dans ${daysLeft} jours (${formatLongDay(plan.race_date)})` : daysLeft === 0 ? 'C’est aujourd’hui : bonne course !' : 'Objectif passé'}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/60">
          <div className="h-full rounded-full bg-primary" style={{ width: `${(done / Math.max(1, data.sessions.length)) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {done} séance{done > 1 ? 's' : ''} faite{done > 1 ? 's' : ''} sur {data.sessions.length}
        </p>
      </section>

      {todays.map((s) => (
        <section key={s.id} className="space-y-2 rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aujourd’hui</p>
          <p className="font-semibold">{s.title}</p>
          {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
          {tired && !s.is_completed && !/récupération/i.test(s.title) && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-2.5 text-sm">
              <span className="flex-1">Votre fatigue est élevée (forme {Math.round(data.tsb!)}). Alléger la séance du jour ?</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); await lightenSession(s); setBusy(false) }}>
                <Feather className="size-4" /> Alléger
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            {(s.workout_structure as { steps?: Step[] } | null)?.steps?.length ? (
              <Link to="/dashboard/record" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                Faire en séance guidée
              </Link>
            ) : null}
            {s.is_completed && (
              <span className="flex items-center gap-1 text-sm text-green-500">
                <Check className="size-4" /> Faite
              </span>
            )}
          </div>
        </section>
      ))}

      <WeekList title="Cette semaine" sessions={week} today={today} />
      {nextWeek.length > 0 && <WeekList title="Semaine prochaine" sessions={nextWeek} today={today} />}
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard/calendar" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm">
          <CalendarDays className="size-4" /> Voir dans le calendrier
        </Link>
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={async () => {
            if (!confirm('Arrêter ce plan ? Les séances à venir seront retirées du calendrier (les séances faites restent).')) return
            await supabase.from('planned_workouts').delete().eq('plan_id', plan.id).eq('is_completed', false).gte('scheduled_date', today)
            await supabase.from('training_plans').update({ active: false }).eq('id', plan.id)
            onChange()
          }}
        >
          <Trash2 className="size-4" /> Arrêter le plan
        </Button>
      </div>
    </div>
  )
}

function WeekList({ title, sessions, today }: { title: string; sessions: { id: string; scheduled_date: string; title: string; target_duration_seconds: number | null; is_completed: boolean }[]; today: string }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {!sessions.length && <p className="text-sm text-muted-foreground">Repos.</p>}
      <ul className="space-y-1.5 text-sm">
        {sessions.map((s) => (
          <li key={s.id} className={cn('flex items-center gap-2', s.scheduled_date < today && !s.is_completed && 'opacity-60')}>
            <span className="w-24 shrink-0 text-muted-foreground first-letter:uppercase">{formatLongDay(s.scheduled_date).split(' ').slice(0, 3).join(' ')}</span>
            <span className="min-w-0 flex-1">{s.title}</span>
            {s.is_completed ? <Check className="size-4 text-green-500" aria-label="Faite" /> : <span className="tabular-nums text-muted-foreground">{s.target_duration_seconds ? minutes(s.target_duration_seconds) : ''}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
