import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { sportInfo } from '@/lib/sports'
import { TrackMap } from '../components/TrackMap'
import { Avatar, SocialPanel, statLine } from '../components/Social'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'
import type { SharedActivity } from '../social'

const when = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' })

/** Séance d'un autre athlète, si sa visibilité le permet. */
export function SharedActivityView({ id }: { id: string }) {
  const user = useUser()
  const { data } = useData(async () => ({ a: (await supabase.rpc('get_shared_activity', { p_activity: id })).data as unknown as SharedActivity | null }), [id])
  if (!data) return <div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />
  const a = data.a
  if (!a) return <p className="text-sm text-muted-foreground">Séance introuvable ou privée.</p>
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link to="/dashboard/feed" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Fil d’actualité</Link>
      <Link to={`/dashboard/athletes/${a.user.id}`} className="flex items-center gap-3">
        <Avatar user={a.user} />
        <div>
          <p className="font-semibold">{a.user.name}</p>
          <p className="text-xs text-muted-foreground">{sportInfo(a.sport_type).label} · {when.format(new Date(a.start_time))}</p>
        </div>
      </Link>
      <h1 className="text-2xl font-bold">{a.title}</h1>
      <dl className="grid grid-cols-2 sm:grid-cols-4 overflow-hidden rounded-xl border bg-card">
        {[...statLine(a), ...(a.avg_hr ? [{ label: 'FC moyenne', value: `${a.avg_hr} bpm` }] : [])].map((s) => (
          <div key={s.label} className="-mb-px border-b p-4">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {(a.route?.length ?? 0) > 1 && (
        <section className="rounded-xl border bg-card p-4 space-y-2">
          <TrackMap route={a.route!} className="h-80" />
          <p className="text-xs text-muted-foreground">Départ et arrivée masqués pour protéger la vie privée de l’athlète.</p>
        </section>
      )}
      {a.athlete_notes && <p className="whitespace-pre-line rounded-xl border bg-card p-4">{a.athlete_notes}</p>}
      <SocialPanel activityId={a.id} userId={user.id} mine={false} />
    </div>
  )
}
