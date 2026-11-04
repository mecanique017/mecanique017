import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SubscriptionTier } from '@/types/database'
import { getPlan } from './plans'

export interface CoachUsage {
  used: number
  /** null = illimité */
  limit: number | null
  remaining: number | null
}

/** Analyses du coach consommées ce mois-ci (mois calendaire UTC). */
export async function getCoachUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: SubscriptionTier
): Promise<CoachUsage> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const { count, error } = await supabase
    .from('coach_insights')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart)
  if (error) throw error

  const used = count ?? 0
  const limit = getPlan(tier).monthlyCoachAnalyses
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used) }
}
