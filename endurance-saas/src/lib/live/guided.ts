/**
 * Séance guidée pendant l'enregistrement : enchaînement des étapes (échauffement, fractions,
 * récupérations…) selon le temps en mouvement ou la distance, avec annonces vocales.
 * Logique pure : l'écran d'enregistrement fournit le temps (s) et la distance (m) courants.
 */
import type { Step } from '@/lib/training/plan'
import { formatPace } from '@/lib/training/plan'

export interface GuidedState {
  title: string
  steps: Step[]
  index: number
  /** temps (s) et distance (m) de la séance au début de l'étape en cours */
  stepT: number
  stepD: number
  done: boolean
}

export const startGuided = (title: string, steps: Step[], t: number, d: number): GuidedState => ({ title, steps, index: 0, stepT: t, stepD: d, done: !steps.length })

/** Reste de l'étape en cours : secondes ou mètres, et part effectuée (0..1). */
export function remaining(g: GuidedState, t: number, d: number) {
  const s = g.steps[g.index]
  if (!s) return { seconds: 0, meters: 0, ratio: 1 }
  if (s.meters) {
    const left = Math.max(0, s.meters - (d - g.stepD))
    return { seconds: null, meters: left, ratio: 1 - left / s.meters }
  }
  const total = s.seconds ?? 0
  const left = Math.max(0, total - (t - g.stepT))
  return { seconds: left, meters: null, ratio: total ? 1 - left / total : 1 }
}

/** Fait avancer la séance ; renvoie l'étape franchie (pour l'annonce) ou la fin. */
export function advance(g: GuidedState, t: number, d: number): { state: GuidedState; event?: 'step' | 'finish' } {
  if (g.done) return { state: g }
  const r = remaining(g, t, d)
  const over = r.meters != null ? r.meters <= 0 : (r.seconds ?? 0) <= 0
  if (!over) return { state: g }
  const index = g.index + 1
  if (index >= g.steps.length) return { state: { ...g, index, done: true }, event: 'finish' }
  return { state: { ...g, index, stepT: t, stepD: d }, event: 'step' }
}

/** Étape suivante sans attendre (bouton « Étape suivante »). */
export const skip = (g: GuidedState, t: number, d: number): GuidedState =>
  g.index + 1 >= g.steps.length ? { ...g, index: g.steps.length, done: true } : { ...g, index: g.index + 1, stepT: t, stepD: d }

const spokenDistance = (m: number) => (m >= 1000 ? `${(Math.round(m / 100) / 10).toLocaleString('fr-FR')} kilomètres` : `${Math.round(m)} mètres`)
const spokenDuration = (s: number) => {
  const min = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return [min ? `${min} minute${min > 1 ? 's' : ''}` : '', sec ? `${sec} secondes` : ''].filter(Boolean).join(' ')
}
const spokenPace = (p: number) => `${Math.floor(p / 60)} minutes ${String(Math.round(p % 60)).padStart(2, '0')} au kilomètre`

/** Texte annoncé au début d'une étape. */
export function announce(s: Step, isLast: boolean) {
  const what = s.meters ? spokenDistance(s.meters) : s.seconds ? spokenDuration(s.seconds) : ''
  const target = s.pace ? `, allure ${spokenPace(s.pace)}` : s.watts ? `, ${s.watts} watts` : ''
  return `${s.label}${isLast ? ', dernière étape' : ''} : ${what}${target}.`
}

/** Libellé court de la cible (affichage). */
export const targetLabel = (s: Step) => (s.pace ? formatPace(s.pace) : s.watts ? `${s.watts} W` : '')

/** Séances rapides disponibles sans plan (fractionné classique). */
export function quickWorkouts(sport: 'run' | 'ride', vma: number, ftp: number): { title: string; steps: Step[] }[] {
  const pace = (pct: number) => Math.round(3600 / (vma * pct))
  const reps = (n: number, work: Omit<Step, 'kind'>, rec: Omit<Step, 'kind'>, wu: Omit<Step, 'kind'>, cd: Omit<Step, 'kind'>): Step[] => {
    const out: Step[] = [{ kind: 'warmup', ...wu }]
    for (let i = 0; i < n; i++) {
      out.push({ kind: 'work', ...work, label: `${work.label} ${i + 1}/${n}` })
      if (i < n - 1) out.push({ kind: 'recovery', ...rec })
    }
    out.push({ kind: 'cooldown', ...cd })
    return out
  }
  if (sport === 'run') {
    const wu = { label: 'Échauffement', seconds: 900, pace: pace(0.65) }
    const cd = { label: 'Retour au calme', seconds: 600, pace: pace(0.62) }
    return [
      { title: '10 × 1 min / 1 min', steps: reps(10, { label: 'Vite', seconds: 60, pace: pace(0.98) }, { label: 'Récupération', seconds: 60, pace: pace(0.6) }, wu, cd) },
      { title: '8 × 400 m', steps: reps(8, { label: '400 m', meters: 400, pace: pace(0.98) }, { label: 'Récupération', seconds: 75, pace: pace(0.55) }, wu, cd) },
      { title: '6 × 1 000 m', steps: reps(6, { label: '1 000 m', meters: 1000, pace: pace(0.92) }, { label: 'Récupération', seconds: 120, pace: pace(0.55) }, wu, cd) },
      { title: '3 × 10 min seuil', steps: reps(3, { label: 'Seuil', seconds: 600, pace: pace(0.86) }, { label: 'Récupération', seconds: 120, pace: pace(0.6) }, wu, cd) },
    ]
  }
  const wu = { label: 'Échauffement', seconds: 900, watts: Math.round(ftp * 0.6) }
  const cd = { label: 'Retour au calme', seconds: 600, watts: Math.round(ftp * 0.55) }
  return [
    { title: '5 × 4 min PMA', steps: reps(5, { label: 'PMA', seconds: 240, watts: Math.round(ftp * 1.12) }, { label: 'Récupération', seconds: 240, watts: Math.round(ftp * 0.5) }, wu, cd) },
    { title: '3 × 12 min sweet spot', steps: reps(3, { label: 'Sweet spot', seconds: 720, watts: Math.round(ftp * 0.9) }, { label: 'Récupération', seconds: 300, watts: Math.round(ftp * 0.55) }, wu, cd) },
    { title: '30 / 30 × 10', steps: reps(10, { label: 'Sprint', seconds: 30, watts: Math.round(ftp * 1.3) }, { label: 'Souple', seconds: 30, watts: Math.round(ftp * 0.5) }, wu, cd) },
  ]
}
