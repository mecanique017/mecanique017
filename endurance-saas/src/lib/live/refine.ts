/**
 * Affinage d'une séance à la fin de l'enregistrement (plus précis que le calcul en direct) :
 *  1. lissage avant + arrière (Kalman + lisseur de Rauch-Tung-Striebel) sur TOUS les points GPS
 *     bruts : chaque position bénéficie aussi des points suivants, ce que le direct ne peut pas faire ;
 *  2. dénivelé recalculé sur le modèle de terrain IGN (RGE ALTI®, précision métrique en France),
 *     comme la « correction d'altitude » des applications de sport — l'altitude GPS bruite de ±10-20 m.
 * Logique pure + un appel réseau optionnel (fetchIgnElevations), réutilisable côté serveur.
 */
import { haversine } from './recorder'
import { sportFamily } from '@/lib/sports'

/** Point GPS brut retenu pendant l'enregistrement : [t (s en mouvement), lat, lng, précision (m), epoch ms] */
export type RawFix = [number, number, number, number, number]

const M = 111_320

function q(sport: string) {
  const fam = sportFamily(sport)
  if (fam === 'ride') return 1.5
  if (fam === 'swim') return 0.3
  if (sport === 'walk' || sport === 'hike') return 0.5
  if (fam === 'run') return 0.8
  return 1.2
}

/** Lissage avant/arrière d'un axe (modèle position + vitesse). */
function smoothAxis(z: number[], r: number[], dt: number[], qa: number): number[] {
  const n = z.length
  const xs: [number, number][] = [] // état filtré
  const Ps: [number, number, number][] = [] // covariance filtrée (pp, pv, vv)
  const xp: [number, number][] = [] // état prédit
  const Pp: [number, number, number][] = [] // covariance prédite
  let x: [number, number] = [z[0], 0]
  let P: [number, number, number] = [r[0], 0, 25]
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const d = dt[i]
      const q2 = qa * qa
      x = [x[0] + x[1] * d, x[1]]
      P = [P[0] + 2 * d * P[1] + d * d * P[2] + (q2 * d ** 4) / 4, P[1] + d * P[2] + (q2 * d ** 3) / 2, P[2] + q2 * d * d]
    }
    xp.push([...x])
    Pp.push([...P])
    const s = P[0] + r[i]
    const k0 = P[0] / s
    const k1 = P[1] / s
    const innov = z[i] - x[0]
    x = [x[0] + k0 * innov, x[1] + k1 * innov]
    P = [(1 - k0) * P[0], (1 - k0) * P[1], P[2] - k1 * P[1]]
    xs.push([...x])
    Ps.push([...P])
  }
  // Passe arrière (RTS)
  const out = new Array<number>(n)
  let xsN = xs[n - 1]
  out[n - 1] = xsN[0]
  for (let i = n - 2; i >= 0; i--) {
    const d = dt[i + 1]
    const [a, b, c] = Ps[i] // P filtré à i
    // C = P_i F' Pp_{i+1}^-1 avec F = [[1, d], [0, 1]]
    const pf00 = a + d * b
    const pf01 = b
    const pf10 = b + d * c
    const pf11 = c
    const [e, f, g] = Pp[i + 1]
    const det = e * g - f * f || 1e-9
    const i00 = g / det
    const i01 = -f / det
    const i11 = e / det
    const C00 = pf00 * i00 + pf01 * i01
    const C01 = pf00 * i01 + pf01 * i11
    const C10 = pf10 * i00 + pf11 * i01
    const C11 = pf10 * i01 + pf11 * i11
    const dx0 = xsN[0] - xp[i + 1][0]
    const dx1 = xsN[1] - xp[i + 1][1]
    xsN = [xs[i][0] + C00 * dx0 + C01 * dx1, xs[i][1] + C10 * dx0 + C11 * dx1]
    out[i] = xsN[0]
  }
  return out
}

export interface RefinedTrack {
  points: { t: number; lat: number; lng: number }[]
  distance: number
}

/** Lisse la trace complète. Les pauses (écart > 30 s) découpent la trace en segments indépendants. */
export function smoothTrack(raw: RawFix[], sport: string): RefinedTrack | null {
  if (raw.length < 3) return null
  const qa = q(sport)
  const segments: RawFix[][] = [[]]
  for (let i = 0; i < raw.length; i++) {
    if (i > 0 && (raw[i][4] - raw[i - 1][4]) / 1000 > 30) segments.push([])
    segments[segments.length - 1].push(raw[i])
  }
  const lat0 = raw[0][1]
  const lng0 = raw[0][2]
  const kx = Math.cos((lat0 * Math.PI) / 180) * M
  const points: RefinedTrack['points'] = []
  let distance = 0
  for (const seg of segments) {
    if (!seg.length) continue
    const dt = seg.map((f, i) => (i ? Math.min(60, Math.max(0.001, (f[4] - seg[i - 1][4]) / 1000)) : 0))
    const r = seg.map((f) => Math.max(f[3], 3) ** 2)
    const xs = seg.length > 1 ? smoothAxis(seg.map((f) => (f[2] - lng0) * kx), r, dt, qa) : [(seg[0][2] - lng0) * kx]
    const ys = seg.length > 1 ? smoothAxis(seg.map((f) => (f[1] - lat0) * M), r, dt, qa) : [(seg[0][1] - lat0) * M]
    let last: { lat: number; lng: number } | null = null
    for (let i = 0; i < seg.length; i++) {
      const p = { t: seg[i][0], lat: lat0 + ys[i] / M, lng: lng0 + xs[i] / kx }
      points.push(p)
      if (!last) last = p
      else {
        const d = haversine(last.lat, last.lng, p.lat, p.lng)
        if (d >= 2) {
          distance += d
          last = p
        }
      }
    }
    // Liaison entre segments (pause) : non comptée, comme en direct
  }
  return { points, distance }
}

/** Rééchantillonne la trace tous les `step` mètres (pour l'altitude IGN). */
export function resample(points: RefinedTrack['points'], step = 15, max = 4000) {
  if (!points.length) return []
  const out = [points[0]]
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    acc += haversine(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
    if (acc >= step) {
      out.push(points[i])
      acc = 0
    }
  }
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1])
  if (out.length <= max) return out
  const k = Math.ceil(out.length / max)
  return out.filter((_, i) => i % k === 0 || i === out.length - 1)
}

/** Dénivelé positif / négatif sur une altitude de terrain (lissage léger + seuil de 1 m). */
export function elevationFromProfile(z: number[]) {
  const s = z.map((_, i) => {
    const w = z.slice(Math.max(0, i - 1), i + 2)
    return w.reduce((a, b) => a + b, 0) / w.length
  })
  let gain = 0
  let loss = 0
  let ref = s[0]
  for (const v of s) {
    if (v - ref >= 1) {
      gain += v - ref
      ref = v
    } else if (ref - v >= 1) {
      loss += ref - v
      ref = v
    }
  }
  return { gain: Math.round(gain), loss: Math.round(loss) }
}

/**
 * Altitudes du modèle de terrain IGN (Géoplateforme, gratuit, sans clé, Licence Ouverte).
 * Requêtes GET de 150 points (≤ 5 requêtes/s autorisées). Renvoie null hors de France ou en cas d'échec.
 */
export async function fetchIgnElevations(points: { lat: number; lng: number }[], signal?: AbortSignal): Promise<number[] | null> {
  const out: number[] = []
  for (let i = 0; i < points.length; i += 150) {
    const chunk = points.slice(i, i + 150)
    const url =
      'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json?resource=ign_rge_alti_wld&delimiter=|&zonly=true' +
      `&lon=${chunk.map((p) => p.lng.toFixed(6)).join('|')}&lat=${chunk.map((p) => p.lat.toFixed(6)).join('|')}`
    try {
      const res = await fetch(url, { signal })
      if (!res.ok) return null
      const json = (await res.json()) as { elevations?: number[] }
      if (!Array.isArray(json.elevations) || json.elevations.length !== chunk.length) return null
      out.push(...json.elevations)
    } catch {
      return null
    }
    if (i + 150 < points.length) await new Promise((r) => setTimeout(r, 250))
  }
  // Hors couverture : -99999 → inutilisable si une part notable du parcours est concernée
  const bad = out.filter((z) => z < -1000).length
  if (bad > out.length * 0.05) return null
  for (let i = 0; i < out.length; i++) if (out[i] < -1000) out[i] = out[i - 1] ?? out.find((z) => z > -1000) ?? 0
  return out
}

export interface Refinement {
  /** Distance retenue : moyenne du calcul en direct (tendance à surestimer quand le signal tremble)
   *  et du lissage avant/arrière (tendance à couper les virages serrés) — leurs biais s'opposent. */
  distance: number
  route: [number, number][]
  /** Profil d'altitude IGN : t (s) → altitude (m), si disponible */
  profile: { t: number; z: number }[] | null
  elevationGain: number | null
  elevationLoss: number | null
}

export function refineDistance(liveDistance: number, smoothed: RefinedTrack | null) {
  return smoothed && smoothed.distance > 0 ? (liveDistance + smoothed.distance) / 2 : liveDistance
}

/** Tracé lissé, ≤ 1000 points. */
export function smoothedRoute(smoothed: RefinedTrack | null): [number, number][] {
  if (!smoothed) return []
  const k = Math.max(1, Math.ceil(smoothed.points.length / 1000))
  return smoothed.points
    .filter((_, i) => i % k === 0 || i === smoothed.points.length - 1)
    .map((p) => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5])
}

/** Temps (s en mouvement) de chaque point du tracé lissé (même échantillonnage que smoothedRoute). */
export function smoothedRouteTimes(smoothed: RefinedTrack | null): number[] {
  if (!smoothed) return []
  const k = Math.max(1, Math.ceil(smoothed.points.length / 1000))
  return smoothed.points.filter((_, i) => i % k === 0 || i === smoothed.points.length - 1).map((p) => p.t)
}

/** Remplace l'altitude GPS des points de courbe par l'altitude IGN la plus proche dans le temps. */
export function withIgnAltitude<T extends { t: number; alt?: number }>(points: T[], profile: { t: number; z: number }[]): T[] {
  if (!profile.length) return points
  let j = 0
  return points.map((p) => {
    while (j < profile.length - 1 && Math.abs(profile[j + 1].t - p.t) <= Math.abs(profile[j].t - p.t)) j++
    return { ...p, alt: Math.round(profile[j].z) }
  })
}
