import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Échange le code reçu (lien de confirmation email / OAuth) contre une session.
 * `next` est restreint aux chemins internes pour éviter les redirections ouvertes.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  const error = encodeURIComponent('Impossible de valider la session')
  return NextResponse.redirect(`${origin}/login?error=${error}`)
}

function safeNextPath(next: string | null): string {
  // Seuls les chemins relatifs du type "/xxx" sont acceptés ("//" ou "/\" = autre domaine)
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/dashboard'
  }
  return next
}
