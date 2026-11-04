import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { sportFamily, sportInfo } from '@/lib/sports'
import { cn } from '@/lib/utils'
import { TrackMap } from '../components/TrackMap'
import { supabase } from '../supabase'

interface Live {
  display_name: string | null
  sport: string
  status: 'running' | 'paused' | 'ended'
  started_at: string
  updated_at: string
  lat: number | null
  lng: number | null
  accuracy: number | null
  distance_meters: number
  moving_seconds: number
  track: [number, number][]
}

const clock = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

/** Page publique (sans compte) : suivi d'une séance en direct à partir du lien secret. */
export function LiveViewPage() {
  const { token } = useParams()
  const [live, setLive] = useState<Live | null | undefined>(undefined)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let stop = false
    const load = async () => {
      const { data, error } = await supabase.rpc('get_live_share', { p_token: token! })
      if (!stop) setLive(error ? null : ((data as unknown as Live) ?? null))
    }
    load()
    const id = setInterval(load, 15_000)
    const tick = setInterval(() => setNow(Date.now()), 10_000)
    return () => {
      stop = true
      clearInterval(id)
      clearInterval(tick)
    }
  }, [token])

  const position = useMemo(() => (live?.lat != null && live.lng != null ? { lat: live.lat, lng: live.lng, accuracy: live.accuracy ?? 10 } : null), [live])

  if (live === undefined) return <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
  if (!live)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-xl font-bold">Suivi indisponible</h1>
        <p className="text-sm text-muted-foreground">Ce lien a expiré ou n’existe pas. Les liens de suivi sont valables 24 h après la séance.</p>
      </div>
    )

  const ago = Math.max(0, Math.round((now - new Date(live.updated_at).getTime()) / 60000))
  const stale = live.status !== 'ended' && ago >= 3
  const name = live.display_name || 'Votre proche'
  const km = (live.distance_meters / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  const speed = live.moving_seconds > 0 ? live.distance_meters / live.moving_seconds : 0
  const run = sportFamily(live.sport) === 'run'

  return (
    <div className="fixed inset-0 flex flex-col bg-black pt-[env(safe-area-inset-top)]">
      <div className="relative flex-1">
        <TrackMap route={live.track} position={live.status === 'ended' ? null : position} live={live.status !== 'ended'} className="absolute inset-0 rounded-none border-0" />
        <p className={cn('absolute left-1/2 top-4 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-lg', live.status === 'ended' ? 'bg-neutral-800' : stale ? 'bg-amber-600' : 'bg-primary')}>
          <Radio className="size-3.5" />
          {live.status === 'ended' ? 'Séance terminée' : stale ? `Pas de nouvelle position depuis ${ago} min` : live.status === 'paused' ? 'En pause' : 'En direct'}
        </p>
      </div>
      <div className="shrink-0 bg-neutral-950 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] text-white space-y-3">
        <p className="text-sm text-neutral-400">
          <strong className="text-white">{name}</strong> · {sportInfo(live.sport).label} · départ {new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(live.started_at))}
        </p>
        <div className="grid grid-cols-3 text-center">
          <div><p className="text-2xl font-bold tabular-nums">{km}</p><p className="text-[11px] text-neutral-400">km</p></div>
          <div><p className="text-2xl font-bold tabular-nums">{clock(live.moving_seconds)}</p><p className="text-[11px] text-neutral-400">en mouvement</p></div>
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {run ? (speed > 0.3 ? `${Math.floor(1000 / speed / 60)}:${String(Math.round((1000 / speed) % 60)).padStart(2, '0')}` : '–') : (speed * 3.6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            </p>
            <p className="text-[11px] text-neutral-400">{run ? 'allure moy. /km' : 'km/h moy.'}</p>
          </div>
        </div>
        <p className="text-center text-[11px] text-neutral-500">Mis à jour {ago === 0 ? 'à l’instant' : `il y a ${ago} min`} · KronoFit</p>
      </div>
    </div>
  )
}
