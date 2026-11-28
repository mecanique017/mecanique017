// Maths – Les fractions : lire, égalités, simplifier, fraction d'une quantité, comparer à 1, écriture décimale.
import { pick, randInt, shuffle, buildChoices, fmt, gcd } from '../../core/utils.js';

const fr = (n, d) => `${n}/${d}`;

function genLire(rng, level) {
  const parts = randInt(rng, 2, level === 1 ? 6 : 10);
  const shaded = randInt(rng, 1, parts - 1);
  const shape = pick(rng, ['bar', 'disc']);
  const correct = fr(shaded, parts);
  const { choices, answer } = buildChoices(rng, correct, [fr(parts, shaded), fr(parts - shaded, parts), fr(shaded, parts - shaded), fr(shaded, parts + 1)], 4);
  return {
    type: 'qcm', notion: 'Lire une fraction',
    question: 'Quelle fraction de la figure est coloriée ?',
    figure: { kind: 'fraction', shape, parts, shaded },
    choices, answer,
    hint: 'Le dénominateur (en bas) = le nombre de parts égales. Le numérateur (en haut) = le nombre de parts coloriées.',
    explanation: `La figure est partagée en ${parts} parts égales et ${shaded} sont coloriées : ${correct}.`,
  };
}

function genEgales(rng, level) {
  const d = randInt(rng, 2, 9), n = randInt(rng, 1, d + (level === 3 ? 4 : -1));
  const k = randInt(rng, 2, level === 1 ? 3 : 6);
  const askNum = rng() < 0.5;
  return {
    type: 'trous', notion: 'Fractions égales',
    question: 'Complète pour obtenir une fraction égale.',
    text: askNum ? `${fr(n, d)} = ___/${d * k}` : `${fr(n, d)} = ${n * k}/___`,
    answers: [[String(askNum ? n * k : d * k)]],
    hint: 'On ne change pas une fraction en multipliant le numérateur ET le dénominateur par le même nombre.',
    explanation: `${fr(n, d)} = ${n} × ${k} / ${d} × ${k} = ${fr(n * k, d * k)}.`,
  };
}

function genSimplifier(rng) {
  let n, d;
  do { d = randInt(rng, 2, 9); n = randInt(rng, 1, d - 1); } while (gcd(n, d) !== 1);
  const k = randInt(rng, 2, 6);
  return {
    type: 'trous', notion: 'Simplifier une fraction',
    question: 'Simplifie cette fraction au maximum (écris-la sous la forme a/b).',
    text: `${fr(n * k, d * k)} = ___`,
    answers: [[fr(n, d), `${n} / ${d}`]],
    hint: `Cherche un nombre qui divise à la fois ${n * k} et ${d * k}.`,
    explanation: `On divise le numérateur et le dénominateur par ${k} : ${fr(n * k, d * k)} = ${fr(n, d)}.`,
  };
}

function genQuantite(rng, level) {
  const d = pick(rng, level === 1 ? [2, 3, 4, 10] : [2, 3, 4, 5, 6, 8, 10]);
  const n = randInt(rng, 1, d - 1);
  const q = d * randInt(rng, 2, level === 3 ? 25 : 12);
  const unit = pick(rng, [['bonbons', ''], ['élèves', ''], ['€', ' €'], ['km', ' km']]);
  const r = (q / d) * n;
  return {
    type: 'trous', notion: 'Fraction d’une quantité',
    question: 'Calcule.', text: `${fr(n, d)} de ${q} ${unit[0]}, c’est ___ ${unit[0]}.`, answers: [[String(r)]],
    hint: `Divise d’abord ${q} par ${d} (une part), puis multiplie par ${n}.`,
    explanation: `${q} ÷ ${d} = ${q / d}, puis ${q / d} × ${n} = ${r}.`,
  };
}

function genCompare1(rng) {
  const d = randInt(rng, 2, 12);
  const n = pick(rng, [randInt(rng, 1, d - 1), d, randInt(rng, d + 1, 2 * d + 3)]);
  const sign = n < d ? '<' : n > d ? '>' : '=';
  return {
    type: 'qcm', notion: 'Comparer une fraction à 1',
    question: `Compare ${fr(n, d)} et 1.`, choices: [`${fr(n, d)} < 1`, `${fr(n, d)} > 1`, `${fr(n, d)} = 1`],
    answer: ['<', '>', '='].indexOf(sign),
    hint: 'Compare le numérateur et le dénominateur : si on prend toutes les parts, on obtient 1 unité.',
    explanation: `${n} ${sign} ${d}, donc ${fr(n, d)} ${sign} 1.`,
  };
}

const DECIMALES = [[1, 2, '0,5'], [1, 4, '0,25'], [3, 4, '0,75'], [1, 5, '0,2'], [2, 5, '0,4'], [1, 10, '0,1'], [7, 10, '0,7'], [3, 2, '1,5'], [5, 4, '1,25'], [9, 100, '0,09'], [37, 100, '0,37'], [1, 8, '0,125'], [5, 2, '2,5']];

function genDecimal(rng, level) {
  const pool = level === 1 ? DECIMALES.slice(0, 7) : DECIMALES;
  const [n, d, dec] = pick(rng, pool);
  return {
    type: 'trous', notion: 'Fraction et écriture décimale',
    question: 'Écris cette fraction sous forme décimale.', text: `${fr(n, d)} = ___`, answers: [[dec]],
    hint: `Une fraction, c’est une division : ${n} ÷ ${d}.`,
    explanation: `${fr(n, d)} = ${n} ÷ ${d} = ${dec}.`,
  };
}

function genVraiFaux(rng) {
  const d = randInt(rng, 2, 7), n = randInt(rng, 1, d - 1), k = randInt(rng, 2, 4);
  const truth = rng() < 0.5;
  const [n2, d2] = truth ? [n * k, d * k] : pick(rng, [[n + k, d + k], [n * k, d + k], [n + 1, d * k]]);
  const good = 'On multiplie (ou divise) le numérateur et le dénominateur par le même nombre.';
  const justifications = shuffle(rng, [good, 'On ajoute le même nombre au numérateur et au dénominateur.', 'Deux fractions sont égales si leurs dénominateurs sont égaux.']);
  return {
    type: 'vraifaux', notion: 'Fractions égales',
    statement: `${fr(n, d)} = ${fr(n2, d2)}`, answer: truth,
    question: 'Vrai ou faux ? Choisis ensuite la règle qui permet de le vérifier.',
    justifications, justificationAnswer: justifications.indexOf(good),
    hint: `Cherche par quel nombre on passe de ${d} à ${d2}. Est-ce le même pour les numérateurs ?`,
    explanation: truth ? `${fr(n, d)} = ${fr(n * k, d * k)} (on a multiplié en haut et en bas par ${k}).` : `${fr(n, d)} = ${fr(n * k, d * k)}, pas ${fr(n2, d2)} : il faut multiplier le haut et le bas par le même nombre.`,
  };
}

export default {
  id: 'math-fractions',
  subject: 'maths',
  subjectName: 'Mathématiques',
  domain: 'Nombres et calculs',
  title: 'Les fractions',
  emoji: '🍕',
  color: '#e17055',
  summary: 'Fractions : fraction-partage (numérateur, dénominateur), fractions égales, simplification, fraction d’une quantité, comparaison à 1, fraction-quotient et écriture décimale.',
  lesson: {
    intro: 'Une **fraction** représente des **parts égales** d’un tout. C’est aussi le résultat d’une **division** !',
    rules: [
      { title: 'Lire une fraction', text: 'Dans **3/4** : le **dénominateur** 4 = nombre de parts égales ; le **numérateur** 3 = nombre de parts prises.', examples: ['3/4 d’une pizza = 3 parts sur 4'] },
      { title: 'Fractions égales', text: 'On obtient une fraction égale en **multipliant** (ou divisant) le numérateur **et** le dénominateur par le **même nombre**. Diviser, c’est **simplifier**.', examples: ['1/2 = 2/4 = 5/10', '6/8 = 3/4'] },
      { title: 'Fraction d’une quantité', text: 'Pour calculer **3/4 de 20** : 20 ÷ 4 = 5 (une part), puis 5 × 3 = 15.', examples: ['2/3 de 12 = 8'] },
      { title: 'Fraction et décimal', text: '**a/b = a ÷ b**. Une fraction est **plus petite que 1** si le numérateur est plus petit que le dénominateur.', examples: ['3/4 = 0,75', '7/5 > 1'] },
    ],
    pitfalls: [
      'Les parts doivent être ÉGALES pour parler de fraction.',
      'Ajouter le même nombre en haut et en bas ne donne PAS une fraction égale : 1/2 ≠ 2/3.',
      'Plus le dénominateur est grand, plus les parts sont petites : 1/8 < 1/4.',
    ],
    tip: 'Pense à une pizza ou une tablette de chocolat : c’est la meilleure façon de « voir » une fraction !',
  },
  generators: [genLire, genLire, genEgales, genSimplifier, genQuantite, genCompare1, genDecimal, genVraiFaux],
};
