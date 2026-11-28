// Serveur de l'application « Apprentissage 6e ».
// - sert les fichiers du dossier public/
// - expose /api/health et /api/generate (génération illimitée via l'API Claude)
// La clé API reste côté serveur : elle n'est jamais envoyée au navigateur.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { validateExercise } from './public/js/core/exercise.js';

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
// Modèles qui acceptent la reprise automatique côté serveur en cas de refus (« fallbacks »).
const FALLBACK_MODELS = ['claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

// --- Schémas JSON imposés à l'IA (structured outputs) ------------------------
const str = { type: 'string' };
const strArr = { type: 'array', items: str };
const common = { hint: str, explanation: str, notion: str };
const variant = (type, props) => ({
  type: 'object',
  additionalProperties: false,
  properties: { type: { type: 'string', enum: [type] }, ...props, ...common },
  required: ['type', ...Object.keys(props), ...Object.keys(common)],
});
const EXERCISE_SCHEMA = {
  anyOf: [
    variant('qcm', { question: str, choices: strArr, answer: { type: 'integer' } }),
    variant('trous', { question: str, text: str, answers: { type: 'array', items: strArr }, choices: strArr }),
    variant('ordre', { question: str, items: strArr }),
    variant('identification', { question: str, tokens: strArr, targets: { type: 'array', items: { type: 'integer' } } }),
    variant('vraifaux', { question: str, statement: str, answer: { type: 'boolean' }, justifications: strArr, justificationAnswer: { type: 'integer' } }),
    variant('dictee', { question: str, text: str }),
  ],
};
const obj = (props) => ({ type: 'object', additionalProperties: false, properties: props, required: Object.keys(props) });
const SCHEMAS = {
  exercises: obj({ exercises: { type: 'array', items: EXERCISE_SCHEMA } }),
  reading: obj({ passageTitle: str, passage: str, exercises: { type: 'array', items: EXERCISE_SCHEMA } }),
  module: obj({
    title: str, emoji: str, summary: str,
    lesson: obj({
      intro: str,
      rules: { type: 'array', items: obj({ title: str, text: str, examples: strArr }) },
      pitfalls: strArr,
      tip: str,
    }),
    exercises: { type: 'array', items: EXERCISE_SCHEMA },
  }),
};
SCHEMAS.dictee = SCHEMAS.exercises;

// --- Consignes données à l'IA --------------------------------------------------
const SYSTEM = `Tu es un professeur expérimenté de collège en France, spécialiste de la classe de 6e (cycle 3), et concepteur d'exercices pour une application d'apprentissage ludique destinée à un élève de 11-12 ans.

Exigences :
- Respecte strictement les programmes officiels de l'Éducation nationale pour la 6e (attendus de fin de cycle 3).
- Langue française impeccable (orthographe, accords, accents, typographie française : guillemets « », espace avant ? ! : ;).
- Ton bienveillant, clair, motivant, adapté à 11-12 ans, sans être bébé. Jamais punitif.
- Contenus 100 % originaux (pas d'extraits protégés). Exemples concrets et variés, tirés de la vie d'un collégien, de contes, de mythes, d'aventures.
- Chaque exercice a UNE seule bonne réponse, sans ambiguïté. Vérifie-la deux fois.
- "hint" : un indice qui aide à réfléchir SANS donner la réponse (une méthode, une question à se poser).
- "explanation" : explique simplement POURQUOI c'est la bonne réponse (1 à 3 phrases), en rappelant la règle.
- "notion" : la notion précise travaillée (ex. « Accord de l'adjectif », « Passé simple 1er groupe »).
- Varie les types d'exercices.

Format de chaque type :
- qcm : "question", "choices" (3 ou 4 propositions distinctes), "answer" = index (0-based) de la bonne proposition. Place la bonne réponse à une position aléatoire.
- trous : "text" contient exactement autant de "___" (trois tirets bas) que d'éléments dans "answers" ; chaque élément de "answers" est la liste des réponses acceptées pour ce trou (souvent une seule). "choices" : banque de mots (2 à 6 mots contenant toutes les bonnes réponses) ou [] pour une saisie libre.
- ordre : "items" = éléments dans le BON ordre (3 à 8 éléments) ; l'application les mélange. Un seul ordre doit être possible.
- identification : "tokens" = la phrase découpée en mots ou groupes de mots cliquables ; "targets" = index (0-based) de TOUS les tokens à sélectionner.
- vraifaux : "statement" = affirmation ; "answer" = true/false ; "justifications" = 3 justifications dont une seule correcte ; "justificationAnswer" = son index.
- dictee : "text" = une phrase de dictée (8 à 20 mots) adaptée au niveau, qui réinvestit des règles d'orthographe.
Pour "question", écris la consigne destinée à l'élève.`;

const LEVELS = { 1: 'facile (découverte)', 2: 'moyen (consolidation)', 3: 'difficile (approfondissement, avec pièges classiques)' };

function buildPrompt(b) {
  const lvl = LEVELS[b.level] || LEVELS[2];
  const avoid = b.avoid?.length ? `\nÉvite de reproduire ces exercices déjà vus :\n- ${b.avoid.join('\n- ')}` : '';
  const focus = b.focus && (b.focus.top?.length || b.focus.examples?.length)
    ? `\nL'élève a des difficultés sur : ${(b.focus.top || []).join(', ') || 'non précisé'}.\nExemples d'exercices ratés : ${(b.focus.examples || []).join(' | ') || 'aucun'}.\nCible ces difficultés avec des exercices progressifs et rassurants.`
    : '';
  const chap = b.chapter ? `Chapitre : « ${b.chapter.title} ».\nRésumé : ${b.chapter.summary}\nLeçon de référence :\n${b.chapter.lesson}` : '';
  switch (b.mode) {
    case 'module':
      return `Matière : ${b.subject}. Crée un module d'apprentissage complet pour un élève de 6e sur la demande suivante : « ${b.request} ».
Niveau : ${lvl}.
Le module contient :
- "title" (court), "emoji" (un seul emoji), "summary" (une phrase décrivant les notions) ;
- "lesson" : "intro" (2-3 phrases accrocheuses), "rules" (3 à 5 règles, chacune avec "title", "text" court et 1 à 3 "examples"), "pitfalls" (2 à 4 pièges fréquents), "tip" (une astuce mémo) ; tu peux mettre en gras avec **mot** ;
- "exercises" : ${b.count} exercices variés (au moins 4 types différents), du plus facile au plus difficile.
Si la demande ne relève pas du programme de 6e, adapte-la au niveau 6e le plus proche.`;
    case 'reading':
      return `${chap}
Écris un texte narratif ORIGINAL de 150 à 250 mots (conte, récit des origines, récit d'aventure, fable ou récit mythologique, comme au programme de 6e), avec un titre ("passageTitle") et le texte ("passage", paragraphes séparés par des retours à la ligne).
Puis ${b.count} questions de compréhension variées sur ce texte : informations explicites, implicites (sentiments, intentions), vocabulaire en contexte, genre du texte, figures de style éventuelles, et un exercice "ordre" de chronologie des événements.
Niveau : ${lvl}.${avoid}`;
    case 'dictee':
      return `${chap}
Crée ${b.count} exercices de type "dictee" uniquement, de niveau ${lvl}, qui réinvestissent les accords, les homophones et la conjugaison de 6e. Pour chacun, "hint" rappelle une règle utile pour la phrase, "explanation" détaille les pièges de la phrase.${avoid}${focus}`;
    default:
      return `Matière : ${b.subject || 'Français'}.
${chap}
Crée ${b.count} nouveaux exercices variés (au moins 3 types différents parmi qcm, trous, ordre, identification, vraifaux) sur ce chapitre.
Niveau : ${lvl}.${focus}${avoid}`;
  }
}

/** Extrait le JSON d'une réponse texte (secours si le format structuré n'est pas disponible). */
function parseJson(text) {
  try { return JSON.parse(text); } catch { /* on tente d'extraire le bloc JSON */ }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error('Réponse illisible');
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
  const mode = ['exercises', 'reading', 'dictee', 'module'].includes(body.mode) ? body.mode : 'exercises';
  const prompt = buildPrompt({ ...body, mode });
  let data;
  try {
    data = await askClaude(mode, prompt, true);
  } catch (e) {
    // Si le schéma structuré est rejeté (400), on retente en JSON libre, validé ensuite.
    if (e instanceof Anthropic.BadRequestError) data = await askClaude(mode, prompt, false);
    else throw e;
  }
  const clean = (list, extra = {}) => (Array.isArray(list) ? list : []).map((ex) => validateExercise({ ...ex, ...extra })).filter(Boolean);
  if (mode === 'module') {
    return { module: { ...data, exercises: clean(data.exercises) } };
  }
  if (mode === 'reading') {
    return { exercises: clean(data.exercises, { passage: data.passage, passageTitle: data.passageTitle }) };
  }
  return { exercises: clean(data.exercises) };
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

function sanitizeBody(b) {
  const s = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  return {
    mode: s(b.mode, 20),
    subject: s(b.subject, 60) || 'Français',
    request: s(b.request, 300),
    level: [1, 2, 3].includes(Number(b.level)) ? Number(b.level) : 2,
    count: Math.min(10, Math.max(3, Number(b.count) || 6)),
    chapter: b.chapter ? { title: s(b.chapter.title, 120), summary: s(b.chapter.summary, 400), lesson: s(b.chapter.lesson, 3000) } : null,
    focus: b.focus ? {
      top: Array.isArray(b.focus.top) ? b.focus.top.slice(0, 5).map((x) => s(x, 100)) : [],
      examples: Array.isArray(b.focus.examples) ? b.focus.examples.slice(0, 5).map((x) => s(x, 200)) : [],
    } : null,
    avoid: Array.isArray(b.avoid) ? b.avoid.slice(0, 15).map((x) => s(x, 120)).filter(Boolean) : [],
  };
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
