import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCoachUsage } from '@/lib/coach-quota'
import { Button } from '@/components/ui/button'
import { formatDuration, SPORT_LABELS } from '@/components/dashboard/activity-list'
import { deleteActivity } from '../actions'
import { AnalyzeButton } from './analyze-button'
import { SessionProfileChart } from '@/components/dashboard/session-profile-chart'
import type { TelemetryPoint } from '@/lib/fit/parse-fit'

export const metadata: Metadata = { title: 'Séance — Endurance SaaS' }

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
})

export default function ActivityPage({ params }: PageProps<'/dashboard/activities/[id]'>) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Tableau de bord
      </Link>
      <Suspense fallback={<div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <ActivityDetail params={params} />
      </Suspense>
    </div>
  )
}

async function ActivityDetail({ params }: { params: PageProps<'/dashboard/activities/[id]'>['params'] }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: activity }, { data: insights }, { data: profile }] = await Promise.all([
    supabase.from('activities').select('*').eq('id', id).maybeSingle(),
    supabase.from('coach_insights').select('*').eq('activity_id', id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
  ])
  if (!activity) notFound()
  const usage = await getCoachUsage(supabase, user.id, profile?.subscription_tier ?? 'free')

  const sport = SPORT_LABELS[activity.sport_type]
  const telemetry = activity.raw_telemetry as { normalizedPower?: number | null; points?: TelemetryPoint[] } | null
  const points = Array.isArray(telemetry?.points) ? telemetry.points : []
  const km = Number(activity.distance_meters) / 1000
  const stats = [
    { label: 'Durée', value: formatDuration(activity.duration_seconds) },
    { label: 'Distance', value: km > 0 ? `${km.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km` : '—' },
    { label: 'TSS', value: Math.round(Number(activity.tss)).toString() },
    { label: 'Intensité (IF)', value: Number(activity.intensity_factor) > 0 ? Number(activity.intensity_factor).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' },
    { label: 'FC moyenne', value: activity.avg_hr ? `${activity.avg_hr} bpm` : '—' },
    { label: 'FC max', value: activity.max_hr ? `${activity.max_hr} bpm` : '—' },
    { label: 'Puissance moy.', value: activity.avg_watts ? `${activity.avg_watts} W` : '—' },
    ...(telemetry?.normalizedPower ? [{ label: 'Puissance normalisée', value: `${telemetry.normalizedPower} W` }] : []),
    { label: 'Dénivelé +', value: Number(activity.elevation_gain_meters) > 0 ? `${Math.round(Number(activity.elevation_gain_meters))} m` : '—' },
    { label: 'Effort ressenti', value: activity.rpe_score ? `${activity.rpe_score} / 10` : '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{sport.label}</p>
          <h1 className="text-2xl font-bold">{activity.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{dateTimeFormat.format(new Date(activity.start_time))}</p>
        </div>
        <form action={deleteActivity}>
          <input type="hidden" name="id" value={activity.id} />
          <Button variant="ghost" size="sm" type="submit">
            <Trash2 className="h-4 w-4" /> Supprimer
          </Button>
        </form>
      </div>

      {/* Seules les mesures disponibles sont affichées ; séparateurs horizontaux (pas de case vide) */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 overflow-hidden rounded-xl border bg-card">
        {stats.filter((s) => s.value !== '—').map((s) => (
          <div key={s.label} className="-mb-px border-b p-4">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      {points.length > 1 && (
        <section className="rounded-xl border bg-card p-4 md:p-6 space-y-4">
          <h2 className="font-semibold">Profil de la séance</h2>
          <SessionProfileChart points={points} sport={activity.sport_type} />
        </section>
      )}

      {activity.athlete_notes && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm text-muted-foreground mb-1">Notes</h2>
          <p className="whitespace-pre-line">{activity.athlete_notes}</p>
        </div>
      )}

      <section className="rounded-xl border bg-card p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Retour du coach IA</h2>
          <p className="text-sm text-muted-foreground">
            {usage.limit === null ? 'Analyses illimitées' : `${usage.remaining} analyse(s) restante(s) ce mois-ci`}
          </p>
        </div>

        {insights && insights.length > 0 ? (
          <ul className="space-y-4">
            {insights.map((insight) => {
              const recommendation = (insight.suggested_adjustments as { recommendation?: string } | null)?.recommendation
              return (
                <li key={insight.id} className="space-y-2 border-l-2 pl-4">
                  {insight.fatigue_alert && (
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <AlertTriangle className="size-4" style={{ color: 'var(--status-critical)' }} aria-hidden />
                      Alerte fatigue
                    </p>
                  )}
                  <p>{insight.summary}</p>
                  <p className="text-xs text-muted-foreground">Analyse du {dateTimeFormat.format(new Date(insight.created_at))}</p>
                  {recommendation && (
                    <p className="text-sm">
                      <span className="font-medium">Prochaine séance : </span>
                      <span className="text-muted-foreground">{recommendation}</span>
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune analyse pour cette séance.</p>
        )}

        {usage.remaining === 0 ? (
          <Link href="/pricing" className="text-sm font-medium underline underline-offset-4">
            Quota atteint : voir les offres
          </Link>
        ) : (
          <AnalyzeButton activityId={activity.id} />
        )}
      </section>
    </div>
  )
}
