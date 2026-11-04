import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deregisterUser } from '@/lib/polar/client'

/**
 * POST /api/polar/disconnect : désenregistrement chez Polar puis suppression du jeton
 * (licence Polar § 3.3). Les séances déjà importées restent dans le compte de l'utilisateur,
 * sauf s'il coche « supprimer aussi les séances Polar ».
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url), 303)

  const form = await req.formData().catch(() => null)
  const admin = createAdminClient()
  const { data: connection } = await admin.from('polar_connections').select('access_token, polar_user_id').eq('user_id', user.id).maybeSingle()

  if (connection) {
    try {
      await deregisterUser(connection.access_token, connection.polar_user_id)
    } catch (error) {
      // Jeton déjà révoqué côté Polar : on supprime quand même la connexion locale
      console.error('Désenregistrement Polar', error)
    }
    await admin.from('polar_connections').delete().eq('user_id', user.id)
  }
  if (form?.get('delete_activities') === 'on') {
    await supabase.from('activities').delete().eq('source', 'polar')
  }
  return NextResponse.redirect(new URL('/dashboard/integrations?polar=disconnected', req.url), 303)
}
