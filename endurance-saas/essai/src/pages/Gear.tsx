import { useState } from 'react'
import { Bike, Footprints, Loader2, Plus, RotateCcw, Settings2, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { SPORTS } from '@/lib/sports'
import type { Database, GearKind } from '@/types/database'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

type Gear = Database['public']['Tables']['gear']['Row']

export const GEAR_KINDS: { key: GearKind; label: string; limit: number | null; top: boolean }[] = [
  { key: 'shoes', label: 'Chaussures', limit: 700, top: true },
  { key: 'bike', label: 'Vélo', limit: null, top: true },
  { key: 'chain', label: 'Chaîne', limit: 3000, top: false },
  { key: 'tyres', label: 'Pneus', limit: 4000, top: false },
  { key: 'brake_pads', label: 'Plaquettes / patins', limit: 2500, top: false },
  { key: 'cassette', label: 'Cassette', limit: 9000, top: false },
  { key: 'other', label: 'Autre', limit: null, top: true },
]
const kindLabel = (k: GearKind) => GEAR_KINDS.find((g) => g.key === k)?.label ?? k
const RUN_SPORTS = ['run', 'trail', 'walk', 'hike']
const RIDE_SPORTS = ['ride', 'gravel', 'mtb', 'ebike', 'virtual_ride']
const nf = (n: number) => Math.round(n).toLocaleString('fr-FR')

export async function loadGear(userId: string) {
  const [g, u] = await Promise.all([supabase.from('gear').select('*').eq('user_id', userId).order('created_at'), supabase.rpc('gear_usage')])
  if (g.error) throw g.error
  if (u.error) throw u.error
  const usage = new Map((u.data ?? []).map((r) => [r.gear_id, { km: Number(r.km), activities: Number(r.activities), last: r.last_used }]))
  return (g.data ?? []).map((x) => ({ ...x, km: usage.get(x.id)?.km ?? Number(x.start_km), activities: usage.get(x.id)?.activities ?? 0 }))
}
export type GearWithUsage = Awaited<ReturnType<typeof loadGear>>[number]

/** Équipements à surveiller (≥ 90 % de la durée de vie conseillée). */
export const wornGear = (list: GearWithUsage[]) => list.filter((g) => !g.retired && g.limit_km && g.km >= 0.9 * Number(g.limit_km))

export function GearPage() {
  const user = useUser()
  const { data, error, reload } = useData(() => loadGear(user.id), [user.id])
  const [adding, setAdding] = useState<{ parent: Gear | null } | null>(null)
  const [showRetired, setShowRetired] = useState(false)

  if (error) return <p className="text-sm text-destructive">Chargement impossible : {error}</p>
  if (!data) return <p className="text-sm text-muted-foreground">Chargement…</p>
  const top = data.filter((g) => !g.parent_id && (showRetired || !g.retired))
  const retiredCount = data.filter((g) => !g.parent_id && g.retired).length

  const update = async (id: string, patch: Database['public']['Tables']['gear']['Update']) => {
    await supabase.from('gear').update(patch).eq('id', id)
    reload()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold">Matériel</h1>
        <Button size="sm" onClick={() => setAdding({ parent: null })}>
          <Plus className="size-4" /> Ajouter
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Vos chaussures et vélos cumulent les kilomètres de chaque séance (l’équipement « par défaut » d’un sport est choisi automatiquement). Les pièces d’usure d’un vélo comptent depuis leur montage.
      </p>

      {adding && (
        <GearForm
          userId={user.id}
          parent={adding.parent}
          onDone={() => {
            setAdding(null)
            reload()
          }}
        />
      )}

      {!top.length && !adding && <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Aucun équipement pour l’instant. Ajoutez vos chaussures de course ou votre vélo.</p>}

      {top.map((g) => {
        const parts = data.filter((p) => p.parent_id === g.id && !p.retired)
        return (
          <section key={g.id} className={cn('rounded-xl border bg-card', g.retired && 'opacity-60')}>
            <div className="flex items-start gap-3 p-4">
              {g.kind === 'bike' ? <Bike className="mt-0.5 size-5" /> : g.kind === 'shoes' ? <Footprints className="mt-0.5 size-5" /> : <Settings2 className="mt-0.5 size-5" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {g.name} {g.is_default && <Star className="inline size-3.5 fill-current text-amber-400" aria-label="Par défaut" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {kindLabel(g.kind)} · {g.activities} séance{g.activities > 1 ? 's' : ''}
                  {g.sports.length > 0 && ` · ${g.sports.map((s) => SPORTS.find((x) => x.key === s)?.short ?? s).join(', ')}`}
                  {g.retired && ' · retiré'}
                </p>
                <Wear km={g.km} limit={g.limit_km != null ? Number(g.limit_km) : null} />
              </div>
            </div>
            {parts.length > 0 && (
              <ul className="divide-y border-t">
                {parts.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {kindLabel(p.kind)} <span className="text-muted-foreground">· {p.name}</span>
                      </p>
                      <Wear km={p.km} limit={p.limit_km != null ? Number(p.limit_km) : null} />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Pièce remplacée : remettre le compteur à zéro"
                      onClick={() => confirm(`${kindLabel(p.kind)} remplacée ? Le compteur repart de zéro.`) && update(p.id, { installed_at: new Date().toISOString(), start_km: 0 })}
                    >
                      <RotateCcw className="size-4" /> Remplacée
                    </Button>
                    <button className="rounded p-1.5 text-muted-foreground hover:bg-accent" aria-label={`Supprimer ${p.name}`} onClick={() => confirm('Supprimer cette pièce ?') && supabase.from('gear').delete().eq('id', p.id).then(reload)}>
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 border-t px-4 py-2.5">
              {g.kind === 'bike' && !g.retired && (
                <Button size="sm" variant="ghost" onClick={() => setAdding({ parent: g })}>
                  <Plus className="size-4" /> Pièce d’usure
                </Button>
              )}
              {!g.retired && !g.is_default && g.sports.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => update(g.id, { is_default: true })}>
                  <Star className="size-4" /> Par défaut
                </Button>
              )}
              {!g.retired && g.is_default && (
                <Button size="sm" variant="ghost" onClick={() => update(g.id, { is_default: false })}>
                  Ne plus choisir automatiquement
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => update(g.id, { retired: !g.retired, is_default: false })}>
                {g.retired ? 'Remettre en service' : 'Retirer'}
              </Button>
            </div>
          </section>
        )
      })}
      {retiredCount > 0 && (
        <button className="text-sm text-muted-foreground underline underline-offset-4" onClick={() => setShowRetired(!showRetired)}>
          {showRetired ? 'Masquer' : 'Afficher'} le matériel retiré ({retiredCount})
        </button>
      )}
    </div>
  )
}

function Wear({ km, limit }: { km: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (km / limit) * 100) : 0
  const worn = limit != null && km >= limit
  const soon = limit != null && !worn && km >= 0.9 * limit
  return (
    <div className="mt-1.5">
      <p className="text-sm tabular-nums">
        <span className="font-semibold">{nf(km)} km</span>
        {limit && <span className="text-muted-foreground"> / {nf(limit)} km conseillés</span>}
        {worn && <span className="ml-2 text-xs font-medium text-red-500">À remplacer</span>}
        {soon && <span className="ml-2 text-xs font-medium text-amber-500">Bientôt usé</span>}
      </p>
      {limit && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/40">
          <div className={cn('h-full rounded-full', worn ? 'bg-red-500' : soon ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

function GearForm({ userId, parent, onDone }: { userId: string; parent: Gear | null; onDone: () => void }) {
  const kinds = GEAR_KINDS.filter((k) => (parent ? !k.top : k.top))
  const [kind, setKind] = useState<GearKind>(kinds[0].key)
  const [name, setName] = useState('')
  const [startKm, setStartKm] = useState('0')
  const [limit, setLimit] = useState(String(kinds[0].limit ?? ''))
  const [sports, setSports] = useState<string[]>(parent ? [] : RUN_SPORTS)
  const [isDefault, setIsDefault] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const pickKind = (k: GearKind) => {
    setKind(k)
    setLimit(String(GEAR_KINDS.find((g) => g.key === k)?.limit ?? ''))
    if (!parent) setSports(k === 'shoes' ? RUN_SPORTS : k === 'bike' ? ['ride'] : [])
  }
  const choices = kind === 'shoes' ? SPORTS.filter((s) => RUN_SPORTS.includes(s.key)) : kind === 'bike' ? SPORTS.filter((s) => RIDE_SPORTS.includes(s.key)) : SPORTS
  const n = (v: string) => Number(v.replace(',', '.'))
  return (
    <form
      className="space-y-4 rounded-xl border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return setMsg('Donnez un nom (ex. « Pegasus 41 », « Vélo de route »).')
        setBusy(true)
        const { error } = await supabase.from('gear').insert({
          user_id: userId,
          parent_id: parent?.id ?? null,
          kind,
          name: name.trim().slice(0, 80),
          sports: parent ? [] : sports,
          is_default: !parent && sports.length > 0 && isDefault,
          start_km: Math.max(0, n(startKm) || 0),
          limit_km: n(limit) > 0 ? n(limit) : null,
        })
        setBusy(false)
        if (error) return setMsg('Enregistrement impossible. Vérifiez les valeurs.')
        onDone()
      }}
    >
      <h2 className="font-semibold">{parent ? `Pièce d’usure de « ${parent.name} »` : 'Nouvel équipement'}</h2>
      <div className="grid grid-cols-2 gap-3">
        <SelectField id="g-kind" label="Type" value={kind} onChange={(e) => pickKind(e.target.value as GearKind)}>
          {kinds.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </SelectField>
        <Field id="g-name" label="Nom / modèle" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <Field id="g-start" label="Km déjà parcourus" type="text" inputMode="decimal" value={startKm} onChange={(e) => setStartKm(e.target.value)} />
        <Field id="g-limit" label="Durée de vie (km, facultatif)" type="text" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} />
      </div>
      {!parent && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Utilisé pour</legend>
          <div className="flex flex-wrap gap-2">
            {choices.map((s) => (
              <label key={s.key} className={cn('flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm', sports.includes(s.key) && 'border-primary bg-primary/10')}>
                <input type="checkbox" className="sr-only" checked={sports.includes(s.key)} onChange={(e) => setSports(e.target.checked ? [...sports, s.key] : sports.filter((x) => x !== s.key))} />
                {s.short}
              </label>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Choisir automatiquement pour ces sports
          </label>
        </fieldset>
      )}
      {msg && <p role="status" className="text-sm">{msg}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy && <Loader2 className="size-4 animate-spin" />} Enregistrer
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
