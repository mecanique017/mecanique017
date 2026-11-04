import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FitImportError } from '@/lib/fit/parse-fit'
import { importFitActivity } from '@/lib/fit/import'

/** Limite sous celle des hébergeurs serverless (4,5 Mo sur Vercel). Une sortie de 5 h ≈ 1 à 2 Mo. */
const MAX_BYTES = 4 * 1024 * 1024

/**
 * POST /api/activities/import (multipart, champ "file") → { id }
 * Le fichier est analysé côté serveur puis la séance est enregistrée ; le fichier lui-même n'est pas conservé.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
  }
  if (!file.name.toLowerCase().endsWith('.fit')) {
    return NextResponse.json({ error: 'Format non pris en charge : fichier .fit attendu' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (4 Mo maximum)' }, { status: 413 })
  }

  try {
    const result = await importFitActivity(supabase, user.id, await file.arrayBuffer(), { source: 'fit' })
    if (result.status === 'duplicate') {
      return NextResponse.json({ error: 'Séance déjà importée', id: result.id }, { status: 409 })
    }
    return NextResponse.json({ id: result.id, linkedPlannedWorkout: result.linkedPlannedWorkout }, { status: 201 })
  } catch (error) {
    if (error instanceof FitImportError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('Import FIT', error)
    return NextResponse.json({ error: 'Import impossible' }, { status: 500 })
  }
}
