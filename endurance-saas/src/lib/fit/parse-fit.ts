import 'server-only'
import FitParser from 'fit-file-parser'
import { normalizedPower } from '@/lib/training/metrics'
import type { SportType } from '@/types/database'

/** Point de télémétrie compact stocké dans activities.raw_telemetry. */
// type (et non interface) : compatible avec le type Json de Supabase
export type TelemetryPoint = {
  t: number // secondes depuis le départ
  hr?: number // bpm
  w?: number // watts
  v?: number // m/s
  alt?: number // m
}

export interface ParsedFitActivity {
  sportType: SportType
  startTime: string // ISO UTC
  durationSeconds: number // temps en mouvement (chrono)
  distanceMeters: number
  elevationGainMeters: number
  avgHr: number | null
  maxHr: number | null
  avgWatts: number | null
  maxWatts: number | null
  normalizedPower: number | null
  telemetry: TelemetryPoint[]
  /** Tracé GPS [lat, lng] (≤ 500 points), vide si pas de GPS (home-trainer, piscine) */
  route: [number, number][]
}

export class FitImportError extends Error {}

const SPORTS: Record<string, SportType> = {
  running: 'run', trail: 'trail', trail_running: 'trail', walking: 'walk', hiking: 'hike',
  cycling: 'ride', road: 'ride', mountain: 'mtb', gravel_cycling: 'gravel', e_biking: 'ebike', e_bike_fitness: 'ebike',
  indoor_cycling: 'virtual_ride', virtual_activity: 'virtual_ride',
  swimming: 'swim', lap_swimming: 'swim', open_water: 'open_water',
  rowing: 'rowing', indoor_rowing: 'rowing', paddling: 'kayak', kayaking: 'kayak', stand_up_paddleboarding: 'kayak',
  cross_country_skiing: 'ski_nordic', backcountry: 'ski_touring', alpine_skiing: 'ski', snowboarding: 'ski',
  elliptical: 'elliptical', training: 'strength', strength_training: 'strength', hiit: 'hiit', yoga: 'yoga',
  rock_climbing: 'climbing', soccer: 'team', basketball: 'team', tennis: 'racket', fitness_equipment: 'cardio',
}

/** Nombre maximal de points conservés (graphiques) : ~1 point / 10 s pour 2 h. */
const MAX_POINTS = 720

/** Point de mesure commun (.fit, .gpx, .tcx) */
export interface FitRecord {
  timestamp?: string | Date
  heart_rate?: number
  power?: number
  speed?: number
  distance?: number
  enhanced_speed?: number
  altitude?: number
  enhanced_altitude?: number
  position_lat?: number
  position_long?: number
}

interface FitSession {
  sport?: string | number
  start_time?: string | Date
  total_timer_time?: number
  total_elapsed_time?: number
  total_distance?: number
  total_ascent?: number
  avg_heart_rate?: number
  max_heart_rate?: number
  avg_power?: number
  max_power?: number
}

export const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const roundOrNull = (v: number | undefined) => (v === undefined ? null : Math.round(v))

/**
 * Lit un fichier .fit d'activité (Garmin, Wahoo, Coros, Polar, Suunto…).
 * Les résumés de la session sont privilégiés ; à défaut, ils sont recalculés depuis les enregistrements.
 */
export async function parseFitActivity(buffer: ArrayBuffer): Promise<ParsedFitActivity> {
  let data: { sessions?: FitSession[]; records?: FitRecord[] }
  try {
    // force: false → contrôle CRC : un fichier corrompu est refusé plutôt que mal lu
    data = (await new FitParser({ force: false, mode: 'list' }).parseAsync(buffer)) as unknown as typeof data
  } catch {
    throw new FitImportError('Fichier illisible : ce n’est pas un fichier .fit valide.')
  }

  const records = (data.records ?? []).filter((r) => r.timestamp)
  const session = data.sessions?.[0] ?? {}
  if (records.length === 0 && !session.start_time) {
    throw new FitImportError('Aucune activité trouvée dans ce fichier.')
  }

  const sportType = SPORTS[String(session.sport ?? 'running')]
  if (!sportType) {
    throw new FitImportError(`Sport « ${session.sport} » non pris en charge (course, vélo ou natation).`)
  }

  const start = new Date(session.start_time ?? records[0].timestamp!)
  const startMs = start.getTime()
  const lastMs = records.length ? new Date(records.at(-1)!.timestamp!).getTime() : startMs
  const durationSeconds = Math.round(num(session.total_timer_time) ?? num(session.total_elapsed_time) ?? (lastMs - startMs) / 1000)
  if (!(durationSeconds > 0)) throw new FitImportError('Durée de l’activité nulle.')

  const watts1Hz = wattsTo1Hz(records, startMs)

  const hrValues = records.map((r) => num(r.heart_rate)).filter((v): v is number => v !== undefined && v > 0)
  const powerValues = records.map((r) => num(r.power)).filter((v): v is number => v !== undefined)
  const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : undefined)

  return {
    sportType,
    startTime: start.toISOString(),
    durationSeconds,
    distanceMeters: Math.round(num(session.total_distance) ?? 0),
    elevationGainMeters: Math.round(num(session.total_ascent) ?? 0),
    avgHr: roundOrNull(num(session.avg_heart_rate) ?? mean(hrValues)),
    maxHr: roundOrNull(num(session.max_heart_rate) ?? (hrValues.length ? Math.max(...hrValues) : undefined)),
    avgWatts: roundOrNull(num(session.avg_power) ?? mean(powerValues)),
    maxWatts: roundOrNull(num(session.max_power) ?? (powerValues.length ? Math.max(...powerValues) : undefined)),
    normalizedPower: normalizedPower(watts1Hz),
    telemetry: downsample(records, startMs),
    route: extractRoute(records),
  }
}

const MAX_ROUTE_POINTS = 500

/** Tracé GPS allégé : un point sur N, coordonnées arrondies à 5 décimales (≈ 1 m). */
export function extractRoute(records: FitRecord[]): [number, number][] {
  const points = records
    .map((r) => [num(r.position_lat), num(r.position_long)] as const)
    .filter((p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180 && !(p[0] === 0 && p[1] === 0))
  if (points.length < 2) return []
  const step = Math.ceil(points.length / MAX_ROUTE_POINTS)
  const round5 = (v: number) => Math.round(v * 1e5) / 1e5
  const route = points.filter((_, i) => i % step === 0).map(([lat, lng]) => [round5(lat), round5(lng)] as [number, number])
  const last = points.at(-1)!
  route.push([round5(last[0]), round5(last[1])]) // l'arrivée est toujours conservée
  return route
}

/** Moyenne par tranches de temps pour limiter la taille stockée. */
export function downsample(records: FitRecord[], startMs: number): TelemetryPoint[] {
  if (records.length === 0) return []
  const totalS = (new Date(records.at(-1)!.timestamp!).getTime() - startMs) / 1000
  const bucket = Math.max(1, Math.ceil(totalS / MAX_POINTS))
  const buckets = new Map<number, { n: Record<string, number>; sum: Record<string, number> }>()

  for (const r of records) {
    const t = Math.floor((new Date(r.timestamp!).getTime() - startMs) / 1000 / bucket) * bucket
    const b = buckets.get(t) ?? { n: {}, sum: {} }
    const values = {
      hr: num(r.heart_rate),
      w: num(r.power),
      v: num(r.enhanced_speed) ?? num(r.speed),
      alt: num(r.enhanced_altitude) ?? num(r.altitude),
    }
    for (const [k, v] of Object.entries(values)) {
      if (v === undefined) continue
      b.sum[k] = (b.sum[k] ?? 0) + v
      b.n[k] = (b.n[k] ?? 0) + 1
    }
    buckets.set(t, b)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, b]) => {
      const point: TelemetryPoint = { t }
      for (const k of Object.keys(b.sum) as (keyof Omit<TelemetryPoint, 't'>)[]) {
        const avg = b.sum[k] / b.n[k]
        point[k] = k === 'v' ? Math.round(avg * 100) / 100 : Math.round(avg)
      }
      return point
    })
}

/** Série de puissance à 1 Hz (enregistrement « intelligent » : la dernière valeur est prolongée, pas les pauses > 10 s). */
export function wattsTo1Hz(records: FitRecord[], startMs: number): number[] {
  const watts1Hz: number[] = []
  let lastSecond = -1
  let lastWatts = 0
  for (const r of records) {
    const second = Math.round((new Date(r.timestamp!).getTime() - startMs) / 1000)
    const w = num(r.power)
    if (w === undefined || second <= lastSecond) continue
    const gap = second - lastSecond
    for (let s = 1; s < gap && gap <= 10; s++) watts1Hz.push(lastWatts)
    watts1Hz.push(w)
    lastWatts = w
    lastSecond = second
  }
  return watts1Hz
}
