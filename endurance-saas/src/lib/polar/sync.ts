import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { importActivityFile } from '@/lib/fit/import'
import { FitImportError } from '@/lib/fit/parse-fit'
import { localDate } from '@/lib/training/load'
import { addDays } from '@/lib/dates'
import { downloadExerciseFit, listExercises, nightlyHrv, PolarError } from './client'

export interface SyncResult {
  imported: number
  duplicates: number
  skipped: number
  hrvDays: number
}

/** Nombre maximal de téléchargements par synchronisation (limites de débit Polar). */
const MAX_DOWNLOADS = 30

/**
 * Synchronise un utilisateur : nouvelles séances (via leur .fit) + VFC nocturne des 3 derniers jours
 * (seulement si la VFC du jour n'a pas été saisie à la main). Client service role : user_id explicite partout.
 */
export async function syncPolarUser(userId: string): Promise<SyncResult> {
  const admin = createAdminClient()
  const { data: connection } = await admin.from('polar_connections').select('*').eq('user_id', userId).maybeSingle()
  if (!connection) throw new PolarError('Compte Polar non connecté', 404)

  const result: SyncResult = { imported: 0, duplicates: 0, skipped: 0, hrvDays: 0 }
  try {
    const exercises = await listExercises(connection.access_token)
    const ids = exercises.map((e) => String(e.id))

    // Séances déjà synchronisées (identifiant Polar)
    const { data: known } = await admin
      .from('activities')
      .select('external_id')
      .eq('user_id', userId)
      .eq('source', 'polar')
      .in('external_id', ids.length ? ids : ['-'])
    const knownIds = new Set((known ?? []).map((k) => k.external_id))

    for (const id of ids.filter((i) => !knownIds.has(i)).slice(0, MAX_DOWNLOADS)) {
      try {
        const fit = await downloadExerciseFit(connection.access_token, id)
        const r = await importActivityFile(admin, userId, fit, { format: 'fit', source: 'polar', externalId: id })
        if (r.status === 'created') result.imported++
        else result.duplicates++
      } catch (error) {
        // Sport non pris en charge, fichier sans données… : on passe à la séance suivante
        if (error instanceof FitImportError) result.skipped++
        else throw error
      }
    }

    // VFC nocturne → bien-être (sans écraser une saisie manuelle)
    const today = localDate(new Date())
    for (const day of [addDays(today, -2), addDays(today, -1), today]) {
      const hrv = await nightlyHrv(connection.access_token, day)
      if (hrv === null) continue
      const { data: existing } = await admin.from('daily_metrics').select('id, hrv').eq('user_id', userId).eq('date', day).maybeSingle()
      if (existing?.hrv != null) continue
      const { error } = existing
        ? await admin.from('daily_metrics').update({ hrv }).eq('id', existing.id)
        : await admin.from('daily_metrics').insert({ user_id: userId, date: day, hrv })
      if (!error) result.hrvDays++
    }

    await admin.from('polar_connections').update({ last_sync_at: new Date().toISOString(), last_sync_error: null }).eq('user_id', userId)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    await admin.from('polar_connections').update({ last_sync_error: message.slice(0, 300) }).eq('user_id', userId)
    throw error
  }
}
