import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bluetooth, BluetoothOff, Heart, Loader2, MapPin, Pause, Play, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { SportOptions } from '@/components/ui/sport-options'
import { FormAlert } from '@/components/auth/form-alert'
import { RouteMap } from '@/components/dashboard/route-map'
import { calculateTSS } from '@/lib/training/metrics'
import { linkPlannedWorkout } from '@/lib/training/planned'
import { sportFamily, sportInfo, type SportKey } from '@/lib/sports'
import {
  addFix, addHeartRate, currentSpeed, heartRateStats, loadSession, movingSeconds, newSession, parseHeartRate, pause, resume, saveSession, toTelemetry,
  type LiveSession,
} from '@/lib/live/recorder'
import { cn } from '@/lib/utils'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

// --- APIs navigateur non typées par TypeScript (Web Bluetooth, Wake Lock) ---
type BtChar = EventTarget & { value?: DataView; startNotifications(): Promise<unknown> }
type BtDevice = EventTarget & { name?: string; gatt?: { connect(): Promise<{ getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BtChar> }> }>; disconnect(): void } }
type Bluetooth = { requestDevice(o: unknown): Promise<BtDevice> }
type WakeLock = { request(t: 'screen'): Promise<{ release(): Promise<void> }> }
const nav = navigator as Navigator & { bluetooth?: Bluetooth; wakeLock?: WakeLock }

const clock = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`
}
const pace = (ms: number | null) => (ms && ms > 0.3 ? clock(1000 / ms) : '–:––')
const kmh = (ms: number | null) => (ms != null ? (ms * 3.6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '–')
const partOfDay = (d: Date) => { const h = d.getHours(); return h < 11 ? 'du matin' : h < 14 ? 'du midi' : h < 18 ? 'de l’après-midi' : 'du soir' }

export function RecordPage() {
  const user = useUser()
  const navigate = useNavigate()
  const { data: profile } = useData(async () => (await supabase.from('profiles').select('ftp, hr_rest, lactate_threshold_hr').eq('id', user.id).single()).data, [user.id])
  const [session, setSession] = useState<LiveSession | null>(() => loadSession())
  const [sport, setSport] = useState<SportKey>((session?.sport as SportKey) ?? 'run')
  const [now, setNow] = useState(() => Date.now())
  const [gps, setGps] = useState<{ accuracy: number } | { error: string } | null>(null)
  const [hr, setHr] = useState<number | null>(null)
  const [hrDevice, setHrDevice] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const hrRef = useRef<number | null>(null)
  const deviceRef = useRef<BtDevice | null>(null)

  // Toute modification de séance est sauvegardée immédiatement (survit à la fermeture de l'app)
  const update = useCallback((fn: (s: LiveSession) => LiveSession) => {
    setSession((s) => {
      if (!s) return s
      const next = fn(s)
      if (next !== s) saveSession(next)
      return next
    })
  }, [])

  const running = session?.status === 'running'
  const useGps = sportInfo(session?.sport ?? sport).gps

  // Chronomètre
  const active = !!session
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])

  // GPS : suivi continu tant qu'une séance d'extérieur est en cours
  useEffect(() => {
    if (!session || !useGps || finishing) return
    if (!('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setGps({ accuracy: Math.round(p.coords.accuracy) })
        update((s) => addFix(s, { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, altitude: p.coords.altitude, at: p.timestamp || Date.now() }, hrRef.current))
      },
      (e) => setGps({ error: e.code === 1 ? 'Accès à la position refusé : autorisez-le dans les réglages du téléphone.' : 'Recherche du signal GPS…' }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [!!session, useGps, finishing, update]) // eslint-disable-line react-hooks/exhaustive-deps

  // Écran maintenu allumé pendant l'enregistrement (sinon le GPS s'arrête quand l'écran se verrouille)
  useEffect(() => {
    if (!running || !nav.wakeLock) return
    let lock: { release(): Promise<void> } | null = null
    const acquire = () => nav.wakeLock!.request('screen').then((l) => (lock = l)).catch(() => {})
    acquire()
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [running])

  // FC seule pour les sports sans GPS : échantillonnée à la réception des mesures Bluetooth
  const hrOnlyRef = useRef(false)
  useEffect(() => {
    hrOnlyRef.current = !useGps
  }, [useGps])

  useEffect(() => () => deviceRef.current?.gatt?.disconnect(), [])

  const connectHr = async () => {
    try {
      const device = await nav.bluetooth!.requestDevice({ filters: [{ services: ['heart_rate'] }] })
      const server = await device.gatt!.connect()
      const ch = await (await server.getPrimaryService('heart_rate')).getCharacteristic('heart_rate_measurement')
      ch.addEventListener('characteristicvaluechanged', () => {
        const v = ch.value ? parseHeartRate(ch.value) : null
        hrRef.current = v
        setHr(v)
        if (v && hrOnlyRef.current) update((s) => addHeartRate(s, v))
      })
      device.addEventListener('gattserverdisconnected', () => {
        hrRef.current = null
        setHr(null)
        setHrDevice(null)
      })
      await ch.startNotifications()
      deviceRef.current = device
      setHrDevice(device.name || 'Ceinture cardio')
    } catch {
      // Fenêtre fermée par l'utilisateur ou appareil incompatible : rien à faire
    }
  }

  const start = () => {
    const s = newSession(sport)
    saveSession(s)
    setSession(s)
    setNow(Date.now())
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Enregistrer une séance</h1>
        <SelectField id="sport" label="Sport" value={sport} onChange={(e) => setSport(e.target.value as SportKey)}>
          <SportOptions />
        </SelectField>
        <HrButton device={hrDevice} hr={hr} onConnect={connectHr} />
        <Button size="lg" className="w-full h-16 text-lg rounded-full" onClick={start}>
          <Play className="size-6" /> Démarrer
        </Button>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          {sportInfo(sport).gps ? (
            <>
              <li>Autorisez l’accès à la position quand le téléphone le demande.</li>
              <li>L’écran reste allumé pendant l’enregistrement : <strong className="text-foreground">ne le verrouillez pas et restez dans l’application</strong>, sinon le téléphone coupe le GPS (surtout sur iPhone).</li>
            </>
          ) : (
            <li>Sport en salle : chronomètre (et fréquence cardiaque si une ceinture est connectée), sans GPS.</li>
          )}
          <li>Si l’application se ferme, la séance reprend où elle en était à la réouverture.</li>
        </ul>
      </div>
    )
  }

  const seconds = movingSeconds(session, Math.max(now, session.lastFix?.at ?? 0))
  const speed = running ? currentSpeed(session) : null
  const avgSpeed = seconds > 0 ? session.distance / seconds : null
  const isRun = sportFamily(session.sport) === 'run'
  const route = session.points.filter((p) => p.lat != null).map((p) => [p.lat!, p.lng!] as [number, number])
  const step = Math.max(1, Math.ceil(route.length / 300))
  const shownRoute = route.filter((_, i) => i % step === 0 || i === route.length - 1)

  if (finishing && profile) {
    return <FinishForm session={session} profile={profile} userId={user.id} onBack={() => setFinishing(false)} onDiscard={() => { saveSession(null); deviceRef.current?.gatt?.disconnect(); setSession(null); setFinishing(false) }} onSaved={(id) => { saveSession(null); deviceRef.current?.gatt?.disconnect(); navigate(`/dashboard/activities/${id}`) }} />
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{sportInfo(session.sport).label}</p>
        <p className={cn('text-xs rounded-full px-2 py-1', running ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}>
          {running ? '● Enregistrement' : 'En pause'}
        </p>
      </div>

      <div className="text-center">
        <p className="text-6xl font-bold tabular-nums tracking-tight">{clock(seconds)}</p>
        <p className="text-sm text-muted-foreground">Temps en mouvement</p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        {useGps && <Stat label="Distance" value={(session.distance / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="km" />}
        {useGps && (isRun ? <Stat label="Allure actuelle" value={pace(speed)} unit="/km" /> : <Stat label="Vitesse" value={kmh(speed)} unit="km/h" />)}
        {useGps && (isRun ? <Stat label="Allure moyenne" value={pace(avgSpeed)} unit="/km" /> : <Stat label="Vitesse moy." value={kmh(avgSpeed)} unit="km/h" />)}
        {useGps && <Stat label="Dénivelé +" value={String(Math.round(session.elevationGain))} unit="m" />}
        {hrDevice && <Stat label="Fréquence cardiaque" value={hr ? String(hr) : '–'} unit="bpm" accent />}
      </dl>

      {useGps && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          <MapPin className="size-3.5" />
          {!('geolocation' in navigator) ? 'GPS indisponible sur cet appareil.' : !gps ? 'Recherche du signal GPS…' : 'error' in gps ? gps.error : gps.accuracy > 30 ? `Signal GPS faible (± ${gps.accuracy} m)` : `GPS OK (± ${gps.accuracy} m)`}
        </p>
      )}
      {shownRoute.length >= 2 && (
        <div className="rounded-xl border bg-card p-2">
          <RouteMap route={shownRoute} />
        </div>
      )}
      {!hrDevice && <HrButton device={hrDevice} hr={hr} onConnect={connectHr} />}

      <div className="grid grid-cols-2 gap-3">
        {running ? (
          <Button size="lg" variant="outline" className="h-16 text-lg rounded-full" onClick={() => update((s) => pause(s))}>
            <Pause className="size-6" /> Pause
          </Button>
        ) : (
          <Button size="lg" className="h-16 text-lg rounded-full" onClick={() => update((s) => resume(s))}>
            <Play className="size-6" /> Reprendre
          </Button>
        )}
        <Button size="lg" variant="destructive" className="h-16 text-lg rounded-full" onClick={() => { update((s) => pause(s)); setFinishing(true) }}>
          <Square className="size-5" /> Terminer
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-2xl font-bold tabular-nums', accent && 'text-rose-400')}>
        {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </dd>
    </div>
  )
}

function HrButton({ device, hr, onConnect }: { device: string | null; hr: number | null; onConnect: () => void }) {
  if (device)
    return (
      <p className="flex items-center gap-2 text-sm">
        <Heart className="size-4 text-rose-400" /> {device} connectée {hr ? `· ${hr} bpm` : ''}
      </p>
    )
  if (!nav.bluetooth)
    return (
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <BluetoothOff className="size-4 shrink-0" /> Ceinture cardio : connexion Bluetooth possible avec Chrome sur Android (non autorisée par Apple sur iPhone). Vous pourrez saisir la FC moyenne à la fin.
      </p>
    )
  return (
    <Button variant="outline" className="w-full" onClick={onConnect}>
      <Bluetooth className="size-4" /> Connecter une ceinture cardio
    </Button>
  )
}

function FinishForm({ session, profile, userId, onBack, onDiscard, onSaved }: {
  session: LiveSession
  profile: { ftp: number; hr_rest: number; lactate_threshold_hr: number }
  userId: string
  onBack: () => void
  onDiscard: () => void
  onSaved: (id: string) => void
}) {
  const info = sportInfo(session.sport)
  const stats = heartRateStats(session)
  const [f, setF] = useState({ title: `${info.short} ${partOfDay(new Date(session.startedAt))}`, sport: session.sport as SportKey, rpe: '', hr: stats.avg ? String(stats.avg) : '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const seconds = Math.round(movingSeconds(session))
  const avgHr = Number(f.hr) || null
  const tss = calculateTSS({ durationSeconds: seconds, avgHr, hrRest: profile.hr_rest, lactateThresholdHr: profile.lactate_threshold_hr, rpe: Number(f.rpe) || null })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (seconds < 1) return setError('Séance trop courte pour être enregistrée.')
    setSaving(true)
    setError(null)
    const telemetry = toTelemetry(session)
    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id: userId,
        title: f.title.trim() || info.short,
        sport_type: f.sport,
        start_time: new Date(session.startedAt).toISOString(),
        duration_seconds: seconds,
        distance_meters: Math.round(session.distance),
        elevation_gain_meters: Math.round(session.elevationGain),
        avg_hr: avgHr,
        max_hr: stats.max ?? avgHr,
        rpe_score: Number(f.rpe) || null,
        athlete_notes: f.notes.trim() || null,
        tss: tss.tss,
        intensity_factor: tss.intensityFactor,
        source: 'live',
        raw_telemetry: telemetry.points.length ? telemetry : null,
      })
      .select('id, sport_type, start_time')
      .single()
    if (error || !data) {
      setSaving(false)
      return setError('Enregistrement impossible (réseau ?). La séance est conservée sur le téléphone : réessayez.')
    }
    await linkPlannedWorkout(supabase, data, userId)
    onSaved(data.id)
  }

  return (
    <form onSubmit={save} className="max-w-md mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Séance terminée</h1>
      {error && <FormAlert message={error} />}
      <dl className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Durée" value={clock(seconds)} unit="" />
        <Stat label="Distance" value={(session.distance / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} unit="km" />
        <Stat label="D+" value={String(Math.round(session.elevationGain))} unit="m" />
      </dl>
      <Field id="title" label="Titre" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} />
      <div className="grid grid-cols-2 gap-4">
        <SelectField id="sport" label="Sport" value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value as SportKey })}>
          <SportOptions />
        </SelectField>
        <SelectField id="rpe" label="Effort ressenti" value={f.rpe} onChange={(e) => setF({ ...f, rpe: e.target.value })}>
          <option value="">—</option>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1} / 10</option>
          ))}
        </SelectField>
      </div>
      <Field id="hr" label="FC moyenne (facultatif)" type="number" inputMode="numeric" value={f.hr} onChange={(e) => setF({ ...f, hr: e.target.value })} readOnly={!!stats.avg} />
      <TextareaField id="notes" label="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={2000} />
      <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          TSS estimé{' '}
          <span className="block text-xs">{tss.method === 'heart_rate' ? 'd’après la FC' : tss.method === 'rpe' ? 'd’après l’effort ressenti' : 'indiquez l’effort ressenti ou la FC'}</span>
        </p>
        <p className="text-3xl font-bold tabular-nums">{tss.tss}</p>
      </div>
      <Button type="submit" size="lg" className="w-full h-14 text-base" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer la séance
      </Button>
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>Retour</Button>
        <Button type="button" variant="ghost" className="text-destructive" onClick={() => confirm('Supprimer cette séance sans l’enregistrer ?') && onDiscard()}>
          <Trash2 className="size-4" /> Abandonner
        </Button>
      </div>
    </form>
  )
}
