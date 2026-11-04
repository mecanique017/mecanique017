import 'server-only'

/**
 * Envoi via l'API REST de Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Sans clé, l'envoi est ignoré (journalisé) : pratique en développement.
 * RESEND_API_URL est surchargeable pour les tests.
 */
const API_URL = process.env.RESEND_API_URL ?? 'https://api.resend.com/emails'

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)

export interface Email {
  to: string
  subject: string
  html: string
  text: string
  /** Absent pour un e-mail transactionnel (invitation) */
  unsubscribeUrl?: string
}

export async function sendEmail(email: Email): Promise<boolean> {
  if (!emailConfigured()) {
    console.info('[e-mail non configuré] envoi ignoré :', email.subject, '→', email.to)
    return false
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      // Désinscription en un clic depuis la messagerie (RFC 8058, exigée par Gmail et Yahoo)
      headers: email.unsubscribeUrl
        ? { 'List-Unsubscribe': `<${email.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
        : undefined,
    }),
  })
  if (!res.ok) {
    console.error('Envoi e-mail refusé', res.status, await res.text().catch(() => ''))
    return false
  }
  return true
}
