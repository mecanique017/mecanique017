import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/admin'

/** Le jeton d'invitation n'est jamais stocké en clair : seul son SHA-256 l'est. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const newInviteToken = () => randomBytes(32).toString('base64url')

export interface CoachedAthlete {
  relation_id: string
  athlete_id: string
  full_name: string | null
  sport_discipline: string
  ftp: number
  hr_max: number
  hr_rest: number
  lactate_threshold_hr: number
  vma: number
  accepted_at: string
}

/** Athlètes actifs du coach connecté (colonnes sportives uniquement, via la fonction SQL dédiée). */
export async function getCoachedAthletes(supabase: SupabaseClient<Database>): Promise<CoachedAthlete[]> {
  const { data, error } = await supabase.rpc('coached_athletes')
  if (error) throw error
  return (data ?? []) as CoachedAthlete[]
}

/** Coachs actifs de l'athlète connecté. */
export async function getMyCoaches(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.rpc('my_coaches')
  if (error) throw error
  return (data ?? []) as { relation_id: string; coach_id: string; full_name: string | null; accepted_at: string }[]
}

export type InvitationLookup =
  | { status: 'ok'; id: string; coachId: string; coachName: string | null; invitedEmail: string }
  | { status: 'invalid' | 'expired' | 'used' }

/** Recherche d'une invitation par jeton (service role : le hash n'est pas lisible par les utilisateurs). */
export async function findInvitation(token: string): Promise<InvitationLookup> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('coach_athletes')
    .select('id, coach_id, invited_email, status, expires_at')
    .eq('invite_token_hash', hashToken(token))
    .maybeSingle()
  if (!data) return { status: 'invalid' }
  if (data.status !== 'pending') return { status: 'used' }
  if (Date.parse(data.expires_at) < Date.now()) return { status: 'expired' }
  const { data: coach } = await admin.from('profiles').select('full_name').eq('id', data.coach_id).single()
  return { status: 'ok', id: data.id, coachId: data.coach_id, coachName: coach?.full_name ?? null, invitedEmail: data.invited_email }
}
