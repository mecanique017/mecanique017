import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { addDays } from '@/lib/dates'

export interface WellnessDay {
  date: string
  hrv: number | null
  resting_hr: number | null
  sleep_score: number | null
  perceived_fatigue: number | null
}

/** Relevés de bien-être sur [from, to], triés par date. */
export async function getWellness(
  supabase: SupabaseClient<Database>,
  userId: string,
  from: string,
  to: string
): Promise<WellnessDay[]> {
  const { data, error } = await supabase
    .from('daily_metrics')
    .select('date, hrv, resting_hr, sleep_score, perceived_fatigue')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

const mean = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null)

/** Moyenne de VFC des 7 jours précédant `day` (hors jour même) : la référence personnelle. */
export function hrvBaseline(history: WellnessDay[], day: string): number | null {
  const from = addDays(day, -7)
  const values = history.filter((d) => d.date >= from && d.date < day && d.hrv != null).map((d) => d.hrv!)
  // Au moins 3 mesures pour une référence fiable
  return values.length >= 3 ? Math.round(mean(values)!) : null
}

/** Contexte bien-être d'un jour, pour le coach IA et le tableau de bord. */
export async function getWellnessContext(supabase: SupabaseClient<Database>, userId: string, day: string) {
  const history = await getWellness(supabase, userId, addDays(day, -7), day)
  const today = history.find((d) => d.date === day) ?? null
  return { today, hrvBaseline: hrvBaseline(history, day) }
}
