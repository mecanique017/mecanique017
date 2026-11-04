'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fieldErrors, optionalNumber, optionalText, requiredNumber, type FormState } from '@/lib/form-utils'

// Mêmes bornes que les contraintes CHECK de la migration SQL
const ProfileSchema = z
  .object({
    full_name: optionalText(120),
    sport_discipline: z.enum(['running', 'cycling', 'triathlon']),
    age: optionalNumber(z.number().int().min(5, 'Âge invalide').max(120, 'Âge invalide')),
    weight: optionalNumber(z.number().positive('Poids invalide').max(400)),
    height: optionalNumber(z.number().positive('Taille invalide').max(260)),
    hr_max: requiredNumber(z.number().int().min(100, 'Entre 100 et 250').max(250, 'Entre 100 et 250')),
    hr_rest: requiredNumber(z.number().int().min(25, 'Entre 25 et 120').max(120, 'Entre 25 et 120')),
    lactate_threshold_hr: requiredNumber(z.number().int().min(80, 'Entre 80 et 250').max(250, 'Entre 80 et 250')),
    ftp: requiredNumber(z.number().int().positive('FTP invalide').max(2500)),
    vma: requiredNumber(z.number().positive('VMA invalide').max(40)),
  })
  .refine((p) => p.hr_rest < p.lactate_threshold_hr, {
    path: ['lactate_threshold_hr'],
    message: 'La FC seuil doit être supérieure à la FC de repos',
  })
  .refine((p) => p.lactate_threshold_hr <= p.hr_max, {
    path: ['lactate_threshold_hr'],
    message: 'La FC seuil ne peut pas dépasser la FC max',
  })

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: 'Vérifiez les champs en rouge.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const p = parsed.data
  // Seules ces colonnes sont autorisées en écriture (GRANT par colonne dans la migration)
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: p.full_name,
      sport_discipline: p.sport_discipline,
      age: p.age ?? null,
      weight: p.weight ?? null,
      height: p.height ?? null,
      hr_max: p.hr_max,
      hr_rest: p.hr_rest,
      lactate_threshold_hr: p.lactate_threshold_hr,
      ftp: p.ftp,
      vma: p.vma,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Mise à jour profil', error)
    return { message: 'Enregistrement impossible. Réessayez.' }
  }
  return { ok: true, message: 'Profil enregistré. Les prochaines séances utiliseront ces valeurs.' }
}
