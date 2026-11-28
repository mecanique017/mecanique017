// Orchestration de la génération : moteur local paramétrable + moteur IA (via /api/generate) + réserve locale.
import { BUILTIN_CHAPTERS } from '../content/index.js';
import { validateExercise } from './exercise.js';
import { makeRng, shuffle, signature } from './utils.js';
import { getState, poolGet, poolAdd, notion, reviewItems } from './state.js';
import { levelFromMastery } from './gamification.js';

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
export function suggestChapter() {
  const chapters = allChapters();
  const worked = chapters.filter((c) => notion(c.id).attempts > 0);
  const fresh = chapters.filter((c) => notion(c.id).attempts === 0 && !c.custom);
  const weak = worked.filter((c) => notion(c.id).mastery < 70).sort((a, b) => notion(a.id).mastery - notion(b.id).mastery);
  if (weak.length && (rng() < 0.6 || !fresh.length)) return { chapter: weak[0], reason: 'À consolider' };
  if (fresh.length) return { chapter: fresh[0], reason: 'Nouvelle notion' };
  return { chapter: worked.sort((a, b) => notion(a.id).mastery - notion(b.id).mastery)[0], reason: 'Pour progresser encore' };
}

// --- Moteur IA -----------------------------------------------------------------
let statusCache = null;
export async function aiStatus(force = false) {
  if (statusCache && !force) return statusCache;
  try {
    const r = await fetch('api/health', { cache: 'no-store' });
    statusCache = r.ok ? await r.json() : { ai: false };
  } catch {
    statusCache = { ai: false, offline: true };
  }
  return statusCache;
}

async function callApi(body, timeoutMs = 180000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch('api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('La génération a pris trop de temps. Réessaie dans un instant.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
