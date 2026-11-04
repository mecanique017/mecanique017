import { useEffect, useRef, useState } from 'react'
import { RouteMap } from '@/components/dashboard/route-map'
import { cn } from '@/lib/utils'
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl'

/**
 * Carte de suivi (type application de sport) :
 *  - fonds : Plan (OpenStreetMap via OpenFreeMap — gratuit, sans clé, usage commercial autorisé),
 *    Satellite et Carte topo IGN (Géoplateforme, Licence Ouverte Etalab : libre, sans clé, France) ;
 *  - tracé orange en direct, « Mes passages » (vos anciens parcours en surbrillance) ;
 *  - position : point bleu + cône de direction + cercle de précision ; suivi, carte orientée, 3D.
 * MapLibre (BSD) est chargé à la demande. Sans WebGL ou hors ligne : repli sur le tracé SVG.
 */
const STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const ORANGE = '#e10600'
const IGN = (layer: string, format: string) =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&FORMAT=${format}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`

export type BaseLayer = 'plan' | 'satellite' | 'topo'
type LatLng = [number, number]
export interface MapPosition {
  lat: number
  lng: number
  accuracy: number
  heading?: number | null // degrés, 0 = nord
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
type Data = Parameters<GeoJSONSource['setData']>[0]
const collection = (features: object[]) => ({ type: 'FeatureCollection' as const, features }) as Data

/** Point bleu + cône de direction (élément HTML, orienté par rapport au nord de la carte). */
function meElement() {
  const el = document.createElement('div')
  el.style.cssText = 'width:72px;height:72px;position:relative;pointer-events:none'
  el.innerHTML = `
    <svg data-cone viewBox="0 0 72 72" width="72" height="72" style="position:absolute;inset:0;transition:transform .3s;display:none">
      <defs><linearGradient id="me-cone" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1a73e8" stop-opacity=".6"/><stop offset="1" stop-color="#1a73e8" stop-opacity="0"/></linearGradient></defs>
      <path d="M36 36 L20 3 A34 34 0 0 1 52 3 Z" fill="url(#me-cone)"/>
    </svg>
    <div style="position:absolute;left:24px;top:24px;width:24px;height:24px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`
  return el
}

export function TrackMap({
  route,
  position,
  live = false,
  follow = true,
  onUserPan,
  layer = 'plan',
  heat,
  threeD = false,
  headingUp = false,
  className,
}: {
  route: LatLng[]
  position?: MapPosition | null
  /** Enregistrement en cours : position, suivi, pas de marqueur d'arrivée */
  live?: boolean
  follow?: boolean
  onUserPan?: () => void
  layer?: BaseLayer
  /** « Mes passages » : anciens parcours */
  heat?: LatLng[][]
  threeD?: boolean
  /** Carte orientée dans le sens du déplacement */
  headingUp?: boolean
  className?: string
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const me = useRef<Marker | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const fitted = useRef(false)
  const onPan = useRef(onUserPan)
  useEffect(() => {
    onPan.current = onUserPan
  }, [onUserPan])

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
          zoom: position || route.length ? 16 : 5,
          attributionControl: { compact: true },
          cooperativeGestures: !live, // page de séance : un doigt fait défiler la page, deux doigts la carte
          maxPitch: 70,
        })
        map.current = created
        created.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-left')
        // Repli seulement si la carte ne peut pas démarrer (style injoignable) ; une tuile manquante
        // (photo aérienne hors de France, réseau faible) ne doit jamais faire disparaître la carte
        let loaded = false
        created.on('load', () => (loaded = true))
        created.on('error', (e) => {
          if (!loaded && !('sourceId' in e) && !('tile' in e)) setFailed(true)
        })
        // Geste de l'utilisateur (pas un déplacement programmé) : le suivi s'interrompt
        created.on('dragstart', () => onPan.current?.())
        created.on('load', () => {
          const m = created!
          const firstSymbol = m.getStyle().layers.find((l) => l.type === 'symbol')?.id
          m.addSource('ign-ortho', { type: 'raster', tiles: [IGN('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg')], tileSize: 256, maxzoom: 19, attribution: 'Photographies aériennes © IGN' })
          m.addSource('ign-plan', { type: 'raster', tiles: [IGN('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png')], tileSize: 256, maxzoom: 19, attribution: 'Plan IGN © IGN' })
          m.addLayer({ id: 'ign-ortho', type: 'raster', source: 'ign-ortho', layout: { visibility: 'none' } }, firstSymbol)
          m.addLayer({ id: 'ign-plan', type: 'raster', source: 'ign-plan', layout: { visibility: 'none' } }, firstSymbol)
          m.addSource('heat', { type: 'geojson', data: collection([]) })
          m.addSource('track', { type: 'geojson', data: collection([]) })
          m.addSource('accuracy', { type: 'geojson', data: collection([]) })
          m.addSource('marks', { type: 'geojson', data: collection([]) })
          m.addLayer({ id: 'heat', type: 'line', source: 'heat', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#7c3aed', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 7], 'line-opacity': 0.5, 'line-blur': 1 } })
          m.addLayer({ id: 'track-casing', type: 'line', source: 'track', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 } })
          m.addLayer({ id: 'track-line', type: 'line', source: 'track', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ORANGE, 'line-width': 5 } })
          m.addLayer({ id: 'accuracy', type: 'fill', source: 'accuracy', paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.15 } })
          m.addLayer({
            id: 'marks',
            type: 'circle',
            source: 'marks',
            paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'kind'], 'start', '#16a34a', '#111111'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 },
          })
          me.current = new ml.Marker({ element: meElement(), rotationAlignment: 'map', pitchAlignment: 'map' })
          setReady(true)
        })
      })
      .catch(() => setFailed(true))
    return () => {
      cancelled = true
      created?.remove()
      map.current = null
      me.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fond de carte
  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    m.setLayoutProperty('ign-ortho', 'visibility', layer === 'satellite' ? 'visible' : 'none')
    m.setLayoutProperty('ign-plan', 'visibility', layer === 'topo' ? 'visible' : 'none')
  }, [ready, layer])

  // Mes passages
  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    ;(m.getSource('heat') as GeoJSONSource | undefined)?.setData(collection((heat ?? []).filter((r) => r.length > 1).map(line)))
  }, [ready, heat])

  // Tracé, position et caméra
  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    ;(m.getSource('track') as GeoJSONSource | undefined)?.setData(route.length >= 2 ? collection([line(route)]) : collection([]))
    const marks = []
    if (route.length) marks.push(point(route[0][0], route[0][1], 'start'))
    if (!live && route.length > 1) marks.push(point(route[route.length - 1][0], route[route.length - 1][1], 'end'))
    ;(m.getSource('marks') as GeoJSONSource | undefined)?.setData(collection(marks))
    ;(m.getSource('accuracy') as GeoJSONSource | undefined)?.setData(position ? collection([circle(position.lat, position.lng, Math.max(position.accuracy, 3))]) : collection([]))

    if (me.current) {
      if (position) {
        me.current.setLngLat([position.lng, position.lat]).addTo(m)
        const cone = me.current.getElement().querySelector<SVGElement>('[data-cone]')
        if (cone) {
          const h = position.heading
          cone.style.display = h != null && Number.isFinite(h) ? 'block' : 'none'
          if (h != null) cone.style.transform = `rotate(${h}deg)`
        }
      } else me.current.remove()
    }

    if (live && position && follow) {
      m.easeTo({
        center: [position.lng, position.lat],
        zoom: Math.max(m.getZoom(), 16),
        bearing: headingUp ? (position.heading ?? m.getBearing()) : 0,
        pitch: threeD ? 60 : 0,
        duration: 700,
      })
    } else if (!live && route.length > 1 && !fitted.current) {
      fitted.current = true
      const lats = route.map((p) => p[0])
      const lngs = route.map((p) => p[1])
      m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 32, duration: 0 })
    }
  }, [ready, route, position, live, follow, headingUp, threeD])

  // 3D et orientation quand on ne suit pas la position (on regarde la carte librement)
  useEffect(() => {
    const m = map.current
    if (!ready || !m || (live && follow && position)) return
    m.easeTo({ pitch: threeD ? 60 : 0, bearing: headingUp ? m.getBearing() : 0, duration: 500 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, threeD, headingUp])

  if (failed) {
    return route.length >= 2 ? (
      <div className={cn('rounded-xl border bg-card p-2', className)}>
        <RouteMap route={route} />
      </div>
    ) : (
      <div className={cn('flex items-center justify-center rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground', className)}>
        Carte indisponible (pas de connexion) : le tracé est tout de même enregistré.
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-[#e8e4da]', live && 'live-map', className)}>
      <div ref={el} className="h-full w-full" aria-label="Carte du parcours" role="img" />
      {!ready && <p className="absolute inset-0 flex items-center justify-center text-sm text-neutral-600">Chargement de la carte…</p>}
    </div>
  )
}
