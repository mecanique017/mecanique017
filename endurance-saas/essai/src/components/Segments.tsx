import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Loader2, Plus, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bbox, matchSegment, routeLength, simplify, type LatLng } from '@/lib/routes/geo'
import { sportFamily } from '@/lib/sports'
import { supabase } from '../supabase'
import { TrackMap } from './TrackMap'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

interface Found { id: string; name: string; distance: number; elapsed: number; rank: number | null; best: boolean }

/**
 * Segments traversés par une de MES séances : détection automatique (temps à chaque point requis,
 * séances enregistrées en direct), enregistrement des passages, rang au classement. Création d'un segment.
 */
export function ActivitySegments({ activity, route, times, userId }: { activity: { id: string; sport_type: string; start_time: string }; route: LatLng[]; times: number[] | null; userId: string }) {
  const [found, setFound] = useState<Found[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!times || times.length !== route.length || route.length < 3) return
    let stop = false
    ;(async () => {
      const b = bbox(route)
      const { data: segs } = await supabase.rpc('segments_in_box', { p_min_lat: b.min_lat, p_max_lat: b.max_lat, p_min_lng: b.min_lng, p_max_lng: b.max_lng })
      const out: Found[] = []
      for (const sg of segs ?? []) {
        if (sg.sport_family !== sportFamily(activity.sport_type)) continue
        const m = matchSegment(route, times, sg.points as unknown as LatLng[])
        if (!m) continue
        await supabase.from('segment_efforts').upsert(
          { segment_id: sg.id, activity_id: activity.id, user_id: userId, elapsed_seconds: m.elapsed, start_time: new Date(new Date(activity.start_time).getTime() + m.startT * 1000).toISOString() },
          { onConflict: 'segment_id,activity_id' },
        )
        const { data: board } = await supabase.rpc('segment_leaderboard', { p_segment: sg.id })
        const me = (board as unknown as { me: { rank: number; elapsed: number } | null } | null)?.me
        out.push({ id: sg.id, name: sg.name, distance: sg.distance_meters, elapsed: m.elapsed, rank: me?.rank ?? null, best: !!me && me.elapsed === m.elapsed })
      }
      if (!stop) setFound(out)
    })()
    return () => {
      stop = true
    }
  }, [activity.id, activity.sport_type, activity.start_time, route, times, userId, version])

  return (
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold"><Flag className="size-4 text-primary" /> Segments</h2>
        {route.length > 2 && !creating && <Button size="sm" variant="outline" onClick={() => setCreating(true)}><Plus className="size-4" /> Créer un segment</Button>}
      </div>
      {!times ? (
        <p className="text-sm text-muted-foreground">Le chronométrage des segments se fait sur les séances enregistrées en direct avec KronoFit.</p>
      ) : found === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Recherche des segments traversés…</p>
      ) : found.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun segment sur ce parcours. Créez le premier !</p>
      ) : (
        <ul className="divide-y">
          {found.map((f) => (
            <li key={f.id}>
              <Link to={`/dashboard/segments/${f.id}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{(f.distance / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km</span>
                </span>
                <span className="text-right">
                  <strong className="tabular-nums">{clock(f.elapsed)}</strong>
                  <span className="block text-xs text-muted-foreground">
                    {f.best && <Trophy className="mr-1 inline size-3 text-primary" />}{f.rank ? `${f.rank}${f.rank === 1 ? 'er' : 'e'} du classement` : ''}{f.best ? ' · record perso' : ''}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating && <SegmentCreator route={route} sport={activity.sport_type} userId={userId} onDone={() => { setCreating(false); setFound(null); setVersion((v) => v + 1) }} />}
    </section>
  )
}

function SegmentCreator({ route, sport, userId, onDone }: { route: LatLng[]; sport: string; userId: string; onDone: () => void }) {
  const [range, setRange] = useState<[number, number]>([10, 40])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const i0 = Math.floor((range[0] / 100) * (route.length - 1))
  const i1 = Math.max(i0 + 1, Math.floor((range[1] / 100) * (route.length - 1)))
  const part = route.slice(i0, i1 + 1)
  const len = routeLength(part)
  const save = async () => {
    if (!name.trim()) return setError('Donnez un nom au segment (ex. « Montée du phare »).')
    if (len < 100) return setError('Un segment fait au moins 100 m.')
    const pts = simplify(part, 600)
    const { error } = await supabase.from('segments').insert({ creator_id: userId, name: name.trim().slice(0, 80), sport_family: sportFamily(sport), points: pts, distance_meters: Math.round(len), ...bbox(pts) })
    if (error) return setError('Création impossible.')
    onDone()
  }
  return (
    <div className="space-y-3 rounded-xl border p-3">
      <p className="text-sm font-semibold">Nouveau segment (en jaune)</p>
      <TrackMap route={route} highlight={part} className="h-56" />
      <label className="block text-xs text-muted-foreground">Début : {range[0]} %
        <input type="range" min={0} max={99} value={range[0]} onChange={(e) => setRange([Math.min(Number(e.target.value), range[1] - 1), range[1]])} className="w-full accent-primary" />
      </label>
      <label className="block text-xs text-muted-foreground">Fin : {range[1]} %
        <input type="range" min={1} max={100} value={range[1]} onChange={(e) => setRange([range[0], Math.max(Number(e.target.value), range[0] + 1)])} className="w-full accent-primary" />
      </label>
      <p className="text-sm">Longueur : <strong>{(len / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km</strong></p>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nom du segment" aria-label="Nom du segment" className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={save}>Créer le segment</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </div>
  )
}
