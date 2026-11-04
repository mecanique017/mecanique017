import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  bestByDistance, bestPower, computeBestEfforts, hrZones, paceZones, POWER_DURATIONS, powerZones, predictTimes, RIDE_DISTANCES, RUN_DISTANCES, thresholdPace,
  type BestEfforts, type EffortRow,
} from '@/lib/training/performance'
import type { TelemetryPoint } from '@/lib/fit/parse-fit'
import { sportFamily } from '@/lib/sports'
import type { Json } from '@/types/database'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

export const hms = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.round(s % 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
const pace = (secPerKm: number) => `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')} /km`
const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Calcule et enregistre les meilleurs efforts des séances qui n'en ont pas encore (une seule fois). */
async function backfill(userId: string, onProgress: (done: number, total: number) => void) {
  const { data } = await supabase.from('activities').select('id').eq('user_id', userId).is('best_efforts', null)
  const ids = (data ?? []).map((r) => r.id)
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10)
    const { data: rows } = await supabase.from('activities').select('id, sport_type, distance_meters, duration_seconds, points:raw_telemetry->points').in('id', chunk)
    await Promise.all(
      (rows ?? []).map((r) => {
        const efforts = computeBestEfforts(
          { sport_type: r.sport_type, distance_meters: Number(r.distance_meters), duration_seconds: r.duration_seconds },
          Array.isArray(r.points) ? (r.points as TelemetryPoint[]) : null,
        )
        return supabase.from('activities').update({ best_efforts: efforts as unknown as Json }).eq('id', r.id)
      }),
    )
    onProgress(Math.min(i + 10, ids.length), ids.length)
  }
  return ids.length
}

export function PerformancePage() {
  const user = useUser()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    backfill(user.id, (done, total) => setProgress({ done, total })).finally(() => setReady(true))
  }, [user.id])

  const { data, reload } = useData(async () => {
    if (!ready) return null
    const [acts, profile] = await Promise.all([
      supabase.from('activities').select('id, sport_type, start_time, best_efforts').eq('user_id', user.id).not('best_efforts', 'is', null).order('start_time', { ascending: false }),
      supabase.from('profiles').select('hr_rest, hr_max, lactate_threshold_hr, ftp').eq('id', user.id).single(),
    ])
    return { acts: acts.data ?? [], profile: profile.data }
  }, [user.id, ready])

  const view = useMemo(() => {
    if (!data) return null
    const rows: EffortRow[] = data.acts.map((a) => ({ activityId: a.id, date: a.start_time, sport: a.sport_type, efforts: a.best_efforts as unknown as BestEfforts }))
    const since = (days: number) => rows.filter((r) => Date.now() - new Date(r.date).getTime() < days * 864e5)
    const runAll = bestByDistance(rows, 'run')
    const rideAll = bestByDistance(rows, 'ride')
    const runRecent = bestByDistance(since(120), 'run')
    const rideRecent = bestByDistance(since(120), 'ride')
    const power = bestPower(rows)
    const power90 = bestPower(since(90))
    // FC au seuil estimée sur les courses uniquement (à vélo la FC est plus basse à effort égal)
    const hr20 = Math.max(0, ...since(120).filter((r) => sportFamily(r.sport) === 'run').map((r) => r.efforts.hr20 ?? 0))
    return {
      runAll,
      rideAll,
      power,
      runPred: predictTimes(runRecent, RUN_DISTANCES),
      ridePred: predictTimes(rideRecent, [{ m: 20000, label: '20 km' }, { m: 50000, label: '50 km' }, { m: 100000, label: '100 km' }, { m: 160000, label: '160 km' }]),
      threshold: thresholdPace(runRecent),
      ftpEstimate: power90['1200'] ? Math.round(power90['1200'].w * 0.95) : null,
      lthrEstimate: hr20 && data.profile && hr20 * 0.98 > data.profile.hr_rest && hr20 * 0.98 <= data.profile.hr_max ? Math.round(hr20 * 0.98) : null,
    }
  }, [data])

  const [msg, setMsg] = useState<string | null>(null)
  const apply = async (patch: { lactate_threshold_hr?: number; ftp?: number }) => {
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    setMsg(error ? 'Valeur refusée (la FC au seuil doit rester entre FC repos et FC max).' : 'Profil mis à jour.')
    reload()
  }

  if (!ready || !view || !data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> {progress && progress.total ? `Analyse de vos séances… ${progress.done} / ${progress.total}` : 'Chargement…'}
      </p>
    )
  }
  const p = data.profile

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Tableau de bord</Link>
      <h1 className="text-2xl font-bold">Records & prédictions</h1>
      {msg && <p role="status" className="rounded-md border bg-card p-3 text-sm">{msg}</p>}

      <RecordTable title="Records course à pied" items={RUN_DISTANCES.map((d) => ({ label: d.label, rec: view.runAll[String(d.m)], meters: d.m }))} kind="run" />
      <RecordTable title="Records vélo" items={RIDE_DISTANCES.map((d) => ({ label: d.label, rec: view.rideAll[String(d.m)], meters: d.m }))} kind="ride" />
      {Object.keys(view.power).length > 0 && (
        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="font-semibold">Meilleure puissance</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {POWER_DURATIONS.map((d) => {
              const r = view.power[String(d.s)]
              return (
                <li key={d.s} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  <p className="text-xl font-bold tabular-nums">{r ? `${r.w} W` : '–'}</p>
                  {r && <Link to={`/dashboard/activities/${r.activityId}`} className="text-[11px] text-muted-foreground underline">{shortDate.format(new Date(r.date))}</Link>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Temps prévus en course</h2>
        <p className="text-xs text-muted-foreground">D’après vos meilleurs efforts des 4 derniers mois (formule de Riegel). Estimation pour un parcours plat et une préparation adaptée.</p>
        <PredictionGrid items={view.runPred} kind="run" />
      </section>
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Temps prévus à vélo</h2>
        <p className="text-xs text-muted-foreground">D’après vos meilleurs efforts à vélo des 4 derniers mois, sur terrain comparable.</p>
        <PredictionGrid items={view.ridePred} kind="ride" />
      </section>

      <section className="rounded-xl border bg-card p-4 space-y-4">
        <h2 className="font-semibold">Vos zones d’entraînement</h2>
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Fréquence cardiaque <span className="font-normal text-muted-foreground">(seuil {p?.lactate_threshold_hr} bpm)</span></h3>
            {view.lthrEstimate && p && Math.abs(view.lthrEstimate - p.lactate_threshold_hr) >= 3 && (
              <Button size="sm" variant="outline" onClick={() => apply({ lactate_threshold_hr: view.lthrEstimate! })}>Seuil estimé {view.lthrEstimate} bpm : appliquer</Button>
            )}
          </div>
          {p && <ZoneList rows={hrZones(p.lactate_threshold_hr).map((z) => ({ name: z.name, value: z.from == null ? `< ${z.to + 1} bpm` : z.to == null ? `≥ ${z.from} bpm` : `${z.from}–${z.to} bpm` }))} />}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Allure course <span className="font-normal text-muted-foreground">{view.threshold ? `(seuil estimé ${pace(view.threshold)})` : ''}</span></h3>
          {view.threshold ? (
            <ZoneList rows={paceZones(view.threshold).map((z) => ({ name: z.name, value: z.slow == null ? `plus lent que ${pace(z.fast!)}` : z.fast == null ? `plus rapide que ${pace(z.slow)}` : `${pace(z.slow)} – ${pace(z.fast)}` }))} />
          ) : (
            <p className="text-sm text-muted-foreground">Enregistrez une course d’au moins 3 km avec le GPS pour estimer votre allure seuil.</p>
          )}
        </div>
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Puissance vélo <span className="font-normal text-muted-foreground">(FTP {p?.ftp} W)</span></h3>
            {view.ftpEstimate && p && Math.abs(view.ftpEstimate - p.ftp) >= 5 && (
              <Button size="sm" variant="outline" onClick={() => apply({ ftp: view.ftpEstimate! })}>FTP estimée {view.ftpEstimate} W : appliquer</Button>
            )}
          </div>
          {p && <ZoneList rows={powerZones(p.ftp).map((z) => ({ name: z.name, value: z.from == null ? `< ${z.to} W` : z.to == null ? `> ${z.from} W` : `${z.from}–${z.to} W` }))} />}
        </div>
      </section>
    </div>
  )
}

function RecordTable({ title, items, kind }: { title: string; items: { label: string; meters: number; rec?: { s: number; est?: boolean; activityId: string; date: string } }[]; kind: 'run' | 'ride' }) {
  if (!items.some((i) => i.rec)) return null
  return (
    <section className="rounded-xl border bg-card p-4 space-y-2">
      <h2 className="flex items-center gap-2 font-semibold"><Trophy className="size-4 text-primary" /> {title}</h2>
      <table className="w-full text-sm tabular-nums">
        <tbody>
          {items.map((i) => (
            <tr key={i.label} className="border-t first:border-t-0">
              <td className="py-2 font-medium">{i.label}</td>
              <td className="py-2 text-right font-bold">{i.rec ? hms(i.rec.s) : '–'}</td>
              <td className="py-2 text-right text-muted-foreground">{i.rec ? (kind === 'run' ? pace(i.rec.s / (i.meters / 1000)) : `${((i.meters / i.rec.s) * 3.6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`) : ''}</td>
              <td className="py-2 text-right text-xs">
                {i.rec && (
                  <Link to={`/dashboard/activities/${i.rec.activityId}`} className="text-muted-foreground underline">
                    {shortDate.format(new Date(i.rec.date))}{i.rec.est ? ' · estimé' : ''}
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function PredictionGrid({ items, kind }: { items: { label: string; m: number; seconds: number | null }[]; kind: 'run' | 'ride' }) {
  if (!items.some((i) => i.seconds)) return <p className="text-sm text-muted-foreground">Pas encore assez de séances avec GPS pour une prédiction.</p>
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((i) => (
        <li key={i.label} className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{i.label}</p>
          <p className="text-xl font-bold tabular-nums">{i.seconds ? hms(i.seconds) : '–'}</p>
          {i.seconds && (
            <p className="text-[11px] text-muted-foreground">
              {kind === 'run' ? pace(i.seconds / (i.m / 1000)) : `${((i.m / i.seconds) * 3.6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function ZoneList({ rows }: { rows: { name: string; value: string }[] }) {
  const colors = ['#64748b', '#2563eb', '#16a34a', '#f59e0b', '#e10600', '#7c3aed']
  return (
    <ul className="mt-2 space-y-1">
      {rows.map((r, i) => (
        <li key={r.name} className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-1.5 text-sm">
          <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: colors[i] }} aria-hidden /> {r.name}</span>
          <span className="tabular-nums text-muted-foreground">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}
