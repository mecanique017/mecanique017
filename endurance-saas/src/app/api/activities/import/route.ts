import { gunzipSync } from 'node:zlib'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FitImportError } from '@/lib/fit/parse-fit'
import { fileFormat, importActivityFile } from '@/lib/fit/import'

/** Limite sous celle des hébergeurs serverless (4,5 Mo sur Vercel). Une sortie de 5 h ≈ 1 à 2 Mo. */
const MAX_BYTES = 4 * 1024 * 1024

/**
 * POST /api/activities/import (multipart, champ "file" : .fit, .gpx ou .tcx) → { id }
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
  // Les gros .gpx / .tcx sont compressés par le navigateur (.gz) pour rester sous la limite d'envoi
  const gzipped = file.name.toLowerCase().endsWith('.gz')
  const format = fileFormat(gzipped ? file.name.slice(0, -3) : file.name)
  if (!format) {
    return NextResponse.json({ error: 'Format non pris en charge : fichier .fit, .gpx ou .tcx attendu' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (4 Mo maximum)' }, { status: 413 })
  }

  try {
    const result = await importActivityFile(supabase, user.id, gzipped ? gunzip(await file.arrayBuffer()) : await file.arrayBuffer(), { format, source: format })
    if (result.status === 'duplicate') {
      return NextResponse.json({ error: 'Séance déjà importée', id: result.id }, { status: 409 })
    }
    return NextResponse.json({ id: result.id, linkedPlannedWorkout: result.linkedPlannedWorkout }, { status: 201 })
  } catch (error) {
    if (error instanceof RangeError || (error as NodeJS.ErrnoException)?.code?.startsWith?.('Z_')) {
      return NextResponse.json({ error: 'Fichier compressé invalide ou trop volumineux' }, { status: 422 })
    }
    if (error instanceof FitImportError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('Import FIT', error)
    return NextResponse.json({ error: 'Import impossible' }, { status: 500 })
  }
}

/** Décompression bornée (protection contre les « bombes » de décompression). */
const MAX_UNCOMPRESSED = 50 * 1024 * 1024
function gunzip(buffer: ArrayBuffer): ArrayBuffer {
  const out = gunzipSync(Buffer.from(buffer), { maxOutputLength: MAX_UNCOMPRESSED })
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
}
