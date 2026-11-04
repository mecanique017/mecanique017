import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDuration } from '@/components/dashboard/activity-list'
import { SPORT_GROUPS, sportFamily, sportInfo } from '@/lib/sports'
import { TrackMap } from '../components/TrackMap'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const FAMILY_LABEL: Record<string, string> = { run: 'Course & marche', ride: 'Vélo', swim: 'Natation', other: 'Autres' }
const FAMILY_COLOR: Record<string, string> = { run: '#e10600', ride: '#f59e0b', swim: '#2563eb', other: '#64748b' }
const km = (m: number) => (m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })

export function StatsPage() {
  const user = useUser()
  const [year, setYear] = useState(new Date().getFullYear())
  const { data } = useData(async () => {
    const { data } = await supabase
      .from('activities')
      .select('id, sport_type, start_time, distance_meters, duration_seconds, elevation_gain_meters, route:raw_telemetry->route')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(2000)
    return data ?? []
  }, [user.id])

  const view = useMemo(() => {
    if (!data) return null
    const years = [...new Set(data.map((a) => new Date(a.start_time).getFullYear()))].sort((a, b) => b - a)
    const acts = data.filter((a) => new Date(a.start_time).getFullYear() === year)
    const total = { n: acts.length, dist: 0, time: 0, elev: 0 }
    const months = MONTHS.map((m) => ({ month: m, run: 0, ride: 0, swim: 0, other: 0 }))
    const bySport = new Map<string, { n: number; dist: number; time: number; elev: number }>()
    for (const a of acts) {
      const d = Number(a.distance_meters)
      total.dist += d
      total.time += a.duration_seconds
      total.elev += Number(a.elevation_gain_meters)
      const m = months[new Date(a.start_time).getMonth()]
      m[sportFamily(a.sport_type)] += Math.round(d / 100) / 10
      const s = bySport.get(a.sport_type) ?? { n: 0, dist: 0, time: 0, elev: 0 }
      s.n++
      s.dist += d
      s.time += a.duration_seconds
      s.elev += Number(a.elevation_gain_meters)
      bySport.set(a.sport_type, s)
    }
    const routes = acts.map((a) => a.route).filter((r): r is [number, number][] => Array.isArray(r) && r.length > 1) as [number, number][][]
    const families = SPORT_GROUPS.map((g) => g.sports[0].family).filter((f) => months.some((m) => m[f] > 0))
    return { years: years.length ? years : [year], total, months, bySport: [...bySport.entries()].sort((a, b) => b[1].time - a[1].time), routes, families }
  }, [data, year])

  if (!view) return <div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Tableau de bord</Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Statistiques</h1>
        <select aria-label="Année" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 rounded-md border bg-background px-3">
          {view.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Séances', String(view.total.n)],
          ['Distance', `${km(view.total.dist)} km`],
          ['Durée', formatDuration(view.total.time)],
          ['Dénivelé +', `${Math.round(view.total.elev).toLocaleString('fr-FR')} m`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{l}</dt>
            <dd className="text-xl font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h2 className="font-semibold">Distance par mois (km)</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={view.months} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v, n) => [`${v} km`, FAMILY_LABEL[String(n)]]} />
              {view.families.map((f) => <Bar key={f} dataKey={f} stackId="a" fill={FAMILY_COLOR[f]} radius={[2, 2, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {view.families.map((f) => <li key={f} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: FAMILY_COLOR[f] }} />{FAMILY_LABEL[f]}</li>)}
        </ul>
      </section>
      {view.bySport.length > 0 && (
        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="font-semibold">Par sport</h2>
          <table className="w-full text-sm tabular-nums">
            <tbody>
              {view.bySport.map(([k, s]) => {
                const Icon = sportInfo(k).icon
                return (
                  <tr key={k} className="border-t first:border-t-0">
                    <td className="py-2"><span className="flex items-center gap-2"><Icon className="size-4 text-muted-foreground" />{sportInfo(k).short}</span></td>
                    <td className="py-2 text-right">{s.n} séance{s.n > 1 ? 's' : ''}</td>
                    <td className="py-2 text-right">{s.dist > 0 ? `${km(s.dist)} km` : ''}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatDuration(s.time)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}
      <section className="rounded-xl border bg-card p-4 space-y-2">
        <h2 className="font-semibold">Carte de mes passages {year}</h2>
        {view.routes.length ? (
          <TrackMap key={year} route={[]} heat={view.routes} className="h-96" />
        ) : (
          <p className="text-sm text-muted-foreground">Aucun parcours GPS cette année.</p>
        )}
        <p className="text-xs text-muted-foreground">{view.routes.length} parcours · gratuit dans KronoFit.</p>
      </section>
    </div>
  )
}
