'use client'

import { useActionState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { FormAlert } from '@/components/auth/form-alert'
import type { Tables } from '@/types/database'
import { updateProfile } from './actions'

type Profile = Pick<
  Tables<'profiles'>,
  | 'full_name'
  | 'sport_discipline'
  | 'age'
  | 'weight'
  | 'height'
  | 'hr_max'
  | 'hr_rest'
  | 'lactate_threshold_hr'
  | 'ftp'
  | 'vma'
  | 'notify_weekly'
  | 'notify_fatigue'
>

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, {})
  const e = state.errors ?? {}
  const value = (v: number | string | null) => (v == null ? '' : String(v))

  return (
    <form action={formAction} className="space-y-6">
      {state.message &&
        (state.ok ? (
          <p role="status" className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm">
            <CheckCircle2 className="size-4" style={{ color: 'var(--status-good)' }} aria-hidden />
            {state.message}
          </p>
        ) : (
          <FormAlert message={state.message} />
        ))}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">Athlète</legend>
        <Field id="full_name" label="Nom" defaultValue={value(profile.full_name)} autoComplete="name" error={e.full_name} />
        <SelectField id="sport_discipline" label="Discipline principale" defaultValue={profile.sport_discipline} error={e.sport_discipline}>
          <option value="running">Course à pied</option>
          <option value="cycling">Vélo</option>
          <option value="triathlon">Triathlon</option>
        </SelectField>
        <div className="grid grid-cols-3 gap-4 sm:col-span-2">
          <Field id="age" label="Âge" type="number" inputMode="numeric" defaultValue={value(profile.age)} error={e.age} />
          <Field id="weight" label="Poids (kg)" type="number" inputMode="decimal" step="0.1" defaultValue={value(profile.weight)} error={e.weight} />
          <Field id="height" label="Taille (cm)" type="number" inputMode="decimal" step="0.1" defaultValue={value(profile.height)} error={e.height} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        <legend className="mb-1 text-sm font-semibold">Paramètres de calcul du TSS</legend>
        <p className="col-span-full -mt-1 mb-1 text-xs text-muted-foreground">
          Utilisés pour les nouvelles séances, et pour les séances récentes si vous cochez la case ci-dessous.
        </p>
        <Field id="hr_rest" label="FC repos (bpm)" type="number" inputMode="numeric" required defaultValue={value(profile.hr_rest)} error={e.hr_rest} />
        <Field id="lactate_threshold_hr" label="FC seuil (bpm)" type="number" inputMode="numeric" required defaultValue={value(profile.lactate_threshold_hr)} error={e.lactate_threshold_hr} hint="Base du TSS cardiaque" />
        <Field id="hr_max" label="FC max (bpm)" type="number" inputMode="numeric" required defaultValue={value(profile.hr_max)} error={e.hr_max} />
        <Field id="ftp" label="FTP (W)" type="number" inputMode="numeric" required defaultValue={value(profile.ftp)} error={e.ftp} hint="Base du TSS puissance" />
        <Field id="vma" label="VMA (km/h)" type="number" inputMode="decimal" step="0.1" required defaultValue={value(profile.vma)} error={e.vma} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold">Notifications par e-mail</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="notify_weekly" defaultChecked={profile.notify_weekly} className="mt-0.5 size-4 accent-primary" />
          <span>
            Résumé hebdomadaire le lundi matin
            <span className="block text-xs text-muted-foreground">Bilan de la semaine passée et séances prévues.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="notify_fatigue" defaultChecked={profile.notify_fatigue} className="mt-0.5 size-4 accent-primary" />
          <span>
            Alerte fatigue
            <span className="block text-xs text-muted-foreground">
              TSB très bas, VFC nettement sous votre référence ou fatigue ressentie élevée ; au plus une alerte tous les 3 jours.
            </span>
          </span>
        </label>
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="recalculate" className="mt-0.5 size-4 accent-primary" />
        <span>
          Recalculer le TSS des séances des 90 derniers jours avec ces valeurs
          <span className="block text-xs text-muted-foreground">
            Utile après un test de FTP ou de seuil : la forme (CTL) et la fatigue (ATL) seront mises à jour.
          </span>
        </span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Enregistrer
      </Button>
    </form>
  )
}
