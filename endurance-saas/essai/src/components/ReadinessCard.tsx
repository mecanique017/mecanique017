import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { readiness } from '@/lib/training/performance'
import type { DailyLoad } from '@/lib/training/metrics'
import { cn } from '@/lib/utils'

interface Day {
  date: string
  hrv: number | null
  resting_hr: number | null
  sleep_score: number | null
  perceived_fatigue: number | null
}

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/** « Prêt aujourd'hui ? » : forme du matin à partir de la fraîcheur (TSB) et du bien-être. */
export function ReadinessCard({ series, wellness, today }: { series: DailyLoad[]; wellness: Day[]; today: string }) {
  // Fraîcheur du matin = celle de la veille au soir (la séance du jour ne compte pas encore)
  const yesterday = series.length > 1 ? series[series.length - 2] : series[series.length - 1]
  const day = wellness.find((d) => d.date === today) ?? null
  const before = wellness.filter((d) => d.date < today)
  const last7 = before.slice(-7)
  const r = readiness({
    tsb: yesterday?.tsb ?? null,
    hrv: day?.hrv ?? null,
    hrvBaseline: avg(last7.map((d) => d.hrv)),
    restingHr: day?.resting_hr ?? null,
    restingHrBaseline: avg(before.slice(-28).map((d) => d.resting_hr)),
    sleep: day?.sleep_score ?? null,
    fatigue: day?.perceived_fatigue ?? null,
  })
  const color = { hard: '#16a34a', moderate: '#84cc16', easy: '#f59e0b', rest: '#e10600' }[r.level]
  const circ = 2 * Math.PI * 42
  return (
    <section className="rounded-xl border bg-card p-4 md:p-5" aria-label="Prêt aujourd’hui ?">
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-24 -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="9" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(r.score / 100) * circ} ${circ}`} />
          </svg>
          <p className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums leading-none">{r.score}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prêt aujourd’hui ?</p>
          <h2 className="text-lg font-bold leading-tight" style={{ color }}>{r.title}</h2>
          <p className="text-sm text-muted-foreground">{r.advice}</p>
        </div>
      </div>
      {r.factors.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {r.factors.map((f) => (
            <li key={f.label} className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-xs', f.effect > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
              {f.effect > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />} {f.label}
            </li>
          ))}
        </ul>
      )}
      {!day && (
        <Link to="/dashboard/wellness" className="mt-3 block text-sm font-medium text-primary underline underline-offset-4">
          Renseignez votre bien-être du matin (VFC, sommeil, fatigue) pour un score plus juste
        </Link>
      )}
    </section>
  )
}
