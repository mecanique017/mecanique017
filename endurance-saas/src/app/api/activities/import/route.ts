import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FitImportError, parseFitActivity } from '@/lib/fit/parse-fit'
import { calculateTSS } from '@/lib/training/metrics'
import { linkPlannedWorkout } from '@/lib/training/planned'

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

  let parsed
  try {
    parsed = await parseFitActivity(await file.arrayBuffer())
  } catch (error) {
    if (error instanceof FitImportError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('Import FIT', error)
    return NextResponse.json({ error: 'Lecture du fichier impossible' }, { status: 422 })
  }

  // Doublon : même heure de départ déjà enregistrée (réimport du même fichier)
  const { data: existing } = await supabase
    .from('activities')
    .select('id')
    .eq('start_time', parsed.startTime)
    .limit(1)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'Séance déjà importée', id: existing.id }, { status: 409 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('ftp, hr_rest, lactate_threshold_hr')
    .eq('id', user.id)
    .single()
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  }

  // TSS vélo : puissance normalisée si disponible (plus juste que la moyenne sur des intervalles)
  const { tss, intensityFactor } = calculateTSS({
    durationSeconds: parsed.durationSeconds,
    avgWatts: parsed.normalizedPower ?? parsed.avgWatts,
    ftp: profile.ftp,
    avgHr: parsed.avgHr,
    hrRest: profile.hr_rest,
    lactateThresholdHr: profile.lactate_threshold_hr,
  })

  const titles = { run: 'Course', ride: 'Sortie vélo', swim: 'Natation' } as const
  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      user_id: user.id,
      title: `${titles[parsed.sportType]} (import)`,
      sport_type: parsed.sportType,
      start_time: parsed.startTime,
      duration_seconds: parsed.durationSeconds,
      distance_meters: parsed.distanceMeters,
      elevation_gain_meters: parsed.elevationGainMeters,
      avg_hr: parsed.avgHr,
      max_hr: parsed.maxHr,
      avg_watts: parsed.avgWatts,
      max_watts: parsed.maxWatts,
      tss,
      intensity_factor: intensityFactor,
      normalized_power: parsed.normalizedPower,
      source: 'fit',
      raw_telemetry: { version: 2, points: parsed.telemetry, route: parsed.route },
    })
    .select('id, sport_type, start_time')
    .single()

  if (error || !activity) {
    console.error('Import FIT : insertion', error)
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 })
  }

  const plannedId = await linkPlannedWorkout(supabase, activity)
  return NextResponse.json({ id: activity.id, linkedPlannedWorkout: plannedId }, { status: 201 })
}
