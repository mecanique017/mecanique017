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

// --- Nombres (écriture française) ------------------------------------------------

/** Formate un nombre à la française : virgule décimale, espace pour les milliers (2 000). */
export function fmt(n, maxDecimals = 3) {
  const r = Number(Number(n).toFixed(maxDecimals));
  let [int, dec] = String(Math.abs(r)).split('.');
  if (int.length > 3) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (r < 0 ? '-' : '') + int + (dec ? ',' + dec : '');
}

/** Lit un nombre écrit par l'élève (« 3,5 », « 3.5 », « 1 000 »). Renvoie NaN si ce n'est pas un nombre. */
export function parseNumber(s) {
  const t = String(s ?? '').trim().replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$|^-?\.\d+$/.test(t)) return NaN;
  return Number(t);
}

export const isNumericAnswer = (s) => !Number.isNaN(parseNumber(s));

/** Arrondi sûr (évite 0.1 + 0.2 = 0.30000000000000004). */
export const round = (n, d = 6) => Number(Number(n).toFixed(d));

export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
