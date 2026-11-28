// Orchestration de la génération : moteur local paramétrable + moteur IA (via /api/generate) + réserve locale.
import { BUILTIN_CHAPTERS } from '../content/index.js';
import { validateExercise } from './exercise.js';
import { makeRng, shuffle, signature } from './utils.js';
import { getState, poolGet, poolAdd, notion, reviewItems } from './state.js';
import { levelFromMastery } from './gamification.js';
import { SCHEMAS, SYSTEM, buildPrompt, parseJson, postProcess, sanitizeBody, AI_MODES, FALLBACK_MODELS } from './ai-prompts.js';

const rng = makeRng(Date.now());
const recent = []; // signatures récemment vues (évite les répétitions)
const remember = (sig) => { recent.push(sig); if (recent.length > 200) recent.shift(); };

export function allChapters() {
  return [...BUILTIN_CHAPTERS, ...getState().customChapters];
}
export const getChapter = (id) => allChapters().find((c) => c.id === id);

/** Niveau de difficulté adapté à la maîtrise de l'élève sur ce chapitre. */
export const adaptiveLevel = (chapterId) => levelFromMastery(notion(chapterId).mastery);

// --- Moteur local --------------------------------------------------------------
function fromGenerators(chapter, level, count) {
  const out = [];
  const seen = new Set();
  let gens = shuffle(rng, chapter.generators);
  let guard = 0;
  while (out.length < count && guard++ < count * 30) {
    if (!gens.length) gens = shuffle(rng, chapter.generators);
    const gen = gens.pop();
    // Variation de difficulté autour du niveau cible.
    const lv = Math.min(3, Math.max(1, level + (rng() < 0.2 ? (rng() < 0.5 ? -1 : 1) : 0)));
    const ex = validateExercise(gen(rng, lv));
    if (!ex) continue;
    const sig = signature(ex);
    if (seen.has(sig) || (recent.includes(sig) && guard < count * 20)) continue;
    seen.add(sig);
    out.push(ex);
  }
  return out;
}

/**
 * Construit une série locale (aucun réseau). Mélange éventuellement des exercices IA déjà en réserve.
 */
export function buildSeries(chapter, { count = 8, level } = {}) {
  level = level || adaptiveLevel(chapter.id);
  let list;
  if (chapter.series) {
    list = chapter.series(rng, level, count).map(validateExercise).filter(Boolean);
  } else if (chapter.generators?.length) {
    const pool = poolGet(chapter.id).filter((e) => !recent.includes(signature(e)));
    const fromPool = shuffle(rng, pool).slice(0, Math.min(pool.length, Math.floor(count / 4)));
    list = shuffle(rng, [...fromGenerators(chapter, level, count - fromPool.length), ...fromPool]);
  } else {
    // Module personnalisé : ses exercices + la réserve.
    const all = [...(chapter.exercises || []), ...poolGet(chapter.id)];
    const fresh = all.filter((e) => !recent.includes(signature(e)));
    list = shuffle(rng, fresh.length >= Math.min(count, all.length) ? fresh : all).slice(0, count);
  }
  list.forEach((e) => remember(signature(e)));
  return list;
}

export function buildReviewSeries(chapterId, count = 8) {
  return reviewItems(chapterId).slice(0, count).map((r) => ({ ...r.exercise, _review: true, _chapterId: r.chapterId }));
}

/** Suggestion du jour : la notion la plus fragile déjà travaillée, sinon une nouvelle. */
export function suggestChapter(subjectId) {
  const all = allChapters();
  const chapters = subjectId ? all.filter((c) => c.subject === subjectId) : all;
  const worked = chapters.filter((c) => notion(c.id).attempts > 0);
  const fresh = chapters.filter((c) => notion(c.id).attempts === 0);
  const weak = worked.filter((c) => notion(c.id).mastery < 70).sort((a, b) => notion(a.id).mastery - notion(b.id).mastery);
  if (weak.length && (rng() < 0.6 || !fresh.length)) return { chapter: weak[0], reason: 'À consolider' };
  if (fresh.length) return { chapter: fresh[0], reason: 'Nouvelle notion' };
  if (!worked.length) return { chapter: null };
  return { chapter: worked.sort((a, b) => notion(a.id).mastery - notion(b.id).mastery)[0], reason: 'Pour progresser encore' };
}

// --- Moteur IA -----------------------------------------------------------------
// Deux transports possibles :
//  1. « server » : le serveur Node (server.js) détient la clé → mode recommandé sur ordinateur.
//  2. « device » : la clé est enregistrée sur l'appareil (ex. iPhone, site statique sans serveur)
//     et l'API Claude est appelée directement depuis le navigateur.
const DEVICE_KEY = 'app6e.ai-device.v1';
export const DEFAULT_DEVICE_MODEL = 'claude-opus-5-5';
export const DEVICE_MODELS = [
  ['claude-opus-5-5', 'Claude Opus 5.5 (meilleure qualité)'],
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (équilibré)'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 (le plus économique)'],
];

export function getDeviceAi() {
  try { return JSON.parse(localStorage.getItem(DEVICE_KEY)) || {}; } catch { return {}; }
}
export function setDeviceAi(cfg) {
  try {
    if (!cfg) localStorage.removeItem(DEVICE_KEY);
    else localStorage.setItem(DEVICE_KEY, JSON.stringify(cfg));
  } catch { /* stockage indisponible */ }
  statusCache = null;
}

let statusCache = null;
export async function aiStatus(force = false) {
  if (statusCache && !force) return statusCache;
  let server = { ai: false };
  try {
    const r = await fetch('api/health', { cache: 'no-store' });
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) server = await r.json();
  } catch { /* pas de serveur : site statique ou hors ligne */ }
  const device = getDeviceAi();
  if (server.ai) statusCache = { ai: true, mode: 'server', model: server.model };
  else if (device.key) statusCache = { ai: true, mode: 'device', model: device.model || DEFAULT_DEVICE_MODEL };
  else statusCache = { ai: false, offline: !server.ok };
  return statusCache;
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(timer) };
}

async function callServer(body, signal) {
  const r = await fetch('api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
  return data;
}

/** Appel direct de l'API Claude depuis le navigateur (clé enregistrée sur l'appareil). */
async function callDevice(rawBody, signal) {
  const { key, model = DEFAULT_DEVICE_MODEL } = getDeviceAi();
  const b = sanitizeBody(rawBody);
  const mode = AI_MODES.includes(b.mode) ? b.mode : 'exercises';
  if (mode === 'module' && b.request.trim().length < 3) throw new Error('Décris le sujet du module.');
  const prompt = buildPrompt({ ...b, mode });
  const fallback = FALLBACK_MODELS.includes(model);

  async function ask(useSchema) {
    const headers = {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2026-10-21',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    // Reprise automatique sur un autre modèle si la requête est refusée par les filtres de sécurité.
    if (fallback) headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model,
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt + (useSchema ? '' : '\nRéponds uniquement avec un objet JSON valide, sans texte autour.') }],
        output_config: { effort: mode === 'module' ? 'medium' : 'low', ...(useSchema ? { format: { type: 'json_schema', schema: SCHEMAS[mode] } } : {}) },
        ...(fallback ? { fallbacks: 'default' } : {}),
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 400 && useSchema) return ask(false); // schéma refusé : on retente en JSON libre
    if (r.status === 401) throw new Error('Clé API invalide : vérifie-la dans l’espace parents.');
    if (r.status === 403) throw new Error('Cette clé API n’a pas accès au modèle choisi.');
    if (r.status === 429) throw new Error('L’IA est très sollicitée (ou le crédit API est épuisé). Réessaie plus tard.');
    if (!r.ok) throw new Error(`Erreur de l’API Claude (${r.status}).`);
    if (data.stop_reason === 'refusal') throw new Error('La demande a été refusée par l’IA. Reformule-la autrement.');
    if (data.stop_reason === 'max_tokens') throw new Error('La réponse de l’IA était trop longue. Réessaie.');
    return parseJson((data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''));
  }
  return postProcess(mode, await ask(true));
}

async function callApi(body, timeoutMs = 180000) {
  const st = await aiStatus();
  if (!st.ai) throw new Error('La génération IA n’est pas configurée (voir l’espace parents).');
  const t = withTimeout(timeoutMs);
  try {
    return st.mode === 'device' ? await callDevice(body, t.signal) : await callServer(body, t.signal);
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('La génération a pris trop de temps. Réessaie dans un instant.');
    if (e instanceof TypeError) throw new Error('Pas de connexion internet : les exercices hors ligne restent disponibles !');
    throw e;
  } finally {
    t.done();
  }
}

/** Petit test de la clé enregistrée sur l'appareil (requête minimale). */
export async function testDeviceKey() {
  const data = await callApi({ mode: 'exercises', subject: 'Français', level: 1, count: 3,
    chapter: { title: 'Les homophones a / à', summary: 'a / à', lesson: 'a = avait ; à = préposition' } }, 120000);
  return (data.exercises || []).length;
}

function lessonText(chapter) {
  const l = chapter.lesson;
  if (!l) return '';
  return [l.intro, ...(l.rules || []).map((r) => `${r.title} : ${r.text} Ex. : ${(r.examples || []).join(' ; ')}`),
    'Pièges : ' + (l.pitfalls || []).join(' ; ')].join('\n').replace(/\*\*/g, '').slice(0, 3000);
}

/** Points faibles détectés sur ce chapitre (pour cibler la génération). */
export function weaknesses(chapterId) {
  const n = notion(chapterId);
  const top = Object.entries(n.errors || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} (${v} erreur${v > 1 ? 's' : ''})`);
  const examples = reviewItems(chapterId).slice(0, 4).map((r) => r.exercise.question || r.exercise.statement || r.exercise.text).filter(Boolean);
  return { top, examples };
}

/**
 * Génère une nouvelle série avec l'IA et la met en réserve.
 * kind : 'exercises' | 'reading' | 'dictee' | 'targeted'
 */
export async function aiSeries(chapter, { count = 6, level, kind = 'exercises' } = {}) {
  level = level || adaptiveLevel(chapter.id);
  const w = weaknesses(chapter.id);
  const data = await callApi({
    mode: kind === 'reading' || chapter.id === 'lecture' ? 'reading' : kind === 'dictee' || chapter.id === 'dictees' ? 'dictee' : 'exercises',
    subject: chapter.subjectName || 'Français',
    chapter: { title: chapter.title, summary: chapter.summary || '', lesson: lessonText(chapter) },
    level,
    count,
    focus: kind === 'targeted' ? w : null,
    avoid: poolGet(chapter.id).slice(0, 15).map((e) => (e.question || e.statement || e.text || '').slice(0, 120)),
  });
  const list = (data.exercises || []).map(validateExercise).filter(Boolean);
  if (!list.length) throw new Error('L’IA n’a pas produit d’exercice valide. Réessaie !');
  poolAdd(chapter.id, list);
  list.forEach((e) => remember(signature(e)));
  return list;
}

/** Crée un module complet (leçon + exercices) sur un sujet demandé. */
export async function aiModule({ subject, request, level = 2 }) {
  const data = await callApi({ mode: 'module', subject, request, level, count: 8 }, 240000);
  const m = data.module;
  const exercises = (m?.exercises || []).map(validateExercise).filter(Boolean);
  if (!m || !m.lesson || exercises.length < 3) throw new Error('Le module généré est incomplet. Reformule ta demande et réessaie.');
  return {
    id: 'perso-' + Date.now().toString(36),
    custom: true,
    subject: 'perso',
    subjectName: subject,
    domain: 'Mes modules',
    title: m.title,
    emoji: m.emoji || '✨',
    color: '#f39c12',
    summary: m.summary || request,
    request,
    lesson: m.lesson,
    exercises,
    generators: [],
  };
}
