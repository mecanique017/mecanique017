import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { HrvChart } from '@/components/dashboard/hrv-chart'
import { localDate } from '@/lib/training/load'
import { getWellness, hrvBaseline } from '@/lib/training/wellness'
import { addDays, formatLongDay } from '@/lib/dates'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

export function WellnessPage() {
  const user = useUser()
  const today = localDate(new Date())
  const [date, setDate] = useState(today)
  const { data, reload } = useData(() => getWellness(supabase, user.id, addDays(today, -37), today), [user.id])
  const entry = data?.find((d) => d.date === date)
  const [f, setF] = useState({ hrv: '', resting: '', sleep: '', fatigue: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Formulaire pré-rempli avec le relevé du jour choisi
  useEffect(() => {
    const v = (x: number | null | undefined) => (x == null ? '' : String(x))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF({ hrv: v(entry?.hrv), resting: v(entry?.resting_hr), sleep: v(entry?.sleep_score), fatigue: v(entry?.perceived_fatigue) })
  }, [entry, date])

  const n = (s: string) => (s === '' ? null : Number(s))
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (![f.hrv, f.resting, f.sleep, f.fatigue].some((x) => x !== '')) return setMessage('Renseignez au moins une valeur.')
    setSaving(true)
    const { error } = await supabase
      .from('daily_metrics')
      .upsert({ user_id: user.id, date, hrv: n(f.hrv), resting_hr: n(f.resting), sleep_score: n(f.sleep), perceived_fatigue: n(f.fatigue), is_demo: false }, { onConflict: 'user_id,date' })
    setSaving(false)
    setMessage(error ? 'Valeurs invalides (VFC > 0, FC repos 25-150, sommeil 0-100).' : 'Enregistré.')
    if (!error) reload()
  }

  const chart = Array.from({ length: 30 }, (_, i) => {
    const day = addDays(today, i - 29)
    const window = (data ?? []).filter((d) => d.date > addDays(day, -7) && d.date <= day && d.hrv != null)
    return { date: day, hrv: data?.find((d) => d.date === day)?.hrv ?? null, avg7: window.length ? Math.round(window.reduce((s, d) => s + d.hrv!, 0) / window.length) : null }
  })
  const baseline = data ? hrvBaseline(data, today) : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Bien-être</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={save} className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
          <h2 className="font-semibold first-letter:uppercase">{date === today ? 'Aujourd’hui' : formatLongDay(date)}</h2>
          {message && <p role="status" className="text-sm">{message}</p>}
          <Field id="date" label="Jour" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Field id="hrv" label="VFC (ms)" type="number" inputMode="numeric" value={f.hrv} onChange={(e) => setF({ ...f, hrv: e.target.value })} />
            <Field id="resting" label="FC repos" type="number" inputMode="numeric" value={f.resting} onChange={(e) => setF({ ...f, resting: e.target.value })} />
            <Field id="sleep" label="Sommeil (0-100)" type="number" inputMode="numeric" value={f.sleep} onChange={(e) => setF({ ...f, sleep: e.target.value })} />
            <SelectField id="fatigue" label="Fatigue" value={f.fatigue} onChange={(e) => setF({ ...f, fatigue: e.target.value })}>
              <option value="">—</option>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} / 10
                </option>
              ))}
            </SelectField>
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </form>
        <section className="lg:col-span-2 rounded-xl border bg-card p-4 md:p-6 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Variabilité cardiaque (30 jours)</h2>
            {baseline !== null && <p className="text-sm text-muted-foreground">Référence : <strong className="text-foreground">{baseline} ms</strong></p>}
          </div>
          {chart.some((d) => d.hrv != null) ? <HrvChart data={chart} /> : <p className="text-sm text-muted-foreground">Aucune VFC enregistrée.</p>}
        </section>
      </div>
    </div>
  )
}
