import { timingSafeEqual } from 'node:crypto'
import { after, NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCode, registerUser } from '@/lib/polar/client'
import { syncPolarUser } from '@/lib/polar/sync'
import { STATE_COOKIE } from '@/lib/polar/client'

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** GET /api/polar/callback?code&state : retour de Polar Flow après autorisation. */
export async function GET(req: NextRequest) {
  const back = (status: string) => {
    const res = NextResponse.redirect(new URL(`/dashboard/integrations?polar=${status}`, req.url))
    res.cookies.delete({ name: STATE_COOKIE, path: '/api/polar' })
    return res
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const { searchParams } = req.nextUrl
  if (searchParams.get('error')) return back('denied') // refus sur Polar Flow

  const [state, cookieUser, issuedAt] = (req.cookies.get(STATE_COOKIE)?.value ?? '').split('.')
  const code = searchParams.get('code')
  if (!code || !state || !safeEqual(state, searchParams.get('state') ?? '') || cookieUser !== user.id || Date.now() - Number(issuedAt) > 600_000) {
    return back('invalid_state')
  }

  try {
    const redirectUri = new URL('/api/polar/callback', process.env.NEXT_PUBLIC_SITE_URL ?? req.url).toString()
    const { accessToken, polarUserId } = await exchangeCode(code, redirectUri)
    await registerUser(accessToken, user.id)

    const { error } = await createAdminClient()
      .from('polar_connections')
      .upsert(
        { user_id: user.id, polar_user_id: polarUserId, access_token: accessToken, ai_consent_at: new Date().toISOString(), last_sync_error: null },
        { onConflict: 'user_id' }
      )
    if (error) throw error
  } catch (error) {
    console.error('Connexion Polar', error)
    return back('error')
  }

  // Première synchronisation après la réponse (l'utilisateur n'attend pas)
  after(() => syncPolarUser(user.id).catch((e) => console.error('Synchronisation Polar initiale', e)))
  return back('connected')
}
