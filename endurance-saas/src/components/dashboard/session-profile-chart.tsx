'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { TelemetryPoint } from '@/lib/fit/parse-fit'
import type { SportType } from '@/types/database'
import { sportFamily } from '@/lib/sports'

/**
 * Profil d'une séance importée : un graphique par mesure (FC, puissance, allure/vitesse),
 * même axe du temps, curseur synchronisé (syncId). Unités différentes → jamais sur un même axe.
 */

const AXIS = { fontSize: 12, fill: 'var(--muted-foreground)' }

const clock = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}
const paceLabel = (secPerKm: number) => `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')} /km`

interface Metric {
  key: string
  title: string
  unit: string
  format: (v: number) => string
  reversed?: boolean
}

export function SessionProfileChart({ points, sport }: { points: TelemetryPoint[]; sport: SportType }) {
  // Allure pour la course (min/km, axe inversé : plus haut = plus rapide), vitesse sinon
  const pace = sportFamily(sport) === 'run'
  const data = points.map((p) => ({
    t: p.t,
    hr: p.hr ?? null,
    w: p.w ?? null,
    pace: pace && p.v && p.v > 0.5 ? 1000 / p.v : null,
    kmh: !pace && p.v != null ? p.v * 3.6 : null,
  }))

  const allMetrics: Metric[] = [
    { key: 'hr', title: 'Fréquence cardiaque', unit: 'bpm', format: (v) => `${Math.round(v)} bpm` },
    { key: 'w', title: 'Puissance', unit: 'W', format: (v) => `${Math.round(v)} W` },
    { key: 'pace', title: 'Allure', unit: 'min/km', format: paceLabel, reversed: true },
    { key: 'kmh', title: 'Vitesse', unit: 'km/h', format: (v) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h` },
  ]
  const metrics = allMetrics.filter((m) => data.some((d) => d[m.key as keyof typeof d] != null))

  if (metrics.length === 0) return null

  return (
    <div className="space-y-6">
      {metrics.map((m) => (
        <section key={m.key} aria-label={m.title} className="space-y-2">
          <h3 className="text-sm font-semibold">
            {m.title} <span className="font-normal text-muted-foreground">({m.unit})</span>
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} syncId="session" margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
                <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={clock} tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  reversed={m.reversed}
                  domain={['auto', 'auto']}
                  tickFormatter={m.key === 'pace' ? (v: number) => paceLabel(v).replace(' /km', '') : (v: number) => String(Math.round(v))}
                />
                <Tooltip
                  content={(props: TooltipContentProps<ValueType, NameType>) => <PointTooltip {...props} metric={m} />}
                  cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
                  isAnimationActive={false}
                />
                <Line dataKey={m.key} type="monotone" stroke="var(--viz-ctl)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ))}
    </div>
  )
}

function PointTooltip({ active, payload, metric }: TooltipContentProps<ValueType, NameType> & { metric: Metric }) {
  const point = payload?.[0]?.payload as Record<string, number | null> | undefined
  const value = point?.[metric.key]
  if (!active || !point || value == null) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-xs text-muted-foreground">{clock(point.t ?? 0)}</p>
      <p>
        <strong className="tabular-nums">{metric.format(value)}</strong>{' '}
        <span className="text-muted-foreground">{metric.title}</span>
      </p>
    </div>
  )
}
