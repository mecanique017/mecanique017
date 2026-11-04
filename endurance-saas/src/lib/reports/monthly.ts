import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SportType } from '@/types/database'
import { getTrainingLoad, localDate } from '@/lib/training/load'
import { getWellness } from '@/lib/training/wellness'
import { addDays, mondayOf } from '@/lib/dates'
import type { DailyLoad } from '@/lib/training/metrics'

export interface MonthlyReport {
  athleteName: string
  month: string // YYYY-MM
  generatedAt: string
  totals: { sessions: number; seconds: number; meters: number; tss: number }
  bySport: { sport: SportType; sessions: number; seconds: number; meters: number; tss: number }[]
  weeks: { monday: string; tss: number; seconds: number }[]
  load: DailyLoad[] // jours du mois
  ctlStart: number
  ctlEnd: number
  tsbEnd: number
  wellness: { days: number; hrv: number | null; sleep: number | null; fatigue: number | null }
  plannedDone: { planned: number; done: number }
  insights: { count: number; fatigueAlerts: number }
  activities: { date: string; title: string; sport: SportType; seconds: number; meters: number; tss: number }[]
}

const avg = (values: (number | null)[]) => {
  const v = values.filter((x): x is number => x != null)
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null
}

/** Données du bilan d'un mois (fuseau Europe/Paris). user_id explicite : utilisable pour un athlète suivi. */
export async function getMonthlyReport(
  supabase: SupabaseClient<Database>,
  userId: string,
  month: string,
  athleteName: string
): Promise<MonthlyReport> {
  const first = `${month}-01`
  const nextMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10)
  const last = addDays(nextMonth, -1)
  const today = localDate(new Date())
  const end = last < today ? last : today

  const [series, { data: rawActivities }, wellness, { data: planned }, { data: insights }] = await Promise.all([
    getTrainingLoad(supabase, userId, new Date(`${end}T21:59:59Z`)),
    supabase
      .from('activities')
      .select('start_time, title, sport_type, duration_seconds, distance_meters, tss')
      .eq('user_id', userId)
      .gte('start_time', `${addDays(first, -1)}T00:00:00Z`)
      .lte('start_time', `${addDays(last, 1)}T23:59:59Z`)
      .order('start_time', { ascending: true }),
    getWellness(supabase, userId, first, last),
    supabase.from('planned_workouts').select('is_completed').eq('user_id', userId).gte('scheduled_date', first).lte('scheduled_date', last),
    supabase.from('coach_insights').select('fatigue_alert').eq('user_id', userId).gte('created_at', `${first}T00:00:00Z`).lt('created_at', `${nextMonth}T00:00:00Z`),
  ])

  const activities = (rawActivities ?? [])
    .map((a) => ({ date: localDate(a.start_time), title: a.title, sport: a.sport_type, seconds: a.duration_seconds, meters: Number(a.distance_meters), tss: Number(a.tss) }))
    .filter((a) => a.date >= first && a.date <= last)

  const bySportMap = new Map<SportType, MonthlyReport['bySport'][number]>()
  for (const a of activities) {
    const s = bySportMap.get(a.sport) ?? { sport: a.sport, sessions: 0, seconds: 0, meters: 0, tss: 0 }
    bySportMap.set(a.sport, { ...s, sessions: s.sessions + 1, seconds: s.seconds + a.seconds, meters: s.meters + a.meters, tss: s.tss + a.tss })
  }

  // Semaines (lundi) qui touchent le mois ; seules les séances du mois sont comptées
  const weeks: MonthlyReport['weeks'] = []
  for (let monday = mondayOf(first); monday <= last; monday = addDays(monday, 7)) {
    const inWeek = activities.filter((a) => a.date >= monday && a.date < addDays(monday, 7))
    weeks.push({ monday, tss: inWeek.reduce((s, a) => s + a.tss, 0), seconds: inWeek.reduce((s, a) => s + a.seconds, 0) })
  }

  const load = series.filter((d) => d.date >= first && d.date <= end)
  const before = series.filter((d) => d.date < first).at(-1)

  return {
    athleteName,
    month,
    generatedAt: new Date().toISOString(),
    totals: {
      sessions: activities.length,
      seconds: activities.reduce((s, a) => s + a.seconds, 0),
      meters: activities.reduce((s, a) => s + a.meters, 0),
      tss: activities.reduce((s, a) => s + a.tss, 0),
    },
    bySport: [...bySportMap.values()],
    weeks,
    load,
    ctlStart: before?.ctl ?? 0,
    ctlEnd: load.at(-1)?.ctl ?? 0,
    tsbEnd: load.at(-1)?.tsb ?? 0,
    wellness: {
      days: wellness.filter((d) => d.hrv != null || d.sleep_score != null || d.perceived_fatigue != null).length,
      hrv: avg(wellness.map((d) => d.hrv)),
      sleep: avg(wellness.map((d) => d.sleep_score)),
      fatigue: avg(wellness.map((d) => d.perceived_fatigue)),
    },
    plannedDone: { planned: planned?.length ?? 0, done: (planned ?? []).filter((p) => p.is_completed).length },
    insights: { count: insights?.length ?? 0, fatigueAlerts: (insights ?? []).filter((i) => i.fatigue_alert).length },
    activities,
  }
}
