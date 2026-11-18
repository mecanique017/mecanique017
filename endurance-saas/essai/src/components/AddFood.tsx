import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Barcode, Camera, Loader2, Pencil, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { MEALS } from '@/lib/nutrition/calculator'
import { forQuantity, searchCommonFoods, type Food } from '@/lib/nutrition/foods'
import type { Meal } from '@/types/database'
import { productByBarcode, searchOpenFoodFacts } from '../nutrition'

type BarcodeDetectorCtor = new (o: { formats: string[] }) => { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }
const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector

const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('fr-FR')

/**
 * Ajout d'un aliment : recherche (aliments courants + produits de marque), récents, code-barres
 * (scan par la caméra quand le navigateur le permet), saisie manuelle ; puis choix de la quantité.
 */
export function AddFood({
  meal: initialMeal,
  recents,
  onAdd,
  onClose,
}: {
  meal: Meal
  recents: (Food & { lastQty: number })[]
  onAdd: (meal: Meal, food: Food, grams: number) => Promise<void>
  onClose: () => void
}) {
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Food | null>(null)
  const [mode, setMode] = useState<'search' | 'barcode' | 'manual' | 'scan'>('search')
  const [online, setOnline] = useState<{ state: 'idle' | 'loading' | 'ok' | 'error'; items: Food[] }>({ state: 'idle', items: [] })
  const local = useMemo(() => searchCommonFoods(q, 12), [q])

  // Produits de marque : recherche en ligne après une courte pause de frappe
  useEffect(() => {
    const term = q.trim()
    // Moins de 3 lettres : la section « produits de marque » n'est pas affichée
    if (term.length < 3) return
    const c = new AbortController()
    const t = setTimeout(() => {
      setOnline((o) => ({ ...o, state: 'loading' }))
      searchOpenFoodFacts(term, c.signal)
        .then((items) => setOnline({ state: 'ok', items }))
        .catch((e) => (e as Error).name !== 'AbortError' && setOnline({ state: 'error', items: [] }))
    }, 500)
    return () => {
      clearTimeout(t)
      c.abort()
    }
  }, [q])

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-background pt-[env(safe-area-inset-top)]" role="dialog" aria-label="Ajouter un aliment">
      <div className="flex items-center gap-2 border-b px-3 py-3">
        {picked || mode !== 'search' ? (
          <button className="p-1" onClick={() => (picked ? setPicked(null) : setMode('search'))} aria-label="Retour">
            <ArrowLeft className="size-6" />
          </button>
        ) : null}
        <h2 className="flex-1 text-lg font-semibold">Ajouter un aliment</h2>
        <button onClick={onClose} aria-label="Fermer" className="p-1">
          <X className="size-6" />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b px-3 py-2" role="radiogroup" aria-label="Repas">
        {MEALS.map((m) => (
          <button
            key={m.key}
            role="radio"
            aria-checked={meal === m.key}
            onClick={() => setMeal(m.key)}
            className={cn('whitespace-nowrap rounded-full border px-3 py-1.5 text-sm', meal === m.key && 'border-primary bg-primary/15 font-medium')}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {picked ? (
          <QuantityStep food={picked} onAdd={(g) => onAdd(meal, picked, g)} />
        ) : mode === 'manual' ? (
          <ManualFood onPick={setPicked} />
        ) : mode === 'barcode' || mode === 'scan' ? (
          <BarcodeStep scan={mode === 'scan'} onPick={setPicked} />
        ) : (
          <div className="space-y-5">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden />
              <input
                autoFocus
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher : pâtes, skyr, banane…"
                aria-label="Rechercher un aliment"
                className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-base"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Detector && (
                <button onClick={() => setMode('scan')} className="flex flex-col items-center gap-1 rounded-xl border p-3 text-xs">
                  <Camera className="size-5" /> Scanner
                </button>
              )}
              <button onClick={() => setMode('barcode')} className="flex flex-col items-center gap-1 rounded-xl border p-3 text-xs">
                <Barcode className="size-5" /> Code-barres
              </button>
              <button onClick={() => setMode('manual')} className="flex flex-col items-center gap-1 rounded-xl border p-3 text-xs">
                <Pencil className="size-5" /> Saisie libre
              </button>
            </div>

            {!q && recents.length > 0 && <FoodList title="Récents" items={recents} onPick={setPicked} />}
            {q && <FoodList title="Aliments courants" items={local} onPick={setPicked} empty="Aucun aliment courant ne correspond." />}
            {q.trim().length >= 3 && (
              <div>
                <FoodList
                  title="Produits de marque (Open Food Facts)"
                  items={online.items}
                  onPick={setPicked}
                  empty={
                    online.state === 'loading' ? undefined : online.state === 'error' ? 'Recherche en ligne indisponible pour le moment.' : 'Aucun produit trouvé.'
                  }
                />
                {online.state === 'loading' && (
                  <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Recherche…
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function FoodList({ title, items, onPick, empty }: { title: string; items: Food[]; onPick: (f: Food) => void; empty?: string }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {items.length ? (
        <ul className="divide-y rounded-xl border">
          {items.map((f, i) => (
            <li key={`${f.name}-${f.brand ?? ''}-${i}`}>
              <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent" onClick={() => onPick(f)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{f.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {f.brand ? `${f.brand} · ` : ''}
                    {Math.round(f.kcal)} kcal · P {fmt1(f.protein)} · G {fmt1(f.carbs)} · L {fmt1(f.fat)} /100 g
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : null}
    </section>
  )
}

function QuantityStep({ food, onAdd }: { food: Food; onAdd: (grams: number) => Promise<void> }) {
  const [grams, setGrams] = useState(String(food.portion ?? 100))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const g = Number(grams.replace(',', '.'))
  const valid = g > 0 && g <= 5000
  const v = forQuantity(food, valid ? g : 0)
  const chips = [...new Set([food.portion, 100, food.portion ? food.portion * 2 : 200].filter((x): x is number => !!x))]
  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-semibold">{food.name}</p>
        {food.brand && <p className="text-sm text-muted-foreground">{food.brand}</p>}
        <p className="text-xs text-muted-foreground">
          Pour 100 g : {Math.round(food.kcal)} kcal · protéines {fmt1(food.protein)} g · glucides {fmt1(food.carbs)} g · lipides {fmt1(food.fat)} g
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c} onClick={() => setGrams(String(c))} className={cn('rounded-full border px-3 py-1.5 text-sm', g === c && 'border-primary bg-primary/15')}>
            {c === food.portion && food.portionLabel && food.portionLabel !== '100 g' ? `${food.portionLabel} (${c} g)` : `${c} g`}
          </button>
        ))}
      </div>
      <Field id="grams" label="Quantité (g ou ml)" type="text" inputMode="decimal" min={1} max={5000} value={grams} onChange={(e) => setGrams(e.target.value)} />
      <div className="grid grid-cols-4 gap-2 rounded-xl border bg-card p-3 text-center">
        <Stat label="kcal" value={String(v.kcal)} strong />
        <Stat label="Protéines" value={`${fmt1(v.protein)} g`} />
        <Stat label="Glucides" value={`${fmt1(v.carbs)} g`} />
        <Stat label="Lipides" value={`${fmt1(v.fat)} g`} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        size="lg"
        className="h-12 w-full rounded-full text-base"
        disabled={!valid || busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          try {
            await onAdd(g)
          } catch {
            setError('Ajout impossible. Vérifiez votre connexion.')
            setBusy(false)
          }
        }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />} Ajouter
      </Button>
    </div>
  )
}

const Stat = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div>
    <p className={cn('tabular-nums', strong ? 'text-lg font-bold' : 'font-semibold')}>{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
)

function ManualFood({ onPick }: { onPick: (f: Food) => void }) {
  const [f, setF] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' })
  const n = (s: string) => Number(s.replace(',', '.') || 0)
  const ok = f.name.trim() && n(f.kcal) > 0 && n(f.kcal) <= 950
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) onPick({ name: f.name.trim(), kcal: n(f.kcal), protein: n(f.protein), carbs: n(f.carbs), fat: n(f.fat), portion: 100, portionLabel: '100 g' })
      }}
    >
      <p className="text-sm text-muted-foreground">Valeurs pour 100 g, lisibles sur l’étiquette (tableau nutritionnel).</p>
      <Field id="mf-name" label="Nom" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={160} />
      <div className="grid grid-cols-2 gap-3">
        <Field id="mf-kcal" label="Énergie (kcal)" type="text" inputMode="decimal" value={f.kcal} onChange={(e) => setF({ ...f, kcal: e.target.value })} required />
        <Field id="mf-p" label="Protéines (g)" type="text" inputMode="decimal" value={f.protein} onChange={(e) => setF({ ...f, protein: e.target.value })} />
        <Field id="mf-c" label="Glucides (g)" type="text" inputMode="decimal" value={f.carbs} onChange={(e) => setF({ ...f, carbs: e.target.value })} />
        <Field id="mf-f" label="Lipides (g)" type="text" inputMode="decimal" value={f.fat} onChange={(e) => setF({ ...f, fat: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={!ok}>
        Continuer
      </Button>
    </form>
  )
}

function BarcodeStep({ scan, onPick }: { scan: boolean; onPick: (f: Food) => void }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState<{ busy: boolean; msg: string | null }>({ busy: false, msg: null })
  const video = useRef<HTMLVideoElement>(null)

  const lookup = async (c: string) => {
    if (!/^\d{6,14}$/.test(c)) return setState({ busy: false, msg: 'Le code-barres compte 8 à 13 chiffres.' })
    setState({ busy: true, msg: null })
    try {
      const food = await productByBarcode(c)
      if (food) onPick(food)
      else setState({ busy: false, msg: 'Produit inconnu ou sans valeurs nutritionnelles. Utilisez la saisie libre.' })
    } catch {
      setState({ busy: false, msg: 'Recherche indisponible. Vérifiez votre connexion.' })
    }
  }

  // Scan par la caméra (Chrome Android, Edge…) ; ailleurs, saisie des chiffres
  useEffect(() => {
    if (!scan || !Detector) return
    let stream: MediaStream | null = null
    let stop = false
    const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        stream = s
        if (!video.current) return
        video.current.srcObject = s
        await video.current.play()
        while (!stop) {
          const found = await detector.detect(video.current).catch(() => [])
          if (found[0]?.rawValue) {
            stop = true
            setCode(found[0].rawValue)
            lookup(found[0].rawValue)
            break
          }
          await new Promise((r) => setTimeout(r, 250))
        }
      })
      .catch(() => setState({ busy: false, msg: 'Caméra indisponible : saisissez les chiffres du code-barres.' }))
    return () => {
      stop = true
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan])

  return (
    <div className="space-y-4">
      {scan && Detector && <video ref={video} className="aspect-[4/3] w-full rounded-xl bg-black object-cover" muted playsInline aria-label="Caméra" />}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          lookup(code.trim())
        }}
      >
        <Field id="barcode" label="Code-barres" inputMode="numeric" pattern="[0-9]*" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="flex-1" />
        <Button type="submit" disabled={state.busy}>
          {state.busy ? <Loader2 className="size-4 animate-spin" /> : 'Chercher'}
        </Button>
      </form>
      {state.msg && <p className="text-sm text-muted-foreground">{state.msg}</p>}
      <p className="text-xs text-muted-foreground">Données Open Food Facts (base libre et collaborative) : vérifiez les valeurs sur l’emballage.</p>
    </div>
  )
}
