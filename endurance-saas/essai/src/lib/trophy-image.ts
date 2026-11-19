/**
 * Images partageables (format story 1080 × 1920) : badge obtenu et bilan du mois.
 * Fond noir, accent rouge KronoFit, emblème du logo en signature.
 */
const RED = '#e10600'
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif'
export const W = 1080
export const H = 1920

function background(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createRadialGradient(W / 2, H * 0.38, 60, W / 2, H * 0.38, W)
  g.addColorStop(0, 'rgba(225,6,0,0.28)')
  g.addColorStop(1, 'rgba(225,6,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function brand(ctx: CanvasRenderingContext2D, mark?: HTMLImageElement | null, baseline = H - 150) {
  ctx.fillStyle = RED
  ctx.font = `900 44px ${FONT}`
  ctx.textAlign = 'left'
  const text = 'KRONOFIT'
  const bw = ctx.measureText(text).width
  const s = 72
  const total = (mark?.complete && mark.naturalWidth ? s + 18 : 0) + bw
  const x0 = (W - total) / 2
  if (mark?.complete && mark.naturalWidth) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x0, baseline - s + 14, s, s, 16)
    ctx.clip()
    ctx.drawImage(mark, x0, baseline - s + 14, s, s)
    ctx.restore()
  }
  ctx.fillText(text, x0 + total - bw, baseline)
}

function centered(ctx: CanvasRenderingContext2D, text: string, y: number, font: string, color = '#fff', max = W - 160) {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  let size = Number(/(\d+)px/.exec(font)?.[1] ?? 40)
  while (ctx.measureText(text).width > max && size > 20) {
    size -= 2
    ctx.font = font.replace(/\d+px/, `${size}px`)
  }
  ctx.fillText(text, W / 2, y)
}

export function renderBadgeImage(canvas: HTMLCanvasElement, b: { icon: string; title: string; description: string; date: string; name?: string | null }, mark?: HTMLImageElement | null) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  background(ctx)
  centered(ctx, 'NOUVEAU BADGE', 330, `700 46px ${FONT}`, RED)
  // Médaille
  const cx = W / 2
  const cy = 820
  ctx.beginPath()
  ctx.arc(cx, cy, 300, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fill()
  ctx.lineWidth = 14
  ctx.strokeStyle = RED
  ctx.stroke()
  ctx.font = `300px ${FONT}`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(b.icon, cx, cy + 20)
  ctx.textBaseline = 'alphabetic'
  centered(ctx, b.title, 1290, `800 96px ${FONT}`)
  centered(ctx, b.description, 1380, `400 44px ${FONT}`, 'rgba(255,255,255,0.75)')
  centered(ctx, [b.name, b.date].filter(Boolean).join(' · '), 1470, `500 40px ${FONT}`, 'rgba(255,255,255,0.6)')
  brand(ctx, mark)
}

export interface RecapImageData {
  monthLabel: string
  name?: string | null
  stats: { label: string; value: string }[]
  sports: { label: string; value: string }[]
  days: boolean[] // jours actifs du mois
  firstWeekday: number // 0 = lundi
  badges: string[] // icônes obtenues dans le mois
}

export function renderRecapImage(canvas: HTMLCanvasElement, d: RecapImageData, mark?: HTMLImageElement | null) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  background(ctx)
  centered(ctx, 'MON MOIS', 220, `700 46px ${FONT}`, RED)
  centered(ctx, d.monthLabel, 320, `800 92px ${FONT}`)
  if (d.name) centered(ctx, d.name, 390, `500 40px ${FONT}`, 'rgba(255,255,255,0.6)')

  // Statistiques (grille 2 × 2)
  const pad = 90
  const colW = (W - 2 * pad) / 2
  d.stats.slice(0, 4).forEach((s, i) => {
    const x = pad + (i % 2) * colW
    const y = 530 + Math.floor(i / 2) * 210
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = `500 38px ${FONT}`
    ctx.fillText(s.label, x, y)
    ctx.fillStyle = '#fff'
    ctx.font = `800 96px ${FONT}`
    ctx.fillText(s.value, x, y + 100)
  })

  // Calendrier des jours actifs
  const cell = 76
  const gap = 14
  const gridW = 7 * cell + 6 * gap
  const gx = (W - gridW) / 2
  const gy = 960
  ;['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((l, i) => {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = `600 30px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(l, gx + i * (cell + gap) + cell / 2, gy - 20)
  })
  d.days.forEach((active, i) => {
    const pos = i + d.firstWeekday
    const x = gx + (pos % 7) * (cell + gap)
    const y = gy + Math.floor(pos / 7) * (cell + gap)
    ctx.beginPath()
    ctx.roundRect(x, y, cell, cell, 18)
    ctx.fillStyle = active ? RED : 'rgba(255,255,255,0.08)'
    ctx.fill()
    ctx.fillStyle = active ? '#fff' : 'rgba(255,255,255,0.4)'
    ctx.font = `600 32px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(String(i + 1), x + cell / 2, y + cell / 2 + 10)
  })
  const rows = Math.ceil((d.days.length + d.firstWeekday) / 7)
  let y = gy + rows * (cell + gap) + 70

  // Sports
  if (d.sports.length) {
    centered(ctx, d.sports.slice(0, 3).map((s) => `${s.label} ${s.value}`).join('   ·   '), y, `600 38px ${FONT}`, 'rgba(255,255,255,0.85)')
    y += 80
  }
  if (d.badges.length) centered(ctx, d.badges.slice(0, 8).join('  '), Math.min(y + 30, H - 220), `72px ${FONT}`)
  brand(ctx, mark, H - 80)
}
