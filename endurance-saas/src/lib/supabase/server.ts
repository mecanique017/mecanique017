import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import type { Database } from '@/types/database'

/** Client Supabase pour Server Components, Server Actions et Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies()
  // Le client Auth lit l'heure (Date.now) dès sa création pour vérifier l'expiration du jeton :
  // avec Cache Components, cela doit se faire au rendu "à la requête", pas pendant le prérendu.
  await connection()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Appelé depuis un Server Component : ignorable,
            // le proxy (src/proxy.ts) rafraîchit la session.
          }
        },
      },
    }
  )
}
