/** Outils du volet social : tracé public (départ/arrivée masqués), photos, types des réponses SQL. */
import { haversine } from '@/lib/live/recorder'
import { supabase } from './supabase'

export type Visibility = 'public' | 'followers' | 'private'
export const VISIBILITY_LABEL: Record<Visibility, string> = { public: 'Tout le monde', followers: 'Mes abonnés', private: 'Moi seul' }

export interface AthleteCard {
  id: string
  username: string | null
  name: string
  avatar_url: string | null
  city: string | null
}
export interface FeedItem {
  id: string
  user: AthleteCard
  mine: boolean
  title: string
  sport_type: string
  start_time: string
  visibility: Visibility
  duration_seconds: number
  distance_meters: number
  elevation_gain_meters: number
  route: [number, number][] | null
  kudos: number
  kudoed: boolean
  comments: number
  photos: string[]
}
export interface SharedActivity extends FeedItem {
  avg_hr: number | null
  avg_watts: number | null
  athlete_notes: string | null
  kudoers: AthleteCard[]
  comment_list: { id: string; body: string; created_at: string; user: AthleteCard; mine: boolean }[]
}

/** Zone de confidentialité : les 200 premiers et derniers mètres ne sont jamais montrés aux autres. */
export function publicRoute(route: [number, number][] | null | undefined, hide = 200): [number, number][] | null {
  if (!route || route.length < 3) return null
  const cum = [0]
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + haversine(route[i - 1][0], route[i - 1][1], route[i][0], route[i][1]))
  const total = cum[cum.length - 1]
  if (total < hide * 3) return null // trop court : rien de montrable sans révéler le départ
  const kept = route.filter((_, i) => cum[i] >= hide && cum[i] <= total - hide)
  return kept.length > 1 ? kept : null
}

/** Calcule une fois le tracé public des séances qui n'en ont pas encore (anciennes séances). */
export async function backfillPublicRoutes(userId: string) {
  const { data } = await supabase.from('activities').select('id, route:raw_telemetry->route').eq('user_id', userId).is('public_route', null).not('raw_telemetry', 'is', null).limit(200)
  await Promise.all(
    (data ?? []).map((r) => {
      const pr = publicRoute(Array.isArray(r.route) ? (r.route as [number, number][]) : null)
      return pr ? supabase.from('activities').update({ public_route: pr }).eq('id', r.id) : null
    }),
  )
}

/** Photo réduite à 1600 px et compressée (JPEG) sur le téléphone avant l'envoi. */
async function compress(file: File): Promise<Blob> {
  const img = await createImageBitmap(file).catch(async () => {
    const el = new Image()
    el.src = URL.createObjectURL(file)
    await el.decode()
    return el
  })
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * scale)
  c.height = Math.round(img.height * scale)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Photo illisible'))), 'image/jpeg', 0.82))
}

export async function uploadPhoto(userId: string, activityId: string, file: File) {
  const blob = await compress(file)
  const path = `${userId}/${activityId}/${crypto.randomUUID()}.jpg`
  const up = await supabase.storage.from('activity-photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (up.error) throw up.error
  const { error } = await supabase.from('activity_photos').insert({ activity_id: activityId, user_id: userId, path })
  if (error) throw error
}

/** Liens temporaires (1 h) vers des photos privées. */
export async function photoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data } = await supabase.storage.from('activity-photos').createSignedUrls(paths, 3600)
  return Object.fromEntries((data ?? []).flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as const] : [])))
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
