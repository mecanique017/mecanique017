'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { FormAlert } from '@/components/auth/form-alert'
import { saveWellness } from './actions'

interface Values {
  hrv: number | null
  resting_hr: number | null
  sleep_score: number | null
  perceived_fatigue: number | null
}

export function WellnessForm({ date, maxDate, values }: { date: string; maxDate: string; values: Values | null }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(saveWellness, {})
  const e = state.errors ?? {}
  const v = (n: number | null | undefined) => (n == null ? '' : String(n))

  return (
    // key = jour + valeurs : le formulaire est recréé avec les valeurs enregistrées
    // (React réinitialise le formulaire après l'action et un <select> ne relit pas sa valeur par défaut)
    <form key={`${date}-${JSON.stringify(values)}`} action={formAction} className="space-y-4">
      {state.message &&
        (state.ok ? (
          <p role="status" className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4" style={{ color: 'var(--status-good)' }} aria-hidden /> {state.message}
          </p>
        ) : (
          <FormAlert message={state.message} />
        ))}
      <Field
        id="date"
        label="Jour"
        type="date"
        defaultValue={date}
        max={maxDate}
        required
        error={e.date}
        onChange={(ev) => ev.target.value && router.replace(`/dashboard/wellness?date=${ev.target.value}`)}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field id="hrv" label="VFC (ms)" type="number" inputMode="numeric" min={1} max={300} defaultValue={v(values?.hrv)} error={e.hrv} hint="Mesure du matin (RMSSD)" />
        <Field id="resting_hr" label="FC au repos (bpm)" type="number" inputMode="numeric" min={25} max={150} defaultValue={v(values?.resting_hr)} error={e.resting_hr} />
        <Field id="sleep_score" label="Score de sommeil (0-100)" type="number" inputMode="numeric" min={0} max={100} defaultValue={v(values?.sleep_score)} error={e.sleep_score} />
        <SelectField id="perceived_fatigue" label="Fatigue ressentie" defaultValue={v(values?.perceived_fatigue)} error={e.perceived_fatigue}>
          <option value="">—</option>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} / 10{i === 0 ? ' (en forme)' : i === 9 ? ' (épuisé)' : ''}
            </option>
          ))}
        </SelectField>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
      </Button>
    </form>
  )
}
