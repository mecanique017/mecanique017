/**
 * Calculs de charge d'entraînement (modèle Banister / PMC).
 * Fonctions pures, sans dépendance : testables et réutilisables côté client ou serveur.
 */

export interface ActivityInput {
  durationSeconds: number
  /** Puissance moyenne (idéalement la puissance normalisée, NP) */
  avgWatts?: number | null
  ftp?: number | null
  avgHr?: number | null
  hrRest?: number | null
  /** FC au seuil lactique (LTHR) : référence de l'hrTSS */
  lactateThresholdHr?: number | null
}

export interface TssResult {
  tss: number
  intensityFactor: number
  method: 'power' | 'heart_rate' | 'none'
}

const round = (value: number, decimals: number) => Number(value.toFixed(decimals))

/**
 * TSS (Training Stress Score). Par définition, 1 h au seuil = 100 TSS.
 * - Puissance : TSS = h × IF² × 100 avec IF = P / FTP
 *   (équivalent à (s × P × IF) / (FTP × 3600) × 100)
 * - Fréquence cardiaque (hrTSS) : IF = (FCmoy − FCrepos) / (LTHR − FCrepos)
 */
export function calculateTSS(input: ActivityInput): TssResult {
  const hours = input.durationSeconds / 3600
  if (!(hours > 0)) return { tss: 0, intensityFactor: 0, method: 'none' }

  if (input.avgWatts && input.ftp && input.ftp > 0) {
    const intensityFactor = input.avgWatts / input.ftp
    return {
      tss: Math.round(hours * intensityFactor ** 2 * 100),
      intensityFactor: round(intensityFactor, 3),
      method: 'power',
    }
  }

  if (input.avgHr && input.hrRest != null && input.lactateThresholdHr) {
    const thresholdReserve = input.lactateThresholdHr - input.hrRest
    if (thresholdReserve > 0) {
      // FC moyenne sous la FC de repos (capteur défaillant) → intensité nulle
      const intensityFactor = Math.max(0, (input.avgHr - input.hrRest) / thresholdReserve)
      return {
        tss: Math.round(hours * intensityFactor ** 2 * 100),
        intensityFactor: round(intensityFactor, 3),
        method: 'heart_rate',
      }
    }
  }

  return { tss: 0, intensityFactor: 0, method: 'none' }
}

export interface TrainingLoad {
  ctl: number
  atl: number
  tsb: number
}

const CTL_DAYS = 42
const ATL_DAYS = 7
const CTL_FACTOR = 1 - Math.exp(-1 / CTL_DAYS)
const ATL_FACTOR = 1 - Math.exp(-1 / ATL_DAYS)

/**
 * Avance la charge d'un jour (moyenne mobile exponentielle).
 * TSB = CTL − ATL du jour (TrainingPeaks utilise ceux de la veille : décalage d'un jour).
 * Les valeurs NE sont PAS arrondies : arrondir à chaque jour cumule l'erreur.
 */
export function updateTrainingLoad(previous: { ctl: number; atl: number }, dayTss: number): TrainingLoad {
  const ctl = previous.ctl + (dayTss - previous.ctl) * CTL_FACTOR
  const atl = previous.atl + (dayTss - previous.atl) * ATL_FACTOR
  return { ctl, atl, tsb: ctl - atl }
}

export interface DailyLoad extends TrainingLoad {
  date: string // YYYY-MM-DD
  tss: number
}

/**
 * Série jour par jour de CTL/ATL/TSB entre deux dates (incluses).
 * Plusieurs activités le même jour sont additionnées ; les jours sans activité valent 0 TSS.
 * Résultat arrondi à 1 décimale pour l'affichage / le stockage.
 */
export function computeTrainingLoadSeries(
  activities: { date: string; tss: number }[],
  from: string,
  to: string,
  initial: { ctl: number; atl: number } = { ctl: 0, atl: 0 }
): DailyLoad[] {
  const tssByDay = new Map<string, number>()
  for (const { date, tss } of activities) {
    const day = date.slice(0, 10)
    tssByDay.set(day, (tssByDay.get(day) ?? 0) + tss)
  }

  const series: DailyLoad[] = []
  let load = { ctl: initial.ctl, atl: initial.atl }
  const end = Date.parse(`${to}T00:00:00Z`)

  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10)
    const tss = tssByDay.get(date) ?? 0
    const next = updateTrainingLoad(load, tss)
    series.push({ date, tss, ctl: round(next.ctl, 1), atl: round(next.atl, 1), tsb: round(next.tsb, 1) })
    load = next
  }
  return series
}
