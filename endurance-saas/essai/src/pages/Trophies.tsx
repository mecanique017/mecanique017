import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flame, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { localDate } from '@/lib/training/load'
import { sportInfo } from '@/lib/sports'
import { computeBadges, monthStats, streaks, type Badge, type BadgeActivity } from '@/lib/badges'
import { ShareCanvas } from '../components/ShareCanvas'
import { renderBadgeImage, renderRecapImage } from '../lib/trophy-image'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'

const longDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const nf = (n: number) => Math.round(n).toLocaleString('fr-FR')
const hours = (s: number) => `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')}`

export async function loadAllActivities(userId: string) {
  const [acts, profile] = await Promise.all([
    supabase.from('activities').select('id, title, sport_type, start_time, duration_seconds, distance_meters, elevation_gain_meters').eq('user_id', userId).order('start_time').limit(5000),
    supabase.from('profiles').select('full_name').eq('id', userId).single(),
  ])
  if (acts.error) throw acts.error
  const list = (acts.data ?? []).map((a) => ({ ...a, distance_meters: a.distance_meters != null ? Number(a.distance_meters) : null, elevation_gain_meters: a.elevation_gain_meters != null ? Number(a.elevation_gain_meters) : null }))
  return { activities: list as (BadgeActivity & { title: string })[], name: profile.data?.full_name ?? null }
}

/** Petit encart pour l'accueil : série en cours et dernier badge. */
export function StreakChip({ activities }: { activities: BadgeActivity[] }) {
  const today = localDate(new Date())
  const s = streaks(activities, today)
  const last = computeBadges(activities)
    .filter((b) => b.earnedAt)
    .sort((a, b) => b.earnedAt!.localeCompare(a.earnedAt!))[0]
  return (
    <Link to="/dashboard/trophies" className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-accent">
      <Flame className={cn('size-6 shrink-0', s.currentWeeks ? 'text-orange-500' : 'text-muted-foreground')} aria-hidden />
      <span className="min-w-0 flex-1 text-sm">
        <strong>
          {s.currentDays > 1 ? `${s.currentDays} jours d’affilée` : s.currentWeeks ? `${s.currentWeeks} semaine${s.currentWeeks > 1 ? 's' : ''} d’affilée` : 'Lancez une série cette semaine'}
        </strong>
        <span className="block truncate text-xs text-muted-foreground">{last ? `Dernier badge : ${last.icon} ${last.title}` : 'Trophées, séries et bilan du mois'}</span>
      </span>
    </Link>
  )
}

export function TrophiesPage() {
  const user = useUser()
  const { data, error } = useData(() => loadAllActivities(user.id), [user.id])
  const [sharing, setSharing] = useState<Badge | null>(null)
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return <p className="text-sm text-muted-foreground">Chargement…</p>
  const today = localDate(new Date())
  const s = streaks(data.activities, today)
  const badges = computeBadges(data.activities)
  const earned = badges.filter((b) => b.earnedAt).sort((a, b) => b.earnedAt!.localeCompare(a.earnedAt!))
  const next = badges.filter((b) => !b.earnedAt).sort((a, b) => b.progress - a.progress)
  const month = today.slice(0, 7)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Trophées</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Jours d’affilée" value={String(s.currentDays)} hint={`record ${s.bestDays}`} hot={s.currentDays >= 3} />
        <Stat label="Semaines d’affilée" value={String(s.currentWeeks)} hint={`record ${s.bestWeeks}`} hot={s.currentWeeks >= 4} />
        <Stat label={`Jours actifs ${today.slice(0, 4)}`} value={String(s.activeDaysThisYear)} />
        <Stat label="Badges" value={`${earned.length} / ${badges.length}`} />
      </div>
      <Link to={`/dashboard/recap?m=${month}`} className="flex items-center justify-between rounded-xl border border-primary/50 bg-primary/10 p-4 text-sm">
        <span>
          <strong>Bilan du mois</strong>
          <span className="block text-xs text-muted-foreground">Statistiques, calendrier, image à partager</span>
        </span>
        <ChevronRight className="size-5" />
      </Link>

      {earned.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Obtenus</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {earned.map((b) => (
              <li key={b.key} className="rounded-xl border bg-card p-3">
                <div className="flex items-start gap-2">
                  <span className="text-3xl" aria-hidden>
                    {b.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{longDate.format(new Date(b.earnedAt!))}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-1">
                  {b.activityId && (
                    <Link to={`/dashboard/activities/${b.activityId}`} className="text-xs underline underline-offset-2">
                      Voir la séance
                    </Link>
                  )}
                  <button className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent" onClick={() => setSharing(b)} aria-label={`Partager le badge ${b.title}`}>
                    <Share2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">À décrocher</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {next.map((b) => (
            <li key={b.key} className="rounded-xl border bg-card p-3 opacity-80">
              <div className="flex items-start gap-2">
                <span className="text-3xl grayscale" aria-hidden>
                  {b.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </div>
              </div>
              {b.progressLabel && (
                <>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/40">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${b.progress * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{b.progressLabel}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {sharing && (
        <ShareCanvas
          title="Partager le badge"
          fileName={`kronofit-badge-${sharing.key}.png`}
          onClose={() => setSharing(null)}
          draw={(c, mark) => renderBadgeImage(c, { icon: sharing.icon, title: sharing.title, description: sharing.description, date: longDate.format(new Date(sharing.earnedAt!)), name: data.name }, mark)}
        />
      )}
    </div>
  )
}

function Stat({ label, value, hint, hot }: { label: string; value: string; hint?: string; hot?: boolean }) {
  return (
    <div className={cn('rounded-xl border bg-card p-3', hot && 'border-orange-500/60')}>
      <p className="text-2xl font-bold tabular-nums">
        {value}
        {hot && ' 🔥'}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

const shiftMonth = (m: string, n: number) => {
  const d = new Date(`${m}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n)
  return d.toISOString().slice(0, 7)
}

export function RecapPage() {
  const user = useUser()
  const [params, setParams] = useSearchParams()
  const today = localDate(new Date())
  const month = /^\d{4}-\d{2}$/.test(params.get('m') ?? '') ? params.get('m')! : today.slice(0, 7)
  const { data, error } = useData(() => loadAllActivities(user.id), [user.id])
  const [sharing, setSharing] = useState(false)
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return <p className="text-sm text-muted-foreground">Chargement…</p>

  const m = monthStats(data.activities, month)
  const prev = monthStats(data.activities, shiftMonth(month, -1))
  const label = monthFmt.format(new Date(`${month}-01T00:00:00Z`))
  const badgesOfMonth = computeBadges(data.activities).filter((b) => b.earnedAt && localDate(b.earnedAt).startsWith(month))
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
  const firstWeekday = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7
  const days = Array.from({ length: daysInMonth }, (_, i) => m.days.has(`${month}-${String(i + 1).padStart(2, '0')}`))
  const delta = (a: number, b: number) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)} %` : null)
  const stats = [
    { label: 'Séances', value: nf(m.sessions), cmp: delta(m.sessions, prev.sessions) },
    { label: 'Distance', value: `${nf(m.km)} km`, cmp: delta(m.km, prev.km) },
    { label: 'Temps', value: hours(m.seconds), cmp: delta(m.seconds, prev.seconds) },
    { label: 'Dénivelé', value: `${nf(m.dplus)} m`, cmp: delta(m.dplus, prev.dplus) },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold first-letter:uppercase">{label}</h1>
        <button className="rounded-full p-2 hover:bg-accent" onClick={() => setParams({ m: shiftMonth(month, -1) })} aria-label="Mois précédent">
          <ChevronLeft className="size-5" />
        </button>
        <button className="rounded-full p-2 hover:bg-accent disabled:opacity-30" disabled={month >= today.slice(0, 7)} onClick={() => setParams({ m: shiftMonth(month, 1) })} aria-label="Mois suivant">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            {s.cmp && <p className="text-[11px] text-muted-foreground">{s.cmp} vs mois précédent</p>}
          </div>
        ))}
      </div>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">
          {m.activeDays} jour{m.activeDays > 1 ? 's' : ''} actif{m.activeDays > 1 ? 's' : ''}
        </h2>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={i} className="text-muted-foreground">
              {d}
            </span>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {days.map((on, i) => (
            <span key={i} className={cn('flex aspect-square items-center justify-center rounded-md', on ? 'bg-primary font-semibold text-primary-foreground' : 'bg-muted/30 text-muted-foreground')}>
              {i + 1}
            </span>
          ))}
        </div>
      </section>
      {m.bySport.length > 0 && (
        <section className="space-y-2 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Par sport</h2>
          {m.bySport.map((s) => (
            <p key={s.sport} className="flex justify-between text-sm">
              <span>{sportInfo(s.sport).label}</span>
              <span className="tabular-nums text-muted-foreground">
                {s.sessions} séance{s.sessions > 1 ? 's' : ''} · {s.km >= 1 ? `${nf(s.km)} km · ` : ''}
                {hours(s.seconds)}
              </span>
            </p>
          ))}
          {m.longest && <p className="pt-1 text-xs text-muted-foreground">Plus longue séance : {data.activities.find((a) => a.id === m.longest!.id)?.title ?? sportInfo(m.longest.sport_type).label} ({hours(m.longest.duration_seconds)}) · meilleure semaine : {nf(m.bestWeekKm)} km</p>}
        </section>
      )}
      {badgesOfMonth.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 font-semibold">Badges du mois</h2>
          <p className="text-sm">{badgesOfMonth.map((b) => `${b.icon} ${b.title}`).join(' · ')}</p>
        </section>
      )}
      <Button className="w-full" size="lg" onClick={() => setSharing(true)} disabled={!m.sessions}>
        <Share2 className="size-4" /> Partager mon mois
      </Button>
      {sharing && (
        <ShareCanvas
          title="Partager mon mois"
          fileName={`kronofit-bilan-${month}.png`}
          onClose={() => setSharing(false)}
          draw={(c, mark) =>
            renderRecapImage(
              c,
              {
                monthLabel: label.charAt(0).toUpperCase() + label.slice(1),
                name: data.name,
                stats: stats.map(({ label, value }) => ({ label, value })),
                sports: m.bySport.map((s) => ({ label: sportInfo(s.sport).short, value: s.km >= 1 ? `${nf(s.km)} km` : hours(s.seconds) })),
                days,
                firstWeekday,
                badges: badgesOfMonth.map((b) => b.icon),
              },
              mark,
            )
          }
        />
      )}
    </div>
  )
}
