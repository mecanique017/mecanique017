'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { calculateTSS } from '@/lib/training/metrics'
import { linkPlannedWorkout } from '@/lib/training/planned'
import { fieldErrors, optionalNumber, optionalText, requiredNumber, type FormState } from '@/lib/form-utils'
import { SPORT_KEYS } from '@/lib/sports'

const ActivitySchema = z.object({
  title: z.string().trim().min(1, 'Titre obligatoire').max(120),
  sport_type: z.enum(SPORT_KEYS, { message: 'Sport invalide' }),
  // ISO UTC calculé dans le navigateur à partir de l'heure locale saisie
  start_time: z.iso.datetime({ message: 'Date et heure obligatoires' }),
  hours: requiredNumber(z.number().int().min(0).max(48)),
  minutes: requiredNumber(z.number().int().min(0, 'Minutes 0-59').max(59, 'Minutes 0-59')),
  distance_km: optionalNumber(z.number().min(0).max(1000)),
  elevation_gain_meters: optionalNumber(z.number().min(0).max(20000)),
  avg_hr: optionalNumber(z.number().int().min(25, 'FC invalide').max(250, 'FC invalide')),
  max_hr: optionalNumber(z.number().int().min(25, 'FC invalide').max(250, 'FC invalide')),
  avg_watts: optionalNumber(z.number().int().min(0).max(2500)),
  rpe_score: optionalNumber(z.number().int().min(1).max(10)),
  athlete_notes: optionalText(2000),
})

export async function createActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ActivitySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: 'Vérifiez les champs en rouge.' }
  }
  const input = parsed.data
  const durationSeconds = input.hours * 3600 + input.minutes * 60
  if (durationSeconds <= 0) {
    return { errors: { minutes: 'Durée obligatoire' }, message: 'Vérifiez les champs en rouge.' }
  }
  if (new Date(input.start_time).getTime() > Date.now() + 5 * 60_000) {
    return { errors: { start_time: 'La séance ne peut pas être dans le futur' }, message: 'Vérifiez les champs en rouge.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('ftp, hr_rest, lactate_threshold_hr')
    .eq('id', user.id)
    .single()
  if (!profile) return { message: 'Profil introuvable.' }

  // TSS recalculé côté serveur : on ne fait pas confiance à l'aperçu du navigateur
  const { tss, intensityFactor } = calculateTSS({
    durationSeconds,
    avgWatts: input.avg_watts,
    ftp: profile.ftp,
    avgHr: input.avg_hr,
    hrRest: profile.hr_rest,
    lactateThresholdHr: profile.lactate_threshold_hr,
    rpe: input.rpe_score,
  })

  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      user_id: user.id,
      title: input.title,
      sport_type: input.sport_type,
      start_time: input.start_time,
      duration_seconds: durationSeconds,
      distance_meters: Math.round((input.distance_km ?? 0) * 1000),
      elevation_gain_meters: input.elevation_gain_meters ?? 0,
      avg_hr: input.avg_hr ?? null,
      max_hr: input.max_hr ?? null,
      avg_watts: input.avg_watts ?? null,
      rpe_score: input.rpe_score ?? null,
      athlete_notes: input.athlete_notes,
      tss,
      intensity_factor: intensityFactor,
    })
    .select('id, sport_type, start_time')
    .single()

  if (error || !activity) {
    console.error('Création séance', error)
    return { message: "Impossible d'enregistrer la séance. Réessayez." }
  }

  // Valide automatiquement la séance prévue correspondante dans le calendrier
  await linkPlannedWorkout(supabase, activity)
  redirect(`/dashboard/activities/${activity.id}`)
}

/** Suppression d'une séance (la RLS limite aux séances de l'utilisateur). */
export async function deleteActivity(formData: FormData) {
  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return
  const supabase = await createClient()
  await supabase.from('activities').delete().eq('id', id.data)
  redirect('/dashboard')
}
