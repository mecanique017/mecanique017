import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SportType } from '@/types/database'
import { localDate } from './load'

/**
 * Automatisation : une séance réalisée valide la séance prévue du même jour et du même sport
 * (la première non encore réalisée). Retourne l'id de la séance prévue associée, ou null.
 */
export async function linkPlannedWorkout(
  supabase: SupabaseClient<Database>,
  activity: { id: string; sport_type: SportType; start_time: string }
): Promise<string | null> {
  const { data: planned } = await supabase
    .from('planned_workouts')
    .select('id')
    .eq('scheduled_date', localDate(activity.start_time))
    .eq('sport_type', activity.sport_type)
    .eq('is_completed', false)
    .is('activity_id', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!planned) return null

  const { error } = await supabase
    .from('planned_workouts')
    .update({ is_completed: true, activity_id: activity.id })
    .eq('id', planned.id)
  return error ? null : planned.id
}
