'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fieldErrors, optionalNumber, optionalText, type FormState } from '@/lib/form-utils'
import { SPORT_KEYS } from '@/lib/sports'

const PlannedSchema = z.object({
  scheduled_date: z.iso.date({ message: 'Date obligatoire' }),
  sport_type: z.enum(SPORT_KEYS, { message: 'Sport invalide' }),
  title: z.string().trim().min(1, 'Titre obligatoire').max(120),
  description: optionalText(2000),
  target_minutes: optionalNumber(z.number().int().min(1, 'Durée invalide').max(1440, 'Durée invalide')),
  target_tss: optionalNumber(z.number().int().min(0).max(1000, 'TSS invalide')),
})

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function createPlannedWorkout(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = PlannedSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: 'Vérifiez les champs en rouge.' }

  const { supabase, user } = await requireUser()
  const p = parsed.data
  const { error } = await supabase.from('planned_workouts').insert({
    user_id: user.id,
    scheduled_date: p.scheduled_date,
    sport_type: p.sport_type,
    title: p.title,
    description: p.description,
    target_duration_seconds: p.target_minutes ? p.target_minutes * 60 : null,
    target_tss: p.target_tss ?? null,
  })
  if (error) {
    console.error('Séance prévue', error)
    return { message: 'Enregistrement impossible. Réessayez.' }
  }
  refresh()
  return { ok: true, message: 'Séance ajoutée au programme.' }
}

const IdSchema = z.uuid()

/** Coche / décoche « réalisée ». Décocher retire aussi le lien avec la séance réalisée. */
export async function togglePlannedWorkout(formData: FormData) {
  const id = IdSchema.safeParse(formData.get('id'))
  if (!id.success) return
  const completed = formData.get('completed') === 'true'
  const { supabase } = await requireUser()
  await supabase
    .from('planned_workouts')
    .update(completed ? { is_completed: true } : { is_completed: false, activity_id: null })
    .eq('id', id.data)
  refresh()
}

export async function deletePlannedWorkout(formData: FormData) {
  const id = IdSchema.safeParse(formData.get('id'))
  if (!id.success) return
  const { supabase } = await requireUser()
  await supabase.from('planned_workouts').delete().eq('id', id.data)
  refresh()
}
