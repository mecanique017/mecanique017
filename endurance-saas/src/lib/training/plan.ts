/**
 * Générateur de plan d'entraînement (sans IA, gratuit) — course à pied et vélo.
 *
 * Principes classiques de l'entraînement d'endurance :
 *  - périodisation : foncier → développement → spécifique → affûtage (dernières 1 à 2 semaines) ;
 *  - progression du volume ≤ 10 % par semaine, semaine allégée (−30 %) toutes les 4 semaines ;
 *  - ~80 % du temps en endurance facile, 1 à 2 séances de qualité par semaine selon le nombre de séances ;
 *  - allures tirées de la VMA (course) et puissances de la FTP (vélo) du profil.
 * Chaque séance porte une structure (échauffement, blocs, récupérations) utilisée par la séance guidée.
 */
import type { PlanGoal, SportType } from '@/types/database'

export interface Step {
  kind: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'steady'
  label: string
  /** durée (s) ou distance (m) : l'une des deux */
  seconds?: number
  meters?: number
  /** allure cible (s/km) pour la course, puissance (W) pour le vélo */
  pace?: number
  watts?: number
}

export interface PlannedSession {
  date: string
  sport: SportType
  title: string
  description: string
  seconds: number
  tss: number
  steps: Step[]
  quality: boolean
}

export const PLAN_GOALS: { key: PlanGoal; label: string; sport: 'run' | 'ride'; km?: number; minWeeks: number; peak: number }[] = [
  { key: '5k', label: '5 km', sport: 'run', km: 5, minWeeks: 6, peak: 32 },
  { key: '10k', label: '10 km', sport: 'run', km: 10, minWeeks: 8, peak: 42 },
  { key: 'half', label: 'Semi-marathon', sport: 'run', km: 21.1, minWeeks: 10, peak: 52 },
  { key: 'marathon', label: 'Marathon', sport: 'run', km: 42.2, minWeeks: 14, peak: 68 },
  { key: 'run_fitness', label: 'Forme (course)', sport: 'run', minWeeks: 4, peak: 30 },
  // vélo : volume en heures par semaine
  { key: 'ride100', label: 'Sortie de 100 km', sport: 'ride', km: 100, minWeeks: 8, peak: 8 },
  { key: 'ride160', label: 'Cyclosportive (160 km)', sport: 'ride', km: 160, minWeeks: 10, peak: 10 },
  { key: 'ride_fitness', label: 'Forme (vélo)', sport: 'ride', minWeeks: 4, peak: 6 },
]

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const weekday = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7 // 0 = lundi
const mondayOf = (day: string) => addDays(day, -weekday(day))

/** Allure (s/km) à un pourcentage de la VMA (km/h). */
const paceAt = (vma: number, pct: number) => Math.round(3600 / (vma * pct))
export const formatPace = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}/km`

/** Jours d'entraînement conseillés selon le nombre de séances (0 = lundi). */
export function defaultDays(n: number): number[] {
  return ({ 2: [2, 6], 3: [1, 3, 6], 4: [1, 3, 5, 6], 5: [0, 1, 3, 5, 6], 6: [0, 1, 2, 3, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] } as Record<number, number[]>)[n] ?? [1, 3, 6]
}

export interface PlanInput {
  goal: PlanGoal
  raceDate: string
  start: string // premier jour du plan (YYYY-MM-DD)
  sessionsPerWeek: number
  days: number[] // jours choisis (0 = lundi), la sortie longue tombe sur le dernier
  /** volume actuel : km/semaine (course) ou h/semaine (vélo), moyenne des 4 dernières semaines */
  currentVolume: number
  vma: number // km/h
  ftp: number // W
}

export function generatePlan(p: PlanInput): { weeks: number; sessions: PlannedSession[] } {
  const g = PLAN_GOALS.find((x) => x.key === p.goal)!
  const run = g.sport === 'run'
  const firstMonday = mondayOf(p.start)
  const weeks = Math.max(1, Math.min(24, Math.floor((Date.parse(`${p.raceDate}T12:00:00Z`) - Date.parse(`${firstMonday}T12:00:00Z`)) / (7 * 86_400_000)) + 1))
  const taper = g.key === 'marathon' ? 2 : g.key.endsWith('fitness') ? 0 : 1
  const days = [...new Set(p.days.length ? p.days : defaultDays(p.sessionsPerWeek))].sort().slice(0, p.sessionsPerWeek)
  const longDay = days.includes(6) ? 6 : days.includes(5) ? 5 : days[days.length - 1]

  // Volume : départ = volume actuel (au moins un minimum), progression ≤ 10 %/sem jusqu'au pic
  const minStart = run ? Math.max(10, g.peak * 0.45) : Math.max(2.5, g.peak * 0.45)
  let vol = Math.max(minStart, Math.min(p.currentVolume || minStart, g.peak))
  const volumes: number[] = []
  for (let w = 0; w < weeks; w++) {
    const fromEnd = weeks - w
    // Affûtage : 70 % puis 50 % du volume atteint (fraîcheur le jour J)
    if (fromEnd <= taper) volumes.push(vol * (fromEnd === 1 ? 0.5 : 0.7))
    else if ((w + 1) % 4 === 0) volumes.push(vol * 0.7) // semaine allégée
    else {
      if (w > 0) vol = Math.min(g.peak, vol * 1.08)
      volumes.push(vol)
    }
  }

  const sessions: PlannedSession[] = []
  for (let w = 0; w < weeks; w++) {
    const phase = w < weeks * 0.4 ? 'base' : w < weeks - taper - Math.max(1, Math.round(weeks * 0.15)) ? 'build' : weeks - w > taper ? 'peak' : 'taper'
    const isRace = (d: string) => d === p.raceDate
    const weekDays = days.map((d) => addDays(firstMonday, w * 7 + d)).filter((d) => d >= p.start && d <= p.raceDate)
    const quality = p.sessionsPerWeek >= 5 ? 2 : p.sessionsPerWeek >= 3 ? 1 : phase === 'base' ? 0 : 1
    const volume = volumes[w]
    let qDone = 0
    for (const day of weekDays) {
      if (isRace(day) && !g.key.endsWith('fitness')) {
        sessions.push(raceDay(g, day, run, p))
        continue
      }
      const wd = weekday(day)
      const isLong = wd === longDay
      if (isLong) sessions.push(longSession(day, run, volume, g, phase, p))
      else if (qDone < quality && phase !== 'taper' && wd !== (longDay + 6) % 7) {
        sessions.push(qualitySession(day, run, phase, qDone, p, g.key))
        qDone++
      } else sessions.push(easySession(day, run, volume, days.length, p))
    }
  }
  return { weeks, sessions: sessions.filter((s) => s.date >= p.start) }
}

const tssOf = (seconds: number, intensity: number) => Math.round((seconds / 3600) * intensity * intensity * 100)

function easySession(date: string, run: boolean, volume: number, perWeek: number, p: PlanInput): PlannedSession {
  if (run) {
    const km = Math.max(4, Math.min(14, Math.round((volume * 0.55) / Math.max(1, perWeek - 1))))
    const pace = paceAt(p.vma, 0.68)
    const seconds = Math.round(km * pace)
    return { date, sport: 'run', title: `Footing ${km} km`, description: `Endurance fondamentale, en aisance respiratoire (vous pouvez parler) : ${formatPace(pace)} environ.`, seconds, tss: tssOf(seconds, 0.7), quality: false, steps: [{ kind: 'steady', label: 'Footing facile', meters: km * 1000, pace }] }
  }
  const seconds = Math.round(Math.max(45, Math.min(120, (volume * 60 * 0.5) / Math.max(1, perWeek - 1))) / 5) * 5 * 60
  const watts = Math.round(p.ftp * 0.65)
  return { date, sport: 'ride', title: `Endurance ${Math.round(seconds / 60)} min`, description: `Sortie en endurance, souple, vers ${watts} W (65 % de la FTP).`, seconds, tss: tssOf(seconds, 0.65), quality: false, steps: [{ kind: 'steady', label: 'Endurance', seconds, watts }] }
}

function longSession(date: string, run: boolean, volume: number, g: (typeof PLAN_GOALS)[number], phase: string, p: PlanInput): PlannedSession {
  if (run) {
    const cap = g.key === 'marathon' ? 32 : g.key === 'half' ? 20 : g.key === '10k' ? 16 : 12
    const km = Math.max(6, Math.min(cap, Math.round(volume * 0.32)))
    const pace = paceAt(p.vma, 0.66)
    const race = g.km ? paceAt(p.vma, g.key === 'marathon' ? 0.8 : g.key === 'half' ? 0.85 : 0.9) : pace
    // Phase spécifique (semi, marathon) : la fin de la sortie longue à l'allure course
    const specific = phase === 'peak' && (g.key === 'marathon' || g.key === 'half')
    const end = specific ? Math.round(km * 0.3) : 0
    const steps: Step[] = specific
      ? [
          { kind: 'steady', label: 'Endurance', meters: (km - end) * 1000, pace },
          { kind: 'work', label: 'Allure course', meters: end * 1000, pace: race },
        ]
      : [{ kind: 'steady', label: 'Sortie longue', meters: km * 1000, pace }]
    const seconds = Math.round((km - end) * pace + end * race)
    return { date, sport: 'run', title: `Sortie longue ${km} km`, description: specific ? `${km - end} km tranquilles puis ${end} km à l'allure course (${formatPace(race)}).` : `Sortie longue en endurance (${formatPace(pace)}), sans chercher la vitesse.`, seconds, tss: tssOf(seconds, specific ? 0.78 : 0.7), quality: false, steps }
  }
  const hours = Math.max(1.5, Math.min(g.key === 'ride160' ? 5.5 : g.key === 'ride100' ? 4 : 3, volume * 0.4))
  const seconds = Math.round(hours * 4) * 15 * 60
  const watts = Math.round(p.ftp * 0.68)
  return { date, sport: 'ride', title: `Sortie longue ${Math.floor(seconds / 3600)} h ${String(Math.round((seconds % 3600) / 60)).padStart(2, '0')}`, description: `Endurance longue vers ${watts} W ; mangez 30 à 60 g de glucides par heure.`, seconds, tss: tssOf(seconds, 0.68), quality: false, steps: [{ kind: 'steady', label: 'Endurance', seconds, watts }] }
}

function qualitySession(date: string, run: boolean, phase: string, n: number, p: PlanInput, goal: PlanGoal): PlannedSession {
  const wu: Step = run ? { kind: 'warmup', label: 'Échauffement', seconds: 900, pace: paceAt(p.vma, 0.65) } : { kind: 'warmup', label: 'Échauffement', seconds: 900, watts: Math.round(p.ftp * 0.6) }
  const cd: Step = run ? { kind: 'cooldown', label: 'Retour au calme', seconds: 600, pace: paceAt(p.vma, 0.62) } : { kind: 'cooldown', label: 'Retour au calme', seconds: 600, watts: Math.round(p.ftp * 0.55) }
  const build = (title: string, description: string, reps: number, work: Omit<Step, 'kind'>, rec: Omit<Step, 'kind'>, intensity: number): PlannedSession => {
    const steps: Step[] = [wu]
    for (let i = 0; i < reps; i++) {
      steps.push({ kind: 'work', ...work, label: `${work.label} ${i + 1}/${reps}` })
      if (i < reps - 1) steps.push({ kind: 'recovery', ...rec })
    }
    steps.push(cd)
    const seconds = steps.reduce((a, s) => a + (s.seconds ?? Math.round(((s.meters ?? 0) / 1000) * (s.pace ?? 360))), 0)
    return { date, sport: run ? 'run' : 'ride', title, description, seconds, tss: tssOf(seconds, intensity), quality: true, steps }
  }
  if (run) {
    const vmaPace = paceAt(p.vma, 0.98)
    const threshold = paceAt(p.vma, 0.86)
    const race = paceAt(p.vma, goal === 'marathon' ? 0.8 : goal === 'half' ? 0.85 : goal === '10k' ? 0.9 : 0.94)
    if (phase === 'base') return build('Fartlek 10 × 1 min', 'Accélérations courtes et vives, récupération en trottinant.', 10, { label: 'Vite', seconds: 60, pace: vmaPace }, { label: 'Récupération', seconds: 60, pace: paceAt(p.vma, 0.6) }, 0.85)
    if (n === 1 || phase === 'peak')
      return build(`Seuil 3 × ${goal === 'marathon' || goal === 'half' ? 12 : 8} min`, `Allure soutenue mais contrôlée (${formatPace(threshold)}).`, 3, { label: 'Seuil', seconds: (goal === 'marathon' || goal === 'half' ? 12 : 8) * 60, pace: phase === 'peak' ? race : threshold }, { label: 'Récupération', seconds: 120, pace: paceAt(p.vma, 0.6) }, 0.9)
    return build('VMA 8 × 400 m', `Fractionné court à ${formatPace(vmaPace)}, récupération 1 min 15 en trottinant.`, 8, { label: '400 m', meters: 400, pace: vmaPace }, { label: 'Récupération', seconds: 75, pace: paceAt(p.vma, 0.55) }, 0.92)
  }
  const ftp = p.ftp
  if (phase === 'base') return build('Tempo 3 × 10 min', `Blocs à ${Math.round(ftp * 0.82)} W, récupération 5 min.`, 3, { label: 'Tempo', seconds: 600, watts: Math.round(ftp * 0.82) }, { label: 'Récupération', seconds: 300, watts: Math.round(ftp * 0.55) }, 0.8)
  if (n === 1 || phase === 'peak') return build('Sweet spot 3 × 12 min', `Blocs à ${Math.round(ftp * 0.9)} W (88-93 % FTP).`, 3, { label: 'Sweet spot', seconds: 720, watts: Math.round(ftp * 0.9) }, { label: 'Récupération', seconds: 300, watts: Math.round(ftp * 0.55) }, 0.88)
  return build('PMA 5 × 4 min', `Efforts intenses à ${Math.round(ftp * 1.12)} W, récupération 4 min.`, 5, { label: 'PMA', seconds: 240, watts: Math.round(ftp * 1.12) }, { label: 'Récupération', seconds: 240, watts: Math.round(ftp * 0.5) }, 0.92)
}

function raceDay(g: (typeof PLAN_GOALS)[number], date: string, run: boolean, p: PlanInput): PlannedSession {
  const km = g.km ?? 10
  const pace = run ? paceAt(p.vma, g.key === 'marathon' ? 0.8 : g.key === 'half' ? 0.85 : g.key === '10k' ? 0.9 : 0.94) : 0
  const seconds = run ? Math.round(km * pace) : Math.round((km / 27) * 3600)
  return {
    date,
    sport: run ? 'run' : 'ride',
    title: `Jour J : ${g.label}`,
    description: run ? `Objectif d'allure : ${formatPace(pace)} (temps visé ≈ ${Math.floor(seconds / 3600)} h ${String(Math.round((seconds % 3600) / 60)).padStart(2, '0')}). Partez prudemment !` : 'Partez prudemment, mangez et buvez toutes les 20 min.',
    seconds,
    tss: tssOf(seconds, run ? 0.95 : 0.8),
    quality: true,
    steps: run ? [{ kind: 'work', label: 'Course', meters: km * 1000, pace }] : [{ kind: 'steady', label: 'Course', meters: km * 1000, watts: Math.round(p.ftp * 0.72) }],
  }
}

/** Version allégée d'une séance (forme du jour basse) : endurance facile, 70 % de la durée. */
export function lighten(s: { sport: SportType; seconds: number }, p: { vma: number; ftp: number }): Pick<PlannedSession, 'title' | 'description' | 'seconds' | 'tss' | 'steps'> {
  const seconds = Math.round((s.seconds * 0.7) / 300) * 300 || 1800
  const run = s.sport === 'run' || s.sport === 'trail'
  return run
    ? { title: `Footing récupération ${Math.round(seconds / 60)} min`, description: 'Séance allégée : forme du jour basse. Très facile, en aisance totale.', seconds, tss: tssOf(seconds, 0.62), steps: [{ kind: 'steady', label: 'Footing très facile', seconds, pace: paceAt(p.vma, 0.62) }] }
    : { title: `Récupération active ${Math.round(seconds / 60)} min`, description: 'Séance allégée : forme du jour basse. Pédalage souple.', seconds, tss: tssOf(seconds, 0.55), steps: [{ kind: 'steady', label: 'Récupération', seconds, watts: Math.round(p.ftp * 0.55) }] }
}
