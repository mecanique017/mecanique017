import { useEffect, useState } from 'react'
import { Database, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { FormAlert } from '@/components/auth/form-alert'
import { clearDemoData, seedDemoData } from '@/lib/demo'
import { recalculateRecentTss } from '@/lib/training/recalc'
import type { SportDiscipline } from '@/types/database'
import type { Visibility } from '../social'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

export function ProfilePage() {
  const user = useUser()
  const { data, reload } = useData(async () => {
    const [profile, demo] = await Promise.all([
      supabase.from('profiles').select('full_name, username, bio, city, default_visibility, sport_discipline, hr_max, hr_rest, lactate_threshold_hr, ftp, vma, subscription_tier, subscription_status, trial_ends_at').eq('id', user.id).single(),
      supabase.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('source', 'demo'),
    ])
    return { profile: profile.data, demoCount: demo.count ?? 0 }
  }, [user.id])

  const [f, setF] = useState({ full_name: '', sport_discipline: 'running' as SportDiscipline, hr_rest: '', lactate_threshold_hr: '', hr_max: '', ftp: '', vma: '', recalc: false })
  useEffect(() => {
    const p = data?.profile
    if (!p) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF({ full_name: p.full_name ?? '', sport_discipline: p.sport_discipline, hr_rest: String(p.hr_rest), lactate_threshold_hr: String(p.lactate_threshold_hr), hr_max: String(p.hr_max), ftp: String(p.ftp), vma: String(p.vma), recalc: false })
  }, [data?.profile])
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = { hr_rest: Number(f.hr_rest), lactate_threshold_hr: Number(f.lactate_threshold_hr), hr_max: Number(f.hr_max), ftp: Number(f.ftp), vma: Number(f.vma) }
    if (!(v.hr_rest < v.lactate_threshold_hr && v.lactate_threshold_hr <= v.hr_max)) return setMessage({ ok: false, text: 'Il faut : FC repos < FC seuil ≤ FC max.' })
    setBusy('save')
    const { error } = await supabase.from('profiles').update({ full_name: f.full_name.trim() || null, sport_discipline: f.sport_discipline, ...v }).eq('id', user.id)
    let text = error ? 'Enregistrement impossible : vérifiez les valeurs.' : 'Profil enregistré.'
    if (!error && f.recalc) text += ` ${await recalculateRecentTss(supabase, v)} séance(s) recalculée(s).`
    setBusy(null)
    setMessage({ ok: !error, text })
    reload()
  }

  const demo = async (action: 'add' | 'remove') => {
    setBusy(action)
    try {
      if (action === 'add') {
        const r = await seedDemoData(supabase, user.id)
        setMessage({ ok: true, text: `${r.activities} séances, ${r.wellness} relevés et ${r.planned} séances prévues ajoutés.` })
      } else {
        await clearDemoData(supabase, user.id)
        setMessage({ ok: true, text: 'Données de démonstration supprimées.' })
      }
    } catch {
      setMessage({ ok: false, text: 'Opération impossible. Réessayez.' })
    }
    setBusy(null)
    reload()
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const p = data?.profile

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user.email}
          {p?.subscription_status === 'trialing' && p.trial_ends_at && ` · Essai Premium jusqu’au ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(p.trial_ends_at))}`}
        </p>
      </div>
      {message && (message.ok ? <p role="status" className="rounded-md border bg-card p-3 text-sm">{message.text}</p> : <FormAlert message={message.text} />)}
      <form onSubmit={save} className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="full_name" label="Nom" value={f.full_name} onChange={set('full_name')} />
          <SelectField id="sport_discipline" label="Discipline" value={f.sport_discipline} onChange={set('sport_discipline')}>
            <option value="running">Course à pied</option>
            <option value="cycling">Vélo</option>
            <option value="triathlon">Triathlon</option>
          </SelectField>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field id="hr_rest" label="FC repos" type="number" inputMode="numeric" value={f.hr_rest} onChange={set('hr_rest')} required />
          <Field id="lthr" label="FC seuil" type="number" inputMode="numeric" value={f.lactate_threshold_hr} onChange={set('lactate_threshold_hr')} required />
          <Field id="hr_max" label="FC max" type="number" inputMode="numeric" value={f.hr_max} onChange={set('hr_max')} required />
          <Field id="ftp" label="FTP (W)" type="number" inputMode="numeric" value={f.ftp} onChange={set('ftp')} required />
          <Field id="vma" label="VMA (km/h)" type="number" inputMode="decimal" step="0.1" value={f.vma} onChange={set('vma')} required />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={f.recalc} onChange={(e) => setF({ ...f, recalc: e.target.checked })} className="mt-0.5 size-4 accent-primary" />
          Recalculer le TSS des séances des 90 derniers jours
        </label>
        <Button type="submit" disabled={busy !== null}>
          {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
        </Button>
      </form>
      {p && <PublicProfileForm userId={user.id} initial={p} onSaved={reload} />}
      <section className="rounded-xl border bg-card p-4 md:p-6 space-y-3">
        <h2 className="font-semibold">Données de démonstration</h2>
        <p className="text-sm text-muted-foreground">12 semaines de séances, de bien-être et le programme de la semaine, supprimables sans toucher à vos vraies données.</p>
        {data && data.demoCount > 0 ? (
          <Button variant="outline" onClick={() => demo('remove')} disabled={busy !== null}>
            {busy === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Supprimer les données de démonstration
          </Button>
        ) : (
          <Button variant="outline" onClick={() => demo('add')} disabled={busy !== null}>
            {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} Charger les données de démonstration
          </Button>
        )}
      </section>
    </div>
  )
}

function PublicProfileForm({ userId, initial, onSaved }: { userId: string; initial: { username: string | null; bio: string | null; city: string | null; default_visibility: Visibility }; onSaved: () => void }) {
  const [f, setF] = useState({ username: initial.username ?? '', bio: initial.bio ?? '', city: initial.city ?? '', default_visibility: initial.default_visibility })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const username = f.username.trim().toLowerCase() || null
    if (username && !/^[a-z0-9_.]{3,20}$/.test(username)) return setMsg({ ok: false, text: 'Pseudo : 3 à 20 caractères (lettres minuscules, chiffres, point, tiret bas).' })
    const { error } = await supabase.from('profiles').update({ username, bio: f.bio.trim() || null, city: f.city.trim() || null, default_visibility: f.default_visibility }).eq('id', userId)
    setMsg(error ? { ok: false, text: error.code === '23505' ? 'Ce pseudo est déjà pris.' : 'Enregistrement impossible.' } : { ok: true, text: 'Profil public enregistré.' })
    if (!error) onSaved()
  }
  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
      <h2 className="font-semibold">Profil public</h2>
      <p className="text-sm text-muted-foreground">Ce que les autres athlètes voient de vous dans le fil, les clubs et les défis.</p>
      {msg && <p role="status" className={msg.ok ? 'text-sm' : 'text-sm text-destructive'}>{msg.text}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="username" label="Pseudo" placeholder="ex. sidi.runner" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} maxLength={20} />
        <Field id="city" label="Ville" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} maxLength={60} />
      </div>
      <Field id="bio" label="Présentation" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={280} />
      <SelectField id="default_visibility" label="Visibilité par défaut de mes séances" value={f.default_visibility} onChange={(e) => setF({ ...f, default_visibility: e.target.value as Visibility })}>
        <option value="public">Tout le monde</option>
        <option value="followers">Mes abonnés</option>
        <option value="private">Moi seul</option>
      </SelectField>
      <Button type="submit">Enregistrer le profil public</Button>
    </form>
  )
}
