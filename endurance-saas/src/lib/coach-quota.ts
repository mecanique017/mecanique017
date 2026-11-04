import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AiUsageKind, Database, SubscriptionTier } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan } from './plans'

export interface CoachUsage {
  used: number
  /** null = illimité */
  limit: number | null
  remaining: number | null
}

const LIMITS: Record<AiUsageKind, (tier: SubscriptionTier) => number | null> = {
  coach_analysis: (tier) => getPlan(tier).monthlyCoachAnalyses,
  training_plan: (tier) => getPlan(tier).monthlyTrainingPlans,
}

/**
 * Consommation IA du mois calendaire (UTC), lue dans ai_usage.
 * Ce journal n'est modifiable que par le serveur : supprimer ses analyses ne libère pas de quota.
 */
export async function getAiUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: SubscriptionTier,
  kind: AiUsageKind = 'coach_analysis'
): Promise<CoachUsage> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const { count, error } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', monthStart)
  if (error) throw error

  const used = count ?? 0
  const limit = LIMITS[kind](tier)
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used) }
}

/** Compatibilité : quota des analyses de séance. */
export const getCoachUsage = (supabase: SupabaseClient<Database>, userId: string, tier: SubscriptionTier) =>
  getAiUsage(supabase, userId, tier, 'coach_analysis')

/** Enregistre un appel IA réussi (client service role : l'utilisateur n'a pas le droit d'écrire). */
export async function recordAiUsage(userId: string, kind: AiUsageKind) {
  const { error } = await createAdminClient().from('ai_usage').insert({ user_id: userId, kind })
  if (error) throw error
}

/** Le journal de quotas exige la clé service role. */
export const aiQuotaConfigured = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
