import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyUnsubscribe } from '@/lib/email/unsubscribe'


async function unsubscribe(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const userId = p.get('u') ?? ''
  const kind = p.get('k') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !verifyUnsubscribe(userId, kind, p.get('s') ?? '')) return null
  const { error } = await createAdminClient().from('profiles').update(kind === 'weekly' ? { notify_weekly: false } : { notify_fatigue: false }).eq('id', userId)
  return error ? null : kind
}

/** Clic sur le lien de l'e-mail : désinscription puis page de confirmation. */
export async function GET(req: NextRequest) {
  const kind = await unsubscribe(req)
  const label = kind === 'weekly' ? 'du résumé hebdomadaire' : 'des alertes de fatigue'
  const html = kind
    ? `<p>Vous êtes désinscrit ${label}. Vous pouvez le réactiver à tout moment dans votre profil.</p>`
    : '<p>Lien de désinscription invalide ou expiré. Modifiez vos préférences depuis votre profil.</p>'
  return new NextResponse(
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Désinscription</title><body style="font-family:Arial,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;line-height:1.5">${html}<p><a href="/dashboard/profile">Mon profil</a></p></body></html>`,
    { status: kind ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8' } }
  )
}

/** Désinscription en un clic depuis la messagerie (RFC 8058). */
export async function POST(req: NextRequest) {
  const kind = await unsubscribe(req)
  return new NextResponse(null, { status: kind ? 200 : 400 })
}
