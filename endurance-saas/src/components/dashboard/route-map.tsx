/**
 * Tracé GPS en SVG, sans fond de carte : aucun service tiers (pas de clé, pas de requête externe,
 * la position de l'athlète ne quitte pas l'application). Projection équirectangulaire corrigée
 * de la latitude : exacte à l'échelle d'une sortie (quelques dizaines de km).
 */

const WIDTH = 640
const HEIGHT = 360
const PAD = 24
const M_PER_DEG_LAT = 111_320

export function RouteMap({ route }: { route: [number, number][] }) {
  const lats = route.map((p) => p[0])
  const lngs = route.map((p) => p[1])
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const kx = Math.cos((midLat * Math.PI) / 180) // 1° de longitude est plus court qu'1° de latitude

  // Coordonnées planes en mètres
  const xs = lngs.map((lng) => lng * kx * M_PER_DEG_LAT)
  const ys = lats.map((lat) => lat * M_PER_DEG_LAT)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const spanX = Math.max(...xs) - minX || 1
  const spanY = Math.max(...ys) - minY || 1
  const scale = Math.min((WIDTH - 2 * PAD) / spanX, (HEIGHT - 2 * PAD) / spanY) // px par mètre
  const offX = (WIDTH - spanX * scale) / 2
  const offY = (HEIGHT - spanY * scale) / 2
  const pt = (i: number) => [offX + (xs[i] - minX) * scale, HEIGHT - (offY + (ys[i] - minY) * scale)] as const

  const path = route.map((_, i) => `${i ? 'L' : 'M'}${pt(i)[0].toFixed(1)},${pt(i)[1].toFixed(1)}`).join(' ')
  const [sx, sy] = pt(0)
  const [ex, ey] = pt(route.length - 1)
  // Boucle : départ et arrivée à moins de 50 m → un seul repère combiné (sinon l'un masque l'autre)
  const isLoop = Math.hypot(xs[0] - xs.at(-1)!, ys[0] - ys.at(-1)!) < 50

  // Échelle : 1, 2, 5, 10… km, environ un cinquième de la largeur
  const target = (WIDTH / 5) / scale
  const nice = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000].find((m) => m >= target) ?? 100000
  const barPx = nice * scale

  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto rounded-lg bg-muted/40" role="img" aria-label="Tracé GPS de la séance">
        <path d={path} fill="none" stroke="var(--viz-ctl)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {/* Départ / arrivée : anneau couleur de fond pour rester lisibles sur le tracé */}
        {isLoop ? (
          <>
            <circle cx={sx} cy={sy} r={9} fill="var(--status-good)" stroke="var(--card)" strokeWidth={2} />
            <circle cx={sx} cy={sy} r={3.5} fill="var(--foreground)" />
          </>
        ) : (
          <>
            <circle cx={sx} cy={sy} r={7} fill="var(--status-good)" stroke="var(--card)" strokeWidth={2} />
            <circle cx={ex} cy={ey} r={7} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
          </>
        )}
        <g transform={`translate(${PAD}, ${HEIGHT - PAD / 2})`}>
          <line x1={0} x2={barPx} y1={0} y2={0} stroke="var(--muted-foreground)" strokeWidth={2} />
          <text x={barPx + 6} y={4} fontSize={12} fill="var(--muted-foreground)">
            {nice >= 1000 ? `${nice / 1000} km` : `${nice} m`}
          </text>
        </g>
      </svg>
      <figcaption className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ background: 'var(--status-good)' }} aria-hidden />
          {isLoop ? 'Boucle : départ et arrivée' : 'Départ'}
        </span>
        {!isLoop && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-foreground" aria-hidden /> Arrivée
          </span>
        )}
      </figcaption>
    </figure>
  )
}
