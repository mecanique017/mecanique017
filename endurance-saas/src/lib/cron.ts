import 'server-only'
import { timingSafeEqual } from 'node:crypto'

/** Vercel Cron envoie « Authorization: Bearer $CRON_SECRET ». Sans secret configuré : refus. */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** E-mail d'un utilisateur (table auth.users, accessible au service role uniquement). */
export async function userEmail(admin: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>, userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId)
  return data.user?.email ?? null
}
