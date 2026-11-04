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
}

export class FitImportError extends Error {}

const SPORTS: Record<string, SportType> = {
  running: 'run',
  trail_running: 'run',
  walking: 'run',
  hiking: 'run',
  cycling: 'ride',
  e_biking: 'ride',
  swimming: 'swim',
}

/** Nombre maximal de points conservés (graphiques) : ~1 point / 10 s pour 2 h. */
const MAX_POINTS = 720

interface FitRecord {
  timestamp?: string | Date
  heart_rate?: number
  power?: number
  speed?: number
  enhanced_speed?: number
  altitude?: number
  enhanced_altitude?: number
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

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
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

  // Série 1 Hz de puissance (enregistrement "intelligent" : on prolonge la dernière valeur)
  const watts1Hz: number[] = []
  let lastSecond = -1
  let lastWatts = 0
  for (const r of records) {
    const second = Math.round((new Date(r.timestamp!).getTime() - startMs) / 1000)
    const w = num(r.power)
    if (w === undefined || second <= lastSecond) continue
    // Pause > 10 s : on n'invente pas de puissance pendant l'arrêt
    const gap = second - lastSecond
    for (let s = 1; s < gap && gap <= 10; s++) watts1Hz.push(lastWatts)
    watts1Hz.push(w)
    lastWatts = w
    lastSecond = second
  }

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
  }
}

/** Moyenne par tranches de temps pour limiter la taille stockée. */
function downsample(records: FitRecord[], startMs: number): TelemetryPoint[] {
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
