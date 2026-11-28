// Progression de l'élève : sauvegarde locale (localStorage), XP, série de jours, maîtrise, erreurs à revoir.
import { todayKey, daysBetween, signature } from './utils.js';
import { XP, DAILY_GOAL, newBadges, levelInfo } from './gamification.js';

const KEY = 'app6e.progression.v1';
const POOL_KEY = 'app6e.pool.v1';
const MAX_REVIEW = 40;
const MAX_POOL_PER_CHAPTER = 80;

// Stockage tolérant : si localStorage est indisponible (navigation privée…), on garde en mémoire.
const memory = {};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return memory[k] ?? null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { memory[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch { delete memory[k]; } },
};

function defaults() {
  return {
    version: 1,
    profile: { name: '', avatar: '🦊', createdAt: todayKey() },
    xp: 0,
    streak: { count: 0, best: 0, last: null },
    daily: { date: todayKey(), xp: 0, goalReached: false },
    notions: {}, // chapterId -> { attempts, correct, mastery, lastSeen, errors: {notion: n} }
    review: [], // exercices ratés (copie) à revoir
    badges: [],
    customChapters: [], // modules générés par l'IA
    stats: { answered: 0, correct: 0, secondTry: 0, perfectSeries: 0, series: 0, reviewFixed: 0, perfectDictees: 0, dailyGoals: 0 },
    history: [], // { date, chapterId, score, total, xp }
    settings: { tts: true, aiDefault: false },
  };
}

let state = load();

function load() {
  try {
    const raw = JSON.parse(store.get(KEY));
    if (raw && raw.version === 1) {
      const d = defaults();
      return { ...d, ...raw, stats: { ...d.stats, ...raw.stats }, settings: { ...d.settings, ...raw.settings }, profile: { ...d.profile, ...raw.profile } };
    }
  } catch { /* données corrompues : on repart de zéro */ }
  return defaults();
}

export function save() { store.set(KEY, JSON.stringify(state)); }
export const getState = () => state;

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(event) { listeners.forEach((fn) => fn(state, event)); }

export function setProfile(p) { state.profile = { ...state.profile, ...p }; save(); emit({ type: 'profile' }); }
export function setSetting(k, v) { state.settings[k] = v; save(); }

function rollDaily() {
  const t = todayKey();
  if (state.daily.date !== t) state.daily = { date: t, xp: 0, goalReached: false };
}

/** Met à jour la série de jours consécutifs (appelé à chaque activité). */
function touchStreak() {
  const t = todayKey();
  const s = state.streak;
  if (s.last === t) return;
  s.count = s.last && daysBetween(s.last, t) === 1 ? s.count + 1 : 1;
  s.best = Math.max(s.best, s.count);
  s.last = t;
}

/** Série « vivante » : affichée à 0 si l'élève a manqué plus d'un jour. */
export function currentStreak() {
  const s = state.streak;
  if (!s.last) return 0;
  return daysBetween(s.last, todayKey()) <= 1 ? s.count : 0;
}

export function notion(chapterId) {
  return state.notions[chapterId] || { attempts: 0, correct: 0, mastery: 0, lastSeen: null, errors: {} };
}

function addXp(n) {
  const before = levelInfo(state.xp).level;
  state.xp += n;
  rollDaily();
  state.daily.xp += n;
  const events = [];
  if (!state.daily.goalReached && state.daily.xp >= DAILY_GOAL) {
    state.daily.goalReached = true;
    state.stats.dailyGoals++;
    events.push({ type: 'daily-goal' });
  }
  const after = levelInfo(state.xp).level;
  if (after > before) events.push({ type: 'level-up', level: after });
  return events;
}

/**
 * Enregistre une réponse.
 * @param {object} p { chapterId, exercise, attempt (1|2), correct, score, combo, fromReview }
 * @returns {{xp:number, events:object[]}}
 */
export function recordAnswer({ chapterId, exercise, attempt, correct, score, combo = 0, fromReview = false }) {
  touchStreak();
  const n = { ...notion(chapterId) };
  n.errors = { ...n.errors };
  n.attempts++;
  if (correct) n.correct++;
  // Maîtrise : moyenne glissante (les réponses récentes comptent plus). Au 2e essai, crédit partiel.
  const value = correct ? (attempt === 1 ? 100 : 60) : Math.round(score * 40);
  n.mastery = Math.round(n.mastery + (value - n.mastery) * 0.2);
  n.lastSeen = todayKey();
  if (!correct && exercise.notion) n.errors[exercise.notion] = (n.errors[exercise.notion] || 0) + 1;
  state.notions[chapterId] = n;

  state.stats.answered++;
  if (correct) state.stats.correct++;
  if (correct && attempt === 2) state.stats.secondTry++;
  if (exercise.type === 'dictee' && correct && attempt === 1) state.stats.perfectDictees++;

  let xp = correct ? (attempt === 1 ? XP.firstTry : XP.secondTry) : XP.effort;
  if (correct && combo > 0 && combo % 3 === 0) xp += XP.streakBonus;

  const sig = signature(exercise);
  if (!correct) {
    if (!state.review.some((r) => r.sig === sig)) {
      state.review.unshift({ sig, chapterId, exercise, date: todayKey() });
      state.review = state.review.slice(0, MAX_REVIEW);
    }
  } else if (fromReview) {
    const before = state.review.length;
    state.review = state.review.filter((r) => r.sig !== sig);
    if (state.review.length < before) state.stats.reviewFixed++;
  }

  const events = addXp(xp);
  save();
  emit({ type: 'answer' });
  return { xp, events };
}

/** Fin de série : bonus, historique, badges. */
export function finishSeries({ chapterId, score, total }) {
  state.stats.series++;
  let bonus = 0;
  if (total > 0 && score === total) { state.stats.perfectSeries++; bonus = XP.perfectSeries; }
  const events = bonus ? addXp(bonus) : [];
  state.history.unshift({ date: todayKey(), chapterId, score, total, xp: bonus });
  state.history = state.history.slice(0, 200);
  const badges = newBadges(state);
  state.badges.push(...badges.map((b) => b.id));
  save();
  emit({ type: 'series' });
  return { bonus, events, badges };
}

/** Vérifie les badges hors série (ex. création de module). */
export function checkBadges() {
  const badges = newBadges(state);
  if (badges.length) { state.badges.push(...badges.map((b) => b.id)); save(); }
  return badges;
}

export function reviewItems(chapterId) {
  return chapterId ? state.review.filter((r) => r.chapterId === chapterId) : state.review;
}

// --- Modules personnalisés (générés par IA) ---------------------------------
export function addCustomChapter(ch) {
  state.customChapters = state.customChapters.filter((c) => c.id !== ch.id);
  state.customChapters.unshift(ch);
  save();
  emit({ type: 'custom' });
}
export function removeCustomChapter(id) {
  state.customChapters = state.customChapters.filter((c) => c.id !== id);
  delete state.notions[id];
  save();
  emit({ type: 'custom' });
}

// --- Réserve d'exercices IA (réutilisables hors ligne) ----------------------
function loadPool() { try { return JSON.parse(store.get(POOL_KEY)) || {}; } catch { return {}; } }
export function poolGet(chapterId) { return loadPool()[chapterId] || []; }
export function poolAdd(chapterId, exercises) {
  const pool = loadPool();
  const cur = pool[chapterId] || [];
  const sigs = new Set(cur.map(signature));
  const added = exercises.filter((e) => !sigs.has(signature(e)));
  pool[chapterId] = [...added, ...cur].slice(0, MAX_POOL_PER_CHAPTER);
  store.set(POOL_KEY, JSON.stringify(pool));
  return added.length;
}
export function poolCount() { return Object.values(loadPool()).reduce((a, l) => a + l.length, 0); }

// --- Export / import / réinitialisation (espace parent) ---------------------
export function exportData() {
  return JSON.stringify({ app: 'apprentissage-6e', exportedAt: new Date().toISOString(), progression: state, pool: loadPool() }, null, 2);
}
export function importData(json) {
  const data = JSON.parse(json);
  if (data?.app !== 'apprentissage-6e' || data.progression?.version !== 1) throw new Error('Fichier non reconnu.');
  store.set(KEY, JSON.stringify(data.progression));
  if (data.pool) store.set(POOL_KEY, JSON.stringify(data.pool));
  state = load();
  emit({ type: 'import' });
}
export function resetAll() {
  store.del(KEY);
  store.del(POOL_KEY);
  state = defaults();
  emit({ type: 'reset' });
}
