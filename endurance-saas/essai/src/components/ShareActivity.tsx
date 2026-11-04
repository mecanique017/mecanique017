import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, ImagePlus, Loader2, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { canvasToFile, renderShareImage, type ShareData, type ShareFormat } from '../lib/share-image'

const FORMATS: { key: ShareFormat; label: string; hint: string }[] = [
  { key: 'story', label: 'Story', hint: 'Instagram, Facebook, TikTok' },
  { key: 'square', label: 'Carré', hint: 'Publication' },
  { key: 'sticker', label: 'Autocollant', hint: 'Transparent, à poser sur votre photo' },
]

/**
 * Partage d'une séance : image générée sur le téléphone puis feuille de partage du système
 * (Instagram, Facebook, TikTok, WhatsApp, Messages…). Repli : téléchargement de l'image.
 */
export function ShareActivity({ data, onClose }: { data: ShareData; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [format, setFormat] = useState<ShareFormat>('story')
  const [photo, setPhoto] = useState<ImageBitmap | HTMLImageElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (canvas.current) renderShareImage(canvas.current, data, format, format === 'sticker' ? null : photo)
  }, [data, format, photo])

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      setPhoto(await createImageBitmap(file))
    } catch {
      // Format non décodable par createImageBitmap (HEIC sur certains navigateurs) : passage par <img>
      const img = new Image()
      img.onload = () => setPhoto(img)
      img.src = URL.createObjectURL(file)
    }
    if (format === 'sticker') setFormat('story')
  }

  const fileName = `kronofit-${data.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${format}.png`

  const share = async () => {
    if (!canvas.current) return
    setBusy(true)
    setMessage(null)
    try {
      const file = await canvasToFile(canvas.current, fileName)
      const payload = { files: [file], title: data.title, text: `${data.title} · ${data.stats.map((s) => s.value).join(' · ')}` }
      if (navigator.canShare?.(payload)) await navigator.share(payload)
      else {
        download(file)
        setMessage('Partage direct indisponible sur cet appareil : image enregistrée, ajoutez-la depuis l’application du réseau social.')
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setMessage('Partage impossible. Utilisez « Enregistrer l’image ».')
    }
    setBusy(false)
  }

  const save = async () => {
    if (!canvas.current) return
    download(await canvasToFile(canvas.current, fileName))
    setMessage('Image enregistrée (Fichiers → Téléchargements sur iPhone, ou appui long sur l’aperçu → « Enregistrer dans Photos »).')
  }

  // Rendu au niveau de <body> : au-dessus de la barre d'onglets et de tout le reste de la page
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-background pt-[env(safe-area-inset-top)]" role="dialog" aria-label="Partager la séance">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Partager</h2>
        <button onClick={onClose} aria-label="Fermer" className="p-1"><X className="size-6" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className={cn('mx-auto overflow-hidden rounded-xl border', format === 'story' ? 'w-[min(62vw,300px)]' : 'w-[min(86vw,380px)]', format === 'sticker' && 'bg-[repeating-conic-gradient(#2a2a2a_0_25%,#3a3a3a_0_50%)] bg-[length:24px_24px]')}>
          <canvas ref={canvas} className="block h-auto w-full" aria-label="Aperçu de l’image partagée" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => (
            <button key={f.key} onClick={() => setFormat(f.key)} aria-pressed={format === f.key} className={cn('rounded-xl border p-2.5 text-left', format === f.key && 'border-primary bg-primary/10')}>
              <span className="block text-sm font-semibold">{f.label}</span>
              <span className="block text-[11px] leading-tight text-muted-foreground">{f.hint}</span>
            </button>
          ))}
        </div>
        {format !== 'sticker' && (
          <div className="flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium">
              <ImagePlus className="size-4" /> {photo ? 'Changer de photo' : 'Ajouter ma photo'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </label>
            {photo && (
              <button onClick={() => setPhoto(null)} className="rounded-xl border px-4 text-sm">Fond noir</button>
            )}
          </div>
        )}
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <Button size="lg" className="h-14 rounded-full text-base" onClick={share} disabled={busy}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Share2 className="size-5" />} Partager
        </Button>
        <Button size="lg" variant="outline" className="h-14 rounded-full" onClick={save} aria-label="Enregistrer l’image">
          <Download className="size-5" />
        </Button>
      </div>
    </div>,
    document.body,
  )
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
