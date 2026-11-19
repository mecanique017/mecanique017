import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, Share, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import type { Database } from '@/types/database'
import { SUPABASE_URL, supabase } from '../supabase'
import { useData, useUser } from '../session'

type Prefs = Database['public']['Tables']['reminder_prefs']['Row']
const FN = `${SUPABASE_URL}/functions/v1/send-reminders`

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const fromB64u = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
const toB64u = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '')

async function currentSubscription() {
  if (!supported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6 h → 22 h

export function RemindersPage() {
  const user = useUser()
  const { data, reload } = useData(async () => {
    const { data } = await supabase.from('reminder_prefs').select('*').eq('user_id', user.id).maybeSingle()
    return data
  }, [user.id])
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    currentSubscription()
      .then((s) => setEnabled(!!s && Notification.permission === 'granted'))
      .catch(() => setEnabled(false))
  }, [])

  const enable = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Notifications refusées : autorisez-les dans les réglages du téléphone (Notifications → KronoFit).')
      const reg = await navigator.serviceWorker.ready
      const { publicKey } = (await (await fetch(`${FN}?vapid`)).json()) as { publicKey: string }
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(publicKey) }))
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({ user_id: user.id, endpoint: sub.endpoint, p256dh: toB64u(sub.getKey('p256dh')), auth: toB64u(sub.getKey('auth')) }, { onConflict: 'endpoint' })
      if (error) throw new Error('Enregistrement impossible. Réessayez.')
      // Réglages par défaut au premier abonnement : pesée 7 h, repas 20 h, séance prévue 8 h, inactivité 4 jours
      if (!data) await supabase.from('reminder_prefs').insert({ user_id: user.id, weigh_hour: 7, meals_hour: 20, planned_hour: 8, inactivity_days: 4 })
      setEnabled(true)
      setMsg('Rappels activés sur cet appareil.')
      reload()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Activation impossible.')
    }
    setBusy(false)
  }

  const disable = async () => {
    setBusy(true)
    const sub = await currentSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe().catch(() => false)
    }
    setEnabled(false)
    setBusy(false)
    setMsg('Rappels désactivés sur cet appareil.')
  }

  const test = async () => {
    setBusy(true)
    setMsg(null)
    const { data: r, error } = await supabase.functions.invoke('send-reminders', { body: { action: 'test' } })
    setBusy(false)
    setMsg(error ? 'Envoi impossible pour le moment.' : (r as { sent: number }).sent ? 'Notification envoyée : elle arrive dans quelques secondes.' : 'Aucun appareil abonné : activez d’abord les rappels.')
  }

  const save = async (patch: Partial<Prefs>) => {
    await supabase.from('reminder_prefs').upsert({ user_id: user.id, ...data, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    reload()
  }

  const needsInstall = isIos() && !isStandalone()
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Rappels</h1>
      <p className="text-sm text-muted-foreground">Des notifications sur le téléphone, même appli fermée : pesée du matin, repas non notés, séance prévue, et un petit coup de pouce après quelques jours sans sport.</p>

      {!supported() || needsInstall ? (
        <section className="space-y-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Smartphone className="size-4" /> {needsInstall ? 'Installez d’abord KronoFit sur l’écran d’accueil' : 'Notifications non prises en charge ici'}
          </p>
          {needsInstall ? (
            <p>
              Sur iPhone, les notifications ne marchent que pour l’appli installée : dans Safari, touchez <Share className="inline size-4" /> <strong>Partager</strong> puis <strong>« Sur l’écran d’accueil »</strong>, ouvrez KronoFit depuis son icône et revenez ici.
            </p>
          ) : (
            <p>Ce navigateur ne permet pas les notifications. Utilisez Chrome, Edge, Firefox ou Safari (iPhone avec l’appli installée).</p>
          )}
        </section>
      ) : (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            {enabled ? <Bell className="size-5 text-green-500" /> : <BellOff className="size-5 text-muted-foreground" />}
            <p className="flex-1 text-sm font-medium">{enabled == null ? 'Vérification…' : enabled ? 'Rappels activés sur cet appareil' : 'Rappels désactivés sur cet appareil'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {enabled ? (
              <>
                <Button size="sm" variant="outline" onClick={test} disabled={busy}>
                  Envoyer une notification de test
                </Button>
                <Button size="sm" variant="ghost" onClick={disable} disabled={busy}>
                  Désactiver ici
                </Button>
              </>
            ) : (
              <Button onClick={enable} disabled={busy || enabled == null}>
                {busy && <Loader2 className="size-4 animate-spin" />} Activer les rappels
              </Button>
            )}
          </div>
          {msg && <p role="status" className="text-sm">{msg}</p>}
        </section>
      )}

      {data && (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Mes rappels</h2>
          <HourSelect id="weigh" label="Pesée du matin (si pas encore notée)" value={data.weigh_hour} onChange={(v) => save({ weigh_hour: v })} />
          <HourSelect id="planned" label="Séance prévue au programme" value={data.planned_hour} onChange={(v) => save({ planned_hour: v })} />
          <HourSelect id="meals" label="Repas non notés dans la journée" value={data.meals_hour} onChange={(v) => save({ meals_hour: v })} />
          <SelectField id="inactive" label="Pas de séance depuis… (rappel à 18 h)" value={data.inactivity_days == null ? '' : String(data.inactivity_days)} onChange={(e) => save({ inactivity_days: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Désactivé</option>
            {[2, 3, 4, 5, 7].map((d) => (
              <option key={d} value={d}>
                {d} jours
              </option>
            ))}
          </SelectField>
          <p className="text-xs text-muted-foreground">Heures de Paris. Un rappel n’est envoyé que s’il est utile (par exemple, pas de rappel de pesée si votre poids du jour est déjà noté) et au plus une fois par jour.</p>
        </section>
      )}
    </div>
  )
}

function HourSelect({ id, label, value, onChange }: { id: string; label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <SelectField id={id} label={label} value={value == null ? '' : String(value)} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">Désactivé</option>
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {h} h
        </option>
      ))}
    </SelectField>
  )
}
