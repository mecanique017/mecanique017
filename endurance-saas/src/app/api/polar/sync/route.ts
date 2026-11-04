import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PolarError } from '@/lib/polar/client'
import { syncPolarUser } from '@/lib/polar/sync'

/** POST /api/polar/sync : synchronisation à la demande (bouton « Synchroniser maintenant »). */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    return NextResponse.json(await syncPolarUser(user.id))
  } catch (error) {
    if (error instanceof PolarError) {
      return NextResponse.json({ error: error.message }, { status: error.status === 429 ? 429 : 502 })
    }
    console.error('Synchronisation Polar', error)
    return NextResponse.json({ error: 'Synchronisation impossible' }, { status: 500 })
  }
}
