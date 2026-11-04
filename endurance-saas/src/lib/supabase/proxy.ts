import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Routes réservées aux utilisateurs connectés. */
const PROTECTED_PREFIXES = ['/dashboard']
/** Routes d'auth : un utilisateur déjà connecté est renvoyé vers le dashboard. */
const AUTH_ROUTES = ['/login', '/register']

/**
 * Rafraîchit la session Supabase à chaque requête, propage les cookies
 * et applique les redirections d'accès.
 * Appelé depuis src/proxy.ts (ex-"middleware" depuis Next.js 16).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Sans configuration Supabase (dev local), on laisse passer.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Ne rien insérer entre createServerClient et getUser() : rafraîchit le token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return redirectWithCookies(request, response, '/login')
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    return redirectWithCookies(request, response, '/dashboard')
  }

  return response
}

/** Redirige en conservant les cookies de session éventuellement rafraîchis. */
function redirectWithCookies(request: NextRequest, from: NextResponse, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  const redirect = NextResponse.redirect(url)
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}
