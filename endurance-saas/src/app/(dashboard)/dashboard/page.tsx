import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LogOut, UserCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { signOut } from './actions'

export const metadata: Metadata = { title: 'Espace Athlète — Endurance SaaS' }

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* En-tête statique : prérendu dans le shell */}
      <div className="flex items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold">Espace Athlète</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bienvenue sur votre tableau de bord sécurisé.
          </p>
        </div>
        <form action={signOut}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </form>
      </div>

      {/* Lecture de session (cookies) : rendu à la requête, derrière Suspense */}
      <Suspense fallback={<UserCardSkeleton />}>
        <UserCard />
      </Suspense>
    </div>
  )
}

async function UserCard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Double sécurité : le proxy redirige déjà les visiteurs non connectés.
  if (!user) {
    redirect('/login')
  }

  const fullName = user.user_metadata?.full_name as string | undefined

  return (
    <div className="p-6 border rounded-xl bg-card space-y-3">
      <div className="flex items-center gap-2 text-emerald-500 font-semibold">
        <UserCheck className="h-5 w-5" />
        <span>Authentification Supabase validée</span>
      </div>
      {fullName && <p className="text-lg font-semibold">{fullName}</p>}
      <p className="text-sm font-mono text-muted-foreground break-all">ID utilisateur : {user.id}</p>
      <p className="text-sm font-mono text-muted-foreground break-all">Email : {user.email}</p>
    </div>
  )
}

function UserCardSkeleton() {
  return <div className="h-32 border rounded-xl bg-card animate-pulse" aria-hidden />
}
