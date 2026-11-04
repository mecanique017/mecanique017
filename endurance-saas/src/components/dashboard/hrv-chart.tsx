'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

export interface HrvPoint {
  date: string
  hrv: number | null
  avg7: number | null
}

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtDay = (d: string) => dayFormat.format(new Date(`${d}T00:00:00Z`))
const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' }
const SERIES = [
  { key: 'hrv', label: 'VFC du jour', color: 'var(--viz-ctl)' },
  { key: 'avg7', label: 'Moyenne 7 jours', color: 'var(--viz-atl)' },
] as const

/** VFC quotidienne et sa moyenne sur 7 jours (même unité, même axe). */
export function HrvChart({ data }: { data: HrvPoint[] }) {
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
            <XAxis dataKey="date" tickFormatter={fmtDay} tick={AXIS} tickLine={false} axisLine={false} minTickGap={32} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} domain={['auto', 'auto']} allowDecimals={false} />
            <Tooltip content={HrvTooltip} cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }} isAnimationActive={false} />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                type="monotone"
                connectNulls
                isAnimationActive={false}
                dot={s.key === 'hrv' ? { r: 3, strokeWidth: 2, stroke: 'var(--card)', fill: s.color } : false}
                activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function HrvTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const p = payload?.[0]?.payload as HrvPoint | undefined
  if (!active || !p) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 text-xs text-muted-foreground">{fmtDay(p.date)}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} aria-hidden />
          <strong className="tabular-nums">{p[s.key] ?? '—'}</strong>
          <span className="text-muted-foreground">{s.label}</span>
        </p>
      ))}
    </div>
  )
}
