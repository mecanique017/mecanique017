import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, SportType } from '@/types/database'
import { calculateTSS } from '@/lib/training/metrics'
import { localDate } from '@/lib/training/load'
import { addDays, mondayOf } from '@/lib/dates'

/**
 * Données de démonstration pour tester l'application sans montre : 12 semaines d'un bloc
 * d'entraînement réaliste (progression, semaine allégée toutes les 4 semaines), bien-être quotidien
 * et programme de la semaine. Tout est marqué (source 'demo', is_demo) pour être supprimé proprement.
 */

const WEEKS = 12

// Générateur pseudo-aléatoire déterministe (mêmes données à chaque génération)
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

interface Template {
  dow: number // 1 = lundi … 7 = dimanche
  sport: SportType
  title: string
  minutes: number
  hrFrac: number // FC moyenne en fraction de la FC seuil
  watts?: number // fraction de la FTP (vélo)
  kmh: number
}

// Semaine type d'un coureur qui fait aussi du vélo
const WEEK: Template[] = [
  { dow: 2, sport: 'run', title: 'Fractionné 6 × 1000 m', minutes: 55, hrFrac: 0.93, kmh: 12.5 },
  { dow: 3, sport: 'ride', title: 'Vélo endurance', minutes: 75, hrFrac: 0.78, watts: 0.65, kmh: 27 },
  { dow: 4, sport: 'run', title: 'Footing', minutes: 45, hrFrac: 0.8, kmh: 10.5 },
  { dow: 6, sport: 'ride', title: 'Vélo 3 × 10 min au seuil', minutes: 90, hrFrac: 0.86, watts: 0.8, kmh: 29 },
  { dow: 7, sport: 'run', title: 'Sortie longue', minutes: 95, hrFrac: 0.82, kmh: 11 },
]

export async function seedDemoData(supabase: SupabaseClient<Database>, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('ftp, hr_rest, lactate_threshold_hr').eq('id', userId).single()
  if (!profile) throw new Error('Profil introuvable')
  const rand = rng(42)
  const today = localDate(new Date())
  const firstMonday = addDays(mondayOf(today), -7 * (WEEKS - 1))

  const activities: Database['public']['Tables']['activities']['Insert'][] = []
  for (let w = 0; w < WEEKS; w++) {
    // Charge croissante, semaine allégée (−35 %) toutes les 4 semaines
    const factor = (w + 1) % 4 === 0 ? 0.65 : 1 + w * 0.04
    for (const t of WEEK) {
      const day = addDays(firstMonday, w * 7 + t.dow - 1)
      if (day >= today) continue
      if (rand() < 0.08) continue // une séance manquée de temps en temps
      const minutes = Math.round(t.minutes * factor * (0.9 + rand() * 0.2))
      const seconds = minutes * 60
      const avgHr = Math.round(profile.hr_rest + (profile.lactate_threshold_hr - profile.hr_rest) * (t.hrFrac + (rand() - 0.5) * 0.04))
      const avgWatts = t.watts ? Math.round(profile.ftp * t.watts * (0.97 + rand() * 0.06)) : null
      const intervals = /×/.test(t.title)
      const np = avgWatts ? (intervals ? Math.round(avgWatts * 1.06) : Math.round(avgWatts * 1.02)) : null
      const { tss, intensityFactor } = calculateTSS({
        durationSeconds: seconds,
        avgWatts: np,
        ftp: profile.ftp,
        avgHr,
        hrRest: profile.hr_rest,
        lactateThresholdHr: profile.lactate_threshold_hr,
      })
      const distance = Math.round((t.kmh * (0.95 + rand() * 0.1) * seconds) / 3.6)
      const startHour = t.dow >= 6 ? 8 : 18
      activities.push({
        user_id: userId,
        title: t.title,
        sport_type: t.sport,
        start_time: new Date(`${day}T${String(startHour - 1).padStart(2, '0')}:30:00Z`).toISOString(),
        duration_seconds: seconds,
        distance_meters: distance,
        elevation_gain_meters: Math.round(distance / 1000 * (t.sport === 'ride' ? 9 : 6)),
        avg_hr: avgHr,
        max_hr: Math.min(avgHr + 18, 200),
        avg_watts: avgWatts,
        normalized_power: np,
        tss,
        intensity_factor: intensityFactor,
        rpe_score: Math.min(10, Math.max(2, Math.round(t.hrFrac * 10 - 2 + rand() * 2))),
        source: 'demo',
        // Courbes et tracé pour les 3 dernières semaines (pour voir les graphiques de séance)
        raw_telemetry: w >= WEEKS - 3 ? telemetry(seconds, avgHr, avgWatts, t.kmh / 3.6, intervals, rand) : null,
      })
    }
  }

  // Bien-être : VFC autour de 62 ms, en baisse après les grosses semaines
  const wellness: Database['public']['Tables']['daily_metrics']['Insert'][] = []
  const { data: existing } = await supabase.from('daily_metrics').select('date').eq('user_id', userId).gte('date', firstMonday)
  const taken = new Set((existing ?? []).map((d) => d.date))
  for (let d = 0; d < WEEKS * 7; d++) {
    const day = addDays(firstMonday, d)
    if (day > today || taken.has(day) || rand() < 0.15) continue
    const w = Math.floor(d / 7)
    const fatigue = (w + 1) % 4 === 0 ? -1 : w * 0.15
    wellness.push({
      user_id: userId,
      date: day,
      hrv: Math.round(62 - fatigue * 3 + (rand() - 0.5) * 10),
      resting_hr: Math.round(profile.hr_rest + fatigue + (rand() - 0.5) * 4),
      sleep_score: Math.round(78 - fatigue * 2 + (rand() - 0.5) * 16),
      perceived_fatigue: Math.min(9, Math.max(1, Math.round(3 + fatigue + (rand() - 0.5) * 3))),
      is_demo: true,
    })
  }

  // Programme : la semaine en cours (séances futures)
  const monday = mondayOf(today)
  const planned = WEEK.map((t) => ({ t, day: addDays(monday, t.dow - 1) }))
    .filter(({ day }) => day >= today)
    .map(({ t, day }) => ({
      user_id: userId,
      scheduled_date: day,
      sport_type: t.sport,
      title: t.title,
      description: 'Séance de démonstration.',
      target_duration_seconds: t.minutes * 60,
      target_tss: Math.round((t.minutes / 60) * t.hrFrac ** 2 * 100),
      source: 'demo' as const,
    }))

  for (let i = 0; i < activities.length; i += 50) {
    const { error } = await supabase.from('activities').insert(activities.slice(i, i + 50))
    if (error) throw error
  }
  if (wellness.length) {
    const { error } = await supabase.from('daily_metrics').insert(wellness)
    if (error) throw error
  }
  if (planned.length) {
    const { error } = await supabase.from('planned_workouts').insert(planned)
    if (error) throw error
  }
  return { activities: activities.length, wellness: wellness.length, planned: planned.length }
}

/** Supprime uniquement les données marquées « démo » (jamais les vraies séances ni les vrais relevés). */
export async function clearDemoData(supabase: SupabaseClient<Database>, userId: string) {
  const results = await Promise.all([
    supabase.from('activities').delete().eq('user_id', userId).eq('source', 'demo'),
    supabase.from('daily_metrics').delete().eq('user_id', userId).eq('is_demo', true),
    supabase.from('planned_workouts').delete().eq('user_id', userId).eq('source', 'demo'),
  ])
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

/** Courbe et tracé de démonstration (boucle autour de Bordeaux). */
function telemetry(seconds: number, hr: number, watts: number | null, speed: number, intervals: boolean, rand: () => number) {
  const step = Math.max(1, Math.ceil(seconds / 600))
  const points = []
  for (let t = 0; t < seconds; t += step) {
    const hard = intervals && t > seconds * 0.2 && t < seconds * 0.8 && Math.floor(t / 300) % 2 === 0
    const k = hard ? 1.08 : 0.96
    const p = watts ? Math.round(watts * (hard ? 1.25 : 0.92) + (rand() - 0.5) * 30) : undefined
    points.push({ t, hr: Math.round(hr * k + (rand() - 0.5) * 4), ...(p ? { w: p } : {}), v: Math.round(speed * k * 100) / 100, alt: Math.round(40 + 25 * Math.sin(t / 900)) })
  }
  const route: [number, number][] = []
  for (let i = 0; i <= 200; i++) {
    const a = (i / 200) * 2 * Math.PI
    route.push([Math.round((44.84 + 0.03 * Math.sin(a) + 0.006 * Math.sin(3 * a)) * 1e5) / 1e5, Math.round((-0.58 + 0.045 * Math.cos(a)) * 1e5) / 1e5])
  }
  return { version: 2, points, route }
}
