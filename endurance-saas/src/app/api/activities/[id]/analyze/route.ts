import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { analyzeWorkoutWithClaude, CoachRefusalError } from '@/lib/ai/coach'

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
  if (!process.env.ANTHROPIC_API_KEY) {
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
  if (!activity || !profile) {
    return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 })
  }

  // Dernier état de charge connu à la date de la séance
  const { data: metrics } = await supabase
    .from('daily_metrics')
    .select('atl, ctl, tsb')
    .lte('date', activity.start_time.slice(0, 10))
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

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
        atl: Number(metrics?.atl ?? 0),
        ctl: Number(metrics?.ctl ?? 0),
        tsb: Number(metrics?.tsb ?? 0),
      },
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
