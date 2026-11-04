import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { calculateTSS } from './metrics'

export const RECALC_DAYS = 90

/**
 * Recalcule le TSS et l'IF des séances récentes avec les paramètres actuels du profil
 * (après une mise à jour de la FTP ou de la FC seuil). Seules les séances modifiées sont réécrites.
 * Retourne le nombre de séances mises à jour.
 */
export async function recalculateRecentTss(
  supabase: SupabaseClient<Database>,
  profile: { ftp: number; hr_rest: number; lactate_threshold_hr: number },
  days = RECALC_DAYS
): Promise<number> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const { data: activities, error } = await supabase
    .from('activities')
    .select('id, duration_seconds, avg_hr, avg_watts, normalized_power, tss, intensity_factor')
    .gte('start_time', since)
  if (error) throw error

  const changes = (activities ?? [])
    .map((a) => {
      const { tss, intensityFactor, method } = calculateTSS({
        durationSeconds: a.duration_seconds,
        avgWatts: a.normalized_power ?? a.avg_watts,
        ftp: profile.ftp,
        avgHr: a.avg_hr,
        hrRest: profile.hr_rest,
        lactateThresholdHr: profile.lactate_threshold_hr,
      })
      // Séance sans FC ni puissance : TSS inchangé (rien à recalculer)
      if (method === 'none') return null
      if (tss === Number(a.tss) && intensityFactor === Number(a.intensity_factor)) return null
      return { id: a.id, tss, intensity_factor: intensityFactor }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  // Mises à jour par lots de 10 (une requête par séance : valeurs différentes)
  for (let i = 0; i < changes.length; i += 10) {
    const results = await Promise.all(
      changes.slice(i, i + 10).map(({ id, ...values }) => supabase.from('activities').update(values).eq('id', id))
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) throw failed.error
  }
  return changes.length
}
