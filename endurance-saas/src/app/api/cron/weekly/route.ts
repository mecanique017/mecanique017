import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedCron, userEmail } from '@/lib/cron'
import { getTrainingLoad, localDate } from '@/lib/training/load'
import { addDays, mondayOf } from '@/lib/dates'
import { sendEmail } from '@/lib/email/send'
import { weeklyEmail } from '@/lib/email/templates'
import { unsubscribeUrl } from '@/lib/email/unsubscribe'

export const maxDuration = 300

/** GET /api/cron/weekly (Vercel Cron, le lundi matin) : bilan de la semaine passée + programme de la semaine. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  const monday = mondayOf(localDate(new Date()))
  const lastMonday = addDays(monday, -7)
  const report = { checked: 0, sent: 0, failed: 0 }

  const { data: profiles } = await admin.from('profiles').select('id, full_name').eq('notify_weekly', true)
  for (const profile of profiles ?? []) {
    report.checked++
    try {
      const [series, { data: activities }, { data: planned }, to] = await Promise.all([
        getTrainingLoad(admin, profile.id),
        admin
          .from('activities')
          .select('duration_seconds, tss, start_time')
          .eq('user_id', profile.id)
          .gte('start_time', `${addDays(lastMonday, -1)}T00:00:00Z`)
          .lt('start_time', `${addDays(monday, 1)}T00:00:00Z`),
        admin
          .from('planned_workouts')
          .select('scheduled_date, title, target_duration_seconds, target_tss')
          .eq('user_id', profile.id)
          .gte('scheduled_date', monday)
          .lte('scheduled_date', addDays(monday, 6))
          .order('scheduled_date', { ascending: true }),
        userEmail(admin, profile.id),
      ])
      if (!to) continue

      // Semaine passée en heure locale (lundi → dimanche)
      const lastWeek = (activities ?? []).filter((a) => {
        const day = localDate(a.start_time)
        return day >= lastMonday && day < monday
      })
      const today = series.at(-1) ?? { ctl: 0, tsb: 0 }
      const weekAgo = series.at(-8) ?? today
      const email = weeklyEmail(
        {
          name: profile.full_name,
          lastWeek: {
            sessions: lastWeek.length,
            seconds: lastWeek.reduce((s, a) => s + a.duration_seconds, 0),
            tss: lastWeek.reduce((s, a) => s + Number(a.tss), 0),
          },
          ctl: today.ctl,
          ctlChange: today.ctl - weekAgo.ctl,
          tsb: today.tsb,
          planned: (planned ?? []).map((p) => ({ date: p.scheduled_date, title: p.title, target_duration_seconds: p.target_duration_seconds, target_tss: p.target_tss })),
        },
        siteUrl,
        unsubscribeUrl(profile.id, 'weekly')
      )
      if (await sendEmail({ to, ...email, unsubscribeUrl: unsubscribeUrl(profile.id, 'weekly') })) report.sent++
    } catch (error) {
      report.failed++
      console.error('Cron hebdo', profile.id, error)
    }
  }
  return NextResponse.json(report)
}
