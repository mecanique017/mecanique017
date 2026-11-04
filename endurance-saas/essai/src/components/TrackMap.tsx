import { useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { RouteMap } from '@/components/dashboard/route-map'
import { cn } from '@/lib/utils'
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl'

/**
 * Carte de type Strava : fond OpenStreetMap (OpenFreeMap, gratuit, sans clé, usage commercial autorisé),
 * tracé orange, position en direct (point bleu + cercle de précision), suivi automatique.
 * MapLibre (BSD) est chargé à la demande : il n'alourdit pas l'ouverture de l'application.
 * Sans WebGL ou hors ligne : repli sur le tracé SVG sans fond de carte.
 */
const STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const ORANGE = '#fc5200'

type LatLng = [number, number]
export interface MapPosition {
  lat: number
  lng: number
  accuracy: number
}

let loader: Promise<typeof import('maplibre-gl')> | null = null
function loadMapLibre() {
  loader ??= Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]).then(([ml, worker]) => {
    ml.setWorkerUrl(worker.default)
    return ml
  })
  return loader
}

/** Cercle de précision en polygone GeoJSON (rayon en mètres). */
function circle(lat: number, lng: number, radius: number) {
  const coords: LatLng[] = []
  const dLat = radius / 111_320
  const dLng = radius / (111_320 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI
    coords.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)])
  }
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [coords] } }
}
const line = (route: LatLng[]) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: route.map(([la, ln]) => [ln, la]) } })
const point = (lat: number, lng: number, kind: string) => ({ type: 'Feature' as const, properties: { kind }, geometry: { type: 'Point' as const, coordinates: [lng, lat] } })
const collection = (features: object[]) => ({ type: 'FeatureCollection' as const, features }) as Parameters<GeoJSONSource['setData']>[0]

export function TrackMap({
  route,
  position,
  live = false,
  className,
}: {
  route: LatLng[]
  position?: MapPosition | null
  /** Enregistrement en cours : suivi de la position, pas de marqueur d'arrivée */
  live?: boolean
  className?: string
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [follow, setFollow] = useState(true)
  const followRef = useRef(true)
  const fitted = useRef(false)

  // Création de la carte (une fois)
  useEffect(() => {
    let cancelled = false
    let created: MlMap | null = null
    loadMapLibre()
      .then((ml) => {
        if (cancelled || !el.current) return
        const start = position ? [position.lng, position.lat] : route.length ? [route[0][1], route[0][0]] : [2.35, 46.6]
        created = new ml.Map({
          container: el.current,
          style: STYLE,
          center: start as [number, number],
          zoom: position || route.length ? 15 : 5,
          attributionControl: { compact: true },
          cooperativeGestures: !live, // page de séance : un doigt fait défiler la page, deux doigts la carte
          pitchWithRotate: false,
        })
        map.current = created
        created.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-left')
        created.on('error', (e) => {
          // Style injoignable (hors ligne) : repli SVG ; une tuile manquante seule n'est pas bloquante
          if (!created?.isStyleLoaded() && /style|Failed to fetch|NetworkError/i.test(String(e.error?.message ?? ''))) setFailed(true)
        })
        created.on('dragstart', () => {
          followRef.current = false
          setFollow(false)
        })
        created.on('load', () => {
          const m = created!
          m.addSource('track', { type: 'geojson', data: collection([]) })
          m.addSource('accuracy', { type: 'geojson', data: collection([]) })
          m.addSource('marks', { type: 'geojson', data: collection([]) })
          m.addLayer({ id: 'track-casing', type: 'line', source: 'track', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 } })
          m.addLayer({ id: 'track-line', type: 'line', source: 'track', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ORANGE, 'line-width': 5 } })
          m.addLayer({ id: 'accuracy', type: 'fill', source: 'accuracy', paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.15 } })
          m.addLayer({
            id: 'marks',
            type: 'circle',
            source: 'marks',
            paint: {
              'circle-radius': ['match', ['get', 'kind'], 'me', 8, 7],
              'circle-color': ['match', ['get', 'kind'], 'me', '#1a73e8', 'start', '#16a34a', '#111111'],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 3,
            },
          })
          setReady(true)
        })
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      created?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mise à jour du tracé, de la position et de la caméra
  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    ;(m.getSource('track') as GeoJSONSource | undefined)?.setData(route.length >= 2 ? collection([line(route)]) : collection([]))
    const marks = []
    if (route.length) marks.push(point(route[0][0], route[0][1], 'start'))
    if (!live && route.length > 1) marks.push(point(route[route.length - 1][0], route[route.length - 1][1], 'end'))
    if (position) marks.push(point(position.lat, position.lng, 'me'))
    ;(m.getSource('marks') as GeoJSONSource | undefined)?.setData(collection(marks))
    ;(m.getSource('accuracy') as GeoJSONSource | undefined)?.setData(position ? collection([circle(position.lat, position.lng, Math.max(position.accuracy, 3))]) : collection([]))

    if (live && position && followRef.current) {
      m.easeTo({ center: [position.lng, position.lat], zoom: Math.max(m.getZoom(), 15), duration: 600 })
    } else if (!live && route.length > 1 && !fitted.current) {
      fitted.current = true
      const lats = route.map((p) => p[0])
      const lngs = route.map((p) => p[1])
      m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 32, duration: 0 })
    }
  }, [ready, route, position, live])

  const recenter = () => {
    followRef.current = true
    setFollow(true)
    if (position) map.current?.easeTo({ center: [position.lng, position.lat], zoom: Math.max(map.current.getZoom(), 15), duration: 400 })
  }

  if (failed) {
    return route.length >= 2 ? (
      <div className={cn('rounded-xl border bg-card p-2', className)}>
        <RouteMap route={route} />
      </div>
    ) : (
      <div className={cn('flex items-center justify-center rounded-xl border bg-card p-4 text-sm text-muted-foreground', className)}>
        Carte indisponible (pas de connexion) : le tracé est tout de même enregistré.
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-[#e8e4da]', className)}>
      <div ref={el} className="h-full w-full" aria-label="Carte du parcours" role="img" />
      {!ready && <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-600">Chargement de la carte…</p>}
      {live && !follow && position && (
        <button onClick={recenter} className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 shadow">
          <LocateFixed className="size-4" /> Recentrer
        </button>
      )}
    </div>
  )
}
