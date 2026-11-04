/**
 * Suivi en direct partagé : le jeton est créé sur le téléphone (aléatoire, 122 bits) pour pouvoir ouvrir
 * la feuille de partage immédiatement (iPhone : le partage doit suivre le geste de l'utilisateur).
 */
import type { LiveSession } from '@/lib/live/recorder'
import { movingSeconds } from '@/lib/live/recorder'
import { supabase } from './supabase'

const KEY = 'kronofit-live-share'

export interface ShareState {
  token: string
  sessionStartedAt: number
  created: boolean
}

export const loadShare = (): ShareState | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}
export const saveShare = (s: ShareState | null) => {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    // stockage indisponible
  }
}

export const shareUrl = (token: string) => `${location.origin}${location.pathname}#/suivi/${token}`

/** Envoie l'état de la séance (position, distance, tracé simplifié). Crée la ligne au premier envoi. */
export async function pushShare(share: ShareState, s: LiveSession, userId: string, name: string | null, pos: { lat: number; lng: number; accuracy: number } | null) {
  const gps = s.points.filter((p) => p.lat != null)
  const k = Math.max(1, Math.ceil(gps.length / 500))
  const track = gps.filter((_, i) => i % k === 0 || i === gps.length - 1).map((p) => [Math.round(p.lat! * 1e5) / 1e5, Math.round(p.lng! * 1e5) / 1e5])
  const last = gps[gps.length - 1]
  const row = {
    token: share.token,
    user_id: userId,
    display_name: name,
    sport: s.sport,
    status: s.status === 'running' ? ('running' as const) : ('paused' as const),
    started_at: new Date(s.startedAt).toISOString(),
    updated_at: new Date().toISOString(),
    lat: pos?.lat ?? last?.lat ?? null,
    lng: pos?.lng ?? last?.lng ?? null,
    accuracy: pos?.accuracy ?? null,
    distance_meters: Math.round(s.distance),
    moving_seconds: Math.round(movingSeconds(s)),
    track,
  }
  const { error } = await supabase.from('live_shares').upsert(row, { onConflict: 'token' })
  return !error
}

export async function endShare(share: ShareState) {
  await supabase.from('live_shares').update({ status: 'ended', updated_at: new Date().toISOString() }).eq('token', share.token)
}
