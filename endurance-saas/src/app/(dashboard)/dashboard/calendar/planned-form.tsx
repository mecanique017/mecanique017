'use client'

import { useActionState, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { FormAlert } from '@/components/auth/form-alert'
import type { FormState } from '@/lib/form-utils'
import { createPlannedWorkout } from './actions'
import { SportOptions } from '@/components/ui/sport-options'

interface Props {
  defaultDate: string
  /** Action serveur (par défaut : programme de l'utilisateur ; espace coach : programme de l'athlète) */
  action?: (prev: FormState, formData: FormData) => Promise<FormState>
  /** Champ caché athlete_id pour l'espace coach */
  athleteId?: string
}

export function PlannedForm({ defaultDate, action = createPlannedWorkout, athleteId }: Props) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const e = state.errors ?? {}

  // Formulaire vidé après un ajout réussi (la date est conservée pour enchaîner)
  useEffect(() => {
    if (!state.ok || !formRef.current) return
    const date = (formRef.current.elements.namedItem('scheduled_date') as HTMLInputElement).value
    formRef.current.reset()
    ;(formRef.current.elements.namedItem('scheduled_date') as HTMLInputElement).value = date
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {athleteId && <input type="hidden" name="athlete_id" value={athleteId} />}
      {state.message &&
        (state.ok ? (
          <p role="status" className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4" style={{ color: 'var(--status-good)' }} aria-hidden /> {state.message}
          </p>
        ) : (
          <FormAlert message={state.message} />
        ))}
      <div className="grid grid-cols-2 gap-4">
        <Field id="scheduled_date" label="Date" type="date" defaultValue={defaultDate} required error={e.scheduled_date} />
        <SelectField id="sport_type" label="Sport" defaultValue="run" error={e.sport_type}>
          <SportOptions />
        </SelectField>
      </div>
      <Field id="title" label="Séance" placeholder="Ex. 5 × 1000 m à allure 10 km" required error={e.title} />
      <div className="grid grid-cols-2 gap-4">
        <Field id="target_minutes" label="Durée prévue (min)" type="number" inputMode="numeric" min={1} error={e.target_minutes} />
        <Field id="target_tss" label="TSS visé" type="number" inputMode="numeric" min={0} error={e.target_tss} />
      </div>
      <TextareaField id="description" label="Consignes" placeholder="Échauffement 20 min, récup 2 min entre les fractions…" maxLength={2000} error={e.description} />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter au programme
      </Button>
    </form>
  )
}
