import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, FileDown, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCoachedAthletes } from '@/lib/coach'
import { getTrainingLoad, localDate } from '@/lib/training/load'
import { getWellness } from '@/lib/training/wellness'
import { addDays, formatLongDay, mondayOf } from '@/lib/dates'
import { KpiTiles } from '@/components/dashboard/kpi-tiles'
import { LoadChart } from '@/components/dashboard/load-chart'
import { ActivityList, formatDuration, SPORT_LABELS } from '@/components/dashboard/activity-list'
import { Button } from '@/components/ui/button'
import { PlannedForm } from '../../calendar/planned-form'
import { deleteAthletePlanned, planForAthlete } from '../actions'

export const metadata: Metadata = { title: 'Athlète — Endurance SaaS' }

export default function AthletePage({ params }: PageProps<'/dashboard/coach/[athleteId]'>) {
  return (
    <div className="space-y-6">
      <Link href="/dashboard/coach" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Mes athlètes
      </Link>
      <Suspense fallback={<div className="h-[32rem] rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <Athlete params={params} />
      </Suspense>
    </div>
  )
}

async function Athlete({ params }: { params: PageProps<'/dashboard/coach/[athleteId]'>['params'] }) {
  const { athleteId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Seuls les athlètes ayant accepté le suivi sont accessibles (sinon : 404, sans rien révéler)
  const athlete = (await getCoachedAthletes(supabase)).find((a) => a.athlete_id === athleteId)
  if (!athlete) notFound()

  const today = localDate(new Date())
  const monday = mondayOf(today)
  const [series, { data: activities }, { data: planned }, wellness] = await Promise.all([
    getTrainingLoad(supabase, athleteId),
    supabase
      .from('activities')
      .select('id, title, sport_type, start_time, duration_seconds, distance_meters, tss')
      .eq('user_id', athleteId)
      .order('start_time', { ascending: false })
      .limit(10),
    supabase
      .from('planned_workouts')
      .select('*')
      .eq('user_id', athleteId)
      .gte('scheduled_date', monday)
      .lte('scheduled_date', addDays(monday, 13))
      .order('scheduled_date', { ascending: true }),
    getWellness(supabase, athleteId, addDays(today, -6), today),
  ])
  const month = today.slice(0, 7)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{athlete.full_name ?? 'Athlète'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            FTP {athlete.ftp} W · FC seuil {athlete.lactate_threshold_hr} bpm · FC max {athlete.hr_max} bpm · VMA {Number(athlete.vma)} km/h
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/reports/monthly?month=${month}&athlete=${athleteId}`}>
            <FileDown className="h-4 w-4" /> Bilan du mois (PDF)
          </a>
        </Button>
      </div>

      <KpiTiles series={series} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-4 md:p-6">
          <LoadChart data={series.slice(-90)} />
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold mb-3">Dernières séances</h2>
            <ActivityList activities={activities ?? []} />
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold mb-3">Bien-être (7 jours)</h2>
            {wellness.length ? (
              <table className="w-full text-right text-sm tabular-nums">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium">Jour</th>
                    <th className="font-medium">VFC</th>
                    <th className="font-medium">Sommeil</th>
                    <th className="font-medium">Fatigue</th>
                  </tr>
                </thead>
                <tbody>
                  {[...wellness].reverse().map((d) => (
                    <tr key={d.date}>
                      <td className="text-left first-letter:uppercase">{formatLongDay(d.date).split(' ').slice(0, 2).join(' ')}</td>
                      <td>{d.hrv ?? '—'}</td>
                      <td>{d.sleep_score ?? '—'}</td>
                      <td>{d.perceived_fatigue != null ? `${d.perceived_fatigue}/10` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun relevé.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 md:p-6 space-y-3">
          <h2 className="font-semibold">Programme (2 semaines)</h2>
          {planned && planned.length > 0 ? (
            <ul className="divide-y text-sm">
              {planned.map((p) => {
                const Icon = SPORT_LABELS[p.sport_type].icon
                const mine = p.created_by === user.id
                return (
                  <li key={p.id} className="flex items-start gap-2 py-2">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label={SPORT_LABELS[p.sport_type].label} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted-foreground first-letter:uppercase">
                        {formatLongDay(p.scheduled_date)} · {mine ? 'par vous' : p.source === 'ai' ? 'plan IA' : 'par l’athlète'}
                        {p.is_completed && ' · réalisée'}
                      </span>
                      <span className={p.is_completed ? 'line-through' : 'font-medium'}>{p.title}</span>
                      {(p.target_duration_seconds || p.target_tss != null) && (
                        <span className="text-muted-foreground">
                          {' '}
                          · {[p.target_duration_seconds && formatDuration(p.target_duration_seconds), p.target_tss != null && `${p.target_tss} TSS`].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    {mine && (
                      <form action={deleteAthletePlanned}>
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" variant="ghost" size="sm" aria-label={`Supprimer ${p.title}`}>
                          <Trash2 className="size-4" />
                        </Button>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune séance prévue.</p>
          )}
        </section>
        <section className="rounded-xl border bg-card p-4 md:p-6 space-y-4">
          <h2 className="font-semibold">Programmer une séance</h2>
          <PlannedForm defaultDate={addDays(today, 1)} action={planForAthlete} athleteId={athleteId} />
        </section>
      </div>
    </div>
  )
}
