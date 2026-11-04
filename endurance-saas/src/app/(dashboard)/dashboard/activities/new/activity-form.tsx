'use client'

import { useActionState, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { FormAlert } from '@/components/auth/form-alert'
import { calculateTSS } from '@/lib/training/metrics'
import { createActivity } from '../actions'

interface Props {
  profile: { ftp: number; hr_rest: number; lactate_threshold_hr: number }
}

/** "2026-11-04T18:30" (heure locale) pour la valeur par défaut d'un input datetime-local. */
function nowLocalInput() {
  const d = new Date()
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function ActivityForm({ profile }: Props) {
  const [state, formAction, pending] = useActionState(createActivity, {})
  const [localStart, setLocalStart] = useState('')
  const [hours, setHours] = useState('1')
  const [minutes, setMinutes] = useState('0')
  const [avgHr, setAvgHr] = useState('')
  const [avgWatts, setAvgWatts] = useState('')

  // L'heure par défaut dépend du fuseau du navigateur : calculée après hydratation
  // (setState dans un effet voulu : la valeur n'existe que côté navigateur)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLocalStart((current) => current || nowLocalInput()), [])

  // L'heure locale saisie est convertie en instant UTC par le navigateur (qui connaît son fuseau)
  const startIso = localStart ? new Date(localStart).toISOString() : ''

  // Aperçu en direct ; le serveur refait le calcul à l'enregistrement
  const preview = calculateTSS({
    durationSeconds: (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60,
    avgWatts: Number(avgWatts) || null,
    ftp: profile.ftp,
    avgHr: Number(avgHr) || null,
    hrRest: profile.hr_rest,
    lactateThresholdHr: profile.lactate_threshold_hr,
  })

  const e = state.errors ?? {}

  return (
    <form action={formAction} className="space-y-6">
      {state.message && <FormAlert message={state.message} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="title" label="Titre" placeholder="Sortie longue, fractionné…" required error={e.title} className="sm:col-span-2" />
        <SelectField id="sport_type" label="Sport" defaultValue="run" error={e.sport_type}>
          <option value="run">Course à pied</option>
          <option value="ride">Vélo</option>
          <option value="swim">Natation</option>
        </SelectField>
        <Field
          id="local_start"
          name="local_start"
          label="Date et heure de départ"
          type="datetime-local"
          value={localStart}
          onChange={(ev) => setLocalStart(ev.target.value)}
          required
          error={e.start_time}
        />
        <input type="hidden" name="start_time" value={startIso} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Durée</legend>
        <div className="grid grid-cols-2 gap-4">
          <Field id="hours" label="Heures" type="number" inputMode="numeric" min={0} max={48} value={hours} onChange={(ev) => setHours(ev.target.value)} required error={e.hours} />
          <Field id="minutes" label="Minutes" type="number" inputMode="numeric" min={0} max={59} value={minutes} onChange={(ev) => setMinutes(ev.target.value)} required error={e.minutes} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Données de la séance</legend>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          <Field id="distance_km" label="Distance (km)" type="number" inputMode="decimal" min={0} step="0.01" error={e.distance_km} />
          <Field id="elevation_gain_meters" label="Dénivelé + (m)" type="number" inputMode="numeric" min={0} error={e.elevation_gain_meters} />
          <Field id="avg_hr" label="FC moyenne (bpm)" type="number" inputMode="numeric" min={25} max={250} value={avgHr} onChange={(ev) => setAvgHr(ev.target.value)} error={e.avg_hr} />
          <Field id="max_hr" label="FC max (bpm)" type="number" inputMode="numeric" min={25} max={250} error={e.max_hr} />
          <Field id="avg_watts" label="Puissance moy. (W)" type="number" inputMode="numeric" min={0} value={avgWatts} onChange={(ev) => setAvgWatts(ev.target.value)} error={e.avg_watts} hint="Vélo avec capteur" />
          <SelectField id="rpe_score" label="Effort ressenti (RPE)" defaultValue="" error={e.rpe_score}>
            <option value="">—</option>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} / 10
              </option>
            ))}
          </SelectField>
        </div>
      </fieldset>

      <TextareaField id="athlete_notes" label="Notes" placeholder="Sensations, météo, douleurs…" maxLength={2000} error={e.athlete_notes} />

      {/* Aperçu du TSS : mis à jour à chaque frappe */}
      <div className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4" aria-live="polite">
        <div>
          <p className="text-sm text-muted-foreground">TSS estimé</p>
          <p className="text-xs text-muted-foreground">
            {preview.method === 'power' && `Calculé sur la puissance (FTP ${profile.ftp} W)`}
            {preview.method === 'heart_rate' && `Calculé sur la FC (seuil ${profile.lactate_threshold_hr} bpm)`}
            {preview.method === 'none' && 'Renseignez la FC moyenne ou la puissance'}
          </p>
        </div>
        <p className="text-3xl font-bold tabular-nums">{preview.tss}</p>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={pending || !startIso}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…
          </>
        ) : (
          'Enregistrer la séance'
        )}
      </Button>
    </form>
  )
}
