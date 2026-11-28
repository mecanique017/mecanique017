// Maths – Calcul : mental, ×/÷ par 10, 100, 1 000, division euclidienne, divisibilité, ordre de grandeur, parenthèses.
import { pick, randInt, shuffle, buildChoices, fmt, round } from '../../core/utils.js';

function genMental(rng, level) {
  const ops = level === 1 ? ['+', '-', '×'] : level === 2 ? ['+', '-', '×', '+d', '-d'] : ['+d', '-d', '×', '×d'];
  const op = pick(rng, ops);
  let a, b, r, txt;
  switch (op) {
    case '+': a = randInt(rng, 12, 99); b = randInt(rng, 12, 99); r = a + b; txt = `${a} + ${b}`; break;
    case '-': a = randInt(rng, 40, 150); b = randInt(rng, 11, a - 5); r = a - b; txt = `${a} − ${b}`; break;
    case '×': a = randInt(rng, 2, level === 1 ? 9 : 12); b = randInt(rng, 2, level === 3 ? 25 : 10); r = a * b; txt = `${a} × ${b}`; break;
    case '+d': a = round(randInt(rng, 10, 200) / 10, 1); b = round(randInt(rng, 5, 150) / 100, 2); r = round(a + b, 2); txt = `${fmt(a)} + ${fmt(b)}`; break;
    case '-d': a = round(randInt(rng, 50, 200) / 10, 1); b = round(randInt(rng, 5, 45) / 10, 1); r = round(a - b, 2); txt = `${fmt(a)} − ${fmt(b)}`; break;
    case '×d': a = round(randInt(rng, 11, 99) / 10, 1); b = randInt(rng, 2, 9); r = round(a * b, 2); txt = `${fmt(a)} × ${b}`; break;
  }
  return {
    type: 'trous', notion: 'Calcul mental',
    question: 'Calcule de tête.', text: `${txt} = ___`, answers: [[fmt(r)]],
    hint: op.includes('d') ? 'Aligne mentalement les virgules : unités avec unités, dixièmes avec dixièmes…' : 'Décompose : par exemple 47 + 38 = 47 + 30 + 8.',
    explanation: `${txt} = ${fmt(r)}.`,
  };
}

function genPuissances10(rng, level) {
  const k = pick(rng, [10, 100, 1000]);
  const div = level >= 2 && rng() < 0.5;
  const a = level === 1 ? randInt(rng, 2, 99) : round(randInt(rng, 11, 9999) / pick(rng, [10, 100]), 2);
  const r = round(div ? a / k : a * k, 6);
  const n = String(k).length - 1;
  return {
    type: 'trous', notion: 'Multiplier / diviser par 10, 100, 1 000',
    question: 'Calcule.', text: `${fmt(a)} ${div ? '÷' : '×'} ${fmt(k)} = ___`, answers: [[fmt(r, 6)]],
    hint: `${div ? 'Diviser' : 'Multiplier'} par ${fmt(k)}, c’est décaler chaque chiffre de ${n} rang${n > 1 ? 's' : ''} vers la ${div ? 'droite' : 'gauche'} (la virgule semble bouger).`,
    explanation: `${fmt(a)} ${div ? '÷' : '×'} ${fmt(k)} = ${fmt(r, 6)} : chaque chiffre prend une valeur ${fmt(k)} fois plus ${div ? 'petite' : 'grande'}.`,
  };
}

function genDivEuclid(rng, level) {
  const b = randInt(rng, 3, level === 3 ? 25 : 9);
  const q = randInt(rng, 4, level === 1 ? 15 : 60);
  const r = randInt(rng, 0, b - 1);
  const a = b * q + r;
  return {
    type: 'trous', notion: 'Division euclidienne',
    question: `Effectue la division euclidienne de ${a} par ${b}.`,
    text: `Quotient : ___  Reste : ___`, answers: [[String(q)], [String(r)]],
    hint: `Cherche le plus grand multiple de ${b} inférieur ou égal à ${a}. Le reste doit être plus petit que ${b}.`,
    explanation: `${a} = ${b} × ${q} + ${r}, avec ${r} < ${b}. Le quotient est ${q} et le reste ${r}.`,
  };
}

const CRIT = {
  2: { ok: (n) => `Son chiffre des unités (${n % 10}) est pair.`, ko: (n) => `Son chiffre des unités (${n % 10}) est impair.` },
  5: { ok: (n) => `Son chiffre des unités est ${n % 10}.`, ko: (n) => `Son chiffre des unités (${n % 10}) n’est ni 0 ni 5.` },
  10: { ok: () => 'Son chiffre des unités est 0.', ko: (n) => `Son chiffre des unités (${n % 10}) n’est pas 0.` },
  3: { ok: (n, s) => `La somme de ses chiffres (${s}) est un multiple de 3.`, ko: (n, s) => `La somme de ses chiffres (${s}) n’est pas un multiple de 3.` },
  9: { ok: (n, s) => `La somme de ses chiffres (${s}) est un multiple de 9.`, ko: (n, s) => `La somme de ses chiffres (${s}) n’est pas un multiple de 9.` },
};

function genDivisibilite(rng, level) {
  const d = pick(rng, level === 1 ? [2, 5, 10] : [2, 3, 5, 9, 10]);
  let n = randInt(rng, 100, level === 3 ? 9999 : 999);
  if (rng() < 0.5) n -= n % d; // la moitié du temps, un multiple
  if (n < 100) n += d * 20;
  const s = String(n).split('').reduce((a, c) => a + Number(c), 0);
  const truth = n % d === 0;
  const good = truth ? CRIT[d].ok(n, s) : CRIT[d].ko(n, s);
  const bad = truth ? CRIT[d].ko(n, s) : CRIT[d].ok(n, s);
  const justifications = shuffle(rng, [good, bad, d === 2 ? 'La somme de ses chiffres est paire.' : 'C’est un nombre à plusieurs chiffres.']);
  const rule = { 2: 'son chiffre des unités est 0, 2, 4, 6 ou 8', 5: 'son chiffre des unités est 0 ou 5', 10: 'son chiffre des unités est 0', 3: 'la somme de ses chiffres est un multiple de 3', 9: 'la somme de ses chiffres est un multiple de 9' }[d];
  return {
    type: 'vraifaux', notion: 'Critères de divisibilité',
    statement: `${fmt(n)} est divisible par ${d}.`, answer: truth,
    question: 'Vrai ou faux ? Choisis ensuite la bonne justification.',
    justifications, justificationAnswer: justifications.indexOf(good),
    hint: `Un nombre est divisible par ${d} si ${rule}.`,
    explanation: `${good} Donc ${fmt(n)} ${truth ? 'est' : 'n’est pas'} divisible par ${d}${truth ? ` (${fmt(n)} = ${d} × ${fmt(n / d)})` : ''}.`,
  };
}

/** Arrondi à un seul chiffre significatif (398 → 400, 21 → 20). */
const roughly = (n) => { const p = 10 ** (String(n).length - 1); return Math.round(n / p) * p; };

function genOrdreGrandeur(rng) {
  const a = randInt(rng, 120, 980), b = randInt(rng, 11, 89);
  const ra = roughly(a), rb = roughly(b);
  const est = ra * rb;
  const { choices, answer } = buildChoices(rng, fmt(est), [fmt(est * 10), fmt(est / 10), fmt(est * 100), fmt(est / 2)], 4);
  return {
    type: 'qcm', notion: 'Ordre de grandeur',
    question: `Quel est un ordre de grandeur de ${a} × ${b} ?`,
    choices, answer,
    hint: 'Arrondis chaque nombre (par exemple 398 ≈ 400 et 21 ≈ 20), puis calcule.',
    explanation: `${a} ≈ ${fmt(ra)} et ${b} ≈ ${rb}, donc ${a} × ${b} ≈ ${fmt(ra)} × ${rb} = ${fmt(est)} (valeur exacte : ${fmt(a * b)}).`,
  };
}

function genParentheses(rng) {
  const a = randInt(rng, 2, 20), b = randInt(rng, 2, 12), c = randInt(rng, 2, 9);
  const withPar = rng() < 0.5;
  const r = withPar ? (a + b) * c : a + b * c;
  const txt = withPar ? `(${a} + ${b}) × ${c}` : `${a} + ${b} × ${c}`;
  return {
    type: 'trous', notion: 'Calculs avec parenthèses',
    question: 'Calcule en respectant l’ordre des opérations.', text: `${txt} = ___`, answers: [[String(r)]],
    hint: 'On calcule d’abord ce qui est entre parenthèses ; sans parenthèses, la multiplication passe avant l’addition.',
    explanation: withPar ? `(${a} + ${b}) × ${c} = ${a + b} × ${c} = ${r}.` : `${a} + ${b} × ${c} = ${a} + ${b * c} = ${r} (la multiplication d’abord).`,
  };
}

export default {
  id: 'math-calcul',
  subject: 'maths',
  subjectName: 'Mathématiques',
  domain: 'Nombres et calculs',
  title: 'Le calcul',
  emoji: '🧮',
  color: '#00b894',
  summary: 'Calcul mental (entiers et décimaux), multiplier/diviser par 10, 100, 1 000, division euclidienne, critères de divisibilité (2, 3, 5, 9, 10), ordre de grandeur, calculs avec parenthèses.',
  lesson: {
    intro: 'Calculer vite et juste, c’est un super-pouvoir ! Voici les techniques à connaître en 6e.',
    rules: [
      { title: '× et ÷ par 10, 100, 1 000', text: '**Multiplier** par 10, 100, 1 000 : chaque chiffre devient 10, 100, 1 000 fois **plus grand** (il se décale vers la gauche). **Diviser** : vers la droite.', examples: ['3,45 × 100 = 345', '27 ÷ 10 = 2,7'] },
      { title: 'La division euclidienne', text: '**dividende = diviseur × quotient + reste**, avec **reste < diviseur**.', examples: ['87 = 6 × 14 + 3'] },
      { title: 'Critères de divisibilité', text: 'Par **2** : chiffre des unités pair. Par **5** : 0 ou 5. Par **10** : 0. Par **3** (ou **9**) : la somme des chiffres est un multiple de 3 (ou 9).', examples: ['345 : 3 + 4 + 5 = 12 → divisible par 3'] },
      { title: 'Ordre de grandeur et priorités', text: 'Arrondis pour **estimer** un résultat. On calcule d’abord les **parenthèses**, puis les **multiplications** avant les additions.', examples: ['398 × 21 ≈ 400 × 20 = 8 000', '5 + 3 × 2 = 11'] },
    ],
    pitfalls: [
      'Pour additionner des décimaux, on aligne les virgules : 3,5 + 1,25 = 4,75 (et pas 1,30).',
      'Dans une division euclidienne, le reste est toujours plus petit que le diviseur.',
      '5 + 3 × 2 ne fait pas 16 : la multiplication est prioritaire.',
    ],
    tip: 'Avant un calcul posé, estime le résultat : si ta réponse est très loin de l’estimation, il y a sûrement une erreur !',
  },
  generators: [genMental, genMental, genPuissances10, genDivEuclid, genDivisibilite, genOrdreGrandeur, genParentheses],
};
