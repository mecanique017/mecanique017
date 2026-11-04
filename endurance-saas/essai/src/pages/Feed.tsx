import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '../supabase'
import { useUser } from '../session'
import { backfillPublicRoutes, type AthleteCard, type FeedItem } from '../social'
import { Avatar, FeedCard } from '../components/Social'

export function FeedPage() {
  const user = useUser()
  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [more, setMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const load = async (before?: string) => {
    setLoading(true)
    const { data } = await supabase.rpc('get_feed', { p_before: before ?? null, p_limit: 15 })
    const page = (data as unknown as FeedItem[]) ?? []
    setItems((cur) => (before ? [...(cur ?? []), ...page] : page))
    setMore(page.length === 15)
    setLoading(false)
  }
  useEffect(() => {
    // Tracés publics des anciennes séances calculés au passage (départ/arrivée masqués)
    backfillPublicRoutes(user.id).finally(() => load())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Fil d’actualité</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild><Link to="/dashboard/clubs">Clubs</Link></Button>
          <Button size="sm" variant="outline" asChild><Link to="/dashboard/challenges">Défis</Link></Button>
        </div>
      </div>
      <AthleteSearch />
      {!items ? (
        <div className="h-64 rounded-xl border bg-card animate-pulse" aria-hidden />
      ) : items.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Abonnez-vous à des athlètes pour voir leurs séances ici.</p>
      ) : (
        <>
          {items.map((i) => <FeedCard key={i.id} item={i} userId={user.id} />)}
          {more && (
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => load(items[items.length - 1]?.start_time)}>
              {loading && <Loader2 className="size-4 animate-spin" />} Voir plus
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function AthleteSearch() {
  const user = useUser()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<(AthleteCard & { following: boolean })[]>([])
  useEffect(() => {
    if (q.trim().length < 2) return
    const id = setTimeout(async () => {
      const { data } = await supabase.rpc('search_athletes', { p_query: q })
      setRes((data as unknown as (AthleteCard & { following: boolean })[]) ?? [])
    }, 300)
    return () => clearTimeout(id)
  }, [q])
  const follow = async (id: string) => {
    await supabase.from('follows').insert({ follower_id: user.id, followee_id: id })
    setRes((r) => r.map((a) => (a.id === id ? { ...a, following: true } : a)))
  }
  return (
    <div className="space-y-2">
      <label className="relative block">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un athlète (nom, pseudo, ville)" aria-label="Rechercher un athlète" className="h-10 w-full rounded-full border bg-card pl-9 pr-4 text-sm" />
      </label>
      {q.trim().length >= 2 && (
        <ul className="rounded-xl border bg-card divide-y">
          {res.length === 0 && <li className="p-3 text-sm text-muted-foreground">Aucun athlète trouvé.</li>}
          {res.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-3">
              <Avatar user={a} size={36} />
              <Link to={`/dashboard/athletes/${a.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="truncate text-xs text-muted-foreground">{[a.username && `@${a.username}`, a.city].filter(Boolean).join(' · ')}</p>
              </Link>
              {a.following ? <span className="text-xs text-muted-foreground">Abonné</span> : <Button size="sm" onClick={() => follow(a.id)}><UserPlus className="size-4" /> Suivre</Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
