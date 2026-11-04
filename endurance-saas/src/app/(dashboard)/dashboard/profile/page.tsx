import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = { title: 'Profil — Endurance SaaS' }

export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground mt-1">Vos paramètres physiologiques servent au calcul de la charge.</p>
      </div>
      <Suspense fallback={<div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <ProfileLoader />
      </Suspense>
    </div>
  )
}

async function ProfileLoader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, sport_discipline, age, weight, height, hr_max, hr_rest, lactate_threshold_hr, ftp, vma')
    .eq('id', user.id)
    .single()
  if (!profile) return <p className="text-sm text-muted-foreground">Profil introuvable.</p>

  return <ProfileForm profile={profile} />
}
