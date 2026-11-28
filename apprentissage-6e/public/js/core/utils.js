// Utilitaires purs (utilisables dans le navigateur ET dans Node pour les tests).

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Prend n éléments distincts au hasard. */
export const sample = (rng, arr, n) => shuffle(rng, arr).slice(0, n);

/** Construit un QCM : mélange la bonne réponse parmi des distracteurs uniques. */
export function buildChoices(rng, correct, distractors, total = 4) {
  const uniq = [...new Set(distractors.filter((d) => d !== correct))];
  const choices = shuffle(rng, [correct, ...sample(rng, uniq, total - 1)]);
  return { choices, answer: choices.indexOf(correct) };
}

export const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Normalise une réponse tapée : espaces, apostrophes, casse. */
export function normalizeAnswer(s) {
  return String(s ?? '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Signature courte d'un exercice pour éviter les doublons. */
export function signature(ex) {
  const core = [ex.type, ex.question, ex.text, ex.statement, ex.passage?.slice(0, 40),
    (ex.tokens || []).join(' '), (ex.items || []).join('|'), (ex.choices || []).join('|')].join('#');
  let h = 0;
  for (let i = 0; i < core.length; i++) h = (Math.imul(31, h) + core.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(a, b) {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.round((db - da) / 86400000);
}
