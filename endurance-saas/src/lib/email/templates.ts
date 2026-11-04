import 'server-only'
import { formatDuration } from '@/components/dashboard/activity-list'
import { formatLongDay } from '@/lib/dates'

/** Échappement HTML : titres et consignes viennent des données de l'utilisateur. */
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`

function layout(title: string, body: string, siteUrl: string, unsubscribeUrl: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#171717">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:24px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:14px;color:#10b981;font-weight:bold;padding-bottom:8px">Endurance SaaS</td></tr>
<tr><td style="font-size:20px;font-weight:bold;padding-bottom:16px">${esc(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.5">${body}</td></tr>
<tr><td style="padding-top:24px"><a href="${siteUrl}/dashboard" style="background:#171717;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;display:inline-block">Ouvrir mon tableau de bord</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#737373">Vous recevez cet e-mail car vous l’avez activé dans votre profil. <a href="${unsubscribeUrl}" style="color:#737373">Se désinscrire</a></td></tr>
</table></td></tr></table></body></html>`
}

export interface WeeklyData {
  name: string | null
  lastWeek: { sessions: number; seconds: number; tss: number }
  ctl: number
  ctlChange: number
  tsb: number
  planned: { date: string; title: string; target_duration_seconds: number | null; target_tss: number | null }[]
}

export function weeklyEmail(d: WeeklyData, siteUrl: string, unsubscribeUrl: string) {
  const hello = d.name ? `Bonjour ${esc(d.name)},` : 'Bonjour,'
  const summary = `La semaine dernière : <strong>${d.lastWeek.sessions} séance(s)</strong>, ${formatDuration(d.lastWeek.seconds)}, ${Math.round(d.lastWeek.tss)} TSS.<br>Forme (CTL) : <strong>${fmt(d.ctl)}</strong> (${signed(d.ctlChange)} sur 7 jours) · Fraîcheur (TSB) : ${signed(d.tsb)}.`
  const plan = d.planned.length
    ? `<p style="margin:16px 0 8px;font-weight:bold">Au programme cette semaine</p><ul style="padding-left:18px;margin:0">${d.planned
        .map((p) => {
          const meta = [p.target_duration_seconds && formatDuration(p.target_duration_seconds), p.target_tss != null && `${p.target_tss} TSS`].filter(Boolean).join(' · ')
          return `<li style="margin-bottom:4px"><span style="text-transform:capitalize">${esc(formatLongDay(p.date))}</span> : ${esc(p.title)}${meta ? ` <span style="color:#737373">(${meta})</span>` : ''}</li>`
        })
        .join('')}</ul>`
    : `<p style="margin-top:16px">Aucune séance prévue cette semaine. Planifiez-la dans le calendrier ou générez un plan avec le coach IA.</p>`

  const text = `${d.name ? `Bonjour ${d.name},` : 'Bonjour,'}\n\nLa semaine dernière : ${d.lastWeek.sessions} séance(s), ${formatDuration(d.lastWeek.seconds)}, ${Math.round(d.lastWeek.tss)} TSS.\nForme (CTL) : ${fmt(d.ctl)} (${signed(d.ctlChange)} sur 7 jours), fraîcheur (TSB) : ${signed(d.tsb)}.\n\n${
    d.planned.length ? 'Au programme cette semaine :\n' + d.planned.map((p) => `- ${formatLongDay(p.date)} : ${p.title}`).join('\n') : 'Aucune séance prévue cette semaine.'
  }\n\n${siteUrl}/dashboard\n\nSe désinscrire : ${unsubscribeUrl}`

  return { subject: 'Votre semaine d’entraînement', html: layout('Votre semaine d’entraînement', `<p style="margin-top:0">${hello}</p><p>${summary}</p>${plan}`, siteUrl, unsubscribeUrl), text }
}

export interface FatigueData {
  name: string | null
  tsb: number
  hrv: number | null
  hrvBaseline: number | null
  reasons: string[]
}

export function fatigueEmail(d: FatigueData, siteUrl: string, unsubscribeUrl: string) {
  const hello = d.name ? `Bonjour ${esc(d.name)},` : 'Bonjour,'
  const reasons = d.reasons.map((r) => `<li>${esc(r)}</li>`).join('')
  const body = `<p style="margin-top:0">${hello}</p><p>Vos indicateurs signalent une fatigue importante :</p><ul style="padding-left:18px">${reasons}</ul><p>Pensez à une journée de récupération (repos ou endurance très facile) avant votre prochaine séance intense. En cas de douleur ou de malaise, consultez un professionnel de santé.</p>`
  const text = `${d.name ? `Bonjour ${d.name},` : 'Bonjour,'}\n\nVos indicateurs signalent une fatigue importante :\n${d.reasons.map((r) => `- ${r}`).join('\n')}\n\nPensez à une journée de récupération avant votre prochaine séance intense.\n\n${siteUrl}/dashboard\n\nSe désinscrire : ${unsubscribeUrl}`
  return { subject: 'Alerte fatigue : prévoyez de la récupération', html: layout('Alerte fatigue', body, siteUrl, unsubscribeUrl), text }
}
