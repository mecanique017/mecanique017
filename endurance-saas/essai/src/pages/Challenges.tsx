import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Award, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/components/dashboard/activity-list'
import { cn } from '@/lib/utils'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'
import type { AthleteCard } from '../social'
import { Avatar } from '../components/Social'

interface Challenge { id: string; title: string; description: string | null; metric: 'distance' | 'duration' | 'elevation' | 'sessions'; goal: number; joined: boolean; participants: number; mine: number | null; leaders: { user: AthleteCard; value: number }[] }
const fmt = (m: Challenge['metric'], v: number) =>
  m === 'distance' ? `${(v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km` : m === 'duration' ? formatDuration(v) : m === 'elevation' ? `${Math.round(v).toLocaleString('fr-FR')} m` : `${v} séance${v > 1 ? 's' : ''}`

export function ChallengesPage() {
  const user = useUser()
  const [offset, setOffset] = useState(0)
  const month = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1)
  const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`
  const { data, reload } = useData(async () => ((await supabase.rpc('challenge_board', { p_month: iso })).data as unknown as Challenge[]) ?? [], [iso])
  const toggle = async (c: Challenge) => {
    if (c.joined) await supabase.from('challenge_participants').delete().eq('challenge_id', c.id).eq('user_id', user.id)
    else await supabase.from('challenge_participants').insert({ challenge_id: c.id, user_id: user.id })
    reload()
  }
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link to="/dashboard/feed" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Fil d’actualité</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Défis du mois</h1>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => setOffset((o) => o - 1)} aria-label="Mois précédent"><ChevronLeft className="size-4" /></Button>
          <span className="w-28 text-center text-sm font-medium first-letter:uppercase">{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(month)}</span>
          <Button size="icon" variant="outline" onClick={() => setOffset((o) => o + 1)} aria-label="Mois suivant"><ChevronRight className="size-4" /></Button>
        </div>
      </div>
      {data && data.length === 0 && <p className="text-sm text-muted-foreground">Pas de défi ce mois-ci.</p>}
      {(data ?? []).map((c) => {
        const pct = Math.min(100, Math.round(((c.mine ?? 0) / c.goal) * 100))
        const done = c.joined && pct >= 100
        return (
          <article key={c.id} className={cn('rounded-xl border bg-card p-4 space-y-3', done && 'border-primary')}>
            <div className="flex items-start gap-3">
              <Award className={cn('size-8 shrink-0', done ? 'text-primary' : 'text-muted-foreground')} />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{c.title}</h2>
                <p className="text-sm text-muted-foreground">{c.description}</p>
                <p className="text-xs text-muted-foreground">{c.participants} participant(s)</p>
              </div>
              <Button size="sm" variant={c.joined ? 'outline' : 'default'} onClick={() => toggle(c)}>{c.joined ? 'Quitter' : 'Participer'}</Button>
            </div>
            {c.joined && (
              <div>
                <div className="flex justify-between text-sm"><span>{done ? '🏅 Défi réussi !' : 'Ma progression'}</span><span className="tabular-nums">{fmt(c.metric, c.mine ?? 0)} / {fmt(c.metric, c.goal)}</span></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
              </div>
            )}
            {c.leaders.length > 0 && (
              <ol className="space-y-1.5">
                {c.leaders.slice(0, 5).map((l, i) => (
                  <li key={l.user.id} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <Avatar user={l.user} size={22} />
                    <span className="min-w-0 flex-1 truncate">{l.user.id === user.id ? 'Vous' : l.user.name}</span>
                    <span className="tabular-nums text-muted-foreground">{fmt(c.metric, l.value)}</span>
                  </li>
                ))}
              </ol>
            )}
          </article>
        )
      })}
    </div>
  )
}
