import { AlertTriangle, BatteryFull, Gauge, TrendingUp, type LucideIcon } from 'lucide-react'
import { formState, type FormState } from '@/lib/training/load'
import type { DailyLoad } from '@/lib/training/metrics'

/** État de forme : couleur de statut TOUJOURS accompagnée d'une icône et d'un libellé. */
const FORM_STATES: Record<FormState, { label: string; hint: string; icon: LucideIcon; color: string }> = {
  fresh: { label: 'Frais', hint: 'Prêt pour un objectif ou une séance clé', icon: BatteryFull, color: 'var(--status-good)' },
  neutral: { label: 'Équilibré', hint: 'Charge stable, ni fatigue ni fraîcheur marquée', icon: Gauge, color: 'var(--muted-foreground)' },
  productive: { label: 'Charge productive', hint: 'Fatigue normale d’un bloc d’entraînement', icon: TrendingUp, color: 'var(--status-warning)' },
  overreaching: { label: 'Surmenage possible', hint: 'Prévoir de la récupération', icon: AlertTriangle, color: 'var(--status-critical)' },
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`

export function KpiTiles({ series }: { series: DailyLoad[] }) {
  const today = series.at(-1) ?? { ctl: 0, atl: 0, tsb: 0, tss: 0, date: '' }
  const weekAgo = series.at(-8) ?? today
  const weekTss = series.slice(-7).reduce((sum, d) => sum + d.tss, 0)
  const state = FORM_STATES[formState(today.tsb)]
  const StateIcon = state.icon

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Tile label="Forme (CTL)" value={fmt(today.ctl)} detail={`${signed(today.ctl - weekAgo.ctl)} sur 7 jours`} />
      <Tile label="Fatigue (ATL)" value={fmt(today.atl)} detail={`${signed(today.atl - weekAgo.atl)} sur 7 jours`} />
      <Tile label="Fraîcheur (TSB)" value={signed(today.tsb)}>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium" title={state.hint}>
          <StateIcon className="size-4 shrink-0" style={{ color: state.color }} aria-hidden />
          {state.label}
        </p>
      </Tile>
      <Tile label="TSS sur 7 jours" value={fmt(weekTss)} detail={`${series.slice(-7).filter((d) => d.tss > 0).length} jour(s) d’entraînement`} />
    </div>
  )
}

function Tile({ label, value, detail, children }: { label: string; value: string; detail?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      {children}
    </div>
  )
}
