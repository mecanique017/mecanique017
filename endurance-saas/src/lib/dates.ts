/** Opérations sur des dates "jour" au format YYYY-MM-DD (sans heure ni fuseau). */

const DAY_MS = 86_400_000
const toMs = (day: string) => Date.parse(`${day}T00:00:00Z`)
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toMs(v))

export function addDays(day: string, n: number): string {
  return fromMs(toMs(day) + n * DAY_MS)
}

/** Lundi de la semaine contenant ce jour (semaine ISO, lundi → dimanche). */
export function mondayOf(day: string): string {
  const dow = new Date(toMs(day)).getUTCDay() // 0 = dimanche
  return addDays(day, -((dow + 6) % 7))
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

const longDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })

export const formatLongDay = (day: string) => longDay.format(new Date(toMs(day)))
export const formatShortDay = (day: string) => shortDay.format(new Date(toMs(day)))
export const formatDayMonth = (day: string) => dayMonth.format(new Date(toMs(day)))
