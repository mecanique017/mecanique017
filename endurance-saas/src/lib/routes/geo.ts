/**
 * Parcours et segments : distances, import GPX, guidage (écart au parcours, distance restante),
 * détection des passages sur un segment dans une séance. Fonctions pures.
 */
import { haversine } from '@/lib/live/recorder'

export type LatLng = [number, number]

export function cumulative(route: LatLng[]): number[] {
  const out = [0]
  for (let i = 1; i < route.length; i++) out.push(out[i - 1] + haversine(route[i - 1][0], route[i - 1][1], route[i][0], route[i][1]))
  return out
}
export const routeLength = (route: LatLng[]) => cumulative(route).at(-1) ?? 0

/** Simplifie un tracé : au plus `max` points, en gardant le premier et le dernier. */
export function simplify(route: LatLng[], max = 2000): LatLng[] {
  const k = Math.max(1, Math.ceil(route.length / max))
  return route.filter((_, i) => i % k === 0 || i === route.length - 1).map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5])
}

/** Points d'un fichier GPX (traces trkpt, itinéraires rtept ou points wpt), dans le navigateur. */
export function parseGpxPoints(xml: string): { name: string | null; points: LatLng[] } {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('Fichier GPX illisible')
  const pick = (sel: string) => Array.from(doc.getElementsByTagName(sel)).map((n) => [Number(n.getAttribute('lat')), Number(n.getAttribute('lon'))] as LatLng).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
  let points = pick('trkpt')
  if (points.length < 2) points = pick('rtept')
  if (points.length < 2) points = pick('wpt')
  if (points.length < 2) throw new Error('Aucun tracé dans ce fichier')
  const name = doc.getElementsByTagName('name')[0]?.textContent?.trim() || null
  return { name, points }
}

/** Projection d'un point (lat, lng) sur un segment [a, b] : distance (m) et fraction le long du segment. */
function project(p: LatLng, a: LatLng, b: LatLng) {
  const kx = Math.cos((p[0] * Math.PI) / 180) * 111_320
  const ky = 111_320
  const ax = (a[1] - p[1]) * kx
  const ay = (a[0] - p[0]) * ky
  const bx = (b[1] - p[1]) * kx
  const by = (b[0] - p[0]) * ky
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0
  return { dist: Math.hypot(ax + t * dx, ay + t * dy), t }
}

export interface Guidance {
  /** distance entre la position et le parcours (m) */
  offRoute: number
  /** distance déjà parcourue le long du parcours (m) */
  along: number
  remaining: number
  total: number
}

/**
 * Position sur le parcours. `hint` (distance le long du parcours au point précédent) évite de « sauter »
 * sur une autre portion quand le parcours repasse au même endroit (aller-retour, boucle).
 */
export function guide(route: LatLng[], cum: number[], pos: LatLng, hint?: number | null): Guidance {
  const total = cum.at(-1) ?? 0
  let best = { dist: Infinity, along: 0 }
  for (let i = 1; i < route.length; i++) {
    const pr = project(pos, route[i - 1], route[i])
    const along = cum[i - 1] + pr.t * (cum[i] - cum[i - 1])
    // Pénalité pour les portions éloignées de la progression attendue (au-delà de 300 m)
    const penalty = hint != null ? Math.max(0, Math.abs(along - hint) - 300) * 0.2 : 0
    if (pr.dist + penalty < best.dist) best = { dist: pr.dist + penalty, along }
  }
  const real = Math.min(...route.slice(1).map((_, i) => project(pos, route[i], route[i + 1]).dist))
  return { offRoute: Number.isFinite(real) ? real : 0, along: best.along, remaining: Math.max(0, total - best.along), total }
}

export const bbox = (pts: LatLng[]) => ({
  min_lat: Math.min(...pts.map((p) => p[0])),
  max_lat: Math.max(...pts.map((p) => p[0])),
  min_lng: Math.min(...pts.map((p) => p[1])),
  max_lng: Math.max(...pts.map((p) => p[1])),
})

/**
 * Passage sur un segment : départ à moins de 30 m du début, arrivée à moins de 30 m de la fin,
 * distance parcourue cohérente (±20 %) et tracé qui suit le segment (90 % des points à moins de 40 m).
 * `times` : secondes depuis le départ pour chaque point du tracé. Renvoie le meilleur passage.
 */
export function matchSegment(track: LatLng[], times: number[], segment: LatLng[]): { elapsed: number; startT: number } | null {
  if (track.length < 3 || segment.length < 2 || times.length !== track.length) return null
  const segLen = routeLength(segment)
  const start = segment[0]
  const end = segment[segment.length - 1]
  // Distance cumulée par pas d'au moins 15 m : insensible au « tremblement » du GPS
  const cum: number[] = [0]
  let anchor = track[0]
  let acc = 0
  for (let k = 1; k < track.length; k++) {
    const d = haversine(anchor[0], anchor[1], track[k][0], track[k][1])
    if (d >= 15) {
      acc += d
      anchor = track[k]
    }
    cum.push(acc)
  }
  const near = (p: LatLng, q: LatLng, r: number) => haversine(p[0], p[1], q[0], q[1]) <= r
  let best: { elapsed: number; startT: number } | null = null
  for (let i = 0; i < track.length; i++) {
    if (!near(track[i], start, 30)) continue
    // Point le plus proche du départ pendant ce passage dans la zone de 30 m
    const dist = (k: number, q: LatLng) => haversine(track[k][0], track[k][1], q[0], q[1])
    let k0 = i
    while (i + 1 < track.length && near(track[i + 1], start, 30)) {
      i++
      if (dist(i, start) < dist(k0, start)) k0 = i
    }
    const iStart = k0
    // Nouveau passage seulement après s'être éloigné de plus de 60 m du départ (pas sur un simple écart GPS)
    while (i + 1 < track.length && near(track[i + 1], start, 60)) i++
    for (let j = iStart + 1; j < track.length; j++) {
      const d = cum[j] - cum[iStart]
      if (d > segLen * 1.25) break
      if (d < segLen * 0.8 || !near(track[j], end, 30)) continue
      // Point le plus proche de l'arrivée pendant ce passage dans la zone de 30 m
      let jEnd = j
      while (j + 1 < track.length && near(track[j + 1], end, 30)) {
        j++
        if (dist(j, end) < dist(jEnd, end)) jEnd = j
      }
      // Le tracé doit coller au segment sur toute sa longueur
      const sample = segment.filter((_, k) => k % Math.max(1, Math.floor(segment.length / 12)) === 0)
      const part = track.slice(iStart, jEnd + 1)
      const close = sample.filter((sp) => part.some((p) => near(p, sp, 40))).length
      if (close / sample.length >= 0.9) {
        const elapsed = Math.round(times[jEnd] - times[iStart])
        if (elapsed > 0 && (!best || elapsed < best.elapsed)) best = { elapsed, startT: times[iStart] }
      }
      break
    }
  }
  return best
}
