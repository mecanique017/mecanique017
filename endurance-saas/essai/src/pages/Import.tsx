import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CircleAlert, CopyCheck, Loader2, Upload } from 'lucide-react'
import { extractFitFiles } from '@/lib/fit/archive'
import { fileFormat, importActivityFile } from '@/lib/fit/import'
import { FitImportError } from '@/lib/fit/parse-fit'
import { supabase } from '../supabase'
import { useUser } from '../session'

type Status = 'pending' | 'uploading' | 'done' | 'duplicate' | 'error'
interface Item {
  name: string
  status: Status
  message?: string
  id?: string
}

/** Import : fichiers analysés directement sur le téléphone (même code que la version serveur). */
export function ImportPage() {
  const user = useUser()
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const busy = items.some((i) => i.status === 'pending' || i.status === 'uploading')

  const run = async (selected: File[]) => {
    const files: File[] = []
    const rejected: Item[] = []
    for (const file of selected) {
      try {
        const r = await extractFitFiles(file)
        if (r.files.length === 0) rejected.push({ name: file.name, status: 'error', message: 'Format non pris en charge (.fit, .gpx, .tcx, .zip)' })
        files.push(...r.files)
      } catch {
        rejected.push({ name: file.name, status: 'error', message: 'Archive illisible' })
      }
    }
    const offset = items.length
    setItems((l) => [...l, ...files.map((f) => ({ name: f.name, status: 'pending' as const })), ...rejected])
    for (const [i, file] of files.entries()) {
      const idx = offset + i
      const update = (patch: Partial<Item>) => setItems((l) => l.map((it, j) => (j === idx ? { ...it, ...patch } : it)))
      update({ status: 'uploading' })
      const format = fileFormat(file.name)
      if (!format) {
        update({ status: 'error', message: 'Format non pris en charge' })
        continue
      }
      try {
        const r = await importActivityFile(supabase, user.id, await file.arrayBuffer(), { format, source: format })
        update(r.status === 'created' ? { status: 'done', id: r.id, message: r.linkedPlannedWorkout ? 'Séance prévue validée' : undefined } : { status: 'duplicate', id: r.id })
      } catch (e) {
        update({ status: 'error', message: e instanceof FitImportError ? e.message : 'Import impossible' })
      }
    }
  }

  const ICONS = { pending: Upload, uploading: Loader2, done: CheckCircle2, duplicate: CopyCheck, error: CircleAlert }
  const LABELS = { pending: 'En attente', uploading: 'Import…', done: 'Importée', duplicate: 'Déjà importée', error: 'Erreur' }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importer des séances</h1>
        <p className="text-sm text-muted-foreground mt-1">Fichiers .fit, .gpx, .tcx ou archive .zip (export Garmin Connect, Strava…). Le fichier est analysé sur votre téléphone.</p>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center">
        <Upload className="size-8 text-muted-foreground" aria-hidden />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50">
          Choisir des fichiers
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept=".fit,.gpx,.tcx,.gz,.zip"
          className="sr-only"
          aria-label="Fichiers à importer"
          onChange={(e) => {
            run([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>
      {items.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card" aria-live="polite">
          {items.map((it, i) => {
            const Icon = ICONS[it.status]
            return (
              <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                <Icon className={`size-4 shrink-0 ${it.status === 'uploading' ? 'animate-spin' : ''}`} style={{ color: it.status === 'done' ? 'var(--status-good)' : it.status === 'error' ? 'var(--status-critical)' : 'var(--muted-foreground)' }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{it.name}</span>
                <span className="text-muted-foreground">
                  {LABELS[it.status]}
                  {it.message && ` · ${it.message}`}
                </span>
                {it.id && (
                  <Link to={`/dashboard/activities/${it.id}`} className="font-medium underline underline-offset-4">
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
