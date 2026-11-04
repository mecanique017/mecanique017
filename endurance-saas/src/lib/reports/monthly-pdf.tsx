import 'server-only'
import { Document, G, Line, Page, Polyline, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import type { MonthlyReport } from './monthly'

/**
 * Bilan mensuel au format PDF (A4). Police Helvetica intégrée (jeu WinAnsi) :
 * on évite les caractères hors de ce jeu (signe moins typographique, flèches).
 * Couleurs : palette claire validée (impression sur papier blanc).
 */
const C = { text: '#171717', muted: '#6b6b6b', grid: '#e6e5e1', ctl: '#2a78d6', atl: '#eb6834', bar: '#2a78d6', card: '#f6f6f4' }

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9.5, color: C.text },
  brand: { fontSize: 10, color: '#10b981', fontFamily: 'Helvetica-Bold' },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  sub: { color: C.muted, marginTop: 2, marginBottom: 14 },
  h2: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: 6, padding: 8 },
  tileLabel: { color: C.muted, fontSize: 8.5 },
  tileValue: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  tileDetail: { color: C.muted, fontSize: 8, marginTop: 2 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.grid, paddingVertical: 3 },
  th: { color: C.muted, fontFamily: 'Helvetica-Bold' },
  legend: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, color: C.muted },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', color: C.muted, fontSize: 8 },
})

const fmt = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d }).replace(/ | /g, ' ')
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmt(Math.abs(n))}`
const hours = (sec: number) => {
  const total = Math.round(sec / 60) // arrondi à la minute avant découpage
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')}`
}
const km = (m: number) => `${fmt(m / 1000)} km`
const SPORTS = { run: 'Course', ride: 'Vélo', swim: 'Natation' } as const
const day = (d: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { ...opts, timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`))
const monthLabel = (m: string) => day(`${m}-01`, { month: 'long', year: 'numeric' })

export function MonthlyReportPdf({ r }: { r: MonthlyReport }) {
  const title = `Bilan de ${monthLabel(r.month)}`
  return (
    <Document title={`${title} - ${r.athleteName}`} author="Endurance SaaS" language="fr">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>Endurance SaaS</Text>
        <Text style={s.h1}>{title.charAt(0).toUpperCase() + title.slice(1)}</Text>
        <Text style={s.sub}>{r.athleteName}</Text>

        <View style={s.tiles}>
          <Tile label="Séances" value={String(r.totals.sessions)} detail={`${r.plannedDone.done} / ${r.plannedDone.planned} séances prévues faites`} />
          <Tile label="Durée" value={hours(r.totals.seconds)} detail={km(r.totals.meters)} />
          <Tile label="Charge (TSS)" value={fmt(r.totals.tss, 0)} detail={`${r.weeks.filter((w) => w.tss > 0).length} semaine(s) d’entraînement`} />
          <Tile label="Forme (CTL)" value={fmt(r.ctlEnd)} detail={`${signed(r.ctlEnd - r.ctlStart)} sur le mois · TSB ${signed(r.tsbEnd)}`} />
        </View>

        <Text style={s.h2}>Forme et fatigue</Text>
        <View style={s.legend}>
          <LegendLine color={C.ctl} label="Forme (CTL)" />
          <LegendLine color={C.atl} label="Fatigue (ATL)" />
        </View>
        <LoadChart load={r.load} />

        <Text style={s.h2}>Charge par semaine (TSS)</Text>
        <WeeklyBars weeks={r.weeks} />

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>Par sport</Text>
            <View style={s.row}>
              <Text style={[s.th, { flex: 2 }]}>Sport</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>Séances</Text>
              <Text style={[s.th, { flex: 1.4, textAlign: 'right' }]}>Durée</Text>
              <Text style={[s.th, { flex: 1.4, textAlign: 'right' }]}>Distance</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>TSS</Text>
            </View>
            {r.bySport.length === 0 && <Text style={{ color: C.muted, marginTop: 4 }}>Aucune séance ce mois-ci.</Text>}
            {r.bySport.map((b) => (
              <View key={b.sport} style={s.row}>
                <Text style={{ flex: 2 }}>{SPORTS[b.sport]}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>{b.sessions}</Text>
                <Text style={{ flex: 1.4, textAlign: 'right' }}>{hours(b.seconds)}</Text>
                <Text style={{ flex: 1.4, textAlign: 'right' }}>{km(b.meters)}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>{fmt(b.tss, 0)}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>Bien-être et coach IA</Text>
            <KeyValue k="Jours renseignés" v={String(r.wellness.days)} />
            <KeyValue k="VFC moyenne" v={r.wellness.hrv != null ? `${fmt(r.wellness.hrv)} ms` : '-'} />
            <KeyValue k="Sommeil moyen" v={r.wellness.sleep != null ? `${fmt(r.wellness.sleep)} / 100` : '-'} />
            <KeyValue k="Fatigue ressentie moyenne" v={r.wellness.fatigue != null ? `${fmt(r.wellness.fatigue)} / 10` : '-'} />
            <KeyValue k="Analyses du coach IA" v={String(r.insights.count)} />
            <KeyValue k="Alertes fatigue du coach" v={String(r.insights.fatigueAlerts)} />
          </View>
        </View>

        <Footer generatedAt={r.generatedAt} />
      </Page>

      {r.activities.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.h2}>Séances du mois</Text>
          <View style={s.row} fixed>
            <Text style={[s.th, { width: 70 }]}>Date</Text>
            <Text style={[s.th, { flex: 1 }]}>Séance</Text>
            <Text style={[s.th, { width: 60 }]}>Sport</Text>
            <Text style={[s.th, { width: 55, textAlign: 'right' }]}>Durée</Text>
            <Text style={[s.th, { width: 60, textAlign: 'right' }]}>Distance</Text>
            <Text style={[s.th, { width: 40, textAlign: 'right' }]}>TSS</Text>
          </View>
          {r.activities.map((a, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={{ width: 70 }}>{day(a.date, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              <Text style={{ flex: 1 }}>{a.title}</Text>
              <Text style={{ width: 60 }}>{SPORTS[a.sport]}</Text>
              <Text style={{ width: 55, textAlign: 'right' }}>{hours(a.seconds)}</Text>
              <Text style={{ width: 60, textAlign: 'right' }}>{a.meters > 0 ? km(a.meters) : '-'}</Text>
              <Text style={{ width: 40, textAlign: 'right' }}>{fmt(a.tss, 0)}</Text>
            </View>
          ))}
          <Footer generatedAt={r.generatedAt} />
        </Page>
      )}
    </Document>
  )
}

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileValue}>{value}</Text>
      <Text style={s.tileDetail}>{detail}</Text>
    </View>
  )
}

function KeyValue({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <Text style={{ flex: 1, color: C.muted }}>{k}</Text>
      <Text>{v}</Text>
    </View>
  )
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <Svg width={14} height={4}>
        <Line x1={0} y1={2} x2={14} y2={2} stroke={color} strokeWidth={2} />
      </Svg>
      <Text>{label}</Text>
    </View>
  )
}

const W = 523
const H = 130
const PAD_L = 26

/** CTL et ATL du mois : même unité, même axe. */
function LoadChart({ load }: { load: MonthlyReport['load'] }) {
  if (load.length < 2) return <Text style={{ color: C.muted }}>Pas assez de données.</Text>
  const max = Math.max(10, ...load.map((d) => Math.max(d.ctl, d.atl)))
  const top = Math.ceil(max / 20) * 20
  const x = (i: number) => PAD_L + (i / (load.length - 1)) * (W - PAD_L - 4)
  const y = (v: number) => H - 14 - (v / top) * (H - 24)
  const pts = (key: 'ctl' | 'atl') => load.map((d, i) => `${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
  const ticks = [0, top / 2, top]
  return (
    <Svg width={W} height={H}>
      {ticks.map((t) => (
        <Line key={t} x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth={0.75} />
      ))}
      {ticks.map((t) => (
        <Text key={`l${t}`} x={0} y={y(t) + 3} style={{ fontSize: 7, color: C.muted }}>
          {String(t)}
        </Text>
      ))}
      <Polyline points={pts('ctl')} stroke={C.ctl} strokeWidth={1.75} fill="none" />
      <Polyline points={pts('atl')} stroke={C.atl} strokeWidth={1.75} fill="none" />
      {[0, Math.floor((load.length - 1) / 2), load.length - 1].map((i) => (
        <Text key={`d${i}`} x={Math.min(x(i) - 10, W - 36)} y={H - 2} style={{ fontSize: 7, color: C.muted }}>
          {day(load[i].date, { day: 'numeric', month: 'short' })}
        </Text>
      ))}
    </Svg>
  )
}

/** TSS par semaine : barres fines, valeur au-dessus (pas d'axe nécessaire). */
function WeeklyBars({ weeks }: { weeks: MonthlyReport['weeks'] }) {
  const h = 90
  const max = Math.max(1, ...weeks.map((w) => w.tss))
  const slot = (W - PAD_L) / weeks.length
  const bw = Math.min(28, slot * 0.5)
  return (
    <Svg width={W} height={h + 24}>
      <Line x1={PAD_L} x2={W} y1={h} y2={h} stroke={C.grid} strokeWidth={0.75} />
      {weeks.map((w, i) => {
        const bh = (w.tss / max) * (h - 16)
        const cx = PAD_L + slot * i + slot / 2
        return (
          <G key={w.monday}>
            <Rect x={cx - bw / 2} y={h - bh} width={bw} height={bh} fill={C.bar} />
            <Text x={cx - 8} y={h - bh - 4} style={{ fontSize: 7.5 }}>
              {fmt(w.tss, 0)}
            </Text>
            <Text x={cx - 16} y={h + 12} style={{ fontSize: 7, color: C.muted }}>
              {`sem. ${day(w.monday, { day: 'numeric', month: 'short' })}`}
            </Text>
          </G>
        )
      })}
    </Svg>
  )
}

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{`Généré le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(new Date(generatedAt))}`}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}
