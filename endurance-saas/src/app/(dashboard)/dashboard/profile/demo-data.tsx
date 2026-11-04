'use client'

import { useActionState } from 'react'
import { Database, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addDemoData, removeDemoData } from './actions'

/** Charger / supprimer les données de démonstration (pour tester sans montre). */
export function DemoData({ hasDemo }: { hasDemo: boolean }) {
  const [addState, add, adding] = useActionState(addDemoData, {})
  const [removeState, remove, removing] = useActionState(removeDemoData, {})
  const state = hasDemo ? addState.ok ? addState : removeState : removeState.ok ? removeState : addState

  return (
    <section className="rounded-xl border bg-card p-4 md:p-6 space-y-3">
      <h2 className="font-semibold">Données de démonstration</h2>
      <p className="text-sm text-muted-foreground">
        Pour découvrir l’application sans montre : 12 semaines de séances (course et vélo), de bien-être et le programme de la semaine.
        Elles sont marquées « démo » et se suppriment en un clic, sans toucher à vos vraies données.
      </p>
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
      {hasDemo ? (
        <form action={remove}>
          <Button type="submit" variant="outline" disabled={removing}>
            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Supprimer les données de démonstration
          </Button>
        </form>
      ) : (
        <form action={add}>
          <Button type="submit" variant="outline" disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} Charger les données de démonstration
          </Button>
        </form>
      )}
    </section>
  )
}
