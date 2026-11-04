import { Link } from 'react-router-dom'
import { loadSession } from '@/lib/live/recorder'
import { sportInfo } from '@/lib/sports'
import { CalendarDays, Circle, HeartPulse, Plus, Sparkles, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KpiTiles } from '@/components/dashboard/kpi-tiles'
import { LoadChart } from '@/components/dashboard/load-chart'
import { ActivityList } from '@/components/dashboard/activity-list'
import { getTrainingLoad, localDate } from '@/lib/training/load'
import { getWellness, getWellnessContext } from '@/lib/training/wellness'
import { addDays } from '@/lib/dates'
import { ReadinessCard } from '../components/ReadinessCard'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

const longDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' })

export function DashboardPage() {
  const user = useUser()
  const { data, error } = useData(async () => {
    const today = localDate(new Date())
    const [series, profile, activities, planned, wellness, history] = await Promise.all([
      getTrainingLoad(supabase, user.id),
      supabase.from('profiles').select('full_name, subscription_tier, subscription_status, trial_ends_at').eq('id', user.id).single(),
      supabase.from('activities').select('id, title, sport_type, start_time, duration_seconds, distance_meters, tss').eq('user_id', user.id).order('start_time', { ascending: false }).limit(8),
      supabase.from('planned_workouts').select('id, title, is_completed').eq('user_id', user.id).eq('scheduled_date', today),
      getWellnessContext(supabase, user.id, today),
      getWellness(supabase, user.id, addDays(today, -29), today),
    ])
    return { today, series, profile: profile.data, activities: activities.data ?? [], planned: planned.data ?? [], wellness, history }
  }, [user.id])

  const live = loadSession()
  return (
    <div className="space-y-6">
      {live && (
        <Link to="/dashboard/record" className="flex items-center gap-3 rounded-xl border border-primary/50 bg-primary/10 p-4">
          <Circle className="size-4 shrink-0 fill-current text-primary" aria-hidden />
          <span className="flex-1 text-sm">
            <strong>Séance de {sportInfo(live.sport).label.toLowerCase()} en cours</strong>
            <span className="block text-muted-foreground">Touchez pour la reprendre, la terminer ou la supprimer.</span>
          </span>
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">Votre charge d’entraînement sur les 90 derniers jours.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-red-600 text-white hover:bg-red-600/90">
            <Link to="/dashboard/record">
              <Circle className="h-4 w-4 fill-current" /> Enregistrer
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/activities/import">
              <Upload className="h-4 w-4" /> Importer
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/activities/new">
              <Plus className="h-4 w-4" /> Saisir
            </Link>
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!data ? (
        <div className="h-96 rounded-xl border bg-card animate-pulse" aria-hidden />
      ) : (
        <>
          {data.profile?.subscription_status === 'trialing' && data.profile.trial_ends_at && (
            <p role="status" className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
              <Sparkles className="size-4 shrink-0" style={{ color: 'var(--brand)' }} aria-hidden />
              <span>Essai Premium jusqu’au {longDate.format(new Date(data.profile.trial_ends_at))}.</span>
            </p>
          )}
          <ReadinessCard series={data.series} wellness={data.history} today={data.today} />
          <nav className="grid grid-cols-2 gap-3" aria-label="Analyses">
            <Link to="/dashboard/performance" className="rounded-xl border bg-card p-4 hover:bg-accent">
              <p className="font-semibold">Records & prédictions</p>
              <p className="text-xs text-muted-foreground">Meilleurs efforts, temps prévus, zones</p>
            </Link>
            <Link to="/dashboard/stats" className="rounded-xl border bg-card p-4 hover:bg-accent">
              <p className="font-semibold">Statistiques</p>
              <p className="text-xs text-muted-foreground">Bilan annuel, carte de mes passages</p>
            </Link>
          </nav>
          <KpiTiles series={data.series} />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border bg-card p-4 md:p-6">
              {data.activities.length > 0 ? (
                <LoadChart data={data.series.slice(-90)} />
              ) : (
                <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
                  <p className="font-semibold">Aucune séance pour l’instant</p>
                  <p className="max-w-sm text-sm text-muted-foreground">Ajoutez une séance, importez un fichier, ou chargez les données de démonstration depuis le Profil.</p>
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <h2 className="font-semibold">Aujourd’hui</h2>
                <div className="flex items-start gap-2 text-sm">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {data.planned.length ? (
                    <ul>
                      {data.planned.map((p) => (
                        <li key={p.id} className={p.is_completed ? 'line-through text-muted-foreground' : ''}>
                          {p.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Link to="/dashboard/calendar" className="text-muted-foreground">
                      Rien au programme · planifier
                    </Link>
                  )}
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <HeartPulse className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {data.wellness.today ? (
                    <p>
                      VFC {data.wellness.today.hrv ?? '—'} ms
                      {data.wellness.hrvBaseline && <span className="text-muted-foreground"> (réf. {data.wellness.hrvBaseline})</span>} · sommeil{' '}
                      {data.wellness.today.sleep_score ?? '—'} · fatigue {data.wellness.today.perceived_fatigue ?? '—'}/10
                    </p>
                  ) : (
                    <Link to="/dashboard/wellness" className="font-medium underline underline-offset-4">
                      Renseigner mon bien-être du matin
                    </Link>
                  )}
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <h2 className="font-semibold mb-3">Dernières séances</h2>
                <ActivityList activities={data.activities} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
