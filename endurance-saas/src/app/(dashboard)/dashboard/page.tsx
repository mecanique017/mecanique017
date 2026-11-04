import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, CalendarDays, CheckCircle2, FileDown, HeartPulse, Plus, Sparkles, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTrainingLoad, localDate } from '@/lib/training/load'
import { getWellnessContext } from '@/lib/training/wellness'
import { getCoachUsage } from '@/lib/coach-quota'
import { getPlan } from '@/lib/plans'
import { Button } from '@/components/ui/button'
import { KpiTiles } from '@/components/dashboard/kpi-tiles'
import { LoadChart } from '@/components/dashboard/load-chart'
import { ActivityList } from '@/components/dashboard/activity-list'

export const metadata: Metadata = { title: 'Tableau de bord — Endurance SaaS' }

const CHART_DAYS = 90

export default function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">Votre charge d’entraînement sur les 90 derniers jours.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/activities/import">
              <Upload className="h-4 w-4" /> Importer .fit
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/activities/new">
              <Plus className="h-4 w-4" /> Nouvelle séance
            </Link>
          </Button>
        </div>
      </div>

      {/* Tout ce qui lit la session (cookies) ou l'URL est rendu à la requête, derrière Suspense */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function DashboardContent({ searchParams }: { searchParams: PageProps<'/dashboard'>['searchParams'] }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = localDate(new Date())
  const [{ subscription }, series, { data: profile }, { data: activities }, { data: todayPlanned }, wellness] = await Promise.all([
    searchParams,
    getTrainingLoad(supabase, user.id),
    supabase.from('profiles').select('full_name, subscription_tier').eq('id', user.id).single(),
    supabase
      .from('activities')
      .select('id, title, sport_type, start_time, duration_seconds, distance_meters, tss')
      .order('start_time', { ascending: false })
      .limit(8),
    supabase.from('planned_workouts').select('id, title, is_completed').eq('scheduled_date', today),
    getWellnessContext(supabase, user.id, today),
  ])
  const tier = profile?.subscription_tier ?? 'free'
  const usage = await getCoachUsage(supabase, user.id, tier)

  return (
    <div className="space-y-6">
      {subscription === 'success' && (
        <Banner icon={CheckCircle2} tone="good">
          Paiement confirmé. Votre offre sera active dans quelques secondes.
        </Banner>
      )}
      {subscription === 'cancelled' && <Banner icon={AlertTriangle}>Paiement annulé : aucun montant n’a été débité.</Banner>}

      <KpiTiles series={series} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-4 md:p-6">
          {activities && activities.length > 0 ? (
            <LoadChart data={series.slice(-CHART_DAYS)} />
          ) : (
            <EmptyState />
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-semibold">Aujourd’hui</h2>
            <div className="flex items-start gap-2 text-sm">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              {todayPlanned && todayPlanned.length > 0 ? (
                <ul className="space-y-0.5">
                  {todayPlanned.map((p) => (
                    <li key={p.id} className={p.is_completed ? 'line-through text-muted-foreground' : ''}>
                      {p.title}
                      {p.is_completed && <span className="sr-only"> (réalisée)</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <Link href="/dashboard/calendar" className="text-muted-foreground hover:text-foreground">
                  Rien au programme · planifier
                </Link>
              )}
            </div>
            <div className="flex items-start gap-2 text-sm">
              <HeartPulse className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              {wellness.today ? (
                <p>
                  VFC {wellness.today.hrv ?? '—'} ms
                  {wellness.hrvBaseline && wellness.today.hrv && (
                    <span className="text-muted-foreground"> (réf. {wellness.hrvBaseline})</span>
                  )}
                  {' · '}sommeil {wellness.today.sleep_score ?? '—'} · fatigue {wellness.today.perceived_fatigue ?? '—'}/10
                </p>
              ) : (
                <Link href="/dashboard/wellness" className="font-medium underline underline-offset-4">
                  Renseigner mon bien-être du matin
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-emerald-500" aria-hidden /> Coach IA
            </div>
            <p className="text-sm text-muted-foreground">
              Offre {getPlan(tier).name} :{' '}
              {usage.limit === null
                ? `${usage.used} analyse(s) ce mois-ci, illimité`
                : `${usage.used} / ${usage.limit} analyses ce mois-ci`}
            </p>
            {usage.remaining === 0 && (
              <Link href="/pricing" className="text-sm font-medium underline underline-offset-4">
                Passer à l’offre supérieure
              </Link>
            )}
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-2">
            <h2 className="font-semibold">Bilans mensuels (PDF)</h2>
            <div className="flex flex-wrap gap-2">
              {[0, 1].map((back) => {
                const d = new Date(`${today.slice(0, 7)}-15T12:00:00Z`)
                d.setUTCMonth(d.getUTCMonth() - back)
                const month = d.toISOString().slice(0, 7)
                const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
                return (
                  <Button key={month} variant="outline" size="sm" asChild>
                    <a href={`/api/reports/monthly?month=${month}`}>
                      <FileDown className="h-4 w-4" /> {label}
                    </a>
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold mb-3">Dernières séances</h2>
            <ActivityList activities={activities ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Banner({ icon: Icon, tone, children }: { icon: typeof CheckCircle2; tone?: 'good'; children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
      <Icon className="size-4 shrink-0" style={{ color: tone === 'good' ? 'var(--status-good)' : 'var(--muted-foreground)' }} aria-hidden />
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-60 flex-col items-center justify-center gap-3 text-center">
      <p className="font-semibold">Aucune séance pour l’instant</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ajoutez vos séances : la forme (CTL), la fatigue (ATL) et la fraîcheur (TSB) se calculent automatiquement.
      </p>
      <Button asChild size="sm">
        <Link href="/dashboard/activities/new">
          <Plus className="h-4 w-4" /> Ajouter ma première séance
        </Link>
      </Button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-xl border bg-card animate-pulse" />
        ))}
      </div>
      <div className="h-96 rounded-xl border bg-card animate-pulse" />
    </div>
  )
}
