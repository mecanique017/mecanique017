import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAiUsage } from '@/lib/coach-quota'
import { PlanForm } from './plan-form'

export const metadata: Metadata = { title: 'Plan d’entraînement IA — Endurance SaaS' }

// La génération d'un plan sur plusieurs semaines peut prendre jusqu'à une ou deux minutes
export const maxDuration = 180

const SPORTS_BY_DISCIPLINE: Record<string, string[]> = {
  running: ['run'],
  cycling: ['ride'],
  triathlon: ['run', 'ride', 'swim'],
}

export default function PlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Plan d’entraînement IA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Le coach part de votre charge actuelle (CTL / ATL / TSB), de vos 4 dernières semaines et de votre bien-être pour
          proposer une progression réaliste. Vous relisez le plan avant de l’ajouter au calendrier.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <PlanLoader />
      </Suspense>
    </div>
  )
}

async function PlanLoader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('sport_discipline, subscription_tier').eq('id', user.id).single()
  const usage = await getAiUsage(supabase, user.id, profile?.subscription_tier ?? 'free', 'training_plan')

  return (
    <PlanForm defaultSports={SPORTS_BY_DISCIPLINE[profile?.sport_discipline ?? 'running'] ?? ['run']} remaining={usage.remaining} />
  )
}
