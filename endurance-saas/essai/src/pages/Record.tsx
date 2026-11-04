import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BarChart3, Bluetooth, BluetoothOff, ChevronDown, Compass, Flag, Heart, Layers, Loader2, LocateFixed, Map as MapIcon, MapPin, Maximize2, Pause, Play, Settings, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react'
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
import { elevationFromProfile, fetchIgnElevations, refineDistance, resample, smoothedRoute, smoothTrack, withIgnAltitude } from '@/lib/live/refine'
import { cn } from '@/lib/utils'
import { TrackMap, type BaseLayer } from '../components/TrackMap'
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
type Prefs = { voice: boolean; lapKm: string; autoPause: Record<string, boolean>; layer: BaseLayer; heat: boolean; threeD: boolean; headingUp: boolean }
const DEFAULT_PREFS: Prefs = { voice: true, lapKm: 'auto', autoPause: {}, layer: 'plan', heat: true, threeD: false, headingUp: false }
const loadPrefs = (): Prefs => {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
  } catch {
    return DEFAULT_PREFS
  }
}

// --- Boussole (direction du téléphone) ---
type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number }
type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
/** iPhone : l'accès à la boussole doit être demandé lors d'un geste (bouton). */
async function requestCompass() {
  try {
    const ctor = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent
    if (ctor?.requestPermission) await ctor.requestPermission()
  } catch {
    // refus ou non pris en charge : la direction viendra du GPS en mouvement
  }
}
function useCompass() {
  const [heading, setHeading] = useState<number | null>(null)
  useEffect(() => {
    let last = 0
    const onEvt = (e: Event) => {
      const ev = e as OrientationEvt
      const h = ev.webkitCompassHeading ?? (ev.absolute && ev.alpha != null ? 360 - ev.alpha : null)
      const t = Date.now()
      if (h == null || t - last < 250) return // 4 mises à jour / s suffisent
      last = t
      setHeading(Math.round(h))
    }
    window.addEventListener('deviceorientationabsolute', onEvt)
    window.addEventListener('deviceorientation', onEvt)
    return () => {
      window.removeEventListener('deviceorientationabsolute', onEvt)
      window.removeEventListener('deviceorientation', onEvt)
    }
  }, [])
  return heading
}

const LAYERS: { key: BaseLayer; label: string; hint: string }[] = [
  { key: 'plan', label: 'Plan', hint: 'OpenStreetMap' },
  { key: 'satellite', label: 'Satellite', hint: 'Photos aériennes IGN (France)' },
  { key: 'topo', label: 'Topo', hint: 'Carte IGN (sentiers, relief)' },
]

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
  // « Mes passages » : tracés des 150 dernières séances (seule la colonne du tracé est lue)
  const { data: heatRows } = useData(async () => {
    const { data } = await supabase.from('activities').select('route:raw_telemetry->route').eq('user_id', user.id).not('raw_telemetry', 'is', null).order('start_time', { ascending: false }).limit(150)
    return (data ?? []).map((r) => r.route).filter((r): r is [number, number][] => Array.isArray(r) && r.length > 1) as [number, number][][]
  }, [user.id])
  const [session, setSession] = useState<LiveSession | null>(() => loadSession())
  const sessionRef = useRef<LiveSession | null>(session)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const prefsRef = useRef(prefs)
  const [sport, setSport] = useState<SportKey>((session?.sport as SportKey) ?? 'run')
  const [now, setNow] = useState(() => Date.now())
  const [gps, setGps] = useState<{ accuracy: number; at: number; lat: number; lng: number; heading: number | null; speed: number | null } | { error: string } | null>(null)
  const [gap, setGap] = useState<number | null>(null)
  const [hr, setHr] = useState<number | null>(null)
  const [hrDevice, setHrDevice] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [follow, setFollow] = useState(true)
  const [panel, setPanel] = useState<'none' | 'settings' | 'layers'>('none')
  const [dataView, setDataView] = useState(false)
  const compass = useCompass()
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

  // Chronomètre (affichage) + pause auto sans nouvelle position
  const active = !!session
  useEffect(() => {
    if (!active) return
    let last = Date.now()
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
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
        setGps({ accuracy: Math.round(p.coords.accuracy), at, lat: p.coords.latitude, lng: p.coords.longitude, heading: p.coords.heading, speed: p.coords.speed })
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
      (e) => setGps({ error: e.code === 1 ? 'Position refusée : Réglages → Confidentialité → Service de localisation → Safari → « Lorsque l’app est active ».' : 'Recherche du signal GPS…' }),
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
    setFollow(true)
    setPanel('none')
    requestCompass()
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
        : gps.accuracy > 500
          ? 'Position approximative : Réglages → Confidentialité → Service de localisation → Safari → activez « Position exacte »'
          : gps.accuracy <= GOOD_ACCURACY_M
          ? `GPS prêt · ± ${gps.accuracy} m`
          : `Signal GPS faible · ± ${gps.accuracy} m`

  // Tracé (≤ 2000 points affichés) et position pour la carte
  const points = session?.points
  const route = useMemo(() => {
    const r = (points ?? []).filter((p) => p.lat != null).map((p) => [p.lat!, p.lng!] as [number, number])
    const k = Math.max(1, Math.ceil(r.length / 2000))
    return k === 1 ? r : r.filter((_, i) => i % k === 0 || i === r.length - 1)
  }, [points])
  // Direction : GPS en mouvement (fiable), sinon boussole du téléphone
  const gpsHeading = gps && 'lat' in gps && gps.heading != null && Number.isFinite(gps.heading) && (gps.speed ?? 0) > 1 ? gps.heading : null
  const heading = gpsHeading ?? compass
  const position = useMemo(
    () => (gps && 'lat' in gps ? { lat: gps.lat, lng: gps.lng, accuracy: gps.accuracy, heading } : null),
    [gps, heading],
  )

  if (finishing && session && profile) {
    return (
      <FullScreen>
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-background">
          <FinishForm
            session={session}
            profile={profile}
            userId={user.id}
            onBack={() => setFinishing(false)}
            onDiscard={() => { apply(null); deviceRef.current?.gatt?.disconnect(); setFinishing(false) }}
            onSaved={(id) => { apply(null); deviceRef.current?.gatt?.disconnect(); navigate(`/dashboard/activities/${id}`) }}
          />
        </div>
      </FullScreen>
    )
  }

  const t = session ? movingSeconds(session, Math.max(now, session.lastFix?.at ?? 0)) : 0
  const speed = session ? currentSpeed(session) : null
  const avgSpeed = session && t > 0 ? session.distance / t : null
  const isRun = sportFamily(session?.sport ?? sport) === 'run'
  const cur = session ? currentLap(session, Math.max(now, session.lastFix?.at ?? 0)) : null
  const showMap = useGps && !dataView
  const roundBtn = 'flex size-12 items-center justify-center rounded-full bg-neutral-900/90 text-white shadow-lg backdrop-blur active:scale-95'

  return (
    <FullScreen>
      {/* ---------- Zone carte (ou données en grand) ---------- */}
      <div className="relative flex-1 min-h-0">
        {showMap ? (
          <TrackMap
            route={route}
            position={position}
            live
            follow={follow}
            onUserPan={() => setFollow(false)}
            layer={prefs.layer}
            heat={prefs.heat ? heatRows ?? undefined : undefined}
            threeD={prefs.threeD}
            headingUp={prefs.headingUp}
            className="absolute inset-0 rounded-none border-0"
          />
        ) : session ? (
          <DataView session={session} seconds={t} speed={speed} avgSpeed={avgSpeed} isRun={isRun} useGps={useGps} hr={hrDevice ? hr : null} cur={cur} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background p-6 text-center text-muted-foreground">
            {sportInfo(sport).label} : sport sans GPS, chronomètre{nav.bluetooth ? ' et fréquence cardiaque' : ''}.
          </div>
        )}

        {/* Haut gauche : quitter (avant départ) ou basculer carte / données */}
        <div className="absolute left-3 top-3 flex flex-col gap-3">
          {!session ? (
            <button className={roundBtn} onClick={() => navigate('/dashboard')} aria-label="Fermer">
              <ChevronDown className="size-6" />
            </button>
          ) : useGps ? (
            <button className={roundBtn} onClick={() => setDataView((v) => !v)} aria-label={dataView ? 'Afficher la carte' : 'Afficher les données'}>
              {dataView ? <MapIcon className="size-5" /> : <BarChart3 className="size-5" />}
            </button>
          ) : null}
        </div>

        {/* Haut : état GPS */}
        {useGps && (
          <p className={cn('absolute left-1/2 top-4 -translate-x-1/2 flex max-w-[calc(100%-8rem)] items-center gap-1.5 rounded-full text-center px-3 py-1.5 text-xs font-medium shadow-lg', gpsReady ? 'bg-emerald-600 text-white' : 'bg-neutral-900/90 text-white')} aria-live="polite">
            <MapPin className="size-3.5" /> {session?.status === 'autopaused' ? 'Pause auto' : session?.status === 'paused' ? 'En pause' : gpsLine}
          </p>
        )}

        {/* Haut droite : réglages + orientation */}
        <div className="absolute right-3 top-3 flex flex-col gap-3">
          <button className={roundBtn} onClick={() => setPanel(panel === 'settings' ? 'none' : 'settings')} aria-label="Réglages">
            <Settings className="size-5" />
          </button>
          {showMap && (
            <button
              className={cn(roundBtn, prefs.headingUp && 'bg-white text-neutral-900')}
              onClick={() => { requestCompass(); savePrefs({ ...prefs, headingUp: !prefs.headingUp }); setFollow(true) }}
              aria-label={prefs.headingUp ? 'Carte orientée nord' : 'Carte orientée dans ma direction'}
            >
              <Compass className="size-5" style={{ transform: `rotate(${prefs.headingUp && heading != null ? -heading : 0}deg)` }} />
            </button>
          )}
        </div>

        {/* Bas droite : fonds, 3D, recentrer */}
        {showMap && (
          <div className="absolute right-3 bottom-40 flex flex-col gap-3">
            <button className={roundBtn} onClick={() => setPanel(panel === 'layers' ? 'none' : 'layers')} aria-label="Fonds de carte">
              <Layers className="size-5" />
            </button>
            <button className={cn(roundBtn, 'text-sm font-bold', prefs.threeD && 'bg-white text-neutral-900')} onClick={() => savePrefs({ ...prefs, threeD: !prefs.threeD })} aria-label="Vue 3D">
              3D
            </button>
            <button className={cn(roundBtn, follow && 'text-sky-400')} onClick={() => { setFollow(true); requestCompass() }} aria-label="Recentrer sur ma position">
              <LocateFixed className="size-5" />
            </button>
          </div>
        )}

        {gap && (
          <div role="alert" className="absolute inset-x-3 top-20 flex items-start gap-2 rounded-xl bg-amber-500 p-3 text-sm text-neutral-950 shadow-lg">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="flex-1">GPS interrompu {spokenDuration(gap)} (écran verrouillé ou appli quittée) : tronçon compté en ligne droite.</span>
            <button onClick={() => setGap(null)} aria-label="Fermer l’alerte"><X className="size-4" /></button>
          </div>
        )}

        {/* Bandeau de données compact (sur la carte) */}
        {showMap && session && (
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-neutral-950/95 p-3 text-white shadow-xl">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>{sportInfo(session.sport).label}{hrDevice && hr ? ` · ♥ ${hr} bpm` : ''}</span>
              <button onClick={() => setDataView(true)} aria-label="Agrandir les données"><Maximize2 className="size-4" /></button>
            </div>
            <div className="mt-1 grid grid-cols-3 items-end text-center">
              <Mini value={clock(t)} label="Temps" />
              <Mini value={isRun ? pace(speed) : kmh(speed)} label={isRun ? 'Allure (/km)' : 'Vitesse (km/h)'} big />
              <Mini value={km(session.distance)} label="Distance (km)" />
            </div>
          </div>
        )}

        {/* Panneaux : réglages / fonds de carte */}
        {panel !== 'none' && (
          <div className="absolute inset-x-3 top-16 z-10 max-h-[70%] overflow-y-auto rounded-2xl bg-background p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{panel === 'layers' ? 'Carte' : 'Réglages'}</h2>
              <button onClick={() => setPanel('none')} aria-label="Fermer"><X className="size-5" /></button>
            </div>
            {panel === 'layers' ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {LAYERS.map((l) => (
                    <button key={l.key} onClick={() => savePrefs({ ...prefs, layer: l.key })} className={cn('rounded-xl border p-3 text-left', prefs.layer === l.key && 'border-orange-500 bg-orange-500/10')}>
                      <span className="block text-sm font-semibold">{l.label}</span>
                      <span className="block text-[11px] leading-tight text-muted-foreground">{l.hint}</span>
                    </button>
                  ))}
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={prefs.heat} onChange={(e) => savePrefs({ ...prefs, heat: e.target.checked })} />
                  <span>
                    Mes passages <span className="block text-xs text-muted-foreground">Vos anciens parcours en violet ({heatRows?.length ?? 0} séance{(heatRows?.length ?? 0) > 1 ? 's' : ''} avec tracé)</span>
                  </span>
                </label>
              </>
            ) : (
              <>
                {!session && (
                  <SelectField id="lap" label="Tour automatique" value={prefs.lapKm} onChange={(e) => savePrefs({ ...prefs, lapKm: e.target.value })}>
                    <option value="auto">{sportFamily(sport) === 'ride' ? '5 km' : sportFamily(sport) === 'swim' ? '100 m' : '1 km'} (conseillé)</option>
                    <option value="0.4">400 m</option>
                    <option value="1">1 km</option>
                    <option value="2">2 km</option>
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                    <option value="off">Aucun</option>
                  </SelectField>
                )}
                {!session && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-primary" checked={autoPauseOn} onChange={(e) => savePrefs({ ...prefs, autoPause: { ...prefs.autoPause, [sport]: e.target.checked } })} />
                    Pause automatique ({sportInfo(sport).short})
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-primary" checked={prefs.voice} onChange={(e) => savePrefs({ ...prefs, voice: e.target.checked })} />
                  {prefs.voice ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} Annonces vocales à chaque tour
                </label>
                <HrButton device={hrDevice} hr={hr} onConnect={connectHr} />
                <p className="text-xs text-muted-foreground">
                  L’écran reste allumé pendant l’enregistrement. Ne le verrouillez pas et restez dans l’application : sur iPhone, une application web ne reçoit plus le GPS écran éteint.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ---------- Bas : commandes ---------- */}
      <div className="shrink-0 rounded-t-2xl bg-neutral-950 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] text-white">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-700" aria-hidden />
        {!session ? (
          <div className="space-y-3">
            <select
              aria-label="Sport"
              value={sport}
              onChange={(e) => setSport(e.target.value as SportKey)}
              className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-base text-white"
            >
              <SportOptions />
            </select>
            <button onClick={start} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#fc5200] text-lg font-semibold active:scale-[.98]">
              <Play className="size-6 fill-current" /> {useGps && !gpsReady ? 'Démarrer (GPS en recherche)' : 'Démarrer'}
            </button>
          </div>
        ) : session.status === 'paused' ? (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => apply(resume(session))} className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#fc5200] text-lg font-semibold">
              <Play className="size-6 fill-current" /> Reprendre
            </button>
            <button onClick={() => setFinishing(true)} className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-lg font-semibold text-neutral-950">
              <Square className="size-5 fill-current" /> Terminer
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={lap} disabled={session.status !== 'running'} className="flex size-14 shrink-0 items-center justify-center rounded-full bg-neutral-800 disabled:opacity-40" aria-label="Tour">
              <Flag className="size-5" />
            </button>
            <button onClick={() => apply(pause(session))} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-[#fc5200] text-lg font-semibold active:scale-[.98]">
              <Pause className="size-6 fill-current" /> Pause
            </button>
          </div>
        )}
      </div>
    </FullScreen>
  )
}

/** Plein écran au-dessus de l'en-tête de l'application (comme une appli native). */
function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex flex-col bg-black pt-[env(safe-area-inset-top)]">{children}</div>
}

function Mini({ value, label, big }: { value: string; label: string; big?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={cn('font-bold tabular-nums leading-none truncate', big ? 'text-4xl' : 'text-2xl')}>{value}</p>
      <p className="mt-1 text-[11px] text-neutral-400 truncate">{label}</p>
    </div>
  )
}

/** Vue « données » plein écran (comme l'écran de données d'une montre). */
function DataView({ session, seconds, speed, avgSpeed, isRun, useGps, hr, cur }: {
  session: LiveSession
  seconds: number
  speed: number | null
  avgSpeed: number | null
  isRun: boolean
  useGps: boolean
  hr: number | null
  cur: { n: number; time: number; dist: number } | null
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-background px-4 pt-20 pb-6 space-y-4">
      <div className="text-center">
        <p className="text-7xl font-bold tabular-nums tracking-tight">{clock(seconds)}</p>
        <p className="text-sm text-muted-foreground">Temps en mouvement</p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {useGps && <Stat label="Distance" value={km(session.distance)} unit="km" big />}
        {useGps && (isRun ? <Stat label="Allure actuelle" value={pace(speed)} unit="/km" big /> : <Stat label="Vitesse" value={kmh(speed)} unit="km/h" big />)}
        {useGps && (isRun ? <Stat label="Allure moyenne" value={pace(avgSpeed)} unit="/km" /> : <Stat label="Vitesse moy." value={kmh(avgSpeed)} unit="km/h" />)}
        {useGps && <Stat label="Dénivelé +" value={String(Math.round(session.elevationGain))} unit="m" />}
        {hr != null && <Stat label="Fréquence cardiaque" value={String(hr)} unit="bpm" accent />}
        {cur && (session.lapEvery > 0 || session.laps.length > 0) && <Stat label={`Tour ${cur.n}`} value={clock(cur.time)} unit={useGps ? `· ${km(cur.dist)} km` : ''} />}
      </dl>
      {session.laps.length > 0 && <LapTable laps={session.laps} sport={session.sport} />}
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
        <BluetoothOff className="size-4 shrink-0" /> Ceinture cardio : possible avec Chrome sur Android (Apple ne l’autorise pas aux applications web sur iPhone). Vous pourrez saisir la FC moyenne à la fin.
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

  // Affinage de fin de séance : lissage avant/arrière de tous les points + dénivelé sur le relief IGN
  const smoothed = useMemo(() => smoothTrack(session.raw ?? [], session.sport), [session])
  const distance = refineDistance(session.distance, smoothed)
  const [ign, setIgn] = useState<{ state: 'loading' | 'ok' | 'off'; profile?: { t: number; z: number }[]; gain?: number }>({ state: smoothed ? 'loading' : 'off' })
  useEffect(() => {
    if (!smoothed) return
    const ctrl = new AbortController()
    const pts = resample(smoothed.points, 15)
    fetchIgnElevations(pts, ctrl.signal).then((z) => {
      if (ctrl.signal.aborted) return
      if (!z) return setIgn({ state: 'off' })
      setIgn({ state: 'ok', profile: pts.map((p, i) => ({ t: p.t, z: z[i] })), gain: elevationFromProfile(z).gain })
    })
    return () => ctrl.abort()
  }, [smoothed])
  const elevation = ign.state === 'ok' ? ign.gain! : Math.round(session.elevationGain)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (seconds < 1) return setError('Séance trop courte pour être enregistrée.')
    setSaving(true)
    setError(null)
    const base = toTelemetry(session)
    const route = smoothedRoute(smoothed)
    const telemetry = {
      ...base,
      route: route.length > 1 ? route : base.route,
      points: ign.state === 'ok' ? withIgnAltitude(base.points, ign.profile!) : base.points,
      elevation_source: ign.state === 'ok' ? 'ign' : 'gps',
    }
    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id: userId,
        title: f.title.trim() || info.short,
        sport_type: f.sport,
        start_time: new Date(session.startedAt).toISOString(),
        duration_seconds: seconds,
        distance_meters: Math.round(distance),
        elevation_gain_meters: elevation,
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
        <Stat label="Distance" value={(distance / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} unit="km" />
        <Stat label="D+" value={String(elevation)} unit="m" />
      </dl>
      {smoothed && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Trace affinée sur {smoothed.points.length} points GPS.{' '}
          {ign.state === 'loading' ? 'Correction du dénivelé avec le relief IGN…' : ign.state === 'ok' ? `Dénivelé corrigé avec le relief IGN (GPS seul : ${Math.round(session.elevationGain)} m).` : 'Dénivelé calculé par le GPS (relief IGN indisponible : hors de France ou sans réseau).'}
        </p>
      )}
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
