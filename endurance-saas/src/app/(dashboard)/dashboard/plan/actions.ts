'use server'

import Anthropic from '@anthropic-ai/sdk'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateTrainingPlan, sanitizePlan, TrainingPlanSchema, type TrainingPlan } from '@/lib/ai/plan'
import { CoachRefusalError } from '@/lib/ai/coach'
import { aiQuotaConfigured, getAiUsage, recordAiUsage } from '@/lib/coach-quota'
import { getTrainingLoad, localDate } from '@/lib/training/load'
import { getWellnessContext } from '@/lib/training/wellness'
import { addDays } from '@/lib/dates'
import { fieldErrors } from '@/lib/form-utils'
import type { SportType } from '@/types/database'

export interface PlanFormValues {
  goal: string
  event_date: string
  weeks: string
  max_hours: string
  days: string[]
  sports: string[]
}

export interface PlanState {
  /** Valeurs saisies, réaffichées après l'envoi (React réinitialise le formulaire) */
  values?: PlanFormValues
  message?: string
  errors?: Record<string, string>
  plan?: TrainingPlan
  startDate?: string
  /** Générations restantes après celle-ci (null = illimité) */
  remaining?: number | null
  discarded?: number
}

const FormSchema = z.object({
  goal: z.string().trim().min(5, 'Décrivez votre objectif (5 caractères minimum)').max(500),
  event_date: z.preprocess((v) => (v === '' ? undefined : v), z.iso.date().optional()),
  weeks: z.coerce.number().int().min(1).max(4),
  max_hours: z.coerce.number().min(1, 'Au moins 1 h').max(30, '30 h maximum'),
  days: z.array(z.coerce.number().int().min(1).max(7)).min(1, 'Choisissez au moins un jour'),
  sports: z.array(z.enum(['run', 'ride', 'swim'])).min(1, 'Choisissez au moins un sport'),
})

export async function generatePlanAction(_prev: PlanState, formData: FormData): Promise<PlanState> {
  const values: PlanFormValues = {
    goal: String(formData.get('goal') ?? ''),
    event_date: String(formData.get('event_date') ?? ''),
    weeks: String(formData.get('weeks') ?? '2'),
    max_hours: String(formData.get('max_hours') ?? '6'),
    days: formData.getAll('days').map(String),
    sports: formData.getAll('sports').map(String),
  }
  const result = await generate(formData)
  return { ...result, values }
}

async function generate(formData: FormData): Promise<Omit<PlanState, 'values'>> {
  const parsed = FormSchema.safeParse({
    goal: formData.get('goal'),
    event_date: formData.get('event_date'),
    weeks: formData.get('weeks'),
    max_hours: formData.get('max_hours'),
    days: formData.getAll('days'),
    sports: formData.getAll('sports'),
  })
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: 'Vérifiez les champs en rouge.' }
  if (!process.env.ANTHROPIC_API_KEY || !aiQuotaConfigured()) return { message: 'Coach IA non configuré.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) return { message: 'Profil introuvable.' }

  const usage = await getAiUsage(supabase, user.id, profile.subscription_tier, 'training_plan')
  if (usage.remaining === 0) {
    return { message: `Quota atteint : ${usage.limit} plan(s) ce mois-ci. Passez à l’offre supérieure pour continuer.` }
  }

  const today = localDate(new Date())
  const startDate = addDays(today, 1)
  const f = parsed.data

  // Contexte : charge actuelle, volume des 4 dernières semaines, bien-être du jour
  const [series, { data: recent }, wellness] = await Promise.all([
    getTrainingLoad(supabase, user.id),
    supabase
      .from('activities')
      .select('sport_type, duration_seconds, tss')
      .gte('start_time', new Date(Date.now() - 28 * 86_400_000).toISOString()),
    getWellnessContext(supabase, user.id, today),
  ])
  const load = series.at(-1) ?? { ctl: 0, atl: 0, tsb: 0 }
  const bySport = new Map<SportType, { sessions: number; seconds: number; tss: number }>()
  for (const a of recent ?? []) {
    const v = bySport.get(a.sport_type) ?? { sessions: 0, seconds: 0, tss: 0 }
    bySport.set(a.sport_type, { sessions: v.sessions + 1, seconds: v.seconds + a.duration_seconds, tss: v.tss + Number(a.tss) })
  }

  const request = {
    goal: f.goal,
    eventDate: f.event_date ?? null,
    startDate,
    weeks: f.weeks,
    availableDays: [...new Set(f.days)].sort(),
    maxHoursPerWeek: f.max_hours,
    sports: [...new Set(f.sports)],
    athlete: {
      discipline: profile.sport_discipline,
      ftp: profile.ftp,
      hrMax: profile.hr_max,
      lactateThresholdHr: profile.lactate_threshold_hr,
      vma: Number(profile.vma),
    },
    load: { ctl: load.ctl, atl: load.atl, tsb: load.tsb },
    recentVolume: [...bySport.entries()].map(([sport, v]) => ({
      sport,
      sessions: v.sessions,
      hours: Math.round((v.seconds / 3600) * 10) / 10,
      tss: Math.round(v.tss),
    })),
    wellness: wellness.today
      ? { hrv: wellness.today.hrv, hrvBaseline: wellness.hrvBaseline, fatigue: wellness.today.perceived_fatigue }
      : null,
  }

  try {
    const raw = await generateTrainingPlan(request)
    const { plan, discarded } = sanitizePlan(raw, request)
    await recordAiUsage(user.id, 'training_plan')
    if (plan.workouts.length === 0) return { message: 'Le coach n’a proposé aucune séance exploitable. Réessayez.' }
    return { plan, startDate, discarded, remaining: usage.remaining === null ? null : Math.max(0, usage.remaining - 1) }
  } catch (error) {
    if (error instanceof CoachRefusalError) return { message: 'Le coach IA n’a pas pu construire ce plan.' }
    if (error instanceof Anthropic.RateLimitError) return { message: 'Coach IA surchargé, réessayez dans un instant.' }
    console.error('Plan IA', error)
    return { message: 'Génération impossible. Réessayez.' }
  }
}

const SaveSchema = z.object({
  startDate: z.iso.date(),
  workouts: TrainingPlanSchema.shape.workouts.max(40),
})

/** Ajoute le plan affiché au calendrier (séances marquées « IA »). */
export async function savePlanAction(formData: FormData) {
  let json: unknown
  try {
    json = JSON.parse(String(formData.get('plan') ?? ''))
  } catch {
    return
  }
  const parsed = SaveSchema.safeParse(json)
  if (!parsed.success) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('planned_workouts').insert(
    parsed.data.workouts.map((w) => ({
      user_id: user.id,
      scheduled_date: w.date,
      sport_type: w.sport_type,
      title: w.title.slice(0, 120),
      description: w.description.slice(0, 2000),
      target_duration_seconds: Math.round(w.target_minutes) * 60,
      target_tss: Math.round(w.target_tss),
      source: 'ai' as const,
    }))
  )
  if (error) {
    console.error('Enregistrement plan', error)
    return
  }
  redirect(`/dashboard/calendar?week=${parsed.data.startDate}`)
}
