import { SkipForward, X } from 'lucide-react'
import { formatPace, type Step } from '@/lib/training/plan'
import { quickWorkouts, remaining, targetLabel, type GuidedState } from '@/lib/live/guided'

/** Bip court (Web Audio) : changement d'étape, compte à rebours. Le contexte audio est créé au départ (geste). */
let audio: AudioContext | null = null
export function unlockAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctx && !audio) audio = new Ctx()
    audio?.resume().catch(() => {})
  } catch {
    audio = null
  }
}
export function beep(freq = 880, ms = 180) {
  try {
    if (!audio) return
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.frequency.value = freq
    g.gain.value = 0.15
    o.connect(g).connect(audio.destination)
    o.start()
    o.stop(audio.currentTime + ms / 1000)
  } catch {
    // son indisponible : les annonces vocales et vibrations restent
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const stepSummary = (steps: Step[]) => {
  const total = steps.reduce((a, s) => a + (s.seconds ?? Math.round(((s.meters ?? 0) / 1000) * (s.pace ?? 330))), 0)
  return `${steps.filter((s) => s.kind === 'work').length || steps.length} bloc${steps.length > 1 ? 's' : ''} · ≈ ${Math.round(total / 60)} min`
}

export interface GuidedChoice {
  title: string
  steps: Step[]
  plannedId?: string
}

/** Choix de la séance guidée : séance prévue aujourd'hui (plan) ou fractionné classique. */
export function GuidedPicker({
  sport,
  planned,
  vma,
  ftp,
  onPick,
  onClose,
}: {
  sport: 'run' | 'ride' | 'other'
  planned: { id: string; title: string; steps: Step[] }[]
  vma: number
  ftp: number
  onPick: (c: GuidedChoice) => void
  onClose: () => void
}) {
  const quick = sport === 'other' ? [] : quickWorkouts(sport, vma, ftp)
  return (
    <div className="absolute inset-x-3 top-16 z-20 max-h-[75%] space-y-3 overflow-y-auto rounded-2xl bg-background p-4 shadow-2xl" role="dialog" aria-label="Séance guidée">
      <div className="flex items-center">
        <h2 className="flex-1 font-semibold">Séance guidée</h2>
        <button onClick={onClose} aria-label="Fermer" className="p-1">
          <X className="size-5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Chaque étape est annoncée à la voix, avec un bip au changement et un compte à rebours.</p>
      {planned.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prévu aujourd’hui</h3>
          {planned.map((p) => (
            <button key={p.id} className="mb-2 w-full rounded-xl border border-primary/60 bg-primary/10 p-3 text-left" onClick={() => onPick({ title: p.title, steps: p.steps, plannedId: p.id })}>
              <span className="block font-medium">{p.title}</span>
              <span className="block text-xs text-muted-foreground">{stepSummary(p.steps)}</span>
            </button>
          ))}
        </section>
      )}
      {quick.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fractionné</h3>
          {quick.map((q) => (
            <button key={q.title} className="mb-2 w-full rounded-xl border p-3 text-left" onClick={() => onPick(q)}>
              <span className="block font-medium">{q.title}</span>
              <span className="block text-xs text-muted-foreground">
                {stepSummary(q.steps)} · cible {targetLabel(q.steps.find((s) => s.kind === 'work') ?? q.steps[0])}
              </span>
            </button>
          ))}
        </section>
      )}
      {!planned.length && !quick.length && <p className="text-sm text-muted-foreground">Pas de séance guidée pour ce sport.</p>}
    </div>
  )
}

/** Bandeau de l'étape en cours (pendant l'enregistrement). */
export function GuidedBanner({ g, t, d, onSkip }: { g: GuidedState; t: number; d: number; onSkip: () => void }) {
  if (g.done) return <p className="mt-1 rounded-lg bg-green-700 px-2 py-1 text-center text-xs font-medium">{g.title} : séance terminée, bravo !</p>
  const s = g.steps[g.index]
  const r = remaining(g, t, d)
  const work = s.kind === 'work'
  return (
    <div className={`mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 ${work ? 'bg-[#e10600]' : 'bg-neutral-800'}`} role="status" aria-live="polite">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">
          {s.label} <span className="font-normal opacity-80">· {g.index + 1}/{g.steps.length}</span>
        </p>
        <p className="text-[11px] opacity-90">{s.pace ? `Cible ${formatPace(s.pace)}` : s.watts ? `Cible ${s.watts} W` : ''}</p>
      </div>
      <p className="text-lg font-bold tabular-nums">{r.meters != null ? `${Math.ceil(r.meters)} m` : mmss(r.seconds ?? 0)}</p>
      <button onClick={onSkip} className="rounded-full bg-black/30 p-1.5" aria-label="Étape suivante">
        <SkipForward className="size-4" />
      </button>
    </div>
  )
}
