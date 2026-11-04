import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Globe, Loader2, Lock, MessageCircle, Send, ThumbsUp, Trash2, Users } from 'lucide-react'
import { RouteMap } from '@/components/dashboard/route-map'
import { formatDuration } from '@/components/dashboard/activity-list'
import { sportFamily, sportInfo } from '@/lib/sports'
import { cn } from '@/lib/utils'
import { supabase } from '../supabase'
import { initials, photoUrls, uploadPhoto, VISIBILITY_LABEL, type AthleteCard, type FeedItem, type SharedActivity, type Visibility } from '../social'

const when = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' })

export function Avatar({ user, size = 40 }: { user: Pick<AthleteCard, 'name' | 'avatar_url'>; size?: number }) {
  return user.avatar_url ? (
    <img src={user.avatar_url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials(user.name)}
    </span>
  )
}

export const VisibilityIcon = ({ v, className }: { v: Visibility; className?: string }) =>
  v === 'public' ? <Globe className={className} /> : v === 'private' ? <Lock className={className} /> : <Users className={className} />

export function statLine(a: Pick<FeedItem, 'sport_type' | 'distance_meters' | 'duration_seconds' | 'elevation_gain_meters'>) {
  const km = Number(a.distance_meters) / 1000
  const out: { label: string; value: string }[] = []
  if (km > 0) out.push({ label: 'Distance', value: `${km.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km` })
  if (km > 0)
    out.push(
      sportFamily(a.sport_type) === 'run'
        ? { label: 'Allure', value: (() => { const p = a.duration_seconds / km; return `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, '0')} /km` })() }
        : { label: 'Vitesse', value: `${((km / a.duration_seconds) * 3600).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h` },
    )
  out.push({ label: 'Durée', value: formatDuration(a.duration_seconds) })
  if (Number(a.elevation_gain_meters) > 0) out.push({ label: 'D+', value: `${Math.round(Number(a.elevation_gain_meters))} m` })
  return out
}

/** Bouton « Bravo » avec mise à jour immédiate. */
export function KudosButton({ activityId, userId, kudoed, count, disabled, onChange }: { activityId: string; userId: string; kudoed: boolean; count: number; disabled?: boolean; onChange?: (k: boolean, n: number) => void }) {
  const [state, setState] = useState({ kudoed, count })
  const toggle = async () => {
    const next = { kudoed: !state.kudoed, count: state.count + (state.kudoed ? -1 : 1) }
    setState(next)
    const { error } = state.kudoed
      ? await supabase.from('kudos').delete().eq('activity_id', activityId).eq('user_id', userId)
      : await supabase.from('kudos').insert({ activity_id: activityId, user_id: userId })
    if (error) setState(state)
    else onChange?.(next.kudoed, next.count)
  }
  return (
    <button onClick={toggle} disabled={disabled} className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm', state.kudoed ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent', disabled && 'opacity-60')} aria-pressed={state.kudoed} aria-label={state.kudoed ? 'Retirer mon bravo' : 'Donner un bravo'}>
      <ThumbsUp className={cn('size-4', state.kudoed && 'fill-current')} /> {state.count > 0 ? state.count : ''} Bravo
    </button>
  )
}

/** Carte d'une séance dans le fil. */
export function FeedCard({ item, userId }: { item: FeedItem; userId: string }) {
  const Icon = sportInfo(item.sport_type).icon
  const [photos, setPhotos] = useState<Record<string, string>>({})
  useEffect(() => {
    photoUrls(item.photos.slice(0, 3)).then(setPhotos)
  }, [item.photos])
  return (
    <article className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-4 pb-2">
        <Link to={`/dashboard/athletes/${item.user.id}`}><Avatar user={item.user} /></Link>
        <div className="min-w-0 flex-1">
          <Link to={`/dashboard/athletes/${item.user.id}`} className="block truncate font-semibold">{item.mine ? 'Vous' : item.user.name}</Link>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon className="size-3.5" /> {when.format(new Date(item.start_time))} {item.user.city ? `· ${item.user.city}` : ''}
            {item.mine && <VisibilityIcon v={item.visibility} className="ml-1 size-3" />}
          </p>
        </div>
      </div>
      <Link to={`/dashboard/activities/${item.id}`} className="block px-4">
        <h3 className="text-lg font-bold leading-tight">{item.title}</h3>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {statLine(item).map((s) => (
            <div key={s.label}>
              <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
              <dd className="font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Link>
      {(item.route?.length ?? 0) > 1 && (
        <Link to={`/dashboard/activities/${item.id}`} className="mt-3 block bg-background/40 px-2">
          <RouteMap route={item.route!} />
        </Link>
      )}
      {Object.keys(photos).length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1 px-4">
          {item.photos.slice(0, 3).map((p) => photos[p] && <img key={p} src={photos[p]} alt="" className="aspect-square w-full rounded-md object-cover" loading="lazy" />)}
        </div>
      )}
      <div className="flex items-center gap-1 border-t px-2 py-1.5 mt-3">
        <KudosButton activityId={item.id} userId={userId} kudoed={item.kudoed} count={item.kudos} disabled={item.mine} />
        <Link to={`/dashboard/activities/${item.id}#commentaires`} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">
          <MessageCircle className="size-4" /> {item.comments > 0 ? item.comments : ''} Commenter
        </Link>
      </div>
    </article>
  )
}

/** Bravos, commentaires, photos (et visibilité pour l'auteur) sous une séance. */
export function SocialPanel({ activityId, userId, mine, visibility, onVisibility }: { activityId: string; userId: string; mine: boolean; visibility?: Visibility; onVisibility?: (v: Visibility) => void }) {
  const [data, setData] = useState<SharedActivity | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = async () => {
    const { data } = await supabase.rpc('get_shared_activity', { p_activity: activityId })
    const d = data as unknown as SharedActivity | null
    setData(d)
    if (d) setUrls(await photoUrls(d.photos))
  }
  useEffect(() => {
    const t = setTimeout(load, 0) // chargement asynchrone (hors rendu)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId])
  if (!data) return null

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy('comment')
    const { error } = await supabase.from('comments').insert({ activity_id: activityId, user_id: userId, body: text.trim().slice(0, 1000) })
    setBusy(null)
    if (error) return setError('Commentaire non envoyé.')
    setText('')
    load()
  }
  const removeComment = async (id: string) => {
    await supabase.from('comments').delete().eq('id', id)
    load()
  }
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy('photo')
    setError(null)
    try {
      for (const f of Array.from(files).slice(0, 6)) await uploadPhoto(userId, activityId, f)
    } catch {
      setError('Photo non envoyée (format ou taille).')
    }
    setBusy(null)
    load()
  }
  const removePhoto = async (path: string) => {
    await supabase.storage.from('activity-photos').remove([path])
    await supabase.from('activity_photos').delete().eq('path', path)
    load()
  }

  return (
    <section className="rounded-xl border bg-card p-4 space-y-4" id="commentaires">
      {mine && visibility && onVisibility && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <VisibilityIcon v={visibility} className="size-4 text-muted-foreground" /> Visible par
          <select value={visibility} onChange={(e) => onVisibility(e.target.value as Visibility)} className="h-9 rounded-md border bg-background px-2">
            {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => <option key={v} value={v}>{VISIBILITY_LABEL[v]}</option>)}
          </select>
          <span className="w-full text-xs text-muted-foreground">Les autres ne voient jamais les 200 premiers et derniers mètres de votre parcours.</span>
        </label>
      )}
      {(data.photos.length > 0 || mine) && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            {data.photos.map((p) => urls[p] && (
              <div key={p} className="relative">
                <img src={urls[p]} alt="" className="aspect-square w-full rounded-md object-cover" loading="lazy" />
                {mine && <button onClick={() => removePhoto(p)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label="Supprimer la photo"><Trash2 className="size-3.5" /></button>}
              </div>
            ))}
          </div>
          {mine && (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-sm">
              {busy === 'photo' ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} Ajouter des photos
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
            </label>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <KudosButton activityId={activityId} userId={userId} kudoed={data.kudoed} count={Number(data.kudos)} disabled={mine} onChange={() => load()} />
        {data.kudoers.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="flex -space-x-2">{data.kudoers.slice(0, 5).map((u) => <Avatar key={u.id} user={u} size={22} />)}</span>
            {data.kudoers.slice(0, 2).map((u) => u.name).join(', ')}{data.kudoers.length > 2 ? ` et ${data.kudoers.length - 2} autre(s)` : ''}
          </p>
        )}
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Commentaires</h2>
        {data.comment_list.length === 0 && <p className="text-sm text-muted-foreground">Aucun commentaire pour l’instant.</p>}
        <ul className="space-y-3">
          {data.comment_list.map((c) => (
            <li key={c.id} className="flex gap-2">
              <Avatar user={c.user} size={32} />
              <div className="min-w-0 flex-1 rounded-xl bg-background px-3 py-2">
                <p className="text-xs"><strong>{c.mine ? 'Vous' : c.user.name}</strong> <span className="text-muted-foreground">· {when.format(new Date(c.created_at))}</span></p>
                <p className="whitespace-pre-line break-words text-sm">{c.body}</p>
              </div>
              {(c.mine || mine) && <button onClick={() => removeComment(c.id)} className="self-start p-1 text-muted-foreground" aria-label="Supprimer le commentaire"><Trash2 className="size-4" /></button>}
            </li>
          ))}
        </ul>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form onSubmit={send} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Écrire un commentaire…" aria-label="Commentaire" className="h-10 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm" />
          <button type="submit" disabled={busy === 'comment' || !text.trim()} className="flex size-10 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50" aria-label="Envoyer"><Send className="size-4" /></button>
        </form>
      </div>
    </section>
  )
}
