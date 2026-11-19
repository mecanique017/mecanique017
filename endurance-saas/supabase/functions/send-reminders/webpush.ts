/**
 * Web Push sans dépendance (WebCrypto uniquement : fonctionne dans Deno et Node 20+).
 *  - VAPID (RFC 8292) : jeton JWT ES256 signé par la clé privée du serveur ;
 *  - chiffrement du message « aes128gcm » (RFC 8291 / RFC 8188).
 */
const enc = new TextEncoder()
type Bytes = Uint8Array<ArrayBuffer>
const text = (t: string): Bytes => new Uint8Array(enc.encode(t))

export const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export const unb64u = (s: string): Bytes => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
const concat = (...parts: Uint8Array[]): Bytes => {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

async function hmac(key: Bytes, data: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

export interface VapidKeys {
  publicKey: string // point P-256 non compressé, base64url (65 octets) — à donner au navigateur
  privateJwk: JsonWebKey
}

/** Nouvelle paire de clés VAPID (une fois pour toutes, conservée dans le coffre Supabase). */
export async function generateVapidKeys(): Promise<VapidKeys> {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))
  return { publicKey: b64u(raw), privateJwk: await crypto.subtle.exportKey('jwk', kp.privateKey) }
}

/** En-tête Authorization VAPID pour le service de notifications de l'abonnement. */
export async function vapidAuth(endpoint: string, keys: VapidKeys, subject: string) {
  const aud = new URL(endpoint).origin
  const header = b64u(text(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64u(text(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })))
  const key = await crypto.subtle.importKey('jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, text(`${header}.${claims}`)))
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${keys.publicKey}`
}

/** Chiffre le message pour un abonnement (clés p256dh et auth fournies par le navigateur). */
export async function encryptPayload(payload: string, p256dh: string, auth: string, salt: Bytes = crypto.getRandomValues(new Uint8Array(16))) {
  const uaPublic = unb64u(p256dh)
  const authSecret = unb64u(auth)
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256))
  // RFC 8291 §3.4 : IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0 || ua_public || as_public)
  const prkKey = await hmac(authSecret, ecdhSecret)
  const ikm = await hmac(prkKey, concat(text('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])))
  // RFC 8188 : clé de contenu et nonce
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, concat(text('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, concat(text('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const plain = concat(text(payload), new Uint8Array([2])) // délimiteur du dernier enregistrement
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain))
  const rs = new Uint8Array([0, 0, 16, 0]) // taille d'enregistrement 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher)
}

export interface Subscription {
  endpoint: string
  p256dh: string
  auth: string
}

/** Envoie une notification. Renvoie le statut HTTP (404/410 : abonnement expiré, à supprimer). */
export async function sendPush(sub: Subscription, message: { title: string; body: string; url?: string; tag?: string }, keys: VapidKeys, subject: string) {
  const body = await encryptPayload(JSON.stringify(message), sub.p256dh, sub.auth)
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(sub.endpoint, keys, subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '43200',
      Urgency: 'normal',
    },
    body,
  })
  return res.status
}
