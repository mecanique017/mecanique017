import { sportFamily } from '@/lib/sports'

export interface LapRow {
  n: number
  time: number // s
  dist: number // m
  hr?: number
}

const clock = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.round(s % 60)
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`
}

/** Tours / splits : temps, allure (course) ou vitesse, FC ; barre relative pour repérer les tours rapides. */
export function LapTable({ laps, sport }: { laps: LapRow[]; sport: string }) {
  const run = sportFamily(sport) === 'run'
  const speeds = laps.map((l) => l.dist / Math.max(l.time, 1))
  const best = Math.max(...speeds)
  return (
    <section className="rounded-xl border bg-card p-4 space-y-2">
      <h2 className="font-semibold">Tours</h2>
      <table className="w-full text-sm tabular-nums">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="text-left font-normal py-1">Tour</th>
            <th className="text-right font-normal">Dist.</th>
            <th className="text-right font-normal">Temps</th>
            <th className="text-right font-normal">{run ? 'Allure' : 'Vitesse'}</th>
            {laps.some((l) => l.hr) && <th className="text-right font-normal">FC</th>}
          </tr>
        </thead>
        <tbody>
          {laps.map((l, i) => (
            <tr key={l.n} className="border-t">
              <td className="py-1.5">
                <span className="inline-flex items-center gap-2">
                  {l.n}
                  <span className="hidden sm:inline-block h-1.5 rounded-full bg-red-600/70" style={{ width: `${Math.round((speeds[i] / best) * 48)}px` }} aria-hidden />
                </span>
              </td>
              <td className="text-right">{(l.dist / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km</td>
              <td className="text-right">{clock(l.time)}</td>
              <td className={i === speeds.indexOf(best) && laps.length > 1 ? 'text-right font-semibold text-red-500' : 'text-right'}>
                {run ? `${clock(1000 / Math.max(speeds[i], 0.01))} /km` : `${(speeds[i] * 3.6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`}
              </td>
              {laps.some((x) => x.hr) && <td className="text-right">{l.hr ?? '–'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
