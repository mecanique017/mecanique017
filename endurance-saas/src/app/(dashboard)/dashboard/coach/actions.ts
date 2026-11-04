'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findInvitation, getCoachedAthletes, hashToken, newInviteToken } from '@/lib/coach'
import { getPlan } from '@/lib/plans'
import { sendEmail } from '@/lib/email/send'
import { fieldErrors, optionalNumber, optionalText, type FormState } from '@/lib/form-utils'
import { SPORT_KEYS } from '@/lib/sports'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export interface InviteState extends FormState {
  /** Lien d'invitation affiché au coach (utile si l'e-mail n'est pas configuré ou n'arrive pas) */
  link?: string
}

/** Invitation d'un athlète par e-mail (offre Premium, dans la limite du nombre d'athlètes). */
export async function inviteAthlete(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const email = z.email('Adresse e-mail invalide').safeParse(String(formData.get('email') ?? '').trim().toLowerCase())
  if (!email.success) return { errors: { email: 'Adresse e-mail invalide' } }

  const { supabase, user } = await requireUser()
  if (email.data === user.email?.toLowerCase()) return { errors: { email: 'Vous ne pouvez pas vous inviter vous-même' } }

  const { data: profile } = await supabase.from('profiles').select('full_name, subscription_tier').eq('id', user.id).single()
  const limit = getPlan(profile?.subscription_tier ?? 'free').maxCoachedAthletes
  if (limit === 0) return { message: 'L’espace coach est inclus dans l’offre Premium.' }

  const admin = createAdminClient()
  const [athletes, { count: pending }] = await Promise.all([
    getCoachedAthletes(supabase),
    admin.from('coach_athletes').select('id', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'pending'),
  ])
  if (athletes.length + (pending ?? 0) >= limit) return { message: `Limite atteinte : ${limit} athlètes (invitations en attente comprises).` }

  const token = newInviteToken()
  const { error } = await admin.from('coach_athletes').insert({ coach_id: user.id, invited_email: email.data, invite_token_hash: hashToken(token) })
  if (error) {
    console.error('Invitation coach', error)
    return { message: 'Invitation impossible. Réessayez.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const link = `${siteUrl}/dashboard/invitations/${token}`
  const coach = profile?.full_name ?? user.email ?? 'Votre coach'
  const sent = await sendEmail({
    to: email.data,
    subject: `${coach} vous invite à partager votre entraînement`,
    text: `${coach} souhaite suivre votre entraînement sur Endurance SaaS.\n\nAccepter ou refuser l’invitation (valable 14 jours) : ${link}\n\nVous pourrez arrêter le partage à tout moment.`,
    html: `<p>${esc(coach)} souhaite suivre votre entraînement sur Endurance SaaS.</p><p><a href="${link}">Voir l’invitation</a> (valable 14 jours).</p><p style="color:#737373;font-size:12px">Vous pourrez arrêter le partage à tout moment.</p>`,
  })
  refresh()
  return {
    ok: true,
    message: sent ? `Invitation envoyée à ${email.data}.` : `Invitation créée. Transmettez ce lien à ${email.data} :`,
    link: sent ? undefined : link,
  }
}

const IdSchema = z.uuid()

/** Annulation d'une invitation en attente (par le coach). */
export async function cancelInvitation(formData: FormData) {
  const id = IdSchema.safeParse(formData.get('id'))
  if (!id.success) return
  const { user } = await requireUser()
  await createAdminClient().from('coach_athletes').delete().eq('id', id.data).eq('coach_id', user.id).eq('status', 'pending')
  refresh()
}

/** Fin du suivi, à l'initiative du coach OU de l'athlète. L'accès du coach est coupé immédiatement. */
export async function endRelation(formData: FormData) {
  const id = IdSchema.safeParse(formData.get('id'))
  if (!id.success) return
  const { user } = await requireUser()
  await createAdminClient()
    .from('coach_athletes')
    .update({ status: 'revoked' })
    .eq('id', id.data)
    .eq('status', 'active')
    .or(`coach_id.eq.${user.id},athlete_id.eq.${user.id}`)
  refresh()
}

/** Acceptation par l'athlète : le jeton doit être valide ET l'e-mail du compte doit être celui invité. */
export async function acceptInvitation(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const { user } = await requireUser()
  const invitation = await findInvitation(token)
  if (invitation.status !== 'ok') redirect(`/dashboard/invitations/${encodeURIComponent(token)}`)
  if (invitation.coachId === user.id || invitation.invitedEmail !== user.email?.toLowerCase()) {
    redirect(`/dashboard/invitations/${encodeURIComponent(token)}`)
  }

  const admin = createAdminClient()
  // Une ancienne relation active avec ce coach est remplacée (index unique)
  await admin.from('coach_athletes').update({ status: 'revoked' }).eq('coach_id', invitation.coachId).eq('athlete_id', user.id).eq('status', 'active')
  const { error } = await admin
    .from('coach_athletes')
    .update({ status: 'active', athlete_id: user.id, accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)
    .eq('status', 'pending')
  if (error) console.error('Acceptation invitation', error)
  redirect('/dashboard/coach?invitation=accepted')
}

/** Refus par l'athlète invité. */
export async function declineInvitation(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const { user } = await requireUser()
  const invitation = await findInvitation(token)
  if (invitation.status === 'ok' && invitation.invitedEmail === user.email?.toLowerCase()) {
    await createAdminClient().from('coach_athletes').delete().eq('id', invitation.id).eq('status', 'pending')
  }
  redirect('/dashboard/coach?invitation=declined')
}

const PlannedSchema = z.object({
  athlete_id: z.uuid(),
  scheduled_date: z.iso.date({ message: 'Date obligatoire' }),
  sport_type: z.enum(SPORT_KEYS, { message: 'Sport invalide' }),
  title: z.string().trim().min(1, 'Titre obligatoire').max(120),
  description: optionalText(2000),
  target_minutes: optionalNumber(z.number().int().min(1, 'Durée invalide').max(1440, 'Durée invalide')),
  target_tss: optionalNumber(z.number().int().min(0).max(1000, 'TSS invalide')),
})

/** Le coach programme une séance à son athlète (la RLS vérifie la relation active). */
export async function planForAthlete(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = PlannedSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: 'Vérifiez les champs en rouge.' }
  const { supabase, user } = await requireUser()
  const p = parsed.data
  const { error } = await supabase.from('planned_workouts').insert({
    user_id: p.athlete_id,
    created_by: user.id,
    scheduled_date: p.scheduled_date,
    sport_type: p.sport_type,
    title: p.title,
    description: p.description,
    target_duration_seconds: p.target_minutes ? p.target_minutes * 60 : null,
    target_tss: p.target_tss ?? null,
  })
  if (error) {
    console.error('Séance coach', error)
    return { message: 'Enregistrement impossible : le suivi de cet athlète est peut-être terminé.' }
  }
  refresh()
  return { ok: true, message: 'Séance ajoutée au programme de l’athlète.' }
}

/** Suppression d'une séance programmée par le coach (RLS : uniquement les siennes). */
export async function deleteAthletePlanned(formData: FormData) {
  const id = IdSchema.safeParse(formData.get('id'))
  if (!id.success) return
  const { supabase, user } = await requireUser()
  await supabase.from('planned_workouts').delete().eq('id', id.data).eq('created_by', user.id)
  refresh()
}
