import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { analyzeWorkoutWithClaude, CoachRefusalError } from '@/lib/ai/coach'
import { aiQuotaConfigured, getCoachUsage, recordAiUsage } from '@/lib/coach-quota'
import { getTrainingLoad, localDate } from '@/lib/training/load'
import { getWellnessContext } from '@/lib/training/wellness'

/**
 * POST /api/activities/:id/analyze
 * Analyse une séance de l'utilisateur connecté avec le coach IA et enregistre le résultat.
 * La RLS garantit qu'on ne peut lire/écrire que ses propres données.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
  }
  if (!process.env.ANTHROPIC_API_KEY || !aiQuotaConfigured()) {
    return NextResponse.json({ error: 'Coach IA non configuré' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const [{ data: activity }, { data: profile }] = await Promise.all([
    supabase.from('activities').select('*').eq('id', id).maybeSingle(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])
  // Un coach peut LIRE la séance d'un athlète (RLS), mais l'analyse IA reste réservée à son propriétaire
  if (!activity || !profile || activity.user_id !== user.id) {
    return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 })
  }

  // Quota mensuel selon l'offre (voir lib/plans.ts)
  const usage = await getCoachUsage(supabase, user.id, profile.subscription_tier)
  if (usage.remaining === 0) {
    return NextResponse.json(
      { error: `Quota atteint : ${usage.limit} analyses ce mois-ci. Passez à l'offre supérieure pour continuer.` },
      { status: 403 }
    )
  }

  // État de charge le jour de la séance, calculé à partir des séances (séance du jour incluse)
  const activityDay = localDate(activity.start_time)
  const [series, wellness] = await Promise.all([
    getTrainingLoad(supabase, user.id, new Date(activity.start_time)),
    getWellnessContext(supabase, user.id, activityDay),
  ])
  const metrics = series.findLast((d) => d.date <= activityDay)

  try {
    const analysis = await analyzeWorkoutWithClaude({
      athleteProfile: {
        sport: profile.sport_discipline,
        ftp: profile.ftp,
        hrMax: profile.hr_max,
        lactateThresholdHr: profile.lactate_threshold_hr,
      },
      activity: {
        title: activity.title,
        sportType: activity.sport_type,
        durationMinutes: Math.round(activity.duration_seconds / 60),
        distanceKm: Number((Number(activity.distance_meters) / 1000).toFixed(2)),
        tss: Number(activity.tss),
        avgHr: activity.avg_hr,
        rpeScore: activity.rpe_score,
        athleteNotes: activity.athlete_notes,
      },
      currentMetrics: {
        atl: metrics?.atl ?? 0,
        ctl: metrics?.ctl ?? 0,
        tsb: metrics?.tsb ?? 0,
      },
      wellness: wellness.today
        ? {
            hrv: wellness.today.hrv,
            hrvBaseline: wellness.hrvBaseline,
            restingHr: wellness.today.resting_hr,
            sleepScore: wellness.today.sleep_score,
            perceivedFatigue: wellness.today.perceived_fatigue,
          }
        : null,
    })

    const { data: insight, error } = await supabase
      .from('coach_insights')
      .insert({
        user_id: user.id,
        activity_id: activity.id,
        summary: analysis.summary,
        fatigue_alert: analysis.fatigueAlert,
        suggested_adjustments: { recommendation: analysis.recommendation },
      })
      .select()
      .single()
    if (error) throw error
    // Quota consommé uniquement après une analyse réussie
    await recordAiUsage(user.id, 'coach_analysis')

    return NextResponse.json({ insight })
  } catch (error) {
    if (error instanceof CoachRefusalError) {
      return NextResponse.json({ error: "Le coach IA n'a pas pu analyser cette séance." }, { status: 422 })
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Coach IA surchargé, réessayez dans un instant.' }, { status: 429 })
    }
    if (error instanceof Anthropic.APIError) {
      console.error('Erreur API Anthropic', error.status, error.message)
      return NextResponse.json({ error: 'Coach IA indisponible.' }, { status: 502 })
    }
    console.error('Erreur analyse séance', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
