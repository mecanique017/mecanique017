import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bluetooth, BluetoothOff, Flag, Heart, Loader2, MapPin, Pause, Play, Square, Trash2, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { SportOptions } from '@/components/ui/sport-options'
import { FormAlert } from '@/components/auth/form-alert'
import { LapTable } from '@/components/dashboard/lap-table'
import { calculateTSS } from '@/lib/training/metrics'
import { linkPlannedWorkout } from '@/lib/training/planned'
import { sportFamily, sportInfo, type SportKey } from '@/lib/sports'
import {
  addFix, addHeartRate, tick, currentLap, currentSpeed, defaultAutoPause, GOOD_ACCURACY_M, heartRateStats, loadSession, manualLap, movingSeconds, newSession,
  parseHeartRate, pause, resume, saveSession, toTelemetry, type Lap, type LiveSession,
} from '@/lib/live/recorder'
import { cn } from '@/lib/utils'
import { TrackMap } from '../components/TrackMap'
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
const km = (m: number) => (m / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const partOfDay = (d: Date) => { const h = d.getHours(); return h < 11 ? 'du matin' : h < 14 ? 'du midi' : h < 18 ? 'de l’après-midi' : 'du soir' }

// Réglages mémorisés sur le téléphone
const PREFS_KEY = 'endurance-live-prefs'
type Prefs = { voice: boolean; lapKm: string; autoPause: Record<string, boolean> }
const loadPrefs = (): Prefs => {
  try {
    return { voice: true, lapKm: 'auto', autoPause: {}, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
  } catch {
    return { voice: true, lapKm: 'auto', autoPause: {} }
  }
}

/** Annonce vocale (synthèse du téléphone, hors ligne). */
function say(text: string) {
  try {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'fr-FR'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    // Synthèse vocale indisponible : silencieux
  }
}
const spokenDuration = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.round(s % 60)
  return [h && `${h} heure${h > 1 ? 's' : ''}`, m && `${m} minute${m > 1 ? 's' : ''}`, sec && `${sec} seconde${sec > 1 ? 's' : ''}`].filter(Boolean).join(' ') || '0 seconde'
}
function lapAnnouncement(lap: Lap, s: LiveSession) {
  const run = sportFamily(s.sport) === 'run'
  const total = (s.distance / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
  const lapSpeed = lap.dist / Math.max(lap.time, 1)
  const effort = run ? `allure ${spokenDuration(1000 / lapSpeed)} au kilomètre` : `${Math.round(lapSpeed * 3.6)} kilomètres heure`
  return `Tour ${lap.n}. ${spokenDuration(lap.time)}, ${effort}${lap.hr ? `, cardio ${lap.hr}` : ''}. Total ${total} kilomètres.`
}

export function RecordPage() {
  const user = useUser()
  const navigate = useNavigate()
  const { data: profile } = useData(async () => (await supabase.from('profiles').select('ftp, hr_rest, lactate_threshold_hr').eq('id', user.id).single()).data, [user.id])
  const [session, setSession] = useState<LiveSession | null>(() => loadSession())
  const sessionRef = useRef<LiveSession | null>(session)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const prefsRef = useRef(prefs)
  const [sport, setSport] = useState<SportKey>((session?.sport as SportKey) ?? 'run')
  const [now, setNow] = useState(() => Date.now())
  const [gps, setGps] = useState<{ accuracy: number; at: number; lat: number; lng: number } | { error: string } | null>(null)
  const [gap, setGap] = useState<number | null>(null)
  const [hr, setHr] = useState<number | null>(null)
  const [hrDevice, setHrDevice] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const hrRef = useRef<number | null>(null)
  const hrOnlyRef = useRef(false)
  const deviceRef = useRef<BtDevice | null>(null)

  /** Source de vérité : la référence (lue par les rappels GPS/Bluetooth), sauvegardée à chaque changement. */
  const apply = useCallback((next: LiveSession | null) => {
    if (next === sessionRef.current) return
    sessionRef.current = next
    saveSession(next)
    setSession(next)
  }, [])

  const savePrefs = (p: Prefs) => {
    prefsRef.current = p
    setPrefs(p)
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(p))
    } catch {
      // stockage indisponible
    }
  }

  const running = session?.status === 'running'
  const useGps = sportInfo(session?.sport ?? sport).gps
  const autoPauseOn = prefs.autoPause[sport] ?? defaultAutoPause(sport)

  useEffect(() => {
    hrOnlyRef.current = !useGps
  }, [useGps])

  // Chronomètre (affichage)
  const active = !!session
  useEffect(() => {
    if (!active) return
    let last = Date.now()
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      // Pause auto sans nouvelle position (téléphone immobile) — seulement si l'appli tournait en continu,
      // pour ne pas confondre avec un écran verrouillé
      const s = sessionRef.current
      if (s && document.visibilityState === 'visible' && t - last < 3000) {
        const r = tick(s, t)
        if (r.event) {
          apply(r.session)
          navigator.vibrate?.(150)
          if (prefsRef.current.voice) say('Pause automatique')
        }
      }
      last = t
    }, 1000)
    return () => clearInterval(id)
  }, [active, apply])

  // GPS : allumé dès l'écran de départ (le signal s'affine avant de partir), suivi continu ensuite
  useEffect(() => {
    if (!useGps || finishing || !('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const at = p.timestamp || Date.now()
        setGps({ accuracy: Math.round(p.coords.accuracy), at, lat: p.coords.latitude, lng: p.coords.longitude })
        const s = sessionRef.current
        if (!s) return
        const r = addFix(s, { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, altitude: p.coords.altitude, at }, hrRef.current)
        apply(r.session)
        if (r.event?.type === 'lap') {
          navigator.vibrate?.([200, 100, 200])
          if (prefsRef.current.voice) say(lapAnnouncement(r.event.lap, r.session))
        } else if (r.event?.type === 'autopause') {
          navigator.vibrate?.(150)
          if (prefsRef.current.voice) say('Pause automatique')
        } else if (r.event?.type === 'autoresume') {
          navigator.vibrate?.(150)
          if (prefsRef.current.voice) say('Reprise')
        }
      },
      (e) => setGps({ error: e.code === 1 ? 'Accès à la position refusé : autorisez-le dans les réglages du téléphone (Safari → Position).' : 'Recherche du signal GPS…' }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [useGps, finishing, apply])

  // Écran maintenu allumé pendant l'enregistrement + détection d'une coupure (écran verrouillé, appli quittée)
  useEffect(() => {
    if (!active) return
    let lock: { release(): Promise<void> } | null = null
    const acquire = () => nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    acquire()
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      acquire()
      const s = sessionRef.current
      const last = s?.lastFix?.at
      if (s?.status === 'running' && last && Date.now() - last > 20000) setGap(Math.round((Date.now() - last) / 1000))
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])

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
        const s = sessionRef.current
        if (v && s && hrOnlyRef.current) apply(addHeartRate(s, v))
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
      // Fenêtre fermée par l'utilisateur ou appareil incompatible
    }
  }

  const start = () => {
    const lapEvery = prefs.lapKm === 'auto' ? undefined : prefs.lapKm === 'off' ? 0 : Number(prefs.lapKm) * 1000
    apply(newSession(sport, Date.now(), { lapEvery, autoPause: autoPauseOn }))
    setNow(Date.now())
    // La synthèse vocale d'iOS doit être déclenchée par un geste : première annonce au départ
    if (prefs.voice) say('C’est parti !')
  }

  const lap = () => {
    const s = sessionRef.current
    if (!s) return
    const r = manualLap(s)
    apply(r.session)
    navigator.vibrate?.(100)
    if (prefs.voice) say(lapAnnouncement(r.lap, r.session))
  }

  const gpsReady = gps && 'accuracy' in gps && gps.accuracy <= GOOD_ACCURACY_M
  const gpsLine = !('geolocation' in navigator)
    ? 'GPS indisponible sur cet appareil.'
    : !gps
      ? 'Recherche du signal GPS…'
      : 'error' in gps
        ? gps.error
        : gps.accuracy <= GOOD_ACCURACY_M
          ? `GPS prêt (± ${gps.accuracy} m)`
          : `Signal GPS en cours d’affinage (± ${gps.accuracy} m)…`

  // Tracé (≤ 2000 points affichés) et position pour la carte
  const points = session?.points
  const route = useMemo(() => {
    const r = (points ?? []).filter((p) => p.lat != null).map((p) => [p.lat!, p.lng!] as [number, number])
    const k = Math.max(1, Math.ceil(r.length / 2000))
    return k === 1 ? r : r.filter((_, i) => i % k === 0 || i === r.length - 1)
  }, [points])
  const position = gps && 'lat' in gps ? { lat: gps.lat, lng: gps.lng, accuracy: gps.accuracy } : null

  if (!session) {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <h1 className="text-2xl font-bold">Enregistrer une séance</h1>
        {useGps && <TrackMap route={[]} position={position} live className="h-64" />}
        <SelectField id="sport" label="Sport" value={sport} onChange={(e) => setSport(e.target.value as SportKey)}>
          <SportOptions />
        </SelectField>
        {useGps && (
          <p className={cn('flex items-center gap-2 rounded-lg border p-3 text-sm', gpsReady ? 'border-emerald-500/40 text-emerald-400' : 'text-muted-foreground')} aria-live="polite">
            <MapPin className="size-4 shrink-0" /> {gpsLine}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <SelectField id="lap" label="Tour automatique" value={prefs.lapKm} onChange={(e) => savePrefs({ ...prefs, lapKm: e.target.value })}>
            <option value="auto">{sportFamily(sport) === 'ride' ? '5 km' : sportFamily(sport) === 'swim' ? '100 m' : '1 km'} (conseillé)</option>
            <option value="0.4">400 m</option>
            <option value="1">1 km</option>
            <option value="2">2 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="off">Aucun</option>
          </SelectField>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Options</p>
            <label className="flex items-center gap-2 text-sm h-10">
              <input type="checkbox" className="size-4 accent-primary" checked={autoPauseOn} onChange={(e) => savePrefs({ ...prefs, autoPause: { ...prefs.autoPause, [sport]: e.target.checked } })} />
              Pause auto
            </label>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={prefs.voice} onChange={(e) => savePrefs({ ...prefs, voice: e.target.checked })} />
          Annonces vocales à chaque tour (temps, allure, cardio)
        </label>
        <HrButton device={hrDevice} hr={hr} onConnect={connectHr} />
        <Button size="lg" className="w-full h-16 text-lg rounded-full bg-orange-500 text-white hover:bg-orange-500/90" onClick={start}>
          <Play className="size-6 fill-current" /> {useGps && !gpsReady ? 'Démarrer quand même' : 'Démarrer'}
        </Button>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          {useGps ? (
            <>
              <li>Pour un tracé précis, attendez « GPS prêt » à découvert (pas sous un toit) avant de démarrer.</li>
              <li>L’écran reste allumé pendant l’enregistrement : <strong className="text-foreground">ne le verrouillez pas et restez dans l’application</strong>, sinon le téléphone coupe le GPS (limite des applications web, surtout sur iPhone).</li>
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
  const speed = currentSpeed(session)
  const avgSpeed = seconds > 0 ? session.distance / seconds : null
  const isRun = sportFamily(session.sport) === 'run'
  const cur = currentLap(session, Math.max(now, session.lastFix?.at ?? 0))

  if (finishing && profile) {
    return (
      <FinishForm
        session={session}
        profile={profile}
        userId={user.id}
        onBack={() => setFinishing(false)}
        onDiscard={() => { apply(null); deviceRef.current?.gatt?.disconnect(); setFinishing(false) }}
        onSaved={(id) => { apply(null); deviceRef.current?.gatt?.disconnect(); navigate(`/dashboard/activities/${id}`) }}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{sportInfo(session.sport).label}</p>
        <p className={cn('text-xs rounded-full px-2 py-1', running ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}>
          {running ? '● Enregistrement' : session.status === 'autopaused' ? 'Pause auto' : 'En pause'}
        </p>
      </div>

      {gap && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-amber-400" />
          <span>
            GPS interrompu pendant {spokenDuration(gap)} (écran verrouillé ou application quittée). Le tronçon manquant est compté en ligne droite.{' '}
            <button className="underline" onClick={() => setGap(null)}>OK</button>
          </span>
        </p>
      )}

      {useGps && <TrackMap route={route} position={position} live className="h-[42vh] min-h-64 -mx-4 rounded-none border-x-0 sm:mx-0 sm:rounded-xl sm:border-x" />}

      <div className="text-center">
        <p className="text-6xl font-bold tabular-nums tracking-tight">{clock(seconds)}</p>
        <p className="text-sm text-muted-foreground">Temps en mouvement</p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        {useGps && <Stat label="Distance" value={km(session.distance)} unit="km" big />}
        {useGps && (isRun ? <Stat label="Allure actuelle" value={pace(speed)} unit="/km" big /> : <Stat label="Vitesse" value={kmh(speed)} unit="km/h" big />)}
        {useGps && (isRun ? <Stat label="Allure moyenne" value={pace(avgSpeed)} unit="/km" /> : <Stat label="Vitesse moy." value={kmh(avgSpeed)} unit="km/h" />)}
        {useGps && <Stat label="Dénivelé +" value={String(Math.round(session.elevationGain))} unit="m" />}
        {hrDevice && <Stat label="Fréquence cardiaque" value={hr ? String(hr) : '–'} unit="bpm" accent />}
        {session.lapEvery > 0 || session.laps.length ? (
          <Stat label={`Tour ${cur.n}`} value={clock(cur.time)} unit={useGps ? `· ${km(cur.dist)} km` : ''} />
        ) : null}
      </dl>

      {useGps && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          <MapPin className="size-3.5" /> {gpsLine.replace('GPS prêt', 'GPS OK')}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {session.status === 'paused' ? (
          <Button size="lg" className="h-16 rounded-full bg-orange-500 text-white hover:bg-orange-500/90" onClick={() => apply(resume(session))} aria-label="Reprendre">
            <Play className="size-6 fill-current" />
          </Button>
        ) : (
          <Button size="lg" variant="outline" className="h-16 rounded-full" onClick={() => apply(pause(session))} aria-label="Pause">
            <Pause className="size-6" />
          </Button>
        )}
        <Button size="lg" variant="outline" className="h-16 rounded-full" onClick={lap} disabled={session.status !== 'running'} aria-label="Tour">
          <Flag className="size-5" /> Tour
        </Button>
        <Button size="lg" variant="destructive" className="h-16 rounded-full" onClick={() => { apply(pause(session)); setFinishing(true) }} aria-label="Terminer">
          <Square className="size-5 fill-current" />
        </Button>
      </div>

      <button className="flex items-center gap-1.5 text-xs text-muted-foreground" onClick={() => savePrefs({ ...prefs, voice: !prefs.voice })}>
        {prefs.voice ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />} Annonces vocales {prefs.voice ? 'activées' : 'désactivées'}
      </button>

      {session.laps.length > 0 && <LapTable laps={session.laps} sport={session.sport} />}
      {!hrDevice && <HrButton device={hrDevice} hr={hr} onConnect={connectHr} />}
    </div>
  )
}

function Stat({ label, value, unit, accent, big }: { label: string; value: string; unit: string; accent?: boolean; big?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3 min-w-0">
      <dt className="text-xs text-muted-foreground truncate">{label}</dt>
      <dd className={cn('font-bold tabular-nums truncate', big ? 'text-3xl' : 'text-2xl', accent && 'text-rose-400')}>
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
        <BluetoothOff className="size-4 shrink-0" /> Ceinture cardio : connexion Bluetooth possible avec Chrome sur Android (Apple ne l’autorise pas aux applications web sur iPhone). Vous pourrez saisir la FC moyenne à la fin.
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
        raw_telemetry: telemetry.points.length || telemetry.laps.length ? telemetry : null,
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
