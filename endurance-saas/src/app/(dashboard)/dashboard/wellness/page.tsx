import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { localDate } from '@/lib/training/load'
import { getWellness, hrvBaseline } from '@/lib/training/wellness'
import { addDays, formatLongDay, isDay } from '@/lib/dates'
import { HrvChart } from '@/components/dashboard/hrv-chart'
import { WellnessForm } from './wellness-form'

export const metadata: Metadata = { title: 'Bien-être — Endurance SaaS' }

const HISTORY_DAYS = 30

export default function WellnessPage({ searchParams }: PageProps<'/dashboard/wellness'>) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Bien-être</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Relevé du matin. Le coach IA en tient compte : une VFC nettement sous votre moyenne signale une récupération incomplète.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <WellnessContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function WellnessContent({ searchParams }: { searchParams: PageProps<'/dashboard/wellness'>['searchParams'] }) {
  const { date } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = localDate(new Date())
  const selected = isDay(date) && date <= today ? date : today
  const from = addDays(today, -(HISTORY_DAYS + 7))
  const history = await getWellness(supabase, user.id, selected < from ? selected : from, today)
  const selectedValues = history.find((d) => d.date === selected) ?? null

  // Série 30 jours : VFC + moyenne glissante 7 jours (référence personnelle)
  const chartDays = Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(today, i - HISTORY_DAYS + 1))
  const chart = chartDays.map((day) => {
    const entry = history.find((d) => d.date === day)
    const window = history.filter((d) => d.date > addDays(day, -7) && d.date <= day && d.hrv != null)
    return {
      date: day,
      hrv: entry?.hrv ?? null,
      avg7: window.length ? Math.round(window.reduce((s, d) => s + d.hrv!, 0) / window.length) : null,
    }
  })
  const hasHrv = chart.some((d) => d.hrv != null)
  // Même référence que le coach et le tableau de bord : 7 jours avant aujourd'hui, jour même exclu
  const baseline = hrvBaseline(history, today)
  const recent = history.filter((d) => d.date > addDays(today, -14)).reverse()

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-xl border bg-card p-4 md:p-6 space-y-4">
        <h2 className="font-semibold first-letter:uppercase">{selected === today ? 'Aujourd’hui' : formatLongDay(selected)}</h2>
        <WellnessForm date={selected} maxDate={today} values={selectedValues} />
      </section>

      <div className="lg:col-span-2 space-y-6">
        <section className="rounded-xl border bg-card p-4 md:p-6 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Variabilité cardiaque (30 jours)</h2>
            {baseline !== null && (
              <p className="text-sm text-muted-foreground">
                Référence (7 jours précédents) : <strong className="text-foreground">{baseline} ms</strong>
              </p>
            )}
          </div>
          {hasHrv ? (
            <HrvChart data={chart} />
          ) : (
            <p className="text-sm text-muted-foreground">Aucune VFC enregistrée pour l’instant.</p>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 md:p-6 space-y-3">
          <h2 className="font-semibold">14 derniers jours</h2>
          {recent.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm tabular-nums">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Jour</th>
                    <th className="py-2 font-medium">VFC</th>
                    <th className="py-2 font-medium">FC repos</th>
                    <th className="py-2 font-medium">Sommeil</th>
                    <th className="py-2 font-medium">Fatigue</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((d) => (
                    <tr key={d.date} className="border-b last:border-0">
                      <td className="py-1.5 text-left first-letter:uppercase">{formatLongDay(d.date)}</td>
                      <td>{d.hrv != null ? `${d.hrv} ms` : '—'}</td>
                      <td>{d.resting_hr != null ? `${d.resting_hr} bpm` : '—'}</td>
                      <td>{d.sleep_score ?? '—'}</td>
                      <td>{d.perceived_fatigue != null ? `${d.perceived_fatigue}/10` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun relevé.</p>
          )}
        </section>
      </div>
    </div>
  )
}
