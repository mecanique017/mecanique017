/**
 * Météo pour sortir (Open-Meteo : gratuit, sans clé, données Météo-France / ECMWF).
 * Logique pure : choix du meilleur créneau de sortie selon pluie, vent, température et jour.
 */
export interface Hour {
  time: string // YYYY-MM-DDTHH:mm (heure locale)
  temp: number
  feels: number
  rainProb: number // %
  rain: number // mm
  wind: number // km/h
  gust: number // km/h
  windDir: number // degrés d'où vient le vent
  code: number // code météo WMO
  day: boolean
}

export interface Forecast {
  hours: Hour[]
  sunrise: string[]
  sunset: string[]
}

export const forecastUrl = (lat: number, lng: number) =>
  'https://api.open-meteo.com/v1/forecast?hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,is_day' +
  `&daily=sunrise,sunset&timezone=Europe%2FParis&forecast_days=2&latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}`

/** Réponse Open-Meteo → prévisions heure par heure. */
export function parseForecast(json: {
  hourly: Record<string, (number | string | null)[]>
  daily: { sunrise: string[]; sunset: string[] }
}): Forecast {
  const h = json.hourly
  const n = (k: string, i: number) => Number(h[k]?.[i] ?? 0)
  return {
    hours: (h.time as string[]).map((time, i) => ({
      time,
      temp: n('temperature_2m', i),
      feels: n('apparent_temperature', i),
      rainProb: n('precipitation_probability', i),
      rain: n('precipitation', i),
      wind: n('wind_speed_10m', i),
      gust: n('wind_gusts_10m', i),
      windDir: n('wind_direction_10m', i),
      code: n('weather_code', i),
      day: n('is_day', i) === 1,
    })),
    sunrise: json.daily.sunrise,
    sunset: json.daily.sunset,
  }
}

/** Libellé et pictogramme d'un code météo WMO. */
export function describe(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Ciel dégagé', icon: '☀️' }
  if (code <= 2) return { label: 'Éclaircies', icon: '🌤️' }
  if (code === 3) return { label: 'Couvert', icon: '☁️' }
  if (code <= 48) return { label: 'Brouillard', icon: '🌫️' }
  if (code <= 57) return { label: 'Bruine', icon: '🌦️' }
  if (code <= 67) return { label: 'Pluie', icon: '🌧️' }
  if (code <= 77) return { label: 'Neige', icon: '🌨️' }
  if (code <= 82) return { label: 'Averses', icon: '🌦️' }
  if (code <= 86) return { label: 'Averses de neige', icon: '🌨️' }
  return { label: 'Orage', icon: '⛈️' }
}

export const windFrom = (deg: number) => ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'][Math.round(((deg % 360) / 45)) % 8]

/** Pénalité d'une heure pour une sortie (0 = idéal). Le vélo est plus sensible au vent et au froid. */
export function hourPenalty(h: Hour, sport: 'run' | 'ride' = 'run') {
  const ideal = sport === 'ride' ? [14, 22] : [8, 16]
  const t = h.feels
  const cold = Math.max(0, ideal[0] - t)
  const hot = Math.max(0, t - ideal[1])
  let p = 0
  p += h.rainProb * 0.6 + h.rain * 25
  p += (sport === 'ride' ? 1.2 : 0.5) * Math.max(0, h.wind - 15) + 0.5 * Math.max(0, h.gust - 45)
  p += cold * (sport === 'ride' ? 4 : 2.5) + hot * 3.5
  if (!h.day) p += 40 // de nuit : possible, mais moins agréable et moins sûr
  if (h.code >= 95) p += 200 // orage
  else if (h.code >= 71 && h.code <= 77) p += 60 // neige
  return p
}

export interface Slot {
  start: string
  end: string
  hours: Hour[]
  penalty: number
}

/**
 * Meilleur créneau de `length` heures à partir de maintenant (aujourd'hui, sinon demain),
 * de préférence en journée, entre 6 h et 21 h.
 */
export function bestSlot(f: Forecast, now: Date, length = 2, sport: 'run' | 'ride' = 'run'): Slot | null {
  const pad = (n: number) => String(n).padStart(2, '0')
  const nowKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`
  const candidates: Slot[] = []
  for (let i = 0; i + length <= f.hours.length; i++) {
    const hs = f.hours.slice(i, i + length)
    if (hs[0].time < nowKey) continue
    const hour = Number(hs[0].time.slice(11, 13))
    if (hour < 6 || hour + length > 21) continue
    if (hs[0].time.slice(0, 10) !== hs[hs.length - 1].time.slice(0, 10)) continue
    const penalty = hs.reduce((a, h) => a + hourPenalty(h, sport), 0) / length
    const end = `${hs[0].time.slice(0, 11)}${pad(hour + length)}:00`
    candidates.push({ start: hs[0].time, end, hours: hs, penalty })
  }
  if (!candidates.length) return null
  const today = nowKey.slice(0, 10)
  const todays = candidates.filter((c) => c.start.startsWith(today))
  const pick = (list: Slot[]) => list.reduce((a, b) => (b.penalty < a.penalty ? b : a))
  // Aujourd'hui s'il reste un créneau correct, sinon le meilleur de demain
  if (todays.length) {
    const best = pick(todays)
    if (best.penalty < 40) return best
    const tomorrow = candidates.filter((c) => !c.start.startsWith(today))
    if (tomorrow.length) {
      const t = pick(tomorrow)
      return t.penalty + 15 < best.penalty ? t : best
    }
    return best
  }
  return pick(candidates)
}

/** Appréciation courte du créneau. */
export function verdict(p: number) {
  if (p < 12) return { label: 'Conditions idéales', tone: 'good' as const }
  if (p < 30) return { label: 'Bonnes conditions', tone: 'good' as const }
  if (p < 60) return { label: 'Conditions moyennes', tone: 'info' as const }
  return { label: 'Conditions difficiles', tone: 'warn' as const }
}
