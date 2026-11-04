'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SyncButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [refreshing, startTransition] = useTransition()

  const sync = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/polar/sync', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) setMessage(body.error ?? 'Synchronisation impossible')
      else {
        const parts = [`${body.imported} séance(s) importée(s)`]
        if (body.duplicates) parts.push(`${body.duplicates} déjà présente(s)`)
        if (body.skipped) parts.push(`${body.skipped} ignorée(s) (sport non pris en charge)`)
        if (body.hrvDays) parts.push(`VFC nocturne ajoutée sur ${body.hrvDays} jour(s)`)
        setMessage(parts.join(' · '))
        startTransition(() => router.refresh())
      }
    } catch {
      setMessage('Connexion perdue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={sync} disabled={loading || refreshing} variant="outline">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Synchroniser maintenant
      </Button>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  )
}
