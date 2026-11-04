import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, Share2, Sparkles, Trash2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration, SPORT_LABELS } from '@/components/dashboard/activity-list'
import { SessionProfileChart } from '@/components/dashboard/session-profile-chart'
import { TrackMap } from '../components/TrackMap'
import { ShareActivity } from '../components/ShareActivity'
import { sportInfo } from '@/lib/sports'
import { computeBestEfforts, RIDE_DISTANCES, RUN_DISTANCES, toGpx, type BestEfforts } from '@/lib/training/performance'
import { hms } from './Performance'
import { LapTable, type LapRow } from '@/components/dashboard/lap-table'
import { sportFamily } from '@/lib/sports'

const paceOf = (secPerKm: number) => `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')}`
import type { TelemetryPoint } from '@/lib/fit/parse-fit'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'
import { SharedActivityView } from './SharedActivity'
import { SocialPanel } from '../components/Social'
import type { Visibility } from '../social'

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' })

export function ActivityPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useUser()
  // Juste après l'enregistrement d'une séance (?partager=1), le partage s'ouvre directement
  const [params] = useSearchParams()
  const [sharing, setSharing] = useState(params.get('partager') === '1')
  const { data, error, reload } = useData(async () => {
    const { data } = await supabase.from('activities').select('*').eq('id', id!).maybeSingle()
    return { activity: data } // enveloppe : distingue « en chargement » (null) de « introuvable »
  }, [id])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return <div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />
  const a = data.activity
  // Séance d'un autre athlète : vue partagée (tracé public, bravos, commentaires)
  if (!a) return <SharedActivityView id={id!} />
  const setVisibility = async (v: Visibility) => {
    await supabase.from('activities').update({ visibility: v }).eq('id', a.id)
    reload()
  }

  const telemetry = a.raw_telemetry as { points?: TelemetryPoint[]; route?: [number, number][]; route_t?: number[]; laps?: LapRow[] } | null
  const laps = Array.isArray(telemetry?.laps) ? telemetry.laps : []
  const points = Array.isArray(telemetry?.points) ? telemetry.points : []
  const route = Array.isArray(telemetry?.route) ? telemetry.route : []
  const km = Number(a.distance_meters) / 1000
  const stats = [
    { label: 'Durée', value: formatDuration(a.duration_seconds) },
    { label: 'Distance', value: km > 0 ? `${km.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km` : '—' },
    { label: sportFamily(a.sport_type) === 'run' ? 'Allure moyenne' : 'Vitesse moyenne', value: km > 0 ? (sportFamily(a.sport_type) === 'run' ? `${paceOf(a.duration_seconds / km)} /km` : `${((km / a.duration_seconds) * 3600).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`) : '—' },
    { label: 'TSS', value: Math.round(Number(a.tss)).toString() },
    { label: 'Intensité (IF)', value: Number(a.intensity_factor) > 0 ? Number(a.intensity_factor).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' },
    { label: 'FC moyenne', value: a.avg_hr ? `${a.avg_hr} bpm` : '—' },
    { label: 'FC max', value: a.max_hr ? `${a.max_hr} bpm` : '—' },
    { label: 'Puissance moy.', value: a.avg_watts ? `${a.avg_watts} W` : '—' },
    { label: 'Puissance normalisée', value: a.normalized_power ? `${a.normalized_power} W` : '—' },
    { label: 'Dénivelé +', value: Number(a.elevation_gain_meters) > 0 ? `${Math.round(Number(a.elevation_gain_meters))} m` : '—' },
    { label: 'Effort ressenti', value: a.rpe_score ? `${a.rpe_score} / 10` : '—' },
  ].filter((s) => s.value !== '—')

  // Meilleurs efforts de cette séance
  const efforts = (a.best_efforts as unknown as BestEfforts | null) ?? computeBestEfforts({ sport_type: a.sport_type, distance_meters: Number(a.distance_meters), duration_seconds: a.duration_seconds }, points)
  const effortList = [...RUN_DISTANCES, ...RIDE_DISTANCES]
    .filter((d, i, all) => all.findIndex((x) => x.m === d.m) === i && efforts.dist[String(d.m)] && !efforts.dist[String(d.m)].est)
    .map((d) => ({ label: d.label, s: efforts.dist[String(d.m)].s }))

  const exportGpx = () => {
    const gpx = toGpx(a, route, telemetry?.route_t ?? null)
    const blob = new Blob([gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${a.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.gpx`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const remove = async () => {
    if (!confirm('Supprimer cette séance ?')) return
    await supabase.from('activities').delete().eq('id', a.id)
    navigate('/dashboard')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Tableau de bord
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{SPORT_LABELS[a.sport_type].label}</p>
          <h1 className="text-2xl font-bold">{a.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{dateTime.format(new Date(a.start_time))}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setSharing(true)}>
            <Share2 className="h-4 w-4" /> Partager
          </Button>
          <Button variant="ghost" size="sm" onClick={remove}>
            <Trash2 className="h-4 w-4" /> Supprimer
          </Button>
        </div>
      </div>
      {sharing && (
        <ShareActivity
          onClose={() => setSharing(false)}
          data={{
            title: a.title,
            sport: sportInfo(a.sport_type).label,
            date: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(new Date(a.start_time)),
            route,
            stats: [
              ...(km > 0 ? [{ label: 'Distance', value: `${km.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km` }] : []),
              { label: 'Durée', value: formatDuration(a.duration_seconds) },
              ...(km > 0
                ? [sportFamily(a.sport_type) === 'run'
                    ? { label: 'Allure', value: `${paceOf(a.duration_seconds / km)} /km` }
                    : { label: 'Vitesse', value: `${((km / a.duration_seconds) * 3600).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h` }]
                : []),
              ...(Number(a.elevation_gain_meters) > 0 ? [{ label: 'Dénivelé', value: `${Math.round(Number(a.elevation_gain_meters))} m` }] : []),
              ...(a.avg_hr ? [{ label: 'FC moyenne', value: `${a.avg_hr} bpm` }] : []),
            ],
          }}
        />
      )}
      <dl className="grid grid-cols-2 sm:grid-cols-3 overflow-hidden rounded-xl border bg-card">
        {stats.map((s) => (
          <div key={s.label} className="-mb-px border-b p-4">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {route.length > 1 && (
        <section className="rounded-xl border bg-card p-4 md:p-6 space-y-3">
          <h2 className="font-semibold">Parcours</h2>
          <TrackMap route={route} className="h-80" />
        </section>
      )}
      {points.length > 1 && (
        <section className="rounded-xl border bg-card p-4 md:p-6 space-y-4">
          <h2 className="font-semibold">Profil de la séance</h2>
          <SessionProfileChart points={points} sport={a.sport_type} />
        </section>
      )}
      {effortList.length > 0 && (
        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="flex items-center gap-2 font-semibold"><Trophy className="size-4 text-primary" /> Meilleurs efforts de la séance</h2>
          <ul className="flex flex-wrap gap-2">
            {effortList.map((e) => (
              <li key={e.label} className="rounded-lg border px-3 py-2 text-sm"><span className="text-muted-foreground">{e.label}</span> <strong className="tabular-nums">{hms(e.s)}</strong></li>
            ))}
          </ul>
        </section>
      )}
      {laps.length > 0 && <LapTable laps={laps} sport={a.sport_type} />}
      {route.length > 1 && (
        <Button variant="outline" onClick={exportGpx}>
          <Download className="h-4 w-4" /> Exporter en GPX (Garmin, Strava, Komoot…)
        </Button>
      )}
      {a.athlete_notes && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm text-muted-foreground mb-1">Notes</h2>
          <p className="whitespace-pre-line">{a.athlete_notes}</p>
        </div>
      )}
      <SocialPanel activityId={a.id} userId={user.id} mine visibility={a.visibility} onVisibility={setVisibility} />
      <p className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <Sparkles className="size-4 shrink-0 text-red-600" aria-hidden /> L’analyse par le coach IA est disponible dans la version complète.
      </p>
    </div>
  )
}
