import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ChevronRight, UserX } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCoachedAthletes, getMyCoaches } from '@/lib/coach'
import { getPlan } from '@/lib/plans'
import { formState, getTrainingLoad, localDate } from '@/lib/training/load'
import { getWellnessContext } from '@/lib/training/wellness'
import { fatigueReasons } from '@/lib/training/fatigue'
import { Button } from '@/components/ui/button'
import { cancelInvitation, endRelation } from './actions'
import { InviteForm } from './invite-form'

export const metadata: Metadata = { title: 'Coach — Endurance SaaS' }

const FORM_LABELS = { fresh: 'Frais', neutral: 'Équilibré', productive: 'Charge productive', overreaching: 'Surmenage possible' } as const
const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

export default function CoachPage({ searchParams }: PageProps<'/dashboard/coach'>) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Coach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Partagez votre entraînement avec un coach, ou suivez vos athlètes. Le partage se fait sur invitation, et chacun peut y mettre fin à tout moment.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <CoachContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function CoachContent({ searchParams }: { searchParams: PageProps<'/dashboard/coach'>['searchParams'] }) {
  const { invitation } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, coaches, athletes, { data: pending }] = await Promise.all([
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
    getMyCoaches(supabase),
    getCoachedAthletes(supabase),
    supabase.from('coach_athletes').select('id, invited_email, expires_at').eq('coach_id', user.id).eq('status', 'pending').order('created_at'),
  ])
  const limit = getPlan(profile?.subscription_tier ?? 'free').maxCoachedAthletes
  const today = localDate(new Date())

  // Synthèse par athlète (lecture autorisée par la RLS « coach »)
  const rows = await Promise.all(
    athletes.map(async (a) => {
      const [series, wellness, { data: last }] = await Promise.all([
        getTrainingLoad(supabase, a.athlete_id),
        getWellnessContext(supabase, a.athlete_id, today),
        supabase.from('activities').select('start_time').eq('user_id', a.athlete_id).order('start_time', { ascending: false }).limit(1).maybeSingle(),
      ])
      const load = series.at(-1) ?? { ctl: 0, atl: 0, tsb: 0 }
      const alerts = fatigueReasons({
        tsb: load.tsb,
        hrv: wellness.today?.hrv ?? null,
        hrvBaseline: wellness.hrvBaseline,
        perceivedFatigue: wellness.today?.perceived_fatigue ?? null,
      })
      return { ...a, load, alerts, lastActivity: last?.start_time ?? null }
    })
  )

  return (
    <div className="space-y-6">
      {invitation === 'accepted' && (
        <p role="status" className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
          <CheckCircle2 className="size-4" style={{ color: 'var(--status-good)' }} aria-hidden /> Invitation acceptée : votre coach peut maintenant suivre votre entraînement.
        </p>
      )}
      {invitation === 'declined' && <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm">Invitation refusée.</p>}

      {/* Côté coach */}
      <section className="rounded-xl border bg-card p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Mes athlètes</h2>
          {limit > 0 && <p className="text-sm text-muted-foreground">{athletes.length} / {limit}</p>}
        </div>

        {limit === 0 ? (
          <p className="text-sm text-muted-foreground">
            L’espace coach (jusqu’à 20 athlètes) est inclus dans l’offre{' '}
            <Link href="/pricing" className="underline underline-offset-4">
              Premium
            </Link>
            .
          </p>
        ) : (
          <>
            <InviteForm />
            {pending && pending.length > 0 && (
              <ul className="space-y-1 text-sm">
                {pending.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                    <span className="min-w-0 truncate">
                      {p.invited_email} <span className="text-muted-foreground">· en attente jusqu’au {shortDate.format(new Date(p.expires_at))}</span>
                    </span>
                    <form action={cancelInvitation}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Annuler
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun athlète pour l’instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground">
                    <tr className="border-b text-right">
                      <th className="py-2 text-left font-medium">Athlète</th>
                      <th className="py-2 font-medium">CTL</th>
                      <th className="py-2 font-medium">ATL</th>
                      <th className="py-2 font-medium">TSB</th>
                      <th className="py-2 pl-3 text-left font-medium">État</th>
                      <th className="py-2 pl-3 text-left font-medium">Dernière séance</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.relation_id} className="border-b last:border-0 text-right tabular-nums">
                        <td className="py-2 text-left font-medium">
                          <Link href={`/dashboard/coach/${r.athlete_id}`} className="hover:underline">
                            {r.full_name ?? 'Athlète'}
                          </Link>
                        </td>
                        <td>{fmt(r.load.ctl)}</td>
                        <td>{fmt(r.load.atl)}</td>
                        <td>{fmt(r.load.tsb)}</td>
                        <td className="pl-3 text-left">
                          {r.alerts.length > 0 ? (
                            <span className="flex items-center gap-1.5" title={r.alerts.join(' · ')}>
                              <AlertTriangle className="size-4 shrink-0" style={{ color: 'var(--status-critical)' }} aria-hidden /> À surveiller
                            </span>
                          ) : (
                            FORM_LABELS[formState(r.load.tsb)]
                          )}
                        </td>
                        <td className="pl-3 text-left text-muted-foreground">{r.lastActivity ? shortDate.format(new Date(r.lastActivity)) : '—'}</td>
                        <td className="pl-2">
                          <Link href={`/dashboard/coach/${r.athlete_id}`} aria-label={`Voir ${r.full_name ?? 'l’athlète'}`} className="inline-flex text-muted-foreground hover:text-foreground">
                            <ChevronRight className="size-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* Côté athlète */}
      <section className="rounded-xl border bg-card p-4 md:p-6 space-y-3">
        <h2 className="text-lg font-semibold">Mes coachs</h2>
        {coaches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Personne ne suit votre entraînement. Pour partager vos données, demandez à votre coach de vous inviter depuis son espace coach.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Ils voient vos séances (y compris celles synchronisées depuis Polar), votre bien-être, vos analyses et votre programme, et peuvent vous programmer des séances. Ils ne voient ni votre abonnement ni votre facturation.
            </p>
            <ul className="space-y-2">
              {coaches.map((c) => (
                <li key={c.relation_id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span>
                    {c.full_name ?? 'Coach'} <span className="text-muted-foreground">· depuis le {shortDate.format(new Date(c.accepted_at))}</span>
                  </span>
                  <form action={endRelation}>
                    <input type="hidden" name="id" value={c.relation_id} />
                    <Button type="submit" variant="outline" size="sm">
                      <UserX className="h-4 w-4" /> Arrêter le partage
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
