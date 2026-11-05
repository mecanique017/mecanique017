/**
 * Tracé « qui suit les routes et chemins » (comme les éditeurs d'itinéraires des applis de sport).
 *  1. BRouter (logiciel libre, données OpenStreetMap) : profils pensés pour le sport (rando/trail,
 *     vélo de route, gravel, vélo loisir), altitude fournie. Serveur public brouter.de, destiné à un
 *     usage modéré : pour une forte audience, héberger son propre BRouter (licence MIT).
 *  2. Repli : calcul d'itinéraire de l'IGN (Géoplateforme, gratuit, sans clé, France) — piéton ou voiture.
 *  3. Dernier recours : ligne droite (l'interface le signale).
 */
import type { LatLng } from './geo'

export type RoutingProfile = 'foot' | 'road' | 'gravel' | 'bike'
export const ROUTING_PROFILES: { key: RoutingProfile; label: string; brouter: string; ign: 'pedestrian' | 'car' }[] = [
  { key: 'foot', label: 'Course, trail, rando', brouter: 'hiking-mountain', ign: 'pedestrian' },
  { key: 'road', label: 'Vélo de route', brouter: 'fastbike', ign: 'car' },
  { key: 'gravel', label: 'Gravel / VTT', brouter: 'gravel', ign: 'pedestrian' },
  { key: 'bike', label: 'Vélo loisir (pistes cyclables)', brouter: 'trekking', ign: 'pedestrian' },
]

export interface RoutedLeg {
  points: LatLng[]
  /** altitude de chaque point (m), si fournie */
  ele: (number | null)[]
  distance: number
  source: 'brouter' | 'ign' | 'direct'
}

const withTimeout = (ms: number) => {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  return { signal: c.signal, done: () => clearTimeout(t) }
}

async function viaBrouter(a: LatLng, b: LatLng, profile: string): Promise<RoutedLeg | null> {
  const t = withTimeout(8000)
  try {
    const url = `https://brouter.de/brouter?lonlats=${a[1].toFixed(6)},${a[0].toFixed(6)}|${b[1].toFixed(6)},${b[0].toFixed(6)}&profile=${profile}&alternativeidx=0&format=geojson`
    const res = await fetch(url, { signal: t.signal })
    if (!res.ok) return null
    const json = await res.json()
    const f = json?.features?.[0]
    const coords: number[][] = f?.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) return null
    return {
      points: coords.map((c) => [c[1], c[0]] as LatLng),
      ele: coords.map((c) => (c.length > 2 && c[2] > -1000 ? c[2] : null)),
      distance: Number(f.properties?.['track-length']) || 0,
      source: 'brouter',
    }
  } catch {
    return null
  } finally {
    t.done()
  }
}

async function viaIgn(a: LatLng, b: LatLng, profile: 'pedestrian' | 'car'): Promise<RoutedLeg | null> {
  const t = withTimeout(8000)
  try {
    const url =
      'https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&optimization=shortest&geometryFormat=geojson&distanceUnit=meter' +
      `&profile=${profile}&start=${a[1].toFixed(6)},${a[0].toFixed(6)}&end=${b[1].toFixed(6)},${b[0].toFixed(6)}`
    const res = await fetch(url, { signal: t.signal })
    if (!res.ok) return null
    const json = await res.json()
    const coords: number[][] = json?.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) return null
    return { points: coords.map((c) => [c[1], c[0]] as LatLng), ele: coords.map(() => null), distance: Number(json.distance) || 0, source: 'ign' }
  } catch {
    return null
  } finally {
    t.done()
  }
}

const R = 6_371_000
const haversine = (a: LatLng, b: LatLng) => {
  const rad = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Itinéraire entre deux points : BRouter, sinon IGN, sinon ligne droite. */
export async function routeLeg(a: LatLng, b: LatLng, profile: RoutingProfile): Promise<RoutedLeg> {
  const p = ROUTING_PROFILES.find((x) => x.key === profile) ?? ROUTING_PROFILES[0]
  const leg = (await viaBrouter(a, b, p.brouter)) ?? (await viaIgn(a, b, p.ign))
  if (leg) {
    // Raccord exact avec les points touchés (le moteur part de la route la plus proche)
    return { ...leg, points: leg.points }
  }
  return { points: [a, b], ele: [null, null], distance: haversine(a, b), source: 'direct' }
}

/** Dénivelé positif cumulé (seuil de 3 m pour ignorer le bruit du modèle de terrain). */
export function gainFromElevations(ele: (number | null)[]) {
  let gain = 0
  let ref: number | null = null
  for (const z of ele) {
    if (z == null) continue
    if (ref == null) ref = z
    else if (z - ref >= 3) {
      gain += z - ref
      ref = z
    } else if (ref - z >= 3) ref = z
  }
  return Math.round(gain)
}
