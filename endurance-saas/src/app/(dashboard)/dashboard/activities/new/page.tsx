import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ActivityForm } from './activity-form'

export const metadata: Metadata = { title: 'Nouvelle séance — Endurance SaaS' }

export default function NewActivityPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nouvelle séance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Le TSS est calculé automatiquement à partir de vos paramètres (
          <Link href="/dashboard/profile" className="underline underline-offset-4">
            profil
          </Link>
          ).
        </p>
      </div>
      <Suspense fallback={<div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <FormWithProfile />
      </Suspense>
    </div>
  )
}

async function FormWithProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('ftp, hr_rest, lactate_threshold_hr')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/dashboard/profile')

  return <ActivityForm profile={profile} />
}
