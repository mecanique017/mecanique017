import Link from 'next/link'
import { Bike, Footprints, Waves } from 'lucide-react'
import type { SportType } from '@/types/database'

export const SPORT_LABELS: Record<SportType, { label: string; icon: typeof Bike }> = {
  run: { label: 'Course', icon: Footprints },
  ride: { label: 'Vélo', icon: Bike },
  swim: { label: 'Natation', icon: Waves },
}

export function formatDuration(seconds: number) {
  // Arrondi à la minute AVANT découpage (sinon 3598 s donnerait « 0 h 60 »)
  const total = Math.round(seconds / 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })

interface ActivityRow {
  id: string
  title: string
  sport_type: SportType
  start_time: string
  duration_seconds: number
  distance_meters: number
  tss: number
}

export function ActivityList({ activities }: { activities: ActivityRow[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune séance enregistrée.</p>
  }
  return (
    <ul className="divide-y">
      {activities.map((a) => {
        const sport = SPORT_LABELS[a.sport_type]
        const Icon = sport.icon
        const km = Number(a.distance_meters) / 1000
        return (
          <li key={a.id}>
            <Link href={`/dashboard/activities/${a.id}`} className="flex items-center gap-3 py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded-md">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-label={sport.label} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {dateFormat.format(new Date(a.start_time))} · {formatDuration(a.duration_seconds)}
                  {km > 0 && ` · ${km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`}
                </p>
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">{Math.round(Number(a.tss))} TSS</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
