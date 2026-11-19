/**
 * Badges et séries (logique pure, calculée à partir des séances : rien à stocker).
 * Chaque badge a une date d'obtention : la séance qui a franchi le seuil.
 */
import { sportFamily } from '@/lib/sports'

export interface BadgeActivity {
  id: string
  sport_type: string
  start_time: string
  duration_seconds: number
  distance_meters: number | null
  elevation_gain_meters: number | null
}

export interface Badge {
  key: string
  group: string
  title: string
  description: string
  icon: string
  /** date ISO d'obtention (null si pas encore obtenu) */
  earnedAt: string | null
  activityId: string | null
  /** progression 0..1 pour les badges non obtenus */
  progress: number
  progressLabel?: string
}

const dayKey = (iso: string, tz = 'Europe/Paris') => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso))
const hourOf = (iso: string, tz = 'Europe/Paris') =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).find((p) => p.type === 'hour')?.value ?? 12)
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
/** Lundi de la semaine (YYYY-MM-DD) */
const mondayOf = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export interface Streaks {
  /** jours consécutifs avec au moins une séance (en cours : se termine aujourd'hui ou hier) */
  currentDays: number
  bestDays: number
  /** semaines consécutives avec au moins une séance */
  currentWeeks: number
  bestWeeks: number
  activeDaysThisYear: number
}

export function streaks(acts: BadgeActivity[], today: string): Streaks {
  const days = [...new Set(acts.map((a) => dayKey(a.start_time)))].sort()
  let best = 0
  let run = 0
  for (let i = 0; i < days.length; i++) {
    run = i && daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  }
  const last = days[days.length - 1]
  const currentDays = last && daysBetween(last, today) <= 1 ? run : 0
  const weeks = [...new Set(days.map(mondayOf))].sort()
  let bestW = 0
  let runW = 0
  for (let i = 0; i < weeks.length; i++) {
    runW = i && daysBetween(weeks[i - 1], weeks[i]) === 7 ? runW + 1 : 1
    bestW = Math.max(bestW, runW)
  }
  const lastW = weeks[weeks.length - 1]
  const thisMonday = mondayOf(today)
  const currentWeeks = lastW && daysBetween(lastW, thisMonday) <= 7 ? runW : 0
  return { currentDays, bestDays: best, currentWeeks, bestWeeks: bestW, activeDaysThisYear: days.filter((d) => d.startsWith(today.slice(0, 4))).length }
}

type Def = {
  key: string
  group: string
  title: string
  description: string
  icon: string
  /** valeur atteinte après chaque séance (cumul ou maximum) et seuil */
  target: number
  unit?: string
  measure: (a: BadgeActivity, state: State) => number
}
interface State {
  count: number
  km: number
  dplus: number
  sports: Set<string>
  dayRun: number
  lastDay: string | null
}

const km = (a: BadgeActivity) => (a.distance_meters ?? 0) / 1000
const isRun = (a: BadgeActivity) => sportFamily(a.sport_type) === 'run' && a.sport_type !== 'walk' && a.sport_type !== 'hike'
const isRide = (a: BadgeActivity) => sportFamily(a.sport_type) === 'ride'

const DEFS: Def[] = [
  { key: 'first', group: 'Régularité', title: 'Premier pas', description: 'Première séance enregistrée', icon: '👟', target: 1, measure: (_, s) => s.count },
  ...[10, 50, 100, 250].map((n) => ({ key: `count-${n}`, group: 'Régularité', title: `${n} séances`, description: `${n} séances au compteur`, icon: n >= 100 ? '🏅' : '📅', target: n, measure: (_: BadgeActivity, s: State) => s.count })),
  ...[3, 7, 14, 30].map((n) => ({ key: `streak-${n}`, group: 'Séries', title: `${n} jours d’affilée`, description: `Au moins une séance ${n} jours de suite`, icon: n >= 14 ? '🔥' : '⚡', target: n, unit: 'j', measure: (_: BadgeActivity, s: State) => s.dayRun })),
  ...[5, 10, 21.1, 42.2].map((d) => ({
    key: `run-${d}`,
    group: 'Course',
    title: d === 21.1 ? 'Semi-marathon' : d === 42.2 ? 'Marathon' : `${d} km en courant`,
    description: `Une sortie de course d’au moins ${String(d).replace('.', ',')} km`,
    icon: d >= 21 ? '🏃' : '🏁',
    target: d,
    unit: 'km',
    measure: (a: BadgeActivity) => (isRun(a) ? km(a) + 0.05 : 0),
  })),
  ...[50, 100, 160].map((d) => ({
    key: `ride-${d}`,
    group: 'Vélo',
    title: d === 160 ? 'Cent miles' : `${d} km à vélo`,
    description: `Une sortie vélo d’au moins ${d} km`,
    icon: '🚴',
    target: d,
    unit: 'km',
    measure: (a: BadgeActivity) => (isRide(a) ? km(a) + 0.1 : 0),
  })),
  ...[100, 500, 1000, 5000].map((d) => ({ key: `total-${d}`, group: 'Cumul', title: `${d.toLocaleString('fr-FR')} km`, description: `${d.toLocaleString('fr-FR')} km cumulés, tous sports`, icon: d >= 1000 ? '🌍' : '🛣️', target: d, unit: 'km', measure: (_: BadgeActivity, s: State) => s.km })),
  ...[500, 1000, 2000].map((d) => ({ key: `climb-${d}`, group: 'Montagne', title: `${d.toLocaleString('fr-FR')} m de D+`, description: `${d.toLocaleString('fr-FR')} m de dénivelé positif en une séance`, icon: '⛰️', target: d, unit: 'm', measure: (a: BadgeActivity) => a.elevation_gain_meters ?? 0 })),
  { key: 'everest', group: 'Montagne', title: 'Everest', description: '8 848 m de dénivelé positif cumulés', icon: '🏔️', target: 8848, unit: 'm', measure: (_, s) => s.dplus },
  { key: 'long-2h', group: 'Endurance', title: 'Deux heures', description: 'Une séance de 2 h ou plus', icon: '⏱️', target: 2, unit: 'h', measure: (a) => a.duration_seconds / 3600 },
  { key: 'long-4h', group: 'Endurance', title: 'Quatre heures', description: 'Une séance de 4 h ou plus', icon: '🦾', target: 4, unit: 'h', measure: (a) => a.duration_seconds / 3600 },
  { key: 'early', group: 'Moments', title: 'Lève-tôt', description: 'Une séance commencée avant 7 h', icon: '🌅', target: 1, measure: (a) => (hourOf(a.start_time) < 7 ? 1 : 0) },
  { key: 'night', group: 'Moments', title: 'Noctambule', description: 'Une séance commencée après 21 h', icon: '🌙', target: 1, measure: (a) => (hourOf(a.start_time) >= 21 ? 1 : 0) },
  { key: 'multi', group: 'Moments', title: 'Polyvalent', description: 'Trois sports différents pratiqués', icon: '🎯', target: 3, measure: (_, s) => s.sports.size },
]

/** Badges obtenus (avec date) et à venir (avec progression), dans l'ordre des définitions. */
export function computeBadges(acts: BadgeActivity[]): Badge[] {
  const sorted = [...acts].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const s: State = { count: 0, km: 0, dplus: 0, sports: new Set(), dayRun: 0, lastDay: null }
  const best = new Map<string, number>()
  const earned = new Map<string, { at: string; id: string }>()
  for (const a of sorted) {
    const day = dayKey(a.start_time)
    s.count++
    s.km += km(a)
    s.dplus += a.elevation_gain_meters ?? 0
    s.sports.add(a.sport_type)
    if (s.lastDay !== day) {
      s.dayRun = s.lastDay && daysBetween(s.lastDay, day) === 1 ? s.dayRun + 1 : 1
      s.lastDay = day
    }
    for (const d of DEFS) {
      const v = d.measure(a, s)
      best.set(d.key, Math.max(best.get(d.key) ?? 0, v))
      if (!earned.has(d.key) && v >= d.target) earned.set(d.key, { at: a.start_time, id: a.id })
    }
  }
  return DEFS.map((d) => {
    const e = earned.get(d.key)
    const v = best.get(d.key) ?? 0
    const fmt = (x: number) => (Math.round(x * 10) / 10).toLocaleString('fr-FR')
    return {
      key: d.key,
      group: d.group,
      title: d.title,
      description: d.description,
      icon: d.icon,
      earnedAt: e?.at ?? null,
      activityId: e?.id ?? null,
      progress: e ? 1 : Math.min(0.99, v / d.target),
      progressLabel: e || d.target === 1 ? undefined : `${fmt(Math.min(v, d.target))} / ${fmt(d.target)}${d.unit ? ` ${d.unit}` : ''}`,
    }
  })
}

export interface MonthStats {
  month: string // YYYY-MM
  sessions: number
  km: number
  seconds: number
  dplus: number
  activeDays: number
  bySport: { sport: string; sessions: number; km: number; seconds: number }[]
  longest: BadgeActivity | null
  bestWeekKm: number
  days: Set<string>
}

export function monthStats(acts: BadgeActivity[], month: string): MonthStats {
  const list = acts.filter((a) => dayKey(a.start_time).startsWith(month))
  const by = new Map<string, { sport: string; sessions: number; km: number; seconds: number }>()
  const weeks = new Map<string, number>()
  for (const a of list) {
    const e = by.get(a.sport_type) ?? { sport: a.sport_type, sessions: 0, km: 0, seconds: 0 }
    e.sessions++
    e.km += km(a)
    e.seconds += a.duration_seconds
    by.set(a.sport_type, e)
    const w = mondayOf(dayKey(a.start_time))
    weeks.set(w, (weeks.get(w) ?? 0) + km(a))
  }
  const days = new Set(list.map((a) => dayKey(a.start_time)))
  return {
    month,
    sessions: list.length,
    km: list.reduce((t, a) => t + km(a), 0),
    seconds: list.reduce((t, a) => t + a.duration_seconds, 0),
    dplus: list.reduce((t, a) => t + (a.elevation_gain_meters ?? 0), 0),
    activeDays: days.size,
    bySport: [...by.values()].sort((a, b) => b.seconds - a.seconds),
    longest: list.reduce<BadgeActivity | null>((m, a) => (!m || a.duration_seconds > m.duration_seconds ? a : m), null),
    bestWeekKm: Math.max(0, ...weeks.values()),
    days,
  }
}
