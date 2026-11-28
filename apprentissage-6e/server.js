// Serveur de l'application « Apprentissage 6e ».
// - sert les fichiers du dossier public/
// - expose /api/health et /api/generate (génération illimitée via l'API Claude)
// La clé API reste côté serveur : elle n'est jamais envoyée au navigateur.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { SCHEMAS, SYSTEM, buildPrompt, parseJson, postProcess, sanitizeBody, AI_MODES, FALLBACK_MODELS } from './public/js/core/ai-prompts.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

// --- Configuration (.env facultatif, sans dépendance) -------------------------
loadEnvFile(path.join(ROOT, '.env'));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.AI_EFFORT || 'low'; // low = rapide ; medium/high = plus réfléchi
const RATE_LIMIT = Number(process.env.AI_RATE_LIMIT_PER_HOUR) || 60;
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

async function askClaude(mode, prompt, useSchema = true) {
  const params = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt + (useSchema ? '' : '\nRéponds uniquement avec un objet JSON valide, sans texte autour.') }],
    output_config: { effort: mode === 'module' ? 'medium' : EFFORT, ...(useSchema ? { format: { type: 'json_schema', schema: SCHEMAS[mode] } } : {}) },
  };
  let msg;
  if (FALLBACK_MODELS.includes(MODEL)) {
    // Reprise automatique sur un autre modèle si la requête est refusée par les filtres de sécurité.
    msg = await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } else {
    msg = await client.messages.create(params);
  }
  if (msg.stop_reason === 'refusal') throw Object.assign(new Error('La demande a été refusée par l’IA. Reformule-la autrement.'), { status: 422 });
  if (msg.stop_reason === 'max_tokens') throw Object.assign(new Error('La réponse de l’IA était trop longue. Demande moins d’exercices.'), { status: 502 });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return parseJson(text);
}

async function generate(body) {
  const mode = AI_MODES.includes(body.mode) ? body.mode : 'exercises';
  const prompt = buildPrompt({ ...body, mode });
  let data;
  try {
    data = await askClaude(mode, prompt, true);
  } catch (e) {
    // Si le schéma structuré est rejeté (400), on retente en JSON libre, validé ensuite.
    if (e instanceof Anthropic.BadRequestError) data = await askClaude(mode, prompt, false);
    else throw e;
  }
  return postProcess(mode, data);
}

// --- Petites protections : taille des requêtes, quota par heure ---------------
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  if (list.length >= RATE_LIMIT) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}


function readJson(req, limit = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Requête trop volumineuse'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(Object.assign(new Error('JSON invalide'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function friendlyError(e) {
  if (e instanceof Anthropic.AuthenticationError) return [401, 'Clé API invalide : vérifie ANTHROPIC_API_KEY dans le fichier .env.'];
  if (e instanceof Anthropic.PermissionDeniedError) return [403, 'Cette clé API n’a pas accès au modèle demandé (AI_MODEL).'];
  if (e instanceof Anthropic.RateLimitError) return [429, 'L’IA est très sollicitée. Réessaie dans une minute.'];
  if (e instanceof Anthropic.APIConnectionError) return [503, 'Impossible de joindre l’API Claude (connexion internet ?).'];
  if (e instanceof Anthropic.APIError) return [502, `Erreur de l’API Claude (${e.status ?? '?'}). Réessaie plus tard.`];
  return [e.status || 500, e.message || 'Erreur inattendue'];
}

// --- Fichiers statiques ---------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.normalize(path.join(PUBLIC, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(PUBLIC + path.sep) && file !== PUBLIC) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Introuvable'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname === '/api/health') return send(res, 200, { ok: true, ai: hasKey, model: hasKey ? MODEL : null });
  if (pathname === '/api/generate') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
    if (!client) return send(res, 503, { error: 'Génération IA non configurée : ajoute ta clé ANTHROPIC_API_KEY dans le fichier .env puis relance le serveur.' });
    if (rateLimited(req.socket.remoteAddress)) return send(res, 429, { error: 'Quota horaire atteint. Les exercices hors ligne restent illimités !' });
    try {
      const body = sanitizeBody(await readJson(req));
      if (body.mode === 'module' && body.request.trim().length < 3) return send(res, 400, { error: 'Décris le sujet du module.' });
      const t0 = Date.now();
      const result = await generate(body);
      console.log(`[IA] ${body.mode} « ${body.chapter?.title || body.request} » → ${(result.exercises || result.module?.exercises || []).length} exercices en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      return send(res, 200, result);
    } catch (e) {
      const [status, message] = friendlyError(e);
      console.error('[IA] erreur :', e.message);
      return send(res, status, { error: message });
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Méthode non autorisée' });
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`\n📚 Apprentissage 6e prêt sur http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(hasKey ? `✨ Génération IA activée (modèle ${MODEL})` : 'ℹ️  Mode hors ligne : ajoute ANTHROPIC_API_KEY dans .env pour activer la génération IA.');
});
