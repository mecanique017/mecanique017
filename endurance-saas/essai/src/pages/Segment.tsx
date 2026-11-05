import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import type { LatLng } from '@/lib/routes/geo'
import { cn } from '@/lib/utils'
import { TrackMap } from '../components/TrackMap'
import { Avatar } from '../components/Social'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'
import type { AthleteCard } from '../social'

interface Board {
  segment: { id: string; name: string; sport_family: string; distance_meters: number; points: LatLng[]; creator: AthleteCard; mine: boolean } | null
  leaders: { rank: number; user: AthleteCard; elapsed: number; date: string; activity_id: string | null }[]
  me: { rank: number; elapsed: number; date: string } | null
  my_efforts: number
  athletes: number
}
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export function SegmentPage() {
  const { id } = useParams()
  const user = useUser()
  const { data } = useData(async () => (await supabase.rpc('segment_leaderboard', { p_segment: id! })).data as unknown as Board | null, [id])
  if (data === undefined) return <div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />
  if (!data?.segment) return <p className="text-sm text-muted-foreground">Segment introuvable.</p>
  const s = data.segment
  const speed = (sec: number) =>
    s.sport_family === 'run'
      ? (() => { const p = sec / (s.distance_meters / 1000); return `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, '0')} /km` })()
      : `${((s.distance_meters / sec) * 3.6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <button onClick={() => history.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Retour</button>
      <h1 className="text-2xl font-bold">{s.name}</h1>
      <p className="text-sm text-muted-foreground">{(s.distance_meters / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km · {data.athletes} athlète(s) · créé par {s.mine ? 'vous' : s.creator.name}</p>
      <TrackMap route={[]} guideRoute={s.points} highlight={s.points} className="h-64" />
      {data.me && (
        <p className="rounded-xl border border-primary/50 bg-primary/10 p-3 text-sm">
          <Trophy className="mr-1 inline size-4 text-primary" /> Votre record : <strong>{clock(data.me.elapsed)}</strong> ({speed(data.me.elapsed)}) · {data.me.rank}{data.me.rank === 1 ? 'er' : 'e'} sur {data.athletes} · {data.my_efforts} passage(s)
        </p>
      )}
      <section className="rounded-xl border bg-card">
        <h2 className="border-b p-4 font-semibold">Classement</h2>
        <ol className="divide-y">
          {data.leaders.map((l) => (
            <li key={l.user.id} className={cn('flex items-center gap-3 p-3', l.user.id === user.id && 'bg-primary/5')}>
              <span className={cn('w-6 text-center font-bold tabular-nums', l.rank <= 3 && 'text-primary')}>{l.rank}</span>
              <Avatar user={l.user} size={32} />
              <span className="min-w-0 flex-1 truncate font-medium">{l.user.id === user.id ? 'Vous' : l.user.name}</span>
              <span className="text-right text-sm tabular-nums">
                {l.activity_id ? <Link to={`/dashboard/activities/${l.activity_id}`} className="font-bold underline-offset-4 hover:underline">{clock(l.elapsed)}</Link> : <strong>{clock(l.elapsed)}</strong>}
                <span className="block text-xs text-muted-foreground">{speed(l.elapsed)} · {date.format(new Date(l.date))}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
