import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { formatDuration, SPORT_LABELS } from '@/components/dashboard/activity-list'
import { localDate } from '@/lib/training/load'
import { addDays, formatDayMonth, formatShortDay, isDay, mondayOf, weekDays } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { SportType } from '@/types/database'
import { supabase } from '../supabase'
import { useData, useUser } from '../session'
import { SportOptions } from '@/components/ui/sport-options'

export function CalendarPage() {
  const user = useUser()
  const [params] = useSearchParams()
  const today = localDate(new Date())
  const week = params.get('week')
  const monday = mondayOf(isDay(week) ? week : today)
  const days = weekDays(monday)
  const { data, reload } = useData(async () => {
    const [planned, activities] = await Promise.all([
      supabase.from('planned_workouts').select('*').eq('user_id', user.id).gte('scheduled_date', monday).lte('scheduled_date', days[6]).order('created_at'),
      supabase
        .from('activities')
        .select('id, title, sport_type, start_time, duration_seconds, tss')
        .eq('user_id', user.id)
        .gte('start_time', `${addDays(monday, -1)}T00:00:00Z`)
        .lte('start_time', `${addDays(days[6], 1)}T23:59:59Z`),
    ])
    return { planned: planned.data ?? [], activities: (activities.data ?? []).filter((a) => days.includes(localDate(a.start_time))) }
  }, [user.id, monday])

  const toggle = async (id: string, done: boolean) => {
    await supabase.from('planned_workouts').update(done ? { is_completed: true } : { is_completed: false, activity_id: null }).eq('id', id)
    reload()
  }
  const remove = async (id: string) => {
    await supabase.from('planned_workouts').delete().eq('id', id)
    reload()
  }

  const linked = new Set((data?.planned ?? []).map((p) => p.activity_id).filter(Boolean))
  const plannedTss = (data?.planned ?? []).reduce((s, p) => s + (p.target_tss ?? 0), 0)
  const doneTss = (data?.activities ?? []).reduce((s, a) => s + Number(a.tss), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Calendrier</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to={`/dashboard/calendar?week=${addDays(monday, -7)}`} aria-label="Semaine précédente">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <p className="text-center font-semibold">
            {formatDayMonth(monday)} – {formatDayMonth(days[6])}
          </p>
          <Button variant="outline" size="icon" asChild>
            <Link to={`/dashboard/calendar?week=${addDays(monday, 7)}`} aria-label="Semaine suivante">
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">TSS réalisé / prévu </span>
          <strong className="tabular-nums">
            {Math.round(doneTss)} / {plannedTss}
          </strong>
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const planned = (data?.planned ?? []).filter((p) => p.scheduled_date === day)
          const done = (data?.activities ?? []).filter((a) => localDate(a.start_time) === day && !linked.has(a.id))
          return (
            <li key={day} className={cn('md:min-h-32 rounded-xl border bg-card p-3 space-y-2', day === today && 'border-primary')}>
              <p className={cn('text-sm first-letter:uppercase', day === today ? 'font-semibold' : 'text-muted-foreground')}>
                {formatShortDay(day)}
                {day === today && ' · aujourd’hui'}
              </p>
              {planned.map((p) => {
                const Icon = SPORT_LABELS[p.sport_type].icon
                return (
                  <div key={p.id} className={cn('rounded-lg border p-2 text-sm space-y-1', p.is_completed && 'opacity-70')}>
                    <p className="flex items-start gap-1.5 font-medium">
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className={cn('min-w-0 break-words', p.is_completed && 'line-through')}>{p.title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[p.target_duration_seconds && formatDuration(p.target_duration_seconds), p.target_tss != null && `${p.target_tss} TSS`].filter(Boolean).join(' · ') || 'Prévue'}
                    </p>
                    {p.activity_id && (
                      <Link to={`/dashboard/activities/${p.activity_id}`} className="block text-xs underline underline-offset-4">
                        Voir la séance réalisée
                      </Link>
                    )}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => toggle(p.id, !p.is_completed)}>
                        {p.is_completed ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />} {p.is_completed ? 'Annuler' : 'Faite'}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => remove(p.id)} aria-label={`Supprimer ${p.title}`}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              {done.map((a) => (
                <Link key={a.id} to={`/dashboard/activities/${a.id}`} className="block rounded-lg bg-accent/60 p-2 text-sm">
                  <span className="block font-medium">{a.title}</span>
                  <span className="text-xs text-muted-foreground">
                    Réalisée · {formatDuration(a.duration_seconds)} · {Math.round(Number(a.tss))} TSS
                  </span>
                </Link>
              ))}
              {planned.length === 0 && done.length === 0 && <p className="text-xs text-muted-foreground">Repos</p>}
            </li>
          )
        })}
      </ol>

      <PlanForm userId={user.id} defaultDate={days.includes(today) ? today : monday} onSaved={reload} />
    </div>
  )
}

function PlanForm({ userId, defaultDate, onSaved }: { userId: string; defaultDate: string; onSaved: () => void }) {
  const [f, setF] = useState({ date: defaultDate, sport: 'run' as SportType, title: '', minutes: '', tss: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return
    setSaving(true)
    const { error } = await supabase.from('planned_workouts').insert({
      user_id: userId,
      scheduled_date: f.date,
      sport_type: f.sport,
      title: f.title.trim(),
      description: f.notes.trim() || null,
      target_duration_seconds: f.minutes ? Number(f.minutes) * 60 : null,
      target_tss: f.tss ? Number(f.tss) : null,
    })
    setSaving(false)
    setMessage(error ? 'Enregistrement impossible.' : 'Séance ajoutée au programme.')
    if (!error) {
      setF({ ...f, title: '', minutes: '', tss: '', notes: '' })
      onSaved()
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-xl border bg-card p-4 md:p-6">
      <h2 className="font-semibold">Planifier une séance</h2>
      {message && <p role="status" className="text-sm">{message}</p>}
      <div className="grid grid-cols-2 gap-4">
        <Field id="date" label="Date" type="date" value={f.date} onChange={set('date')} required />
        <SelectField id="sport" label="Sport" value={f.sport} onChange={set('sport')}>
          <SportOptions />
        </SelectField>
      </div>
      <Field id="title" label="Séance" placeholder="Ex. 5 × 1000 m" value={f.title} onChange={set('title')} required />
      <div className="grid grid-cols-2 gap-4">
        <Field id="minutes" label="Durée prévue (min)" type="number" inputMode="numeric" min={1} value={f.minutes} onChange={set('minutes')} />
        <Field id="tss" label="TSS visé" type="number" inputMode="numeric" min={0} value={f.tss} onChange={set('tss')} />
      </div>
      <TextareaField id="notes" label="Consignes" value={f.notes} onChange={set('notes')} maxLength={2000} />
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter au programme
      </Button>
    </form>
  )
}
