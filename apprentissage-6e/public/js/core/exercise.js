// Schéma commun des exercices + validation + correction.
// Partagé entre le navigateur, le serveur (validation des sorties IA) et les tests.
import { normalizeAnswer, stripAccents } from './utils.js';

export const TYPES = ['qcm', 'trous', 'ordre', 'identification', 'vraifaux', 'dictee'];

export const TYPE_LABELS = {
  qcm: 'QCM',
  trous: 'Texte à trous',
  ordre: 'Remise en ordre',
  identification: 'Identification',
  vraifaux: 'Vrai ou faux',
  dictee: 'Dictée',
};

const isStr = (v, max = 2000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isStrArr = (v, min = 1, max = 40) =>
  Array.isArray(v) && v.length >= min && v.length <= max && v.every((x) => isStr(x, 400));

/**
 * Vérifie et nettoie un exercice (source locale ou IA).
 * Retourne l'exercice normalisé, ou null s'il est invalide.
 */
export function validateExercise(raw) {
  if (!raw || typeof raw !== 'object' || !TYPES.includes(raw.type)) return null;
  const ex = {
    type: raw.type,
    hint: isStr(raw.hint, 600) ? raw.hint.trim() : 'Relis bien la consigne et la leçon.',
    explanation: isStr(raw.explanation, 1500) ? raw.explanation.trim() : '',
  };
  if (isStr(raw.passage, 5000)) ex.passage = raw.passage.trim();
  if (isStr(raw.passageTitle, 200)) ex.passageTitle = raw.passageTitle.trim();
  if (isStr(raw.notion, 120)) ex.notion = raw.notion.trim();

  switch (raw.type) {
    case 'qcm': {
      if (!isStr(raw.question) || !isStrArr(raw.choices, 2, 6)) return null;
      const a = Number(raw.answer);
      if (!Number.isInteger(a) || a < 0 || a >= raw.choices.length) return null;
      if (new Set(raw.choices.map(normalizeAnswer)).size !== raw.choices.length) return null;
      Object.assign(ex, { question: raw.question.trim(), choices: raw.choices.map((c) => c.trim()), answer: a });
      break;
    }
    case 'trous': {
      if (!isStr(raw.text)) return null;
      const blanks = raw.text.split('___').length - 1;
      if (blanks < 1 || !Array.isArray(raw.answers) || raw.answers.length !== blanks) return null;
      // Chaque réponse peut être une chaîne ou une liste de réponses acceptées.
      const answers = raw.answers.map((a) => (Array.isArray(a) ? a : [a]).filter((x) => isStr(x, 200)).map((x) => x.trim()));
      if (answers.some((a) => a.length === 0)) return null;
      ex.question = isStr(raw.question) ? raw.question.trim() : 'Complète.';
      ex.text = raw.text.trim();
      ex.answers = answers;
      if (isStrArr(raw.choices, 2, 8)) {
        ex.choices = raw.choices.map((c) => c.trim());
        // Les réponses doivent figurer dans la banque de mots.
        const bank = ex.choices.map(normalizeAnswer);
        if (!answers.every((a) => a.some((x) => bank.includes(normalizeAnswer(x))))) return null;
      }
      break;
    }
    case 'ordre': {
      if (!isStrArr(raw.items, 3, 14)) return null;
      ex.question = isStr(raw.question) ? raw.question.trim() : 'Remets dans l’ordre.';
      ex.items = raw.items.map((i) => i.trim());
      if (Array.isArray(raw.alternatives)) {
        ex.alternatives = raw.alternatives.filter((alt) => isStrArr(alt, ex.items.length, ex.items.length));
      }
      if (isStr(raw.separator, 5)) ex.separator = raw.separator;
      break;
    }
    case 'identification': {
      if (!isStr(raw.question) || !isStrArr(raw.tokens, 2, 60) || !Array.isArray(raw.targets)) return null;
      const t = [...new Set(raw.targets.map(Number))];
      if (t.length === 0 || t.some((i) => !Number.isInteger(i) || i < 0 || i >= raw.tokens.length)) return null;
      Object.assign(ex, { question: raw.question.trim(), tokens: raw.tokens.map((x) => x.trim()), targets: t.sort((a, b) => a - b) });
      break;
    }
    case 'vraifaux': {
      if (!isStr(raw.statement) || typeof raw.answer !== 'boolean') return null;
      ex.statement = raw.statement.trim();
      ex.answer = raw.answer;
      ex.question = isStr(raw.question) ? raw.question.trim() : 'Vrai ou faux ? Puis justifie.';
      if (isStrArr(raw.justifications, 2, 5)) {
        const j = Number(raw.justificationAnswer);
        if (!Number.isInteger(j) || j < 0 || j >= raw.justifications.length) return null;
        ex.justifications = raw.justifications.map((x) => x.trim());
        ex.justificationAnswer = j;
      }
      break;
    }
    case 'dictee': {
      if (!isStr(raw.text, 800)) return null;
      ex.text = raw.text.trim();
      ex.question = isStr(raw.question) ? raw.question.trim() : 'Écoute et écris la phrase.';
      break;
    }
  }
  return ex;
}

/** Découpe une phrase de dictée en mots comparables. */
export function dicteeWords(s) {
  return String(s)
    .replace(/[’`]/g, "'")
    .replace(/[.,;:!?«»"()…—–-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Alignement mot à mot (distance d'édition) pour un retour précis en dictée. */
export function diffWords(expected, given) {
  const a = dicteeWords(expected);
  const b = dicteeWords(given);
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  const eq = (x, y) => x.toLowerCase() === y.toLowerCase();
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (eq(a[i - 1], b[j - 1]) ? 0 : 1));
  // Remontée : liste des mots attendus avec leur statut.
  const out = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (eq(a[i - 1], b[j - 1]) ? 0 : 1)) {
      out.unshift({ word: a[i - 1], given: b[j - 1], ok: eq(a[i - 1], b[j - 1]) });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      out.unshift({ word: a[i - 1], given: '', ok: false });
      i--;
    } else {
      j--; // mot en trop tapé par l'élève : compté via le score
    }
  }
  const okCount = out.filter((w) => w.ok).length;
  const extra = Math.max(0, m - out.filter((w) => w.given).length);
  return { words: out, score: n ? Math.max(0, (okCount - extra) / n) : 0 };
}

/**
 * Corrige une réponse.
 * @returns {{correct:boolean, score:number, accentOnly?:boolean, partial?:any}}
 */
export function checkAnswer(ex, response) {
  switch (ex.type) {
    case 'qcm':
      return { correct: response === ex.answer, score: response === ex.answer ? 1 : 0 };
    case 'trous': {
      const given = (response || []).map(normalizeAnswer);
      let ok = 0, accentOnly = true;
      const detail = ex.answers.map((accepted, i) => {
        const good = accepted.some((a) => normalizeAnswer(a) === given[i]);
        if (good) ok++;
        else if (!accepted.some((a) => stripAccents(normalizeAnswer(a)) === stripAccents(given[i] || ''))) accentOnly = false;
        return good;
      });
      const correct = ok === ex.answers.length;
      return { correct, score: ok / ex.answers.length, accentOnly: !correct && accentOnly, partial: detail };
    }
    case 'ordre': {
      const given = (response || []).join('\u0001');
      const valid = [ex.items, ...(ex.alternatives || [])].some((seq) => seq.join('\u0001') === given);
      return { correct: valid, score: valid ? 1 : 0 };
    }
    case 'identification': {
      const sel = [...new Set(response || [])].sort((a, b) => a - b);
      const correct = sel.length === ex.targets.length && sel.every((v, i) => v === ex.targets[i]);
      const hits = sel.filter((s) => ex.targets.includes(s)).length;
      const wrong = sel.length - hits;
      return { correct, score: Math.max(0, (hits - wrong) / ex.targets.length) };
    }
    case 'vraifaux': {
      const tf = response?.value === ex.answer;
      const just = ex.justifications ? response?.justification === ex.justificationAnswer : true;
      return { correct: tf && just, score: (tf ? 0.5 : 0) + (just ? 0.5 : 0), partial: { tf, just } };
    }
    case 'dictee': {
      const d = diffWords(ex.text, response || '');
      return { correct: d.score >= 0.999, score: d.score, partial: d };
    }
  }
  return { correct: false, score: 0 };
}

/** Texte lisible de la bonne réponse (affiché après deux essais). */
export function describeAnswer(ex) {
  switch (ex.type) {
    case 'qcm': return ex.choices[ex.answer];
    case 'trous': {
      let i = 0;
      return ex.text.replace(/___/g, () => `【${ex.answers[i++][0]}】`);
    }
    case 'ordre': return ex.items.join(ex.separator ?? ' ');
    case 'identification': return ex.targets.map((t) => ex.tokens[t]).join(' · ');
    case 'vraifaux':
      return (ex.answer ? 'VRAI' : 'FAUX') + (ex.justifications ? ` — ${ex.justifications[ex.justificationAnswer]}` : '');
    case 'dictee': return ex.text;
  }
  return '';
}
