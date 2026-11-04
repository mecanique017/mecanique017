'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { DailyLoad } from '@/lib/training/metrics'

/**
 * Courbes de forme (PMC) :
 * - graphique 1 : CTL (forme) et ATL (fatigue), même unité → même axe
 * - graphique 2 : TSB (fraîcheur), échelle différente et signée → son propre graphique
 *   (jamais de double axe), synchronisé sur la même date (syncId).
 */

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fullDayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })
const formatDay = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`))
const formatFullDay = (date: string) => fullDayFormat.format(new Date(`${date}T00:00:00Z`))
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`

const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' }
const SERIES = [
  { key: 'ctl', label: 'Forme (CTL)', color: 'var(--viz-ctl)' },
  { key: 'atl', label: 'Fatigue (ATL)', color: 'var(--viz-atl)' },
] as const

export function LoadChart({ data }: { data: DailyLoad[] }) {
  const last = data.at(-1)

  return (
    <div className="space-y-6">
      <section aria-labelledby="pmc-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pmc-title" className="font-semibold">
            Forme et fatigue
          </h2>
          {/* Légende : identité jamais portée par la couleur seule */}
          <ul className="flex gap-4 text-sm text-muted-foreground">
            {SERIES.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} aria-hidden />
                {s.label}
                {last && <strong className="text-foreground tabular-nums">{fmt(last[s.key])}</strong>}
              </li>
            ))}
          </ul>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} syncId="pmc" margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
              <XAxis dataKey="date" tickFormatter={formatDay} tick={AXIS} tickLine={false} axisLine={false} minTickGap={32} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
              <Tooltip
                content={PmcTooltip}
                cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
                isAnimationActive={false}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  type="monotone"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-labelledby="tsb-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tsb-title" className="font-semibold">
            Fraîcheur (TSB = CTL − ATL)
          </h2>
          <ul className="flex gap-4 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-sm" style={{ background: 'var(--viz-positive)' }} aria-hidden />
              Frais (&gt; 0)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-sm" style={{ background: 'var(--viz-negative)' }} aria-hidden />
              Fatigué (&lt; 0)
            </li>
          </ul>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} syncId="pmc" margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
              <XAxis dataKey="date" tickFormatter={formatDay} tick={AXIS} tickLine={false} axisLine={false} minTickGap={32} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1} />
              <Tooltip content={PmcTooltip} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} isAnimationActive={false} />
              <Bar dataKey="tsb" name="Fraîcheur (TSB)" maxBarSize={24} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.date} fill={d.tsb >= 0 ? 'var(--viz-positive)' : 'var(--viz-negative)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Vue tableau : les valeurs restent accessibles sans survol ni couleur */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Voir les données des 14 derniers jours
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-right tabular-nums">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Jour</th>
                <th className="py-2 font-medium">TSS</th>
                <th className="py-2 font-medium">CTL</th>
                <th className="py-2 font-medium">ATL</th>
                <th className="py-2 font-medium">TSB</th>
              </tr>
            </thead>
            <tbody>
              {data
                .slice(-14)
                .reverse()
                .map((d) => (
                  <tr key={d.date} className="border-b last:border-0">
                    <td className="py-1.5 text-left">{formatFullDay(d.date)}</td>
                    <td>{fmt(d.tss)}</td>
                    <td>{fmt(d.ctl)}</td>
                    <td>{fmt(d.atl)}</td>
                    <td>{signed(d.tsb)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

/** Une seule infobulle, toutes les valeurs du jour (la valeur en avant, le libellé ensuite). */
function PmcTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const day = payload?.[0]?.payload as DailyLoad | undefined
  if (!active || !day) return null
  const rows = [
    { label: 'Forme (CTL)', value: day.ctl, color: 'var(--viz-ctl)' },
    { label: 'Fatigue (ATL)', value: day.atl, color: 'var(--viz-atl)' },
    { label: 'Fraîcheur (TSB)', value: day.tsb, signed: true, color: day.tsb >= 0 ? 'var(--viz-positive)' : 'var(--viz-negative)' },
    { label: 'TSS du jour', value: day.tss, color: null },
  ]
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 text-xs text-muted-foreground">{formatFullDay(day.date)}</p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            {r.color ? (
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: r.color }} aria-hidden />
            ) : (
              <span className="inline-block w-3" aria-hidden />
            )}
            <strong className="tabular-nums">{r.signed ? signed(r.value) : fmt(r.value)}</strong>
            <span className="text-muted-foreground">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
