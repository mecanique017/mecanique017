/**
 * Enregistrement d'une séance en direct (GPS du téléphone + ceinture cardio Bluetooth optionnelle).
 * Logique pure, sans React : l'état est un objet sérialisable, sauvegardé à chaque point
 * (localStorage) pour survivre à un rechargement ou à la fermeture de l'application.
 *
 * Traitement GPS :
 *  1. rejet des points imprécis (précision annoncée > 25 m) et des sauts impossibles ;
 *  2. filtre de Kalman position + vitesse (pondéré par la précision de chaque point) : tracé lissé,
 *     distance juste même quand le signal « tremble » (immeubles, forêt), vitesse instantanée stable ;
 *  3. pause automatique à l'arrêt (feu rouge, ravitaillement), reprise dès qu'on repart ;
 *  4. altitude lissée + seuil pour le dénivelé (l'altitude GPS brute bruite de ±10 m) ;
 *  5. tours automatiques (1 km par défaut) avec temps et allure de chaque tour.
 */
import type { TelemetryPoint } from '@/lib/fit/parse-fit'
import { sportFamily } from '@/lib/sports'

export interface LivePoint {
  t: number // secondes de temps en mouvement depuis le départ
  lat?: number
  lng?: number
  alt?: number
  hr?: number
}

// type (et non interface) : compatible avec le type Json de Supabase
export type Lap = {
  n: number
  t: number // temps en mouvement à la fin du tour (s)
  d: number // distance cumulée à la fin du tour (m)
  time: number // durée du tour (s)
  dist: number // longueur du tour (m)
  hr?: number // FC moyenne du tour
}

/** Filtre de Kalman « position + vitesse » par axe, en mètres dans un plan local. */
interface Axis {
  p: number // position (m)
  v: number // vitesse (m/s)
  pp: number // variance position
  pv: number // covariance
  vv: number // variance vitesse
}
interface Kalman {
  lat0: number
  lng0: number
  x: Axis
  y: Axis
  at: number // epoch ms
}

export interface LiveSession {
  version: 2
  sport: string
  startedAt: number // epoch ms
  status: 'running' | 'paused' | 'autopaused'
  /** Temps en mouvement accumulé avant la dernière reprise (ms) */
  movingMs: number
  /** Instant de la dernière reprise (epoch ms), null en pause */
  resumedAt: number | null
  distance: number // m
  elevationGain: number // m
  elevationLoss: number // m
  altSmooth: number | null
  altRef: number | null
  points: LivePoint[]
  laps: Lap[]
  lapEvery: number // m (0 = pas de tours automatiques)
  autoPause: boolean
  /** Dernière position filtrée retenue pour la distance */
  lastFix: { lat: number; lng: number; at: number } | null
  kalman: Kalman | null
  /** Depuis quand la vitesse filtrée est sous le seuil d'arrêt (ou au-dessus du seuil de reprise) */
  still: { since: number; lat: number; lng: number } | null
  maxSpeed: number // m/s
}

const STORAGE_KEY = 'endurance-live-session'
export const GOOD_ACCURACY_M = 15 // signal de bonne qualité (affichage « GPS prêt »)
const MAX_ACCURACY_M = 25 // au-delà, le point est rejeté
const MAX_SPEED_MS = 45 // ~160 km/h : au-delà c'est un saut GPS
const ALT_THRESHOLD_M = 5 // seuil d'hystérésis du dénivelé (sur altitude lissée)
const HR_EVERY_S = 5

/** Réglages par sport : accélération plausible (m/s², bruit du modèle), vitesses d'arrêt et de reprise (m/s). */
function tuning(sport: string) {
  const fam = sportFamily(sport)
  if (fam === 'ride') return { q: 1.5, stop: 1.0, resume: 2.0 }
  if (fam === 'swim') return { q: 0.3, stop: 0.15, resume: 0.35 }
  if (sport === 'walk' || sport === 'hike') return { q: 0.5, stop: 0.3, resume: 0.6 }
  if (fam === 'run') return { q: 0.8, stop: 0.5, resume: 1.0 }
  return { q: 1.2, stop: 0.5, resume: 1.0 }
}

/** Pause auto activée par défaut sauf marche, rando et natation (arrêts lents, signal souvent faible). */
export const defaultAutoPause = (sport: string) => !['walk', 'hike', 'swim', 'open_water'].includes(sport)

export function newSession(sport: string, now = Date.now(), options: { lapEvery?: number; autoPause?: boolean } = {}): LiveSession {
  return {
    version: 2,
    sport,
    startedAt: now,
    status: 'running',
    movingMs: 0,
    resumedAt: now,
    distance: 0,
    elevationGain: 0,
    elevationLoss: 0,
    altSmooth: null,
    altRef: null,
    points: [],
    laps: [],
    lapEvery: options.lapEvery ?? (sportFamily(sport) === 'ride' ? 5000 : sportFamily(sport) === 'swim' ? 100 : 1000),
    autoPause: options.autoPause ?? defaultAutoPause(sport),
    lastFix: null,
    kalman: null,
    still: null,
    maxSpeed: 0,
  }
}

export const movingSeconds = (s: LiveSession, now = Date.now()) => (s.movingMs + (s.status === 'running' && s.resumedAt ? Math.max(0, now - s.resumedAt) : 0)) / 1000

function stopClock(s: LiveSession, at: number): Pick<LiveSession, 'movingMs' | 'resumedAt'> {
  return { movingMs: s.movingMs + (s.resumedAt ? Math.max(0, at - s.resumedAt) : 0), resumedAt: null }
}

export function pause(s: LiveSession, now = Date.now()): LiveSession {
  if (s.status === 'paused') return s
  return { ...s, ...(s.status === 'running' ? stopClock(s, now) : {}), status: 'paused', still: null }
}

export function resume(s: LiveSession, now = Date.now()): LiveSession {
  if (s.status !== 'paused') return s
  // lastFix effacé : la distance parcourue pendant la pause n'est pas comptée
  return { ...s, status: 'running', resumedAt: now, lastFix: null, kalman: null, still: null }
}

const R = 6_371_000
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const M_PER_DEG = 111_320

function axisStep(a: Axis, z: number, r: number, dt: number, q: number): Axis {
  // Prédiction (vitesse constante, accélération aléatoire d'écart-type q)
  const p = a.p + a.v * dt
  const q2 = q * q
  const pp = a.pp + 2 * dt * a.pv + dt * dt * a.vv + (q2 * dt ** 4) / 4
  const pv = a.pv + dt * a.vv + (q2 * dt ** 3) / 2
  const vv = a.vv + q2 * dt * dt
  // Correction par la mesure z (variance r)
  const sInv = 1 / (pp + r)
  const kp = pp * sInv
  const kv = pv * sInv
  const innov = z - p
  return { p: p + kp * innov, v: a.v + kv * innov, pp: (1 - kp) * pp, pv: (1 - kp) * pv, vv: vv - kv * pv }
}

function kalmanStep(k: Kalman | null, lat: number, lng: number, accuracy: number, at: number, q: number): Kalman {
  const r = Math.max(accuracy, 3) ** 2
  if (!k) {
    const axis = { p: 0, v: 0, pp: r, pv: 0, vv: 25 }
    return { lat0: lat, lng0: lng, x: axis, y: { ...axis }, at }
  }
  const dt = Math.min(Math.max(0, (at - k.at) / 1000), 60)
  const kx = Math.cos((k.lat0 * Math.PI) / 180) * M_PER_DEG
  return {
    ...k,
    x: axisStep(k.x, (lng - k.lng0) * kx, r, dt, q),
    y: axisStep(k.y, (lat - k.lat0) * M_PER_DEG, r, dt, q),
    at,
  }
}

const kalmanLatLng = (k: Kalman) => ({ lat: k.lat0 + k.y.p / M_PER_DEG, lng: k.lng0 + k.x.p / (Math.cos((k.lat0 * Math.PI) / 180) * M_PER_DEG) })
const kalmanSpeed = (k: Kalman) => Math.hypot(k.x.v, k.y.v)
const stopped = (k: Kalman): Kalman => ({ ...k, x: { ...k.x, v: 0 }, y: { ...k.y, v: 0 } })

/**
 * À appeler chaque seconde tant que l'application est au premier plan : à l'arrêt, beaucoup de
 * téléphones n'envoient plus de position. Sans nouvelle position depuis 8 s → pause auto.
 */
export function tick(s: LiveSession, now = Date.now()): FixResult {
  if (!s.autoPause || s.status !== 'running' || !s.kalman || !s.lastFix) return { session: s }
  if (now - s.kalman.at < 8000) return { session: s }
  const since = Math.max(s.kalman.at, s.resumedAt ?? 0)
  return { session: { ...s, ...stopClock(s, since), status: 'autopaused', still: null, kalman: stopped(s.kalman) }, event: { type: 'autopause' } }
}

export type FixResult = { session: LiveSession; event?: { type: 'lap'; lap: Lap } | { type: 'autopause' } | { type: 'autoresume' } }

/** Ajoute une position GPS. Renvoie la nouvelle séance et, le cas échéant, un événement (tour, pause auto). */
export function addFix(
  s: LiveSession,
  fix: { lat: number; lng: number; accuracy: number; altitude?: number | null; at: number },
  hr?: number | null,
): FixResult {
  if (s.status === 'paused' || !(fix.accuracy <= MAX_ACCURACY_M)) return { session: s }
  const { q, stop, resume: resumeSpeed } = tuning(s.sport)

  // Saut impossible par rapport à la position filtrée : ignoré (le filtre n'est pas contaminé)
  if (s.kalman) {
    const dt = (fix.at - s.kalman.at) / 1000
    const prev = kalmanLatLng(s.kalman)
    const d = haversine(prev.lat, prev.lng, fix.lat, fix.lng)
    if (dt <= 0 || (d - fix.accuracy) / dt > MAX_SPEED_MS) return { session: s }
  }
  const kalman = kalmanStep(s.kalman, fix.lat, fix.lng, fix.accuracy, fix.at, q)
  const pos = kalmanLatLng(kalman)
  const speed = s.kalman ? kalmanSpeed(kalman) : 0
  let next: LiveSession = { ...s, kalman }
  let event: FixResult['event']

  // --- Pause / reprise automatiques sur la vitesse filtrée (avec hystérésis) ---
  if (s.autoPause && s.kalman) {
    if (next.status === 'autopaused') {
      if (speed < resumeSpeed) return { session: { ...next, still: null } }
      const since = next.still?.since ?? fix.at
      if (fix.at - since < 2000) return { session: { ...next, still: next.still ?? { since, ...pos } } }
      next = { ...next, status: 'running', resumedAt: since, still: null, lastFix: { ...pos, at: fix.at } }
      event = { type: 'autoresume' }
    } else if (speed < stop + Math.min(Math.sqrt((kalman.x.vv + kalman.y.vv) / 2), stop)) {
      const still = next.still ?? { since: fix.at, ...pos }
      const dt = (fix.at - still.since) / 1000
      const sigma = Math.sqrt((kalman.x.pp + kalman.y.pp) / 2)
      // Double condition : vitesse faible ET quasi aucun déplacement depuis le début de l'arrêt présumé
      if (haversine(still.lat, still.lng, pos.lat, pos.lng) > stop * dt + 2 * sigma + 2) next = { ...next, still: { since: fix.at, ...pos } }
      else if (dt >= 6) {
        // Arrêté depuis 6 s : le chrono s'arrête au début de l'immobilité
        return { session: { ...next, ...stopClock(next, still.since), status: 'autopaused', still: null, kalman: stopped(kalman) }, event: { type: 'autopause' } }
      } else next = { ...next, still }
    } else if (next.still) next = { ...next, still: null }
  }

  // --- Distance sur positions filtrées ---
  const t = Math.round(movingSeconds(next, fix.at))
  let distance = next.distance
  let lastFix = next.lastFix
  if (!lastFix) lastFix = { ...pos, at: fix.at }
  else {
    // Pas minimal selon l'incertitude restante : le « tremblement » résiduel n'ajoute pas de distance
    const sigma = Math.sqrt((kalman.x.pp + kalman.y.pp) / 2)
    const d = haversine(lastFix.lat, lastFix.lng, pos.lat, pos.lng)
    if (d >= Math.max(4, 2.5 * sigma)) {
      distance += d
      lastFix = { ...pos, at: fix.at }
    }
  }
  const maxSpeed = Math.max(next.maxSpeed, next.points.length > 10 ? speed : 0)

  // --- Dénivelé : altitude lissée (moyenne exponentielle) + hystérésis ---
  let { elevationGain, elevationLoss, altSmooth, altRef } = next
  const alt = fix.altitude != null && Number.isFinite(fix.altitude) ? fix.altitude : null
  if (alt != null) {
    altSmooth = altSmooth == null ? alt : altSmooth + 0.05 * (alt - altSmooth)
    if (altRef == null) altRef = altSmooth
    else if (altSmooth - altRef >= ALT_THRESHOLD_M) {
      elevationGain += altSmooth - altRef
      altRef = altSmooth
    } else if (altRef - altSmooth >= ALT_THRESHOLD_M) {
      elevationLoss += altRef - altSmooth
      altRef = altSmooth
    }
  }

  const point: LivePoint = { t, lat: round(pos.lat, 6), lng: round(pos.lng, 6) }
  if (altSmooth != null) point.alt = Math.round(altSmooth)
  if (hr) point.hr = hr
  const points = [...next.points, point]

  // --- Tours automatiques ---
  let laps = next.laps
  if (next.lapEvery > 0) {
    const lastLap = laps[laps.length - 1]
    const done = lastLap?.d ?? 0
    if (distance - done >= next.lapEvery) {
      const lapStart = lastLap?.t ?? 0
      const hrs = points.filter((p) => p.t > lapStart && p.hr).map((p) => p.hr!)
      const lap: Lap = { n: laps.length + 1, t, d: Math.round(done + next.lapEvery), time: t - lapStart, dist: next.lapEvery }
      if (hrs.length) lap.hr = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)
      laps = [...laps, lap]
      event = { type: 'lap', lap }
    }
  }

  return { session: { ...next, distance, maxSpeed, lastFix, elevationGain, elevationLoss, altSmooth, altRef, points, laps }, event }
}

/** FC seule (sport sans GPS ou GPS indisponible) : un point toutes les 5 s. */
export function addHeartRate(s: LiveSession, hr: number, now = Date.now()): LiveSession {
  if (s.status !== 'running' || !hr) return s
  const t = Math.round(movingSeconds(s, now))
  const last = s.points[s.points.length - 1]
  if (last && t - last.t < HR_EVERY_S) return s
  return { ...s, points: [...s.points, { t, hr }] }
}

/** Tour manuel (bouton « Tour ») : utile en fractionné. */
export function manualLap(s: LiveSession, now = Date.now()): { session: LiveSession; lap: Lap } {
  const t = Math.round(movingSeconds(s, now))
  const last = s.laps[s.laps.length - 1]
  const hrs = s.points.filter((p) => p.t > (last?.t ?? 0) && p.hr).map((p) => p.hr!)
  const lap: Lap = { n: s.laps.length + 1, t, d: Math.round(s.distance), time: Math.max(0, t - (last?.t ?? 0)), dist: Math.round(s.distance - (last?.d ?? 0)) }
  if (hrs.length) lap.hr = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)
  // Les tours automatiques repartent de ce tour manuel
  return { session: { ...s, laps: [...s.laps, lap] }, lap }
}

/** Vitesse actuelle (m/s) : vitesse estimée par le filtre (repli : 10 dernières secondes). */
export function currentSpeed(s: LiveSession): number | null {
  if (s.status !== 'running') return 0
  if (s.kalman && s.points.length > 3) return kalmanSpeed(s.kalman)
  const gps = s.points.filter((p) => p.lat != null)
  if (gps.length < 2) return null
  const last = gps[gps.length - 1]
  let i = gps.length - 2
  while (i > 0 && last.t - gps[i].t < 10) i--
  const first = gps[i]
  const dt = last.t - first.t
  if (dt <= 0) return null
  let d = 0
  for (let k = i + 1; k < gps.length; k++) d += haversine(gps[k - 1].lat!, gps[k - 1].lng!, gps[k].lat!, gps[k].lng!)
  return d / dt
}

export function heartRateStats(s: LiveSession) {
  const hrs = s.points.map((p) => p.hr).filter((h): h is number => !!h)
  if (!hrs.length) return { avg: null, max: null }
  return { avg: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length), max: Math.max(...hrs) }
}

/** Dernier tour en cours (pour l'affichage) : temps et distance depuis le dernier tour. */
export function currentLap(s: LiveSession, now = Date.now()) {
  const last = s.laps[s.laps.length - 1]
  return { n: s.laps.length + 1, time: Math.max(0, movingSeconds(s, now) - (last?.t ?? 0)), dist: Math.max(0, s.distance - (last?.d ?? 0)) }
}

/** Courbes (≤ 720 points), tracé (≤ 1000 points) et tours, au format raw_telemetry v2. */
export function toTelemetry(s: LiveSession): { version: 2; points: TelemetryPoint[]; route: [number, number][]; laps: Lap[] } {
  const pts = s.points
  const out: TelemetryPoint[] = []
  const step = Math.max(1, Math.ceil(pts.length / 720))
  for (let i = 0; i < pts.length; i += step) {
    const p = pts[i]
    const q: TelemetryPoint = { t: p.t }
    if (p.hr) q.hr = p.hr
    if (p.alt != null) q.alt = p.alt
    const a = pts[Math.max(0, i - step)]
    const b = pts[Math.min(pts.length - 1, i + step)]
    if (a.lat != null && b.lat != null && b.t > a.t) {
      let d = 0
      for (let k = Math.max(1, i - step + 1); k <= Math.min(pts.length - 1, i + step); k++) {
        const u = pts[k - 1]
        const v = pts[k]
        if (u.lat != null && v.lat != null) d += haversine(u.lat, u.lng!, v.lat, v.lng!)
      }
      q.v = round(d / (b.t - a.t), 2)
    }
    out.push(q)
  }
  const gps = pts.filter((p) => p.lat != null)
  const rstep = Math.max(1, Math.ceil(gps.length / 1000))
  const route = gps.filter((_, i) => i % rstep === 0 || i === gps.length - 1).map((p) => [round(p.lat!, 5), round(p.lng!, 5)] as [number, number])
  return { version: 2, points: out, route, laps: s.laps }
}

export function saveSession(s: LiveSession | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Stockage plein ou bloqué (navigation privée) : l'enregistrement continue en mémoire
  }
}

export function loadSession(): LiveSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const s = raw ? (JSON.parse(raw) as LiveSession) : null
    return s?.version === 2 ? s : null
  } catch {
    return null
  }
}

/** Décodage de la mesure Bluetooth « Heart Rate Measurement » (0x2A37). */
export function parseHeartRate(value: DataView): number | null {
  const flags = value.getUint8(0)
  const hr = flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1)
  return hr >= 25 && hr <= 250 ? hr : null
}

function round(v: number, d: number) {
  const k = 10 ** d
  return Math.round(v * k) / k
}
