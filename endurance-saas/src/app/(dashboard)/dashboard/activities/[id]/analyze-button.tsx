'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/auth/form-alert'

/** Lance l'analyse IA puis recharge la page pour afficher le nouveau retour du coach. */
export function AnalyzeButton({ activityId, disabled }: { activityId: string; disabled?: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, startTransition] = useTransition()

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/activities/${activityId}/analyze`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'Analyse impossible. Réessayez.')
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setError('Service indisponible. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  const busy = loading || refreshing
  return (
    <div className="space-y-3">
      <Button onClick={analyze} disabled={busy || disabled}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Analyse en cours…' : 'Analyser avec le coach IA'}
      </Button>
      {error && <FormAlert message={error} />}
    </div>
  )
}
