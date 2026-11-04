'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleAlert, CopyCheck, Loader2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'pending' | 'uploading' | 'done' | 'duplicate' | 'error'
interface Item {
  name: string
  status: Status
  message?: string
  id?: string
}

const STATUS_UI: Record<Status, { label: string; icon: typeof Upload; color?: string }> = {
  pending: { label: 'En attente', icon: Upload },
  uploading: { label: 'Import…', icon: Loader2 },
  done: { label: 'Importée', icon: CheckCircle2, color: 'var(--status-good)' },
  duplicate: { label: 'Déjà importée', icon: CopyCheck },
  error: { label: 'Erreur', icon: CircleAlert, color: 'var(--status-critical)' },
}

/** Import de fichiers .fit : glisser-déposer ou sélection, envoi un par un avec statut par fichier. */
export function FitImport() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [dragging, setDragging] = useState(false)
  const busy = items.some((i) => i.status === 'uploading' || i.status === 'pending')

  const update = (index: number, patch: Partial<Item>) =>
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const importFiles = async (files: File[]) => {
    const fitFiles = files.filter((f) => f.name.toLowerCase().endsWith('.fit'))
    const rejected = files.filter((f) => !fitFiles.includes(f))
    const offset = items.length
    setItems((list) => [
      ...list,
      ...fitFiles.map((f) => ({ name: f.name, status: 'pending' as const })),
      ...rejected.map((f) => ({ name: f.name, status: 'error' as const, message: 'Fichier .fit attendu' })),
    ])

    // Envoi séquentiel : évite de saturer le serveur avec un gros lot
    for (const [i, file] of fitFiles.entries()) {
      const index = offset + i
      update(index, { status: 'uploading' })
      try {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch('/api/activities/import', { method: 'POST', body })
        const json = await res.json().catch(() => ({}))
        if (res.status === 201) update(index, { status: 'done', id: json.id, message: json.linkedPlannedWorkout ? 'Séance prévue validée' : undefined })
        else if (res.status === 409) update(index, { status: 'duplicate', id: json.id })
        else update(index, { status: 'error', message: json.error ?? 'Import impossible' })
      } catch {
        update(index, { status: 'error', message: 'Connexion perdue' })
      }
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!busy) importFiles([...e.dataTransfer.files])
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
          dragging ? 'border-primary bg-accent' : 'border-border'
        )}
      >
        <Upload className="size-8 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-medium">Déposez vos fichiers .fit ici</p>
          <p className="text-sm text-muted-foreground">Garmin, Wahoo, Coros, Polar, Suunto… (4 Mo max par fichier)</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Choisir des fichiers
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".fit"
          multiple
          className="sr-only"
          aria-label="Fichiers .fit à importer"
          onChange={(e) => {
            importFiles([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card" aria-live="polite">
          {items.map((item, i) => {
            const ui = STATUS_UI[item.status]
            const Icon = ui.icon
            return (
              <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                <Icon
                  className={cn('size-4 shrink-0', item.status === 'uploading' && 'animate-spin')}
                  style={{ color: ui.color ?? 'var(--muted-foreground)' }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="text-muted-foreground">
                  {ui.label}
                  {item.message && ` · ${item.message}`}
                </span>
                {item.id && (
                  <Link href={`/dashboard/activities/${item.id}`} className="font-medium underline underline-offset-4">
                    Voir
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
