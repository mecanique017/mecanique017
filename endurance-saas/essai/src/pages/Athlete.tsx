import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, UserCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/components/dashboard/activity-list'
import { sportInfo } from '@/lib/sports'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'
import type { AthleteCard } from '../social'
import { Avatar } from '../components/Social'

interface Athlete extends AthleteCard {
  bio: string | null
  me: boolean
  following: boolean
  followers: number
  followees: number
  activities: { id: string; title: string; sport_type: string; start_time: string; distance_meters: number; duration_seconds: number }[]
}
const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

export function AthletePage() {
  const { id } = useParams()
  const user = useUser()
  const { data, reload } = useData(async () => (await supabase.rpc('get_athlete', { p_user: id! })).data as unknown as Athlete | null, [id])
  if (data === undefined) return <div className="h-64 rounded-xl border bg-card animate-pulse" aria-hidden />
  if (!data) return <p className="text-sm text-muted-foreground">Athlète introuvable.</p>
  const toggle = async () => {
    if (data.following) await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', data.id)
    else await supabase.from('follows').insert({ follower_id: user.id, followee_id: data.id })
    reload()
  }
  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link to="/dashboard/feed" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Fil d’actualité</Link>
      <div className="flex items-center gap-4">
        <Avatar user={data} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{[data.username && `@${data.username}`, data.city].filter(Boolean).join(' · ')}</p>
          <p className="text-sm"><strong>{data.followers}</strong> abonné(s) · <strong>{data.followees}</strong> abonnement(s)</p>
        </div>
      </div>
      {data.bio && <p className="text-sm">{data.bio}</p>}
      {data.me ? (
        <Button variant="outline" asChild><Link to="/dashboard/profile">Modifier mon profil public</Link></Button>
      ) : (
        <Button onClick={toggle} variant={data.following ? 'outline' : 'default'}>
          {data.following ? <><UserCheck className="size-4" /> Abonné · se désabonner</> : <><UserPlus className="size-4" /> Suivre</>}
        </Button>
      )}
      <section className="rounded-xl border bg-card">
        <h2 className="border-b p-4 font-semibold">Séances</h2>
        {data.activities.length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucune séance visible.</p>}
        <ul className="divide-y">
          {data.activities.map((a) => {
            const Icon = sportInfo(a.sport_type).icon
            return (
              <li key={a.id}>
                <Link to={`/dashboard/activities/${a.id}`} className="flex items-center gap-3 p-4 hover:bg-accent/50">
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {Number(a.distance_meters) > 0 ? `${(Number(a.distance_meters) / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km · ` : ''}{formatDuration(a.duration_seconds)} · {date.format(new Date(a.start_time))}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
