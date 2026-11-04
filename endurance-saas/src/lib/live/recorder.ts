/**
 * Enregistrement d'une séance en direct (GPS du téléphone + ceinture cardio Bluetooth optionnelle).
 * Logique pure, sans React : l'état est un objet sérialisable, sauvegardé à chaque point
 * (localStorage) pour survivre à un rechargement ou à la fermeture de l'application.
 */
import type { TelemetryPoint } from '@/lib/fit/parse-fit'

export interface LivePoint {
  t: number // secondes de temps en mouvement depuis le départ
  lat?: number
  lng?: number
  alt?: number
  hr?: number
}

export interface LiveSession {
  version: 1
  sport: string
  startedAt: number // epoch ms
  status: 'running' | 'paused'
  /** Temps en mouvement accumulé avant la dernière reprise (ms) */
  movingMs: number
  /** Instant de la dernière reprise (epoch ms), null en pause */
  resumedAt: number | null
  distance: number // m
  elevationGain: number // m
  /** Altitude de référence pour le calcul du D+ (hystérésis) */
  altRef: number | null
  points: LivePoint[]
  lastFix: { lat: number; lng: number; at: number } | null
}

const STORAGE_KEY = 'endurance-live-session'
const MAX_ACCURACY_M = 30 // au-delà, le point GPS est trop imprécis
const MIN_STEP_M = 3 // sous ce seuil : bruit GPS à l'arrêt
const MAX_SPEED_MS = 45 // ~160 km/h : au-delà c'est un saut GPS
const ALT_HYSTERESIS_M = 3 // filtre du bruit d'altitude pour le D+
const HR_EVERY_S = 5 // un échantillon de FC toutes les 5 s quand il n'y a pas de GPS

export function newSession(sport: string, now = Date.now()): LiveSession {
  return { version: 1, sport, startedAt: now, status: 'running', movingMs: 0, resumedAt: now, distance: 0, elevationGain: 0, altRef: null, points: [], lastFix: null }
}

export const movingSeconds = (s: LiveSession, now = Date.now()) => (s.movingMs + (s.status === 'running' && s.resumedAt ? now - s.resumedAt : 0)) / 1000

export function pause(s: LiveSession, now = Date.now()): LiveSession {
  if (s.status !== 'running') return s
  return { ...s, status: 'paused', movingMs: s.movingMs + (s.resumedAt ? now - s.resumedAt : 0), resumedAt: null }
}

export function resume(s: LiveSession, now = Date.now()): LiveSession {
  if (s.status !== 'paused') return s
  // lastFix effacé : la distance parcourue pendant la pause n'est pas comptée
  return { ...s, status: 'running', resumedAt: now, lastFix: null }
}

const R = 6_371_000
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Ajoute une position GPS ; renvoie l'état inchangé si le point est rejeté (imprécis, bruit, saut). */
export function addFix(
  s: LiveSession,
  fix: { lat: number; lng: number; accuracy: number; altitude?: number | null; at: number },
  hr?: number | null,
): LiveSession {
  if (s.status !== 'running' || fix.accuracy > MAX_ACCURACY_M) return s
  const t = Math.round(movingSeconds(s, fix.at))
  let distance = s.distance
  if (s.lastFix) {
    const d = haversine(s.lastFix.lat, s.lastFix.lng, fix.lat, fix.lng)
    const dt = (fix.at - s.lastFix.at) / 1000
    if (d < MIN_STEP_M) return s
    if (dt > 0 && d / dt > MAX_SPEED_MS) return s
    distance += d
  }
  let { elevationGain, altRef } = s
  if (fix.altitude != null && Number.isFinite(fix.altitude)) {
    if (altRef == null) altRef = fix.altitude
    else if (fix.altitude - altRef > ALT_HYSTERESIS_M) {
      elevationGain += fix.altitude - altRef
      altRef = fix.altitude
    } else if (altRef - fix.altitude > ALT_HYSTERESIS_M) altRef = fix.altitude
  }
  const point: LivePoint = { t, lat: round(fix.lat, 6), lng: round(fix.lng, 6) }
  if (fix.altitude != null && Number.isFinite(fix.altitude)) point.alt = Math.round(fix.altitude)
  if (hr) point.hr = hr
  return { ...s, distance, elevationGain, altRef, points: [...s.points, point], lastFix: { lat: fix.lat, lng: fix.lng, at: fix.at } }
}

/** FC seule (sport sans GPS ou GPS indisponible) : un point toutes les 5 s. */
export function addHeartRate(s: LiveSession, hr: number, now = Date.now()): LiveSession {
  if (s.status !== 'running' || !hr) return s
  const t = Math.round(movingSeconds(s, now))
  const last = s.points[s.points.length - 1]
  if (last && t - last.t < HR_EVERY_S) return s
  return { ...s, points: [...s.points, { t, hr }] }
}

/** Vitesse actuelle (m/s) sur les ~15 dernières secondes de points GPS. */
export function currentSpeed(s: LiveSession): number | null {
  const gps = s.points.filter((p) => p.lat != null)
  if (gps.length < 2) return null
  const last = gps[gps.length - 1]
  let i = gps.length - 2
  while (i > 0 && last.t - gps[i].t < 15) i--
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

/** Courbes (≤ 720 points) et tracé (≤ 500 points) au format raw_telemetry v2 de l'application. */
export function toTelemetry(s: LiveSession): { version: 2; points: TelemetryPoint[]; route: [number, number][] } {
  const pts = s.points
  const out: TelemetryPoint[] = []
  const step = Math.max(1, Math.ceil(pts.length / 720))
  for (let i = 0; i < pts.length; i += step) {
    const p = pts[i]
    const q: TelemetryPoint = { t: p.t }
    if (p.hr) q.hr = p.hr
    if (p.alt != null) q.alt = p.alt
    // Vitesse lissée entre le point précédent et le suivant de l'échantillon
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
  const rstep = Math.max(1, Math.ceil(gps.length / 500))
  const route = gps.filter((_, i) => i % rstep === 0 || i === gps.length - 1).map((p) => [round(p.lat!, 5), round(p.lng!, 5)] as [number, number])
  return { version: 2, points: out, route }
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
    return s?.version === 1 ? s : null
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
