'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, Lock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/auth/form-field'
import { FormAlert } from '@/components/auth/form-alert'
import { authErrorMessage } from '@/lib/auth-errors'

export function RegisterForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          // Le lien de confirmation passe par /auth/callback pour créer la session
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(authErrorMessage(error, 'Inscription impossible. Réessayez.'))
      } else {
        setSuccess(true)
      }
    } catch {
      // Réseau coupé ou Supabase non configuré : ne pas bloquer le bouton
      setError('Service indisponible. Réessayez dans un instant.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-full bg-emerald-500/10 text-emerald-500 w-12 h-12 mx-auto flex items-center justify-center">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Vérifiez vos e-mails</h2>
        <p className="text-sm text-muted-foreground">
          Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour
          activer votre compte.
        </p>
        <Button variant="outline" asChild className="w-full mt-4">
          <Link href="/login">Retour à la connexion</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-2xl font-bold tracking-tight">Créer un compte</h2>
        <p className="text-sm text-muted-foreground">
          Rejoignez la plateforme et suivez vos performances d&apos;endurance.
        </p>
      </div>

      {error && <FormAlert message={error} />}

      <form method="post" onSubmit={handleRegister} className="space-y-4">
        <FormField
          id="fullName"
          label="Nom complet"
          icon={User}
          type="text"
          autoComplete="name"
          placeholder="Prénom Nom"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
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
          autoComplete="new-password"
          placeholder="6 caractères minimum"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Création du compte...
            </>
          ) : (
            'Créer mon compte'
          )}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Vous avez déjà un compte ?{' '}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </div>
    </div>
  )
}
