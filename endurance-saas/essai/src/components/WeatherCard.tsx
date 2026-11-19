import { useEffect, useState } from 'react'
import { Loader2, MapPin, Wind } from 'lucide-react'
import { cn } from '@/lib/utils'
import { bestSlot, describe, forecastUrl, parseForecast, verdict, windFrom, type Forecast } from '@/lib/weather'

const POS_KEY = 'kronofit-weather-pos'
type Pos = { lat: number; lng: number }

const readPos = (): Pos | null => {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) ?? 'null')
  } catch {
    return null
  }
}
const savePos = (p: Pos) => {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p))
  } catch {
    // stockage indisponible : la position sera redemandée
  }
}
const hh = (t: string) => `${Number(t.slice(11, 13))} h`

/** Météo du jour et meilleur créneau pour sortir (position mémorisée sur l'appareil). */
export function WeatherCard() {
  const [pos, setPos] = useState<Pos | null>(readPos)
  const [state, setState] = useState<{ status: 'idle' | 'locating' | 'loading' | 'ok' | 'error'; forecast?: Forecast; msg?: string }>({ status: pos ? 'loading' : 'idle' })
  const [sport, setSport] = useState<'run' | 'ride'>('run')

  useEffect(() => {
    if (!pos) return
    let alive = true
    fetch(forecastUrl(pos.lat, pos.lng))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('météo'))))
      .then((j) => alive && setState({ status: 'ok', forecast: parseForecast(j) }))
      .catch(() => alive && setState({ status: 'error', msg: 'Météo indisponible pour le moment.' }))
    return () => {
      alive = false
    }
  }, [pos])

  const locate = () => {
    if (!('geolocation' in navigator)) return setState({ status: 'error', msg: 'Position indisponible sur cet appareil.' })
    setState({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: Math.round(p.coords.latitude * 100) / 100, lng: Math.round(p.coords.longitude * 100) / 100 }
        savePos(next)
        setState({ status: 'loading' })
        setPos(next)
      },
      () => setState({ status: 'error', msg: 'Position refusée : autorisez la localisation pour voir la météo.' }),
      { enableHighAccuracy: false, maximumAge: 3_600_000, timeout: 15_000 },
    )
  }

  if (!pos || state.status === 'idle' || state.status === 'locating')
    return (
      <button onClick={locate} className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left hover:bg-accent" disabled={state.status === 'locating'}>
        {state.status === 'locating' ? <Loader2 className="size-5 animate-spin" /> : <MapPin className="size-5" />}
        <span>
          <span className="block font-semibold">Météo pour sortir</span>
          <span className="block text-xs text-muted-foreground">{state.msg ?? 'Afficher la météo près de moi et le meilleur créneau du jour'}</span>
        </span>
      </button>
    )
  if (state.status === 'loading') return <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Chargement de la météo…</div>
  if (state.status === 'error' || !state.forecast)
    return (
      <button onClick={locate} className="w-full rounded-xl border bg-card p-4 text-left text-sm text-muted-foreground">
        {state.msg} Toucher pour réessayer.
      </button>
    )

  const f = state.forecast
  const now = new Date()
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`
  const idx = Math.max(0, f.hours.findIndex((h) => h.time === key))
  const cur = f.hours[idx]
  const d = describe(cur.code)
  const slot = bestSlot(f, now, 2, sport)
  const v = slot ? verdict(slot.penalty) : null
  const next = f.hours.slice(idx, idx + 8)
  const isToday = slot?.start.slice(0, 10) === key.slice(0, 10)

  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Météo">
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {d.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums">{Math.round(cur.temp)}°</p>
          <p className="text-xs text-muted-foreground">
            {d.label} · ressenti {Math.round(cur.feels)}°
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p className="flex items-center justify-end gap-1">
            <Wind className="size-3.5" /> {Math.round(cur.wind)} km/h
          </p>
          <p>du {windFrom(cur.windDir)}</p>
          {cur.gust > 40 && <p>rafales {Math.round(cur.gust)}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-8 gap-1 text-center text-[11px]">
        {next.map((h) => (
          <div key={h.time}>
            <p className="text-muted-foreground">{hh(h.time)}</p>
            <p aria-hidden>{describe(h.code).icon}</p>
            <p className="tabular-nums">{Math.round(h.temp)}°</p>
            <p className={cn('tabular-nums', h.rainProb >= 50 ? 'text-sky-400' : 'text-muted-foreground')}>{h.rainProb}%</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t pt-3">
        <div className="flex rounded-full border p-0.5 text-xs" role="radiogroup" aria-label="Sport">
          {(['run', 'ride'] as const).map((s) => (
            <button key={s} role="radio" aria-checked={sport === s} onClick={() => setSport(s)} className={cn('rounded-full px-2.5 py-1', sport === s && 'bg-primary text-primary-foreground')}>
              {s === 'run' ? 'Course' : 'Vélo'}
            </button>
          ))}
        </div>
        {slot && v ? (
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">
              Meilleur créneau : {isToday ? '' : 'demain '}
              {hh(slot.start)} – {hh(slot.end)}
            </span>
            <span className={cn('block text-xs', v.tone === 'good' ? 'text-green-500' : v.tone === 'warn' ? 'text-amber-500' : 'text-muted-foreground')}>
              {v.label} · {Math.round(Math.min(...slot.hours.map((h) => h.feels)))} à {Math.round(Math.max(...slot.hours.map((h) => h.feels)))}° ressentis · pluie {Math.max(...slot.hours.map((h) => h.rainProb))} %
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Pas de créneau en journée d’ici demain.</p>
        )}
      </div>
    </section>
  )
}
