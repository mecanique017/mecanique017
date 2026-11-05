/**
 * Préparation hors ligne d'un parcours : téléchargement des tuiles de carte de sa zone (zooms 11 à 15).
 * Les tuiles sont gardées par le service worker (cache « kronofit-tiles »). Respect des conditions
 * d'OpenFreeMap : au plus 3 000 tuiles par téléchargement et 4 requêtes en parallèle.
 */
type LatLng = [number, number]

const lon2x = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z)
const lat2y = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z)
}

export function tilesFor(route: LatLng[], zooms = [11, 12, 13, 14, 15], margin = 0.004) {
  const lats = route.map((p) => p[0])
  const lngs = route.map((p) => p[1])
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats) - margin, Math.max(...lats) + margin, Math.min(...lngs) - margin, Math.max(...lngs) + margin]
  const out: [number, number, number][] = []
  for (const z of zooms) {
    // Aux zooms forts, seulement un couloir de ~400 m autour du tracé (et non tout le rectangle)
    const corridor = z >= 14
    const seen = new Set<string>()
    if (corridor) {
      for (const [la, ln] of route)
        for (const dla of [-margin, 0, margin])
          for (const dln of [-margin, 0, margin]) {
            const k = `${lon2x(ln + dln, z)}/${lat2y(la + dla, z)}`
            if (!seen.has(k)) {
              seen.add(k)
              out.push([z, lon2x(ln + dln, z), lat2y(la + dla, z)])
            }
          }
    } else {
      for (let x = lon2x(minLng, z); x <= lon2x(maxLng, z); x++) for (let y = lat2y(maxLat, z); y <= lat2y(minLat, z); y++) out.push([z, x, y])
    }
  }
  return out
}

export async function prepareOffline(route: LatLng[], onProgress: (done: number, total: number) => void): Promise<{ ok: number; total: number }> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) throw new Error('Mode hors ligne indisponible : ouvrez l’application installée sur l’écran d’accueil.')
  const tj = await (await fetch('https://tiles.openfreemap.org/planet')).json()
  const template: string = tj.tiles[0]
  const tiles = tilesFor(route).slice(0, 3000)
  let done = 0
  let ok = 0
  const queue = [...tiles]
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      const [z, x, y] = t
      try {
        const res = await fetch(template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)))
        if (res.ok) ok++
      } catch {
        // tuile manquante : on continue
      }
      onProgress(++done, tiles.length)
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return { ok, total: tiles.length }
}
