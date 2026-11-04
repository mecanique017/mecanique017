'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleAlert, CopyCheck, Loader2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { gzipSync } from 'fflate'
import { extractFitFiles } from '@/lib/fit/archive'

/** Une archive est décompressée en mémoire dans le navigateur : au-delà, découper l'export. */
const MAX_ARCHIVE_BYTES = 500 * 1024 * 1024

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
  const [notice, setNotice] = useState<string | null>(null)
  const busy = items.some((i) => i.status === 'uploading' || i.status === 'pending')

  const update = (index: number, patch: Partial<Item>) =>
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const importFiles = async (selected: File[]) => {
    // Archives (.zip, .gz) décompressées dans le navigateur ; chaque .fit est envoyé séparément
    const fitFiles: File[] = []
    const rejected: File[] = []
    let skipped = 0
    setNotice(null)
    for (const file of selected) {
      if (file.size > MAX_ARCHIVE_BYTES) {
        rejected.push(file)
        continue
      }
      try {
        const extracted = await extractFitFiles(file)
        if (extracted.files.length === 0 && extracted.skipped > 0 && !/\.zip$/i.test(file.name)) rejected.push(file)
        fitFiles.push(...extracted.files)
        skipped += /\.zip$/i.test(file.name) ? extracted.skipped : 0
      } catch {
        rejected.push(file)
      }
    }
    if (skipped > 0) setNotice(`${skipped} fichier(s) de l’archive ignoré(s) : formats pris en charge : .fit, .gpx, .tcx.`)

    const offset = items.length
    setItems((list) => [
      ...list,
      ...fitFiles.map((f) => ({ name: f.name, status: 'pending' as const })),
      ...rejected.map((f) => ({
        name: f.name,
        status: 'error' as const,
        message: f.size > MAX_ARCHIVE_BYTES ? 'Archive trop volumineuse (500 Mo max)' : 'Format non pris en charge (.fit, .gpx, .tcx, .gz ou .zip)',
      })),
    ])

    // Envoi séquentiel : évite de saturer le serveur avec un gros lot
    for (const [i, file] of fitFiles.entries()) {
      const index = offset + i
      update(index, { status: 'uploading' })
      try {
        const body = new FormData()
        // .gpx / .tcx volumineux (XML très verbeux) : compression gzip avant l'envoi
        if (file.size > 3 * 1024 * 1024 && /\.(gpx|tcx)$/i.test(file.name)) {
          const gz = gzipSync(new Uint8Array(await file.arrayBuffer()))
          body.append('file', new File([gz], `${file.name}.gz`))
        } else {
          body.append('file', file)
        }
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
          <p className="font-medium">Déposez vos fichiers .fit, .gpx, .tcx ou une archive .zip</p>
          <p className="text-sm text-muted-foreground">
            Garmin, Wahoo, Coros, Polar, Suunto… Archives acceptées : export Garmin Connect, « Télécharger mes données » de Strava (.fit.gz).
          </p>
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
          accept=".fit,.gpx,.tcx,.gz,.zip"
          multiple
          className="sr-only"
          aria-label="Fichiers .fit ou archives .zip à importer"
          onChange={(e) => {
            importFiles([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
      {items.length > 0 && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {items.filter((i) => i.status === 'done').length} importée(s) · {items.filter((i) => i.status === 'duplicate').length} déjà présente(s) ·{' '}
          {items.filter((i) => i.status === 'error').length} erreur(s) · {items.filter((i) => i.status === 'pending' || i.status === 'uploading').length} en cours
        </p>
      )}
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
