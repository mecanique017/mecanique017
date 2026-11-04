import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Trash2, Undo2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { localDate } from '@/lib/training/load'
import { addDays, formatDayMonth, formatShortDay, isDay, mondayOf, weekDays } from '@/lib/dates'
import { formatDuration, SPORT_LABELS } from '@/components/dashboard/activity-list'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { deletePlannedWorkout, togglePlannedWorkout } from './actions'
import { PlannedForm } from './planned-form'

export const metadata: Metadata = { title: 'Calendrier — Endurance SaaS' }

export default function CalendarPage({ searchParams }: PageProps<'/dashboard/calendar'>) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Calendrier</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Programme de la semaine. Une séance réalisée valide automatiquement la séance prévue du même jour et du même sport.{' '}
          <Link href="/dashboard/plan" className="underline underline-offset-4">
            Générer un plan avec le coach IA
          </Link>
        </p>
      </div>
      <Suspense fallback={<div className="h-[32rem] rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <Week searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Week({ searchParams }: { searchParams: PageProps<'/dashboard/calendar'>['searchParams'] }) {
  const { week } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = localDate(new Date())
  const monday = mondayOf(isDay(week) ? week : today)
  const days = weekDays(monday)
  const sunday = days[6]

  const [{ data: planned }, { data: activities }] = await Promise.all([
    supabase
      .from('planned_workouts')
      .select('*')
      .gte('scheduled_date', monday)
      .lte('scheduled_date', sunday)
      .order('created_at', { ascending: true }),
    // Marge d'un jour de chaque côté : le rattachement au jour se fait ensuite en heure locale
    supabase
      .from('activities')
      .select('id, title, sport_type, start_time, duration_seconds, tss')
      .gte('start_time', `${addDays(monday, -1)}T00:00:00Z`)
      .lte('start_time', `${addDays(sunday, 1)}T23:59:59Z`)
      .order('start_time', { ascending: true }),
  ])

  const weekActivities = (activities ?? []).filter((a) => days.includes(localDate(a.start_time)))
  const linkedIds = new Set((planned ?? []).map((p) => p.activity_id).filter(Boolean))
  const plannedTss = (planned ?? []).reduce((s, p) => s + (p.target_tss ?? 0), 0)
  const plannedSeconds = (planned ?? []).reduce((s, p) => s + (p.target_duration_seconds ?? 0), 0)
  const doneTss = weekActivities.reduce((s, a) => s + Number(a.tss), 0)
  const doneSeconds = weekActivities.reduce((s, a) => s + a.duration_seconds, 0)
  const completed = (planned ?? []).filter((p) => p.is_completed).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/calendar?week=${addDays(monday, -7)}`} aria-label="Semaine précédente">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <p className="min-w-48 text-center font-semibold">
            Semaine du {formatDayMonth(monday)} au {formatDayMonth(sunday)}
          </p>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/calendar?week=${addDays(monday, 7)}`} aria-label="Semaine suivante">
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          {!days.includes(today) && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/calendar">Aujourd’hui</Link>
            </Button>
          )}
        </div>
        {/* Bilan de la semaine : prévu vs réalisé */}
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-muted-foreground">TSS réalisé / prévu</dt>
            <dd className="font-semibold tabular-nums">
              {Math.round(doneTss)} / {plannedTss}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Durée réalisée / prévue</dt>
            <dd className="font-semibold tabular-nums">
              {formatDuration(doneSeconds)} / {formatDuration(plannedSeconds)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Séances prévues faites</dt>
            <dd className="font-semibold tabular-nums">
              {completed} / {planned?.length ?? 0}
            </dd>
          </div>
        </dl>
      </div>

      <ol className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const dayPlanned = (planned ?? []).filter((p) => p.scheduled_date === day)
          const dayDone = weekActivities.filter((a) => localDate(a.start_time) === day && !linkedIds.has(a.id))
          const isToday = day === today
          return (
            <li key={day} className={cn('md:min-h-32 rounded-xl border bg-card p-3 space-y-2', isToday && 'border-primary')}>
              <p className={cn('text-sm first-letter:uppercase', isToday ? 'font-semibold' : 'text-muted-foreground')}>
                {formatShortDay(day)}
                {isToday && ' · aujourd’hui'}
              </p>

              {dayPlanned.map((p) => {
                const Icon = SPORT_LABELS[p.sport_type].icon
                return (
                  <div key={p.id} className={cn('rounded-lg border p-2 text-sm space-y-1', p.is_completed && 'opacity-70')}>
                    <p className="flex items-start gap-1.5 font-medium">
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-label={SPORT_LABELS[p.sport_type].label} />
                      <span className={cn('min-w-0 break-words', p.is_completed && 'line-through')}>{p.title}</span>
                      {p.source === 'ai' && (
                        <span className="ml-auto shrink-0 rounded bg-accent px-1 text-[10px] font-semibold text-muted-foreground" title="Proposée par le coach IA">
                          IA
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[p.target_duration_seconds && formatDuration(p.target_duration_seconds), p.target_tss != null && `${p.target_tss} TSS`]
                        .filter(Boolean)
                        .join(' · ') || 'Prévue'}
                    </p>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-3">{p.description}</p>}
                    {p.activity_id && (
                      <Link href={`/dashboard/activities/${p.activity_id}`} className="block text-xs underline underline-offset-4">
                        Voir la séance réalisée
                      </Link>
                    )}
                    <div className="flex gap-1">
                      <form action={togglePlannedWorkout}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="completed" value={String(!p.is_completed)} />
                        <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          {p.is_completed ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
                          {p.is_completed ? 'Annuler' : 'Faite'}
                        </Button>
                      </form>
                      <form action={deletePlannedWorkout}>
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs" aria-label={`Supprimer ${p.title}`}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </form>
                    </div>
                  </div>
                )
              })}

              {dayDone.map((a) => {
                const Icon = SPORT_LABELS[a.sport_type].icon
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/activities/${a.id}`}
                    className="flex items-start gap-1.5 rounded-lg bg-accent/60 p-2 text-sm hover:bg-accent"
                  >
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className="block break-words font-medium">{a.title}</span>
                      <span className="text-xs text-muted-foreground">
                        Réalisée · {formatDuration(a.duration_seconds)} · {Math.round(Number(a.tss))} TSS
                      </span>
                    </span>
                  </Link>
                )
              })}

              {dayPlanned.length === 0 && dayDone.length === 0 && <p className="text-xs text-muted-foreground">Repos</p>}
            </li>
          )
        })}
      </ol>

      <section className="max-w-xl rounded-xl border bg-card p-4 md:p-6 space-y-4">
        <h2 className="font-semibold">Planifier une séance</h2>
        <PlannedForm defaultDate={days.includes(today) ? today : monday} />
      </section>
    </div>
  )
}
