/**
 * Rappels KronoFit par notification (fonction Supabase Edge, Deno).
 *  - GET ?vapid           : clé publique VAPID (créée au premier appel, gardée dans le coffre Supabase) ;
 *  - POST (tâche horaire) : en-tête x-cron-secret → envoie les rappels de l'heure (heure de Paris) ;
 *  - POST { action: 'test' } avec le jeton de l'utilisateur → notification de test sur ses appareils.
 * La clé privée VAPID et le secret de la tâche ne quittent jamais le serveur (coffre Vault).
 */
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import { generateVapidKeys, sendPush, type Subscription, type VapidKeys } from './webpush.ts'

const SUBJECT = 'https://garage-mecanique17.fr/app-endurance/'
const APP = 'https://garage-mecanique17.fr/app-endurance/#/dashboard'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

async function secret(name: string): Promise<string | null> {
  const { data } = await admin.rpc('kronofit_secret', { secret_name: name })
  return (data as string | null) ?? null
}

async function vapidKeys(): Promise<VapidKeys> {
  const saved = await secret('kronofit_vapid')
  if (saved) return JSON.parse(saved)
  const keys = await generateVapidKeys()
  await admin.rpc('kronofit_secret_set', { secret_name: 'kronofit_vapid', secret_value: JSON.stringify(keys) })
  // Relecture : en cas de création simultanée, tout le monde garde la même clé
  return JSON.parse((await secret('kronofit_vapid')) ?? JSON.stringify(keys))
}

async function notify(userId: string, message: { title: string; body: string; url?: string; tag?: string }, keys: VapidKeys) {
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId)
  let sent = 0
  for (const s of (subs ?? []) as (Subscription & { id: string })[]) {
    try {
      const status = await sendPush(s, message, keys, SUBJECT)
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', s.id)
      else if (status < 300) sent++
    } catch {
      // service de notification injoignable : on réessaiera au prochain rappel
    }
  }
  return sent
}

const parisNow = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  )
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

/** Envoie un rappel une seule fois par jour et par type. */
async function once(userId: string, kind: string, day: string) {
  const { error } = await admin.from('reminder_log').insert({ user_id: userId, kind, day })
  return !error
}

async function runHour() {
  const { day, hour } = parisNow()
  const keys = await vapidKeys()
  const { data: prefs } = await admin.from('reminder_prefs').select('*')
  let sent = 0
  for (const p of prefs ?? []) {
    const uid = p.user_id as string
    if (p.weigh_hour === hour) {
      const { count } = await admin.from('weight_logs').select('day', { count: 'exact', head: true }).eq('user_id', uid).eq('day', day)
      if (!count && (await once(uid, 'weigh', day))) sent += await notify(uid, { title: 'Pesée du matin ⚖️', body: 'À jeun, avant le petit-déjeuner : notez votre poids pour suivre la tendance.', url: `${APP}/nutrition`, tag: 'weigh' }, keys)
    }
    if (p.meals_hour === hour) {
      const { count } = await admin.from('food_logs').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('day', day)
      if (!count && (await once(uid, 'meals', day))) sent += await notify(uid, { title: 'Vos repas du jour 🍽️', body: 'Rien n’est noté aujourd’hui : deux minutes pour compléter votre journal ?', url: `${APP}/nutrition`, tag: 'meals' }, keys)
    }
    if (p.planned_hour === hour) {
      const { data: w } = await admin.from('planned_workouts').select('title').eq('user_id', uid).eq('scheduled_date', day).eq('is_completed', false).limit(1)
      if (w?.length && (await once(uid, 'planned', day))) sent += await notify(uid, { title: 'Séance du jour 🏃', body: `Au programme : ${w[0].title}.`, url: `${APP}/plan`, tag: 'planned' }, keys)
    }
    if (p.inactivity_days && hour === 18) {
      const since = new Date(Date.now() - p.inactivity_days * 86_400_000).toISOString()
      const { count } = await admin.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('start_time', since)
      const { count: recent } = await admin.from('reminder_log').select('day', { count: 'exact', head: true }).eq('user_id', uid).eq('kind', 'inactive').gte('day', since.slice(0, 10))
      if (!count && !recent && (await once(uid, 'inactive', day)))
        sent += await notify(uid, { title: 'On bouge ? 💪', body: `Aucune séance depuis ${p.inactivity_days} jours. Même 20 minutes de footing ou de vélo comptent !`, url: `${APP}/record`, tag: 'inactive' }, keys)
    }
  }
  return { hour, day, users: prefs?.length ?? 0, sent }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = new URL(req.url)
  try {
    if (req.method === 'GET' && url.searchParams.has('vapid')) return json({ publicKey: (await vapidKeys()).publicKey })
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const cronHeader = req.headers.get('x-cron-secret')
    if (cronHeader) {
      const expected = await secret('kronofit_cron_secret')
      if (!expected || cronHeader !== expected) return json({ error: 'forbidden' }, 403)
      return json(await runHour())
    }

    // Notification de test pour l'utilisateur connecté
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'unauthorized' }, 401)
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: u } = await userClient.auth.getUser()
    if (!u.user) return json({ error: 'unauthorized' }, 401)
    const sent = await notify(u.user.id, { title: 'KronoFit', body: 'Les rappels sont activés sur cet appareil ✅', url: `${APP}`, tag: 'test' }, await vapidKeys())
    return json({ sent })
  } catch {
    return json({ error: 'server_error' }, 500)
  }
})
