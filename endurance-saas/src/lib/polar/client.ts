import 'server-only'

/**
 * Client Polar AccessLink v3 (https://www.polar.com/accesslink-api/).
 * Les URL sont surchargeables (tests contre un faux serveur), les valeurs par défaut sont celles de Polar.
 */
const AUTH_URL = process.env.POLAR_AUTH_URL ?? 'https://flow.polar.com/oauth2/authorization'
const TOKEN_URL = process.env.POLAR_TOKEN_URL ?? 'https://polarremote.com/v2/oauth2/token'
const API_URL = process.env.POLAR_API_URL ?? 'https://www.polaraccesslink.com/v3'

export class PolarError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
  }
}

/** Cookie anti-CSRF du parcours OAuth */
export const STATE_COOKIE = 'polar_oauth_state'

export const polarConfigured = () => Boolean(process.env.POLAR_CLIENT_ID && process.env.POLAR_CLIENT_SECRET)

const basicAuth = () =>
  'Basic ' + Buffer.from(`${process.env.POLAR_CLIENT_ID}:${process.env.POLAR_CLIENT_SECRET}`).toString('base64')

export function authorizationUrl(redirectUri: string, state: string) {
  const url = new URL(AUTH_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', process.env.POLAR_CLIENT_ID!)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'accesslink.read_all')
  url.searchParams.set('state', state)
  return url.toString()
}

/** Échange le code d'autorisation contre un jeton (Polar ne fournit pas de refresh token). */
export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json;charset=UTF-8',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  })
  if (!res.ok) throw new PolarError(`Échange du code refusé (${res.status})`, res.status)
  const json = (await res.json()) as { access_token: string; x_user_id: number }
  return { accessToken: json.access_token, polarUserId: Number(json.x_user_id) }
}

async function api(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...init.headers },
  })
  if (res.status === 401 || res.status === 403) throw new PolarError('Accès Polar révoqué ou consentement manquant', res.status)
  if (res.status === 429) throw new PolarError('Limite de requêtes Polar atteinte, réessayez plus tard', 429)
  return res
}

/** Enregistrement obligatoire de l'utilisateur auprès d'AccessLink (409 = déjà enregistré : OK). */
export async function registerUser(token: string, memberId: string) {
  const res = await api('/users', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'member-id': memberId }),
  })
  if (!res.ok && res.status !== 409) throw new PolarError(`Enregistrement Polar refusé (${res.status})`, res.status)
}

/** Désenregistrement : Polar arrête de partager les données avec l'application. */
export async function deregisterUser(token: string, polarUserId: number) {
  const res = await api(`/users/${polarUserId}`, token, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new PolarError(`Déconnexion Polar refusée (${res.status})`, res.status)
}

export interface PolarExercise {
  id: string
  start_time?: string
  sport?: string
}

/** Séances disponibles (30 derniers jours, endpoint non transactionnel). */
export async function listExercises(token: string): Promise<PolarExercise[]> {
  const res = await api('/exercises', token)
  if (res.status === 204) return []
  if (!res.ok) throw new PolarError(`Liste des séances Polar indisponible (${res.status})`, res.status)
  return (await res.json()) as PolarExercise[]
}

/** Fichier .fit d'une séance. */
export async function downloadExerciseFit(token: string, exerciseId: string): Promise<ArrayBuffer> {
  const res = await api(`/exercises/${encodeURIComponent(exerciseId)}/fit`, token, { headers: { Accept: '*/*' } })
  if (!res.ok) throw new PolarError(`Téléchargement du .fit Polar impossible (${res.status})`, res.status)
  return res.arrayBuffer()
}

/** VFC nocturne (« Nightly Recharge ») d'une date, ou null si absente. */
export async function nightlyHrv(token: string, date: string): Promise<number | null> {
  const res = await api(`/users/nightly-recharge/${date}`, token)
  if (!res.ok) return null
  const json = (await res.json()) as { heart_rate_variability_avg?: number }
  return typeof json.heart_rate_variability_avg === 'number' ? Math.round(json.heart_rate_variability_avg) : null
}
