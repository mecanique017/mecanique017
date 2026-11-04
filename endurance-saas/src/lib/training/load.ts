import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { computeTrainingLoadSeries, type DailyLoad } from './metrics'

/** Fuseau utilisé pour rattacher une séance à un jour (une sortie à 0h30 compte pour ce jour-là). */
export const APP_TIMEZONE = 'Europe/Paris'

/** Date locale YYYY-MM-DD d'un instant ISO. */
export function localDate(iso: string | Date, timeZone = APP_TIMEZONE): string {
  // en-CA formate en YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso))
}

/** Historique pris en compte : au-delà, l'influence sur la CTL (42 j) est négligeable (e^-365/42 ≈ 0,02 %). */
const HISTORY_DAYS = 365

/**
 * Série CTL / ATL / TSB de l'utilisateur connecté, calculée à partir de ses séances.
 * Les séances sont la source de vérité : rien à resynchroniser quand une séance change.
 */
export async function getTrainingLoad(
  supabase: SupabaseClient<Database>,
  until: Date = new Date()
): Promise<DailyLoad[]> {
  const to = localDate(until)
  const fromDate = new Date(until.getTime() - HISTORY_DAYS * 86_400_000)
  const from = localDate(fromDate)

  const { data, error } = await supabase
    .from('activities')
    .select('start_time, tss')
    .gte('start_time', fromDate.toISOString())
    .lte('start_time', until.toISOString())
  if (error) throw error

  return computeTrainingLoadSeries(
    (data ?? []).map((a) => ({ date: localDate(a.start_time), tss: Number(a.tss) })),
    from,
    to
  )
}

/** Libellé d'état de forme à partir du TSB (repères courants du modèle PMC). */
export type FormState = 'fresh' | 'neutral' | 'productive' | 'overreaching'
export function formState(tsb: number): FormState {
  if (tsb > 5) return 'fresh'
  if (tsb >= -10) return 'neutral'
  if (tsb >= -30) return 'productive'
  return 'overreaching'
}
