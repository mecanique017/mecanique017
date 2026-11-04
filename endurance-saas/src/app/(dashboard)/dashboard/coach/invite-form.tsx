'use client'

import { useActionState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { FormAlert } from '@/components/auth/form-alert'
import { inviteAthlete, type InviteState } from './actions'

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(inviteAthlete, {})
  return (
    <form action={formAction} className="space-y-3">
      {state.message && !state.ok && <FormAlert message={state.message} />}
      {state.ok && (
        <div role="status" className="space-y-1 text-sm">
          <p>{state.message}</p>
          {state.link && (
            <input readOnly value={state.link} onFocus={(e) => e.target.select()} className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs" aria-label="Lien d’invitation" />
          )}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Field id="email" label="E-mail de l’athlète" type="email" required autoComplete="off" className="min-w-56 flex-1" error={state.errors?.email} />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Inviter
        </Button>
      </div>
    </form>
  )
}
