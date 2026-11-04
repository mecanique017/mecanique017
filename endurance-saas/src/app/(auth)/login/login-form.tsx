'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/auth/form-field'
import { FormAlert } from '@/components/auth/form-alert'
import { authErrorMessage } from '@/lib/auth-errors'

export function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Erreur éventuelle transmise par /auth/callback
  const [error, setError] = useState<string | null>(searchParams.get('error'))
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(authErrorMessage(error, 'Identifiants incorrects ou compte non vérifié.'))
        setLoading(false)
        return
      }
    } catch {
      // Réseau coupé ou Supabase non configuré : ne pas bloquer le bouton
      setError('Service indisponible. Réessayez dans un instant.')
      setLoading(false)
      return
    }

    router.push(safeNext(searchParams.get('next')))
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-2xl font-bold tracking-tight">Se connecter</h2>
        <p className="text-sm text-muted-foreground">
          Entrez vos identifiants pour accéder à votre espace athlète.
        </p>
      </div>

      {error && <FormAlert message={error} />}

      <form method="post" onSubmit={handleLogin} className="space-y-4">
        <FormField
          id="email"
          label="Adresse email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="athlete@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FormField
          id="password"
          label="Mot de passe"
          icon={Lock}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Connexion en cours...
            </>
          ) : (
            'Se connecter'
          )}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Vous n&apos;avez pas encore de compte ?{' '}
        <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
          S&apos;inscrire
        </Link>
      </div>
    </div>
  )
}

/** Chemin interne uniquement (pas de redirection ouverte vers un autre site). */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/dashboard'
}
