import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, LogIn, LogOut, Plus, Trophy, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { formatDuration } from '@/components/dashboard/activity-list'
import { cn } from '@/lib/utils'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'
import type { AthleteCard } from '../social'
import { Avatar } from '../components/Social'

interface Club { id: string; name: string; description: string | null; sport_family: string | null; city: string | null; owner: boolean; members: number; member: boolean }
const FAMILY: Record<string, string> = { run: 'Course', ride: 'Vélo', swim: 'Natation', other: 'Multisport' }

export function ClubsPage() {
  const user = useUser()
  const { data, reload } = useData(async () => ((await supabase.rpc('list_clubs')).data as unknown as Club[]) ?? [], [user.id])
  const [creating, setCreating] = useState(false)
  const [f, setF] = useState({ name: '', description: '', city: '', sport_family: '' })
  const [error, setError] = useState<string | null>(null)
  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('clubs').insert({ name: f.name.trim(), description: f.description.trim() || null, city: f.city.trim() || null, sport_family: f.sport_family || null, owner_id: user.id })
    if (error) return setError('Nom de 3 à 60 caractères.')
    setCreating(false)
    setF({ name: '', description: '', city: '', sport_family: '' })
    reload()
  }
  const join = async (c: Club) => {
    if (c.member) await supabase.from('club_members').delete().eq('club_id', c.id).eq('user_id', user.id)
    else await supabase.from('club_members').insert({ club_id: c.id, user_id: user.id })
    reload()
  }
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link to="/dashboard/feed" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Fil d’actualité</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clubs</h1>
        <Button size="sm" onClick={() => setCreating((v) => !v)}><Plus className="size-4" /> Créer un club</Button>
      </div>
      {creating && (
        <form onSubmit={create} className="rounded-xl border bg-card p-4 space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Field id="club-name" label="Nom du club" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} required />
          <div className="grid grid-cols-2 gap-3">
            <Field id="club-city" label="Ville" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} maxLength={60} />
            <SelectField id="club-sport" label="Sport" value={f.sport_family} onChange={(e) => setF({ ...f, sport_family: e.target.value })}>
              <option value="">Multisport</option>
              <option value="run">Course</option>
              <option value="ride">Vélo</option>
              <option value="swim">Natation</option>
            </SelectField>
          </div>
          <TextareaField id="club-desc" label="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={500} />
          <Button type="submit">Créer</Button>
        </form>
      )}
      <ul className="space-y-3">
        {(data ?? []).map((c) => (
          <li key={c.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">{c.name[0]}</span>
              <Link to={`/dashboard/clubs/${c.id}`} className="min-w-0 flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{[FAMILY[c.sport_family ?? 'other'], c.city, `${c.members} membre(s)`].filter(Boolean).join(' · ')}</p>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              </Link>
              {!c.owner && (
                <Button size="sm" variant={c.member ? 'outline' : 'default'} onClick={() => join(c)}>
                  {c.member ? <><LogOut className="size-4" /> Quitter</> : <><LogIn className="size-4" /> Rejoindre</>}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface Row { user: AthleteCard; role: string; distance: number; duration: number; sessions: number }
const mondayIso = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString()
}
const monthIso = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

export function ClubPage() {
  const { id } = useParams()
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const { data } = useData(async () => {
    const [clubs, board] = await Promise.all([
      supabase.rpc('list_clubs'),
      supabase.rpc('club_leaderboard', { p_club: id!, p_from: period === 'week' ? mondayIso() : monthIso() }),
    ])
    return { club: ((clubs.data as unknown as Club[]) ?? []).find((c) => c.id === id) ?? null, rows: (board.data as unknown as Row[]) ?? [] }
  }, [id, period])
  if (!data) return <div className="h-64 rounded-xl border bg-card animate-pulse" aria-hidden />
  if (!data.club) return <p className="text-sm text-muted-foreground">Club introuvable.</p>
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link to="/dashboard/clubs" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Clubs</Link>
      <h1 className="text-2xl font-bold">{data.club.name}</h1>
      <p className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="size-4" /> {data.club.members} membre(s) {data.club.city ? `· ${data.club.city}` : ''}</p>
      {data.club.description && <p className="text-sm">{data.club.description}</p>}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Trophy className="size-4 text-primary" /> Classement</h2>
          <div className="flex rounded-full border p-0.5 text-xs">
            {(['week', 'month'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={cn('rounded-full px-3 py-1', period === p && 'bg-primary text-white')}>{p === 'week' ? 'Semaine' : 'Mois'}</button>
            ))}
          </div>
        </div>
        <ol className="divide-y">
          {data.rows.map((r, i) => (
            <li key={r.user.id} className="flex items-center gap-3 p-3">
              <span className={cn('w-6 text-center font-bold tabular-nums', i < 3 && 'text-primary')}>{i + 1}</span>
              <Avatar user={r.user} size={32} />
              <Link to={`/dashboard/athletes/${r.user.id}`} className="min-w-0 flex-1 truncate font-medium">{r.user.name}{r.role === 'admin' ? ' · admin' : ''}</Link>
              <span className="text-right text-sm tabular-nums">
                <strong>{(r.distance / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km</strong>
                <span className="block text-xs text-muted-foreground">{r.sessions} séance(s) · {formatDuration(r.duration)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
