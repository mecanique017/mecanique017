import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/auth/form-field'
import { FormAlert } from '@/components/auth/form-alert'
import { supabase } from '../supabase'
import { useSession } from '../session'

export function LoginPage() {
  const { user } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/dashboard" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setError(error.message.includes('Invalid') ? 'Email ou mot de passe incorrect.' : 'Connexion impossible. Vérifiez votre réseau.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <img src={`${import.meta.env.BASE_URL}logo-kronofit.jpg`} alt="KronoFit" width={832} height={397} className="mx-auto w-full max-w-xs rounded-xl" />
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Se connecter</h1>
          <p className="text-sm text-muted-foreground">Version d’essai : utilisez le compte qui vous a été fourni.</p>
        </div>
        {error && <FormAlert message={error} />}
        <form onSubmit={submit} className="space-y-4">
          <FormField id="email" label="Adresse email" icon={Mail} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FormField id="password" label="Mot de passe" icon={Lock} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Se connecter
          </Button>
        </form>
      </div>
    </div>
  )
}
