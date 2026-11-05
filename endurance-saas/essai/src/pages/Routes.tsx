import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CloudDownload, Download, FileUp, Loader2, Navigation, Pencil, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { cumulative, parseGpxPoints, routeLength, simplify, type LatLng } from '@/lib/routes/geo'
import { elevationFromProfile, fetchIgnElevations } from '@/lib/live/refine'
import { toGpx } from '@/lib/training/performance'
import { cn } from '@/lib/utils'
import { TrackMap } from '../components/TrackMap'
import { prepareOffline } from '../offline'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

const FAMILY: Record<string, string> = { run: 'Course / marche', ride: 'Vélo', swim: 'Natation', other: 'Autre' }
const km = (m: number) => `${(m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`

interface RouteRow { id: string; user_id: string; name: string; sport_family: string; points: LatLng[]; distance_meters: number; elevation_gain_meters: number | null; visibility: 'public' | 'private' }

export function RoutesPage() {
  const user = useUser()
  const { data } = useData(async () => ((await supabase.from('routes').select('*').order('created_at', { ascending: false }).limit(100)).data ?? []) as unknown as RouteRow[], [user.id])
  const mine = (data ?? []).filter((r) => r.user_id === user.id)
  const others = (data ?? []).filter((r) => r.user_id !== user.id)
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Tableau de bord</Link>
      <h1 className="text-2xl font-bold">Parcours</h1>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild><Link to="/dashboard/routes/new"><Pencil className="size-4" /> Tracer</Link></Button>
        <Button variant="outline" asChild><Link to="/dashboard/routes/new?gpx=1"><FileUp className="size-4" /> Importer un GPX</Link></Button>
      </div>
      <RouteList title="Mes parcours" rows={mine} empty="Aucun parcours. Tracez-en un, importez un GPX ou créez-le depuis une séance." />
      {others.length > 0 && <RouteList title="Parcours partagés" rows={others} empty="" />}
    </div>
  )
}

function RouteList({ title, rows, empty }: { title: string; rows: RouteRow[]; empty: string }) {
  return (
    <section className="rounded-xl border bg-card">
      <h2 className="border-b p-4 font-semibold">{title}</h2>
      {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">{empty}</p>}
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.id}>
            <Link to={`/dashboard/routes/${r.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent/50">
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">{FAMILY[r.sport_family]} · {km(r.distance_meters)}{r.elevation_gain_meters ? ` · D+ ${Math.round(r.elevation_gain_meters)} m` : ''}</span>
              </span>
              <Navigation className="size-4 shrink-0 text-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Création : tracé au doigt sur la carte, import GPX, ou depuis une séance (?depuis=<id séance>). */
export function RouteEditorPage() {
  const user = useUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [points, setPoints] = useState<LatLng[]>([])
  const [f, setF] = useState({ name: '', sport_family: 'run', visibility: 'private' as 'public' | 'private' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fromActivity = params.get('depuis')
  // Carte centrée sur ma position pour tracer (sinon vue de la France après 4 s)
  const [here, setHere] = useState<{ lat: number; lng: number; accuracy: number } | null | undefined>(undefined)
  useEffect(() => {
    const done = setTimeout(() => setHere((h) => (h === undefined ? null : h)), 4000)
    navigator.geolocation?.getCurrentPosition((pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }), () => setHere(null), { enableHighAccuracy: true, timeout: 4000 })
    return () => clearTimeout(done)
  }, [])

  useEffect(() => {
    if (!fromActivity) return
    supabase.from('activities').select('title, sport_type, route:raw_telemetry->route').eq('id', fromActivity).single().then(({ data }) => {
      if (data && Array.isArray(data.route)) {
        setPoints(simplify(data.route as LatLng[]))
        setF((x) => ({ ...x, name: data.title }))
      }
    })
  }, [fromActivity])

  const importGpx = async (file: File | undefined) => {
    if (!file) return
    try {
      const g = parseGpxPoints(await file.text())
      setPoints(simplify(g.points))
      setF((x) => ({ ...x, name: x.name || g.name || file.name.replace(/\.gpx$/i, '') }))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const distance = useMemo(() => routeLength(points), [points])

  const save = async () => {
    if (points.length < 2) return setError('Touchez la carte au moins deux fois pour tracer le parcours.')
    if (!f.name.trim()) return setError('Donnez un nom au parcours.')
    setSaving(true)
    // Dénivelé du parcours sur le relief IGN (France) — facultatif
    let gain: number | null = null
    const cum = cumulative(points)
    const sampled: LatLng[] = []
    let next = 0
    points.forEach((p, i) => {
      if (cum[i] >= next) {
        sampled.push(p)
        next += 25
      }
    })
    const z = await fetchIgnElevations(sampled.map(([lat, lng]) => ({ lat, lng }))).catch(() => null)
    if (z) gain = elevationFromProfile(z).gain
    const { data, error } = await supabase
      .from('routes')
      .insert({ user_id: user.id, name: f.name.trim().slice(0, 80), sport_family: f.sport_family, visibility: f.visibility, points: simplify(points, 5000), distance_meters: Math.round(distance), elevation_gain_meters: gain })
      .select('id')
      .single()
    setSaving(false)
    if (error || !data) return setError('Enregistrement impossible.')
    navigate(`/dashboard/routes/${data.id}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link to="/dashboard/routes" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Parcours</Link>
      <h1 className="text-2xl font-bold">Nouveau parcours</h1>
      {params.get('gpx') && points.length === 0 && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm font-medium">
          <FileUp className="size-4" /> Choisir un fichier GPX (Komoot, Garmin, Strava, Visorando…)
          <input type="file" accept=".gpx,application/gpx+xml" className="sr-only" onChange={(e) => importGpx(e.target.files?.[0])} />
        </label>
      )}
      <p className="text-sm text-muted-foreground">{fromActivity || params.get('gpx') ? 'Vérifiez le tracé, nommez-le puis enregistrez.' : 'Touchez la carte pour placer les points du parcours, dans l’ordre.'}</p>
      {here === undefined && points.length === 0 ? (
        <div className="flex h-[50vh] items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" /> Localisation…</div>
      ) : (
        <TrackMap route={[]} position={here ?? null} guideRoute={points} onMapClick={(p) => setPoints((x) => [...x, [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6]])} className="h-[50vh]" />
      )}
      <div className="flex items-center justify-between text-sm">
        <span><strong className="tabular-nums">{km(distance)}</strong> · {points.length} point(s)</span>
        <span className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPoints((x) => x.slice(0, -1))} disabled={!points.length}><Undo2 className="size-4" /> Annuler</Button>
          <Button size="sm" variant="ghost" onClick={() => setPoints([])} disabled={!points.length}>Effacer</Button>
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Field id="route-name" label="Nom" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField id="route-sport" label="Sport" value={f.sport_family} onChange={(e) => setF({ ...f, sport_family: e.target.value })}>
          <option value="run">Course / marche</option>
          <option value="ride">Vélo</option>
          <option value="other">Autre</option>
        </SelectField>
        <SelectField id="route-vis" label="Visible par" value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value as 'public' | 'private' })}>
          <option value="private">Moi seul</option>
          <option value="public">Tout le monde</option>
        </SelectField>
      </div>
      <Button className="w-full" size="lg" onClick={save} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Enregistrer le parcours</Button>
    </div>
  )
}

export function RouteDetailPage() {
  const { id } = useParams()
  const user = useUser()
  const navigate = useNavigate()
  const { data } = useData(async () => ({ r: ((await supabase.from('routes').select('*').eq('id', id!).maybeSingle()).data ?? null) as unknown as RouteRow | null }), [id])
  const [offline, setOffline] = useState<{ done: number; total: number; msg?: string } | null>(null)
  if (!data) return <div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />
  const r = data.r
  if (!r) return <p className="text-sm text-muted-foreground">Parcours introuvable.</p>
  const mine = r.user_id === user.id

  const prep = async () => {
    setOffline({ done: 0, total: 0 })
    try {
      const res = await prepareOffline(r.points, (done, total) => setOffline({ done, total }))
      setOffline({ done: res.total, total: res.total, msg: `Carte prête hors ligne (${res.ok} morceaux de carte enregistrés).` })
    } catch (e) {
      setOffline({ done: 0, total: 0, msg: (e as Error).message })
    }
  }
  const gpx = () => {
    const blob = new Blob([toGpx({ title: r.name, sport_type: r.sport_family, start_time: new Date().toISOString() }, r.points)], { type: 'application/gpx+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${r.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.gpx`
    a.click()
  }
  const remove = async () => {
    if (!confirm('Supprimer ce parcours ?')) return
    await supabase.from('routes').delete().eq('id', r.id)
    navigate('/dashboard/routes')
  }
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link to="/dashboard/routes" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Parcours</Link>
      <h1 className="text-2xl font-bold">{r.name}</h1>
      <p className="text-sm text-muted-foreground">{FAMILY[r.sport_family]} · {km(r.distance_meters)}{r.elevation_gain_meters ? ` · D+ ${Math.round(r.elevation_gain_meters)} m` : ''} · {r.visibility === 'public' ? 'public' : 'privé'}</p>
      <TrackMap route={[]} guideRoute={r.points} className="h-80" />
      <Button size="lg" className="w-full h-14 rounded-full text-base" asChild>
        <Link to={`/dashboard/record?parcours=${r.id}`}><Navigation className="size-5" /> Suivre ce parcours</Link>
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={prep} disabled={!!offline && !offline.msg}>
          {offline && !offline.msg ? <Loader2 className="size-4 animate-spin" /> : <CloudDownload className="size-4" />} Carte hors ligne
        </Button>
        <Button variant="outline" onClick={gpx}><Download className="size-4" /> Exporter GPX</Button>
      </div>
      {offline && (
        <p role="status" className={cn('text-sm', offline.msg ? '' : 'text-muted-foreground')}>
          {offline.msg ?? `Téléchargement de la carte… ${offline.done} / ${offline.total || '…'}`}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Hors ligne : préparez la carte avec du réseau, puis gardez l’application ouverte. Le tracé GPS fonctionne toujours sans réseau.</p>
      {mine && <Button variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="size-4" /> Supprimer</Button>}
    </div>
  )
}
