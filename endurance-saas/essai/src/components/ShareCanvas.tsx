import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Loader2, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canvasToFile } from '../lib/share-image'

/**
 * Partage d'une image dessinée sur un canvas (badge, bilan du mois…).
 * L'image est préparée dès l'ouverture : sur iPhone, la feuille de partage doit s'ouvrir
 * dans l'instant du toucher. Image seule (sans texte) pour Instagram et TikTok.
 */
export function ShareCanvas({ title, fileName, draw, onClose }: { title: string; fileName: string; draw: (c: HTMLCanvasElement, mark: HTMLImageElement | null) => void; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<File | null>(null)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    const img = new Image()
    const go = (mark: HTMLImageElement | null) => {
      if (!alive || !canvas.current) return
      draw(canvas.current, mark)
      canvasToFile(canvas.current, fileName)
        .then((f) => {
          if (!alive) return
          fileRef.current = f
          setReady(true)
        })
        .catch(() => setMessage('Image impossible à créer.'))
    }
    img.onload = () => go(img)
    img.onerror = () => go(null)
    img.src = `${import.meta.env.BASE_URL}icons/icon-192.png`
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const download = (file: File) => {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  const share = () => {
    const file = fileRef.current
    if (!file) return
    const payload = { files: [file] }
    if (!navigator.canShare?.(payload)) {
      download(file)
      setMessage('Partage direct indisponible ici : image enregistrée, ajoutez-la depuis l’application du réseau social.')
      return
    }
    setBusy(true)
    navigator
      .share(payload)
      .catch((e: Error) => e?.name !== 'AbortError' && setMessage('Partage impossible : utilisez le bouton d’enregistrement.'))
      .finally(() => setBusy(false))
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-background pt-[env(safe-area-inset-top)]" role="dialog" aria-label={title}>
      <div className="flex items-center border-b px-4 py-3">
        <h2 className="flex-1 text-lg font-semibold">{title}</h2>
        <button onClick={onClose} aria-label="Fermer" className="p-1">
          <X className="size-6" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <canvas ref={canvas} className="max-h-full max-w-full rounded-2xl border" style={{ aspectRatio: '9 / 16', height: '100%' }} />
      </div>
      {message && <p role="status" className="px-4 pb-2 text-sm text-muted-foreground">{message}</p>}
      <div className="grid grid-cols-[1fr_auto] gap-2 border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <Button size="lg" className="h-14 rounded-full text-base" onClick={share} disabled={!ready || busy}>
          {busy || !ready ? <Loader2 className="size-5 animate-spin" /> : <Share2 className="size-5" />} Partager
        </Button>
        <Button size="lg" variant="outline" className="h-14 rounded-full" onClick={() => fileRef.current && download(fileRef.current)} disabled={!ready} aria-label="Enregistrer l’image">
          <Download className="size-5" />
        </Button>
      </div>
    </div>,
    document.body,
  )
}
