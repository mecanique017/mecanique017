import 'server-only'
import { XMLParser } from 'fast-xml-parser'
import { normalizedPower } from '@/lib/training/metrics'
import type { SportType } from '@/types/database'
import { downsample, extractRoute, FitImportError, num, wattsTo1Hz, type FitRecord, type ParsedFitActivity } from './parse-fit'

/**
 * Lecture des fichiers .gpx et .tcx (exports Strava, Garmin, Suunto, Komoot…), convertis dans le
 * même format de points que le .fit pour réutiliser exactement les mêmes calculs (NP, tracé, courbes).
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true, // gpxtpx:hr → hr, ns3:TPX → TPX
  parseTagValue: true,
  // Listes même quand il n'y a qu'un élément
  isArray: (name) => ['trk', 'trkseg', 'trkpt', 'Activity', 'Lap', 'Track', 'Trackpoint'].includes(name),
})

const SPORTS: Record<string, SportType> = {
  running: 'run', run: 'run', trail_running: 'run', trailrunning: 'run', walking: 'run', hiking: 'run', '9': 'run',
  cycling: 'ride', biking: 'ride', ride: 'ride', road_biking: 'ride', mountain_biking: 'ride', gravel_cycling: 'ride', virtualride: 'ride', '1': 'ride',
  swimming: 'swim', swim: 'swim', open_water_swimming: 'swim',
}

const R = 6_371_000
const haversine = (a: FitRecord, b: FitRecord) => {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.position_lat! - a.position_lat!)
  const dLng = toRad(b.position_long! - a.position_long!)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.position_lat!)) * Math.cos(toRad(b.position_lat!)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Pause : intervalle de plus de 30 s sans point (montre en pause, arrêt). */
const PAUSE_S = 30

export function parseTrackActivity(xml: string, format: 'gpx' | 'tcx'): ParsedFitActivity {
  let doc: Record<string, unknown>
  try {
    doc = parser.parse(xml)
  } catch {
    throw new FitImportError(`Fichier illisible : ce n’est pas un fichier .${format} valide.`)
  }
  const { records, sport, timerSeconds, distanceMeters } = format === 'gpx' ? readGpx(doc) : readTcx(doc)
  if (records.length < 2) throw new FitImportError('Aucun point horodaté dans ce fichier.')

  const startMs = new Date(records[0].timestamp!).getTime()
  const times = records.map((r) => new Date(r.timestamp!).getTime() / 1000)

  // Distance et vitesse point à point quand le fichier ne les fournit pas (GPX)
  let distance = 0
  for (let i = 1; i < records.length; i++) {
    const a = records[i - 1]
    const b = records[i]
    if (b.distance === undefined && a.position_lat !== undefined && b.position_lat !== undefined) {
      const d = haversine(a, b)
      distance += d
      b.distance = distance
      const dt = times[i] - times[i - 1]
      if (b.speed === undefined && dt > 0 && dt <= PAUSE_S) b.speed = d / dt
    } else if (b.distance !== undefined) {
      distance = b.distance
    }
  }

  // Temps en mouvement : somme des intervalles sans pause
  let moving = 0
  for (let i = 1; i < times.length; i++) {
    const dt = times[i] - times[i - 1]
    if (dt > 0 && dt <= PAUSE_S) moving += dt
  }
  const durationSeconds = Math.round(timerSeconds ?? moving)
  if (!(durationSeconds > 0)) throw new FitImportError('Durée de l’activité nulle.')
  const totalDistance = Math.round(distanceMeters ?? distance)

  // Sport : celui du fichier, sinon déduit de la vitesse moyenne (> 16 km/h → vélo)
  const avgKmh = totalDistance / 1000 / (durationSeconds / 3600)
  const sportType: SportType = (sport && SPORTS[sport.toLowerCase().replace(/[\s-]/g, '_')]) || (avgKmh > 16 ? 'ride' : 'run')

  // Dénivelé positif avec un seuil de 3 m (filtre le bruit de l'altitude GPS)
  let gain = 0
  let ref: number | undefined
  for (const r of records) {
    if (r.altitude === undefined) continue
    if (ref === undefined) ref = r.altitude
    else if (r.altitude - ref >= 3) {
      gain += r.altitude - ref
      ref = r.altitude
    } else if (r.altitude < ref) ref = r.altitude
  }

  const hr = records.map((r) => num(r.heart_rate)).filter((v): v is number => v !== undefined && v > 0)
  const watts = records.map((r) => num(r.power)).filter((v): v is number => v !== undefined)
  const mean = (a: number[]) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null)

  return {
    sportType,
    startTime: new Date(startMs).toISOString(),
    durationSeconds,
    distanceMeters: totalDistance,
    elevationGainMeters: Math.round(gain),
    avgHr: mean(hr),
    maxHr: hr.length ? Math.max(...hr) : null,
    avgWatts: mean(watts),
    maxWatts: watts.length ? Math.max(...watts) : null,
    normalizedPower: normalizedPower(wattsTo1Hz(records, startMs)),
    telemetry: downsample(records, startMs),
    route: extractRoute(records),
  }
}

type Node = Record<string, unknown>
const arr = (v: unknown): Node[] => (Array.isArray(v) ? (v as Node[]) : v ? [v as Node] : [])
const n = (v: unknown) => {
  const x = typeof v === 'object' && v !== null ? (v as Node)['#text'] : v
  const f = typeof x === 'number' ? x : parseFloat(String(x))
  return Number.isFinite(f) ? f : undefined
}

function readGpx(doc: Node) {
  const gpx = doc.gpx as Node | undefined
  if (!gpx) throw new FitImportError('Fichier illisible : ce n’est pas un fichier .gpx valide.')
  const tracks = arr(gpx.trk)
  const records: FitRecord[] = []
  for (const trk of tracks) {
    for (const seg of arr(trk.trkseg)) {
      for (const pt of arr(seg.trkpt)) {
        if (!pt.time) continue
        const ext = (pt.extensions ?? {}) as Node
        const tpx = (ext.TrackPointExtension ?? {}) as Node
        records.push({
          timestamp: String(pt.time),
          position_lat: n(pt['@lat']),
          position_long: n(pt['@lon']),
          altitude: n(pt.ele),
          heart_rate: n(tpx.hr ?? ext.hr ?? ext.heartrate),
          power: n(ext.power ?? tpx.power ?? ext.watts),
        })
      }
    }
  }
  records.sort((a, b) => Date.parse(String(a.timestamp)) - Date.parse(String(b.timestamp)))
  const type = tracks[0]?.type
  return { records, sport: type !== undefined ? String(type) : undefined, timerSeconds: undefined, distanceMeters: undefined }
}

function readTcx(doc: Node) {
  const root = doc.TrainingCenterDatabase as Node | undefined
  const activity = arr((root?.Activities as Node | undefined)?.Activity)[0]
  if (!activity) throw new FitImportError('Fichier illisible : ce n’est pas un fichier .tcx valide.')
  const laps = arr(activity.Lap)
  const records: FitRecord[] = []
  for (const lap of laps) {
    for (const track of arr(lap.Track)) {
      for (const tp of arr(track.Trackpoint)) {
        if (!tp.Time) continue
        const pos = (tp.Position ?? {}) as Node
        const tpx = (((tp.Extensions ?? {}) as Node).TPX ?? {}) as Node
        records.push({
          timestamp: String(tp.Time),
          position_lat: n(pos.LatitudeDegrees),
          position_long: n(pos.LongitudeDegrees),
          altitude: n(tp.AltitudeMeters),
          distance: n(tp.DistanceMeters),
          heart_rate: n((tp.HeartRateBpm as Node | undefined)?.Value),
          speed: n(tpx.Speed),
          power: n(tpx.Watts),
        })
      }
    }
  }
  // Chrono et distance officiels : somme des tours
  const timer = laps.reduce((s, l) => s + (n(l.TotalTimeSeconds) ?? 0), 0)
  const dist = laps.reduce((s, l) => s + (n(l.DistanceMeters) ?? 0), 0)
  const sport = activity['@Sport']
  return {
    records,
    sport: sport && sport !== 'Other' ? String(sport) : undefined,
    timerSeconds: timer > 0 ? timer : undefined,
    distanceMeters: dist > 0 ? dist : undefined,
  }
}
