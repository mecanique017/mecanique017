import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { FormAlert } from '@/components/auth/form-alert'
import { calculateTSS } from '@/lib/training/metrics'
import { linkPlannedWorkout } from '@/lib/training/planned'
import type { SportType } from '@/types/database'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

const nowLocal = () => {
  const d = new Date()
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
const n = (v: string) => (v.trim() === '' ? null : Number(v))

export function NewActivityPage() {
  const user = useUser()
  const navigate = useNavigate()
  const { data: profile } = useData(async () => (await supabase.from('profiles').select('ftp, hr_rest, lactate_threshold_hr').eq('id', user.id).single()).data, [user.id])
  const [f, setF] = useState({ title: '', sport: 'run' as SportType, start: nowLocal(), hours: '1', minutes: '0', km: '', elev: '', hr: '', hrMax: '', watts: '', rpe: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  const seconds = (Number(f.hours) || 0) * 3600 + (Number(f.minutes) || 0) * 60
  const tss = profile
    ? calculateTSS({ durationSeconds: seconds, avgWatts: n(f.watts), ftp: profile.ftp, avgHr: n(f.hr), hrRest: profile.hr_rest, lactateThresholdHr: profile.lactate_threshold_hr })
    : { tss: 0, intensityFactor: 0, method: 'none' as const }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!f.title.trim()) return setError('Titre obligatoire.')
    if (seconds <= 0) return setError('Durée obligatoire.')
    const start = new Date(f.start)
    if (start.getTime() > Date.now() + 5 * 60_000) return setError('La séance ne peut pas être dans le futur.')
    setSaving(true)
    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id: user.id,
        title: f.title.trim(),
        sport_type: f.sport,
        start_time: start.toISOString(),
        duration_seconds: seconds,
        distance_meters: Math.round((n(f.km) ?? 0) * 1000),
        elevation_gain_meters: n(f.elev) ?? 0,
        avg_hr: n(f.hr),
        max_hr: n(f.hrMax),
        avg_watts: n(f.watts),
        rpe_score: n(f.rpe),
        athlete_notes: f.notes.trim() || null,
        tss: tss.tss,
        intensity_factor: tss.intensityFactor,
      })
      .select('id, sport_type, start_time')
      .single()
    if (error || !data) {
      setSaving(false)
      return setError('Enregistrement impossible : vérifiez les valeurs (FC entre 25 et 250, RPE de 1 à 10).')
    }
    await linkPlannedWorkout(supabase, data, user.id)
    navigate(`/dashboard/activities/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Nouvelle séance</h1>
      <form onSubmit={submit} className="space-y-6">
        {error && <FormAlert message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="title" label="Titre" placeholder="Sortie longue, fractionné…" value={f.title} onChange={set('title')} required className="sm:col-span-2" />
          <SelectField id="sport" label="Sport" value={f.sport} onChange={set('sport')}>
            <option value="run">Course à pied</option>
            <option value="ride">Vélo</option>
            <option value="swim">Natation</option>
          </SelectField>
          <Field id="start" label="Date et heure" type="datetime-local" value={f.start} onChange={set('start')} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field id="hours" label="Heures" type="number" inputMode="numeric" min={0} value={f.hours} onChange={set('hours')} />
          <Field id="minutes" label="Minutes" type="number" inputMode="numeric" min={0} max={59} value={f.minutes} onChange={set('minutes')} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field id="km" label="Distance (km)" type="number" inputMode="decimal" step="0.01" min={0} value={f.km} onChange={set('km')} />
          <Field id="elev" label="Dénivelé + (m)" type="number" inputMode="numeric" min={0} value={f.elev} onChange={set('elev')} />
          <Field id="hr" label="FC moyenne" type="number" inputMode="numeric" value={f.hr} onChange={set('hr')} />
          <Field id="hrMax" label="FC max" type="number" inputMode="numeric" value={f.hrMax} onChange={set('hrMax')} />
          <Field id="watts" label="Puissance moy. (W)" type="number" inputMode="numeric" value={f.watts} onChange={set('watts')} />
          <SelectField id="rpe" label="Effort ressenti" value={f.rpe} onChange={set('rpe')}>
            <option value="">—</option>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} / 10
              </option>
            ))}
          </SelectField>
        </div>
        <TextareaField id="notes" label="Notes" value={f.notes} onChange={set('notes')} maxLength={2000} />
        <div className="rounded-lg border bg-card p-4 flex items-center justify-between" aria-live="polite">
          <div>
            <p className="text-sm text-muted-foreground">TSS estimé</p>
            <p className="text-xs text-muted-foreground">
              {tss.method === 'power' ? 'Calculé sur la puissance' : tss.method === 'heart_rate' ? 'Calculé sur la FC' : 'Renseignez la FC moyenne ou la puissance'}
            </p>
          </div>
          <p className="text-3xl font-bold tabular-nums">{tss.tss}</p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer la séance
        </Button>
      </form>
    </div>
  )
}
