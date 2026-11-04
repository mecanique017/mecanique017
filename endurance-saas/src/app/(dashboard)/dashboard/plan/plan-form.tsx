'use client'

import { useActionState } from 'react'
import { CalendarPlus, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { FormAlert } from '@/components/auth/form-alert'
import { formatLongDay, mondayOf } from '@/lib/dates'
import { formatDuration, SPORT_LABELS } from '@/components/dashboard/activity-list'
import { generatePlanAction, savePlanAction, type PlanState } from './actions'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const SPORTS = [
  { value: 'run', label: 'Course' },
  { value: 'ride', label: 'Vélo' },
  { value: 'swim', label: 'Natation' },
] as const

interface Props {
  defaultSports: string[]
  remaining: number | null
}

export function PlanForm({ defaultSports, remaining: initialRemaining }: Props) {
  const [state, formAction, pending] = useActionState<PlanState, FormData>(generatePlanAction, {})
  const remaining = state.remaining !== undefined ? state.remaining : initialRemaining
  const e = state.errors ?? {}
  const v = state.values
  const dayChecked = (day: number) => (v ? v.days.includes(String(day)) : day !== 1 && day !== 5)
  const sportChecked = (sport: string) => (v ? v.sports.includes(sport) : defaultSports.includes(sport))

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* key : le formulaire est recréé avec les valeurs saisies après chaque génération */}
      <form key={JSON.stringify(v ?? null)} action={formAction} className="lg:col-span-2 space-y-4 rounded-xl border bg-card p-4 md:p-6">
        {state.message && <FormAlert message={state.message} />}
        <TextareaField
          id="goal"
          label="Objectif"
          placeholder="Ex. Semi-marathon en 1 h 35, ou reprendre après 3 semaines de coupure"
          required
          maxLength={500}
          defaultValue={v?.goal}
          error={e.goal}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field id="event_date" label="Date de l’objectif" type="date" defaultValue={v?.event_date} error={e.event_date} hint="Facultatif" />
          <SelectField id="weeks" label="Durée du plan" defaultValue={v?.weeks ?? '2'} error={e.weeks}>
            {[1, 2, 3, 4].map((w) => (
              <option key={w} value={w}>
                {w} semaine{w > 1 ? 's' : ''}
              </option>
            ))}
          </SelectField>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Jours disponibles</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <label key={d} className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent">
                <input type="checkbox" name="days" value={i + 1} defaultChecked={dayChecked(i + 1)} className="accent-primary" />
                {d}
              </label>
            ))}
          </div>
          {e.days && <p className="text-xs text-destructive">{e.days}</p>}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Sports</legend>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map((s) => (
              <label key={s.value} className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent">
                <input type="checkbox" name="sports" value={s.value} defaultChecked={sportChecked(s.value)} className="accent-primary" />
                {s.label}
              </label>
            ))}
          </div>
          {e.sports && <p className="text-xs text-destructive">{e.sports}</p>}
        </fieldset>

        <Field id="max_hours" label="Volume maximal par semaine (h)" type="number" inputMode="decimal" min={1} max={30} step="0.5" defaultValue={v?.max_hours ?? '6'} required error={e.max_hours} />

        <Button type="submit" disabled={pending || remaining === 0} className="w-full">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {pending ? 'Le coach prépare votre plan…' : 'Générer le plan'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {remaining === null ? 'Plans illimités.' : `${remaining} génération(s) restante(s) ce mois-ci.`} La génération prend environ une minute.
        </p>
      </form>

      <div className="lg:col-span-3">
        {state.plan && state.startDate ? (
          <PlanPreview state={state as Required<Pick<PlanState, 'plan' | 'startDate'>> & PlanState} />
        ) : (
          <div className="flex h-full min-h-60 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Le plan proposé s’affichera ici. Vous pourrez le relire avant de l’ajouter au calendrier.
          </div>
        )}
      </div>
    </div>
  )
}

function PlanPreview({ state }: { state: Required<Pick<PlanState, 'plan' | 'startDate'>> & PlanState }) {
  const { plan, startDate } = state
  // Regroupement par semaine (lundi)
  const weeks = new Map<string, typeof plan.workouts>()
  for (const w of plan.workouts) {
    const key = mondayOf(w.date)
    weeks.set(key, [...(weeks.get(key) ?? []), w])
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 md:p-6" aria-live="polite">
      <div className="space-y-2">
        <h2 className="font-semibold">Plan proposé</h2>
        <p className="text-sm text-muted-foreground">{plan.summary}</p>
        {!!state.discarded && (
          <p className="text-xs text-muted-foreground">
            {state.discarded} séance(s) écartée(s) : hors période, sur un jour non disponible ou en doublon.
          </p>
        )}
      </div>

      {[...weeks.entries()].map(([monday, workouts]) => (
        <div key={monday} className="space-y-2">
          <h3 className="flex justify-between text-sm font-semibold">
            <span>Semaine du {formatLongDay(monday)}</span>
            <span className="font-normal text-muted-foreground tabular-nums">
              {formatDuration(workouts.reduce((s, w) => s + w.target_minutes * 60, 0))} · {workouts.reduce((s, w) => s + w.target_tss, 0)} TSS
            </span>
          </h3>
          <ul className="divide-y rounded-lg border">
            {workouts.map((w) => {
              const Icon = SPORT_LABELS[w.sport_type].icon
              return (
                <li key={w.date} className="space-y-1 p-3 text-sm">
                  <p className="flex items-start gap-2">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={SPORT_LABELS[w.sport_type].label} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted-foreground first-letter:uppercase">{formatLongDay(w.date)}</span>
                      <span className="font-medium">{w.title}</span>
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDuration(w.target_minutes * 60)} · {w.target_tss} TSS
                    </span>
                  </p>
                  <p className="pl-6 text-muted-foreground">{w.description}</p>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <form action={savePlanAction}>
        <input type="hidden" name="plan" value={JSON.stringify({ startDate, workouts: plan.workouts })} />
        <Button type="submit">
          <CalendarPlus className="h-4 w-4" /> Ajouter les {plan.workouts.length} séances au calendrier
        </Button>
      </form>
    </section>
  )
}
