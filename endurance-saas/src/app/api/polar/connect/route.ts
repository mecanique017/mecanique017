import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authorizationUrl, polarConfigured, STATE_COOKIE } from '@/lib/polar/client'


/**
 * POST /api/polar/connect (formulaire avec la case de consentement « ai_consent »)
 * → redirection vers Polar Flow. Le consentement à l'envoi des données au coach IA est obligatoire
 * (licence Polar § 3.1.1 : pas de transmission à un tiers sans permission explicite du membre).
 */
export async function POST(req: NextRequest) {
  const back = (error: string) => NextResponse.redirect(new URL(`/dashboard/integrations?polar=${error}`, req.url), 303)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url), 303)
  if (!polarConfigured()) return back('not_configured')

  const form = await req.formData()
  if (form.get('ai_consent') !== 'on') return back('consent_required')

  const state = randomBytes(24).toString('base64url')
  const redirectUri = new URL('/api/polar/callback', process.env.NEXT_PUBLIC_SITE_URL ?? req.url).toString()
  const res = NextResponse.redirect(authorizationUrl(redirectUri, state), 303)
  // Anti-CSRF : le state renvoyé par Polar doit correspondre à ce cookie (10 min)
  res.cookies.set(STATE_COOKIE, `${state}.${user.id}.${Date.now()}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/polar',
  })
  return res
}
