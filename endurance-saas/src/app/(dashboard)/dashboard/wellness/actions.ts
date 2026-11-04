'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { localDate } from '@/lib/training/load'
import { addDays } from '@/lib/dates'
import { fieldErrors, optionalNumber, type FormState } from '@/lib/form-utils'

// Mêmes bornes que les contraintes CHECK de daily_metrics
const WellnessSchema = z
  .object({
    date: z.iso.date({ message: 'Date invalide' }),
    hrv: optionalNumber(z.number().int().min(1, 'VFC invalide').max(300, 'VFC invalide')),
    resting_hr: optionalNumber(z.number().int().min(25, 'Entre 25 et 150').max(150, 'Entre 25 et 150')),
    sleep_score: optionalNumber(z.number().int().min(0, 'Entre 0 et 100').max(100, 'Entre 0 et 100')),
    perceived_fatigue: optionalNumber(z.number().int().min(1).max(10)),
  })
  .refine((v) => [v.hrv, v.resting_hr, v.sleep_score, v.perceived_fatigue].some((x) => x !== undefined), {
    path: ['form'],
    message: 'Renseignez au moins une valeur.',
  })

export async function saveWellness(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = WellnessSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error)
    return { errors, message: errors.form ?? 'Vérifiez les champs en rouge.' }
  }
  const v = parsed.data
  const today = localDate(new Date())
  if (v.date > today || v.date < addDays(today, -60)) {
    return { errors: { date: 'Date entre aujourd’hui et il y a 60 jours' }, message: 'Vérifiez les champs en rouge.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Une ligne par jour (UNIQUE user_id, date) : enregistrer à nouveau remplace les valeurs du jour
  const { error } = await supabase.from('daily_metrics').upsert(
    {
      user_id: user.id,
      date: v.date,
      hrv: v.hrv ?? null,
      resting_hr: v.resting_hr ?? null,
      sleep_score: v.sleep_score ?? null,
      perceived_fatigue: v.perceived_fatigue ?? null,
    },
    { onConflict: 'user_id,date' }
  )
  if (error) {
    console.error('Bien-être', error)
    return { message: 'Enregistrement impossible. Réessayez.' }
  }
  refresh()
  return { ok: true, message: 'Enregistré.' }
}
