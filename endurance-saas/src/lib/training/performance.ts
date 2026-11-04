/**
 * Performance : forme du jour, meilleurs efforts, prédictions de temps, zones d'entraînement, export GPX.
 * Fonctions pures, réutilisables côté navigateur ou serveur.
 */
import type { TelemetryPoint } from '@/lib/fit/parse-fit'
import { sportFamily } from '@/lib/sports'

// ---------------------------------------------------------------------------
// 1. « Prêt aujourd'hui ? »
// ---------------------------------------------------------------------------
export interface ReadinessInput {
  tsb: number | null
  hrv: number | null
  hrvBaseline: number | null
  restingHr: number | null
  restingHrBaseline: number | null
  sleep: number | null // 0-100
  fatigue: number | null // 1-10 ressentie
}
export interface Readiness {
  score: number
  level: 'hard' | 'moderate' | 'easy' | 'rest'
  title: string
  advice: string
  factors: { label: string; effect: number }[]
  hasWellness: boolean
}

export function readiness(i: ReadinessInput): Readiness {
  const factors: { label: string; effect: number }[] = []
  const add = (label: string, effect: number) => effect !== 0 && factors.push({ label, effect })
  if (i.tsb != null) {
    const t = i.tsb
    add(
      t > 15 ? 'Très reposé (charge en baisse)' : t >= 5 ? 'Frais (fraîcheur positive)' : t >= -10 ? '' : t >= -25 ? 'Fatigue d’entraînement' : 'Grosse fatigue d’entraînement',
      t > 15 ? 5 : t >= 5 ? 10 : t >= -10 ? 0 : t >= -25 ? -10 : -25,
    )
  }
  if (i.hrv != null && i.hrvBaseline) {
    const r = i.hrv / i.hrvBaseline
    add(r >= 1 ? 'Variabilité cardiaque au-dessus de votre normale' : r >= 0.93 ? '' : r >= 0.85 ? 'Variabilité cardiaque un peu basse' : 'Variabilité cardiaque nettement basse', r >= 1 ? 10 : r >= 0.93 ? 0 : r >= 0.85 ? -10 : -20)
  }
  if (i.restingHr != null && i.restingHrBaseline) {
    const d = i.restingHr - i.restingHrBaseline
    add(d >= 5 ? `FC au repos élevée (+${Math.round(d)} bpm)` : d >= 2 ? `FC au repos un peu haute (+${Math.round(d)} bpm)` : d <= -2 ? 'FC au repos basse' : '', d >= 5 ? -15 : d >= 2 ? -5 : d <= -2 ? 3 : 0)
  }
  if (i.sleep != null) add(i.sleep >= 80 ? 'Bon sommeil' : i.sleep < 60 ? 'Sommeil insuffisant' : '', i.sleep >= 80 ? 5 : i.sleep < 60 ? -10 : 0)
  if (i.fatigue != null) add(i.fatigue >= 8 ? 'Fatigue ressentie forte' : i.fatigue >= 6 ? 'Fatigue ressentie' : i.fatigue <= 3 ? 'Vous vous sentez en forme' : '', i.fatigue >= 8 ? -15 : i.fatigue >= 6 ? -5 : i.fatigue <= 3 ? 5 : 0)

  const filtered = factors.filter((f) => f.label)
  const score = Math.max(0, Math.min(100, 70 + filtered.reduce((s, f) => s + f.effect, 0)))
  const hasWellness = [i.hrv, i.restingHr, i.sleep, i.fatigue].some((v) => v != null)
  const level = score >= 75 ? 'hard' : score >= 55 ? 'moderate' : score >= 35 ? 'easy' : 'rest'
  const text = {
    hard: ['Prêt pour une séance dure', 'Fractionné, seuil ou sortie longue : c’est le bon jour.'],
    moderate: ['Séance modérée', 'Endurance ou tempo raisonnable ; gardez l’intensité sous contrôle.'],
    easy: ['Footing léger', 'Séance courte et facile, ou technique. Pas d’intensité aujourd’hui.'],
    rest: ['Repos ou récupération', 'Repos complet, marche ou mobilité. Le corps a besoin de récupérer.'],
  }[level]
  return { score, level, title: text[0], advice: text[1], factors: filtered.sort((a, b) => a.effect - b.effect), hasWellness }
}

// ---------------------------------------------------------------------------
// 2. Meilleurs efforts (calculés sur les courbes de chaque séance)
// ---------------------------------------------------------------------------
export const RUN_DISTANCES = [
  { m: 1000, label: '1 km' },
  { m: 5000, label: '5 km' },
  { m: 10000, label: '10 km' },
  { m: 21097.5, label: 'Semi-marathon' },
  { m: 42195, label: 'Marathon' },
]
export const RIDE_DISTANCES = [
  { m: 10000, label: '10 km' },
  { m: 20000, label: '20 km' },
  { m: 40000, label: '40 km' },
  { m: 100000, label: '100 km' },
]
export const POWER_DURATIONS = [
  { s: 60, label: '1 min' },
  { s: 300, label: '5 min' },
  { s: 1200, label: '20 min' },
  { s: 3600, label: '1 h' },
]

export interface BestEfforts {
  v: 1
  /** distance (m) → temps (s) ; `est` : estimé sur la moyenne de la séance (pas de courbe) */
  dist: Record<string, { s: number; est?: boolean }>
  /** durée (s) → puissance moyenne (W) */
  power: Record<string, number>
  /** FC moyenne la plus haute tenue 20 min */
  hr20: number | null
}

/** Temps minimal pour couvrir `target` mètres (fenêtre glissante, interpolée). */
function fastestDistance(t: number[], d: number[], target: number): number | null {
  if (!d.length || d[d.length - 1] < target) return null
  let best = Infinity
  let i = 0
  for (let j = 1; j < d.length; j++) {
    while (i < j && d[j] - d[i + 1] >= target) i++
    if (d[j] - d[i] >= target) {
      // interpolation : on recule le début jusqu'à couvrir exactement `target`
      const excess = d[j] - d[i] - target
      const segD = d[i + 1] - d[i] || 1
      const startT = t[i] + ((t[i + 1] - t[i]) * excess) / segD
      best = Math.min(best, t[j] - startT)
    }
  }
  return Number.isFinite(best) ? Math.round(best) : null
}

/** Moyenne maximale d'une grandeur sur `dur` secondes (pondérée par le temps). */
function bestAverage(t: number[], x: (number | undefined)[], dur: number): number | null {
  if (!t.length || t[t.length - 1] - t[0] < dur) return null
  let best = -Infinity
  let i = 0
  let acc = 0
  const w = (k: number) => (k > 0 ? t[k] - t[k - 1] : 0)
  for (let j = 1; j < t.length; j++) {
    acc += (x[j] ?? 0) * w(j)
    while (t[j] - t[i + 1] >= dur) {
      i++
      acc -= (x[i] ?? 0) * w(i)
    }
    if (t[j] - t[i] >= dur) best = Math.max(best, acc / (t[j] - t[i]))
  }
  return Number.isFinite(best) ? best : null
}

export function computeBestEfforts(
  activity: { sport_type: string; distance_meters: number; duration_seconds: number },
  points: TelemetryPoint[] | null | undefined,
): BestEfforts {
  const fam = sportFamily(activity.sport_type)
  const targets = fam === 'run' ? RUN_DISTANCES : fam === 'ride' ? RIDE_DISTANCES : []
  const out: BestEfforts = { v: 1, dist: {}, power: {}, hr20: null }
  const pts = (points ?? []).filter((p) => Number.isFinite(p.t))
  const hasSpeed = pts.filter((p) => p.v != null).length > 10
  if (hasSpeed) {
    const t: number[] = []
    const d: number[] = []
    let acc = 0
    pts.forEach((p, k) => {
      if (k) acc += (((p.v ?? 0) + (pts[k - 1].v ?? 0)) / 2) * (p.t - pts[k - 1].t)
      t.push(p.t)
      d.push(acc)
    })
    // Recalage sur la distance officielle de la séance (la courbe est sous-échantillonnée)
    const k = acc > 0 && activity.distance_meters > 0 ? activity.distance_meters / acc : 1
    const dd = d.map((v) => v * k)
    for (const tg of targets) {
      const s = fastestDistance(t, dd, tg.m)
      if (s) out.dist[String(tg.m)] = { s }
    }
  } else if (activity.distance_meters > 0) {
    for (const tg of targets)
      if (activity.distance_meters >= tg.m) out.dist[String(tg.m)] = { s: Math.round((activity.duration_seconds * tg.m) / activity.distance_meters), est: true }
  }
  const tt = pts.map((p) => p.t)
  if (pts.some((p) => p.w)) {
    for (const pd of POWER_DURATIONS) {
      const w = bestAverage(tt, pts.map((p) => p.w), pd.s)
      if (w) out.power[String(pd.s)] = Math.round(w)
    }
  }
  if (pts.filter((p) => p.hr).length > 10) {
    const h = bestAverage(tt, pts.map((p) => p.hr), 1200)
    out.hr20 = h ? Math.round(h) : null
  }
  return out
}

// ---------------------------------------------------------------------------
// 3. Prédictions de temps (formule de Riegel) et seuils estimés
// ---------------------------------------------------------------------------
const RIEGEL = 1.06

export interface EffortRow {
  activityId: string
  date: string
  sport: string
  efforts: BestEfforts
}

export function bestByDistance(rows: EffortRow[], family: 'run' | 'ride') {
  const res: Record<string, { s: number; est?: boolean; activityId: string; date: string }> = {}
  for (const r of rows) {
    if (sportFamily(r.sport) !== family) continue
    for (const [m, e] of Object.entries(r.efforts.dist)) {
      const cur = res[m]
      // Un effort mesuré l'emporte sur un effort estimé à temps égal
      if (!cur || e.s < cur.s || (cur.est && !e.est && e.s <= cur.s * 1.02)) res[m] = { ...e, activityId: r.activityId, date: r.date }
    }
  }
  return res
}

export function bestPower(rows: EffortRow[]) {
  const res: Record<string, { w: number; activityId: string; date: string }> = {}
  for (const r of rows)
    for (const [s, w] of Object.entries(r.efforts.power)) if (!res[s] || w > res[s].w) res[s] = { w, activityId: r.activityId, date: r.date }
  return res
}

/** Prédit le temps sur chaque distance à partir des meilleurs efforts récents (le plus favorable retenu). */
export function predictTimes(best: Record<string, { s: number; est?: boolean }>, targets: { m: number; label: string }[]) {
  return targets.map((tg) => {
    let bestS: number | null = null
    let from: string | null = null
    for (const [m, e] of Object.entries(best)) {
      const d1 = Number(m)
      if (d1 < tg.m / 10 || d1 < 1000) continue // trop court pour extrapoler loin
      const s = e.s * (tg.m / d1) ** RIEGEL
      if (bestS == null || s < bestS) {
        bestS = s
        from = m
      }
    }
    return { ...tg, seconds: bestS ? Math.round(bestS) : null, from }
  })
}

/** Allure seuil (s/km) ≈ allure tenable 1 h, déduite du meilleur effort. */
export function thresholdPace(best: Record<string, { s: number }>): number | null {
  let bestPace: number | null = null
  for (const [m, e] of Object.entries(best)) {
    const d1 = Number(m)
    if (d1 < 3000) continue
    const dHour = d1 * (3600 / e.s) ** (1 / RIEGEL) // distance tenable en 1 h
    const pace = 3600 / (dHour / 1000)
    if (bestPace == null || pace < bestPace) bestPace = pace
  }
  return bestPace ? Math.round(bestPace) : null
}

// ---------------------------------------------------------------------------
// 4. Zones d'entraînement
// ---------------------------------------------------------------------------
export function hrZones(lthr: number) {
  // Zones de Joe Friel (course), en % de la FC au seuil
  const z = [0, 0.85, 0.9, 0.95, 1.0, 1.06]
  return [
    { name: 'Z1 Récupération', from: null, to: Math.round(lthr * z[1]) - 1 },
    { name: 'Z2 Endurance', from: Math.round(lthr * z[1]), to: Math.round(lthr * z[2]) - 1 },
    { name: 'Z3 Tempo', from: Math.round(lthr * z[2]), to: Math.round(lthr * z[3]) - 1 },
    { name: 'Z4 Seuil', from: Math.round(lthr * z[3]), to: Math.round(lthr * z[4]) - 1 },
    { name: 'Z5 VO2max', from: Math.round(lthr * z[4]), to: null },
  ]
}
export function paceZones(threshold: number) {
  // Allure en s/km ; plus le nombre est grand, plus c'est lent
  const f = (k: number) => Math.round(threshold * k)
  return [
    { name: 'Z1 Récupération', slow: null, fast: f(1.29) },
    { name: 'Z2 Endurance', slow: f(1.29), fast: f(1.14) },
    { name: 'Z3 Tempo', slow: f(1.14), fast: f(1.06) },
    { name: 'Z4 Seuil', slow: f(1.06), fast: f(0.99) },
    { name: 'Z5 VO2max', slow: f(0.99), fast: null },
  ]
}
export function powerZones(ftp: number) {
  // Zones de Coggan, en % de la FTP
  const f = (k: number) => Math.round(ftp * k)
  return [
    { name: 'Z1 Récupération', from: null, to: f(0.55) },
    { name: 'Z2 Endurance', from: f(0.56), to: f(0.75) },
    { name: 'Z3 Tempo', from: f(0.76), to: f(0.9) },
    { name: 'Z4 Seuil', from: f(0.91), to: f(1.05) },
    { name: 'Z5 VO2max', from: f(1.06), to: f(1.2) },
    { name: 'Z6 Anaérobie', from: f(1.21), to: null },
  ]
}

// ---------------------------------------------------------------------------
// 5. Export GPX
// ---------------------------------------------------------------------------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function toGpx(a: { title: string; sport_type: string; start_time: string }, route: [number, number][], times?: number[] | null, alts?: (number | undefined)[] | null) {
  const start = new Date(a.start_time).getTime()
  const pts = route
    .map(([lat, lng], i) => {
      const ele = alts?.[i] != null ? `<ele>${alts[i]}</ele>` : ''
      const time = times?.[i] != null ? `<time>${new Date(start + times[i] * 1000).toISOString()}</time>` : ''
      return `      <trkpt lat="${lat}" lon="${lng}">${ele}${time}</trkpt>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="KronoFit" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(a.title)}</name><time>${new Date(start).toISOString()}</time></metadata>
  <trk>
    <name>${esc(a.title)}</name>
    <type>${esc(a.sport_type)}</type>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>
`
}
