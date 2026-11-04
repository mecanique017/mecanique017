import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivitySource, Database } from '@/types/database'
import { parseFitActivity } from './parse-fit'
import { calculateTSS } from '@/lib/training/metrics'
import { linkPlannedWorkout } from '@/lib/training/planned'

export type ImportResult =
  | { status: 'created'; id: string; linkedPlannedWorkout: string | null }
  | { status: 'duplicate'; id: string }

const TITLES = { run: 'Course', ride: 'Sortie vélo', swim: 'Natation' } as const

/**
 * Enregistre une séance à partir d'un fichier .fit (import manuel ou synchronisation Polar).
 * user_id est toujours passé explicitement : la fonction est aussi appelée avec le client
 * service role, qui ne filtre pas par RLS. Lève FitImportError si le fichier est invalide.
 */
export async function importFitActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  buffer: ArrayBuffer,
  options: { source: Extract<ActivitySource, 'fit' | 'polar'>; externalId?: string } = { source: 'fit' }
): Promise<ImportResult> {
  const parsed = await parseFitActivity(buffer)

  // Doublon : même heure de départ (réimport, ou séance déjà importée via un .fit puis synchronisée)
  const { data: existing } = await supabase
    .from('activities')
    .select('id')
    .eq('user_id', userId)
    .eq('start_time', parsed.startTime)
    .limit(1)
    .maybeSingle()
  if (existing) return { status: 'duplicate', id: existing.id }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('ftp, hr_rest, lactate_threshold_hr')
    .eq('id', userId)
    .single()
  if (profileError || !profile) throw new Error('Profil introuvable')

  // TSS vélo : puissance normalisée si disponible (plus juste que la moyenne sur des intervalles)
  const { tss, intensityFactor } = calculateTSS({
    durationSeconds: parsed.durationSeconds,
    avgWatts: parsed.normalizedPower ?? parsed.avgWatts,
    ftp: profile.ftp,
    avgHr: parsed.avgHr,
    hrRest: profile.hr_rest,
    lactateThresholdHr: profile.lactate_threshold_hr,
  })

  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      user_id: userId,
      title: `${TITLES[parsed.sportType]} (${options.source === 'polar' ? 'Polar' : 'import'})`,
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
      source: options.source,
      external_id: options.externalId ?? null,
      raw_telemetry: { version: 2, points: parsed.telemetry, route: parsed.route },
    })
    .select('id, sport_type, start_time')
    .single()
  if (error || !activity) throw error ?? new Error('Insertion impossible')

  const linkedPlannedWorkout = await linkPlannedWorkout(supabase, activity, userId)
  return { status: 'created', id: activity.id, linkedPlannedWorkout }
}
