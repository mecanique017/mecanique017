import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedCron, userEmail } from '@/lib/cron'
import { syncPolarUser } from '@/lib/polar/sync'
import { polarConfigured } from '@/lib/polar/client'
import { getTrainingLoad, localDate } from '@/lib/training/load'
import { getWellnessContext } from '@/lib/training/wellness'
import { fatigueReasons } from '@/lib/training/fatigue'
import { sendEmail } from '@/lib/email/send'
import { fatigueEmail } from '@/lib/email/templates'
import { unsubscribeUrl } from '@/lib/email/unsubscribe'

export const maxDuration = 300

/** Pas plus d'une alerte fatigue tous les 3 jours par utilisateur. */
const ALERT_COOLDOWN_MS = 3 * 86_400_000

/**
 * GET /api/cron/daily (Vercel Cron, chaque matin) :
 * 1. synchronisation Polar de tous les comptes connectés ;
 * 2. alertes fatigue pour les utilisateurs qui les ont activées.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  const report = { polar: { synced: 0, failed: 0, imported: 0 }, fatigue: { checked: 0, sent: 0 } }

  // 1. Polar (séquentiel : respecte les limites de débit ; une erreur n'arrête pas les autres comptes)
  if (polarConfigured()) {
    const { data: connections } = await admin.from('polar_connections').select('user_id')
    for (const { user_id } of connections ?? []) {
      try {
        const r = await syncPolarUser(user_id)
        report.polar.synced++
        report.polar.imported += r.imported
      } catch (error) {
        report.polar.failed++
        console.error('Cron Polar', user_id, error)
      }
    }
  }

  // 2. Alertes fatigue (après la synchronisation : VFC nocturne et séances de la veille à jour)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  const today = localDate(new Date())
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, last_fatigue_alert_at')
    .eq('notify_fatigue', true)

  for (const profile of profiles ?? []) {
    if (profile.last_fatigue_alert_at && Date.now() - Date.parse(profile.last_fatigue_alert_at) < ALERT_COOLDOWN_MS) continue
    report.fatigue.checked++
    try {
      const [series, wellness] = await Promise.all([
        getTrainingLoad(admin, profile.id),
        getWellnessContext(admin, profile.id, today),
      ])
      const tsb = series.at(-1)?.tsb ?? 0
      const reasons = fatigueReasons({
        tsb,
        hrv: wellness.today?.hrv ?? null,
        hrvBaseline: wellness.hrvBaseline,
        perceivedFatigue: wellness.today?.perceived_fatigue ?? null,
      })
      if (reasons.length === 0) continue

      const to = await userEmail(admin, profile.id)
      if (!to) continue
      const email = fatigueEmail(
        { name: profile.full_name, tsb, hrv: wellness.today?.hrv ?? null, hrvBaseline: wellness.hrvBaseline, reasons },
        siteUrl,
        unsubscribeUrl(profile.id, 'fatigue')
      )
      if (await sendEmail({ to, ...email, unsubscribeUrl: unsubscribeUrl(profile.id, 'fatigue') })) {
        report.fatigue.sent++
        await admin.from('profiles').update({ last_fatigue_alert_at: new Date().toISOString() }).eq('id', profile.id)
      }
    } catch (error) {
      console.error('Cron fatigue', profile.id, error)
    }
  }

  return NextResponse.json(report)
}
