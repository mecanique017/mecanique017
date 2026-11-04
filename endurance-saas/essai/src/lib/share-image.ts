/**
 * Image de partage d'une séance (réseaux sociaux), dessinée dans un <canvas> sur le téléphone :
 * aucun envoi à un service tiers, l'image est ensuite partagée par la feuille de partage du système.
 *  - story   : 1080 × 1920 (Instagram / Facebook / TikTok Stories)
 *  - square  : 1080 × 1080 (publication)
 *  - sticker : 1080 × 1080 transparent (à poser sur sa propre photo dans Instagram)
 */
export type ShareFormat = 'story' | 'square' | 'sticker'

export interface ShareData {
  title: string
  sport: string
  date: string
  stats: { label: string; value: string }[]
  route: [number, number][]
}

const RED = '#e10600'
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif'

export const SIZES: Record<ShareFormat, [number, number]> = { story: [1080, 1920], square: [1080, 1080], sticker: [1080, 1080] }

function drawRoute(ctx: CanvasRenderingContext2D, route: [number, number][], x: number, y: number, w: number, h: number, glow: boolean) {
  if (route.length < 2) return
  const lats = route.map((p) => p[0])
  const lngs = route.map((p) => p[1])
  const mid = (Math.min(...lats) + Math.max(...lats)) / 2
  const kx = Math.cos((mid * Math.PI) / 180)
  const xs = lngs.map((v) => v * kx)
  const minX = Math.min(...xs)
  const minY = Math.min(...lats)
  const spanX = Math.max(...xs) - minX || 1e-9
  const spanY = Math.max(...lats) - minY || 1e-9
  const scale = Math.min(w / spanX, h / spanY)
  const ox = x + (w - spanX * scale) / 2
  const oy = y + (h - spanY * scale) / 2
  const pt = (i: number) => [ox + (xs[i] - minX) * scale, oy + (spanY - (lats[i] - minY)) * scale] as const
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const path = () => {
    ctx.beginPath()
    route.forEach((_, i) => {
      const [px, py] = pt(i)
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    })
  }
  if (glow) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 22
    path()
    ctx.stroke()
  }
  ctx.strokeStyle = RED
  ctx.lineWidth = 12
  path()
  ctx.stroke()
  const dot = (i: number, color: string) => {
    const [px, py] = pt(i)
    ctx.beginPath()
    ctx.arc(px, py, 16, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  }
  dot(0, '#16a34a')
  dot(route.length - 1, '#111111')
}

/** Recadrage « cover » d'une photo sur tout le canvas. */
function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height)
  const dw = img.width * s
  const dh = img.height * s
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

export function renderShareImage(canvas: HTMLCanvasElement, data: ShareData, format: ShareFormat, photo?: ImageBitmap | HTMLImageElement | null) {
  const [W, H] = SIZES[format]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  const transparent = format === 'sticker'

  // Fond
  if (!transparent) {
    if (photo) {
      drawCover(ctx, photo, W, H)
      const g = ctx.createLinearGradient(0, H * 0.35, 0, H)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.85)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      // Haut assombri : titre lisible même sur une photo claire
      const t = ctx.createLinearGradient(0, 0, 0, H * 0.3)
      t.addColorStop(0, 'rgba(0,0,0,0.65)')
      t.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = t
      ctx.fillRect(0, 0, W, H * 0.3)
    } else {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, W, H)
      const g = ctx.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.4, W)
      g.addColorStop(0, 'rgba(225,6,0,0.22)')
      g.addColorStop(1, 'rgba(225,6,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
  }

  const shadow = (on: boolean) => {
    ctx.shadowColor = on ? 'rgba(0,0,0,0.6)' : 'transparent'
    ctx.shadowBlur = on ? 18 : 0
  }
  const pad = 80
  const statsH = format === 'story' ? 520 : 330
  const routeTop = format === 'story' ? 330 : 90
  const routeBox = { x: pad, y: routeTop, w: W - 2 * pad, h: H - routeTop - statsH - 60 }

  // Tracé
  shadow(transparent || !!photo)
  drawRoute(ctx, data.route, routeBox.x, routeBox.y, routeBox.w, routeBox.h, !!photo || transparent)
  shadow(transparent || !!photo)

  // En-tête (story uniquement : titre en haut)
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'alphabetic'
  if (format === 'story') {
    ctx.font = `600 40px ${FONT}`
    ctx.fillStyle = RED
    ctx.fillText(data.sport.toUpperCase(), pad, 170)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 72px ${FONT}`
    fitText(ctx, data.title, pad, 250, W - 2 * pad)
    ctx.font = `400 36px ${FONT}`
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText(data.date, pad, 300)
  }

  // Statistiques
  const stats = data.stats.slice(0, format === 'story' ? 4 : 3)
  const cols = format === 'story' ? 2 : 3
  const top = H - statsH
  const cw = (W - 2 * pad) / cols
  stats.forEach((st, i) => {
    const cx = pad + (i % cols) * cw
    const cy = top + Math.floor(i / cols) * 190 + (format === 'story' ? 40 : 70)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = `500 34px ${FONT}`
    ctx.fillText(st.label, cx, cy)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${format === 'story' ? 92 : 76}px ${FONT}`
    fitText(ctx, st.value, cx, cy + (format === 'story' ? 100 : 86), cw - 20)
  })
  if (format !== 'story') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = `600 34px ${FONT}`
    fitText(ctx, `${data.title} · ${data.date}`, pad, H - 70, W - 2 * pad - 260)
  }

  // Signature
  ctx.fillStyle = RED
  ctx.font = `900 40px ${FONT}`
  const brand = 'KRONOFIT'
  ctx.fillText(brand, W - pad - ctx.measureText(brand).width, format === 'story' ? H - 80 : H - 70)
  shadow(false)
}

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number) {
  let t = text
  while (ctx.measureText(t).width > max && t.length > 3) t = t.slice(0, -2)
  ctx.fillText(t === text ? t : `${t.trimEnd()}…`, x, y)
}

export function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(new File([b], name, { type: 'image/png' })) : reject(new Error('Image impossible'))), 'image/png'),
  )
}
