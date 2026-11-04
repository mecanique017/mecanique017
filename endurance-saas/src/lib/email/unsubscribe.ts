import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

export type EmailKind = 'weekly' | 'fatigue'

/**
 * Lien de désinscription signé (HMAC-SHA256) : il identifie l'utilisateur sans connexion,
 * sans pouvoir être fabriqué pour un autre compte.
 */
const secret = () => {
  const s = process.env.EMAIL_UNSUBSCRIBE_SECRET
  if (!s || s.length < 32) throw new Error('EMAIL_UNSUBSCRIBE_SECRET manquant (32 caractères minimum)')
  return s
}

const sign = (userId: string, kind: EmailKind) => createHmac('sha256', secret()).update(`${userId}:${kind}`).digest('base64url')

export function unsubscribeUrl(userId: string, kind: EmailKind) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const url = new URL('/api/email/unsubscribe', base)
  url.searchParams.set('u', userId)
  url.searchParams.set('k', kind)
  url.searchParams.set('s', sign(userId, kind))
  return url.toString()
}

export function verifyUnsubscribe(userId: string, kind: string, signature: string): kind is EmailKind {
  if (kind !== 'weekly' && kind !== 'fatigue') return false
  const expected = Buffer.from(sign(userId, kind))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
