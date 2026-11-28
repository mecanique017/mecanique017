// Maths – Les nombres décimaux : lire, décomposer, comparer, ranger, encadrer, arrondir.
import { pick, randInt, shuffle, buildChoices, fmt, round } from '../../core/utils.js';

const RANGS = ['millièmes', 'centièmes', 'dixièmes', 'unités', 'dizaines', 'centaines'];

/** Décimal aléatoire avec `d` décimales, représenté exactement (entier / 10^d). */
function rdec(rng, maxInt, d) {
  const p = 10 ** d;
  return round(randInt(rng, 0, maxInt * p) / p, d);
}

function genComparer(rng, level) {
  const I = randInt(rng, 0, level === 1 ? 20 : 200);
  const kinds = ['piege-longueur', 'zero', 'egal', 'simple'];
  const kind = pick(rng, level === 1 ? ['simple', 'piege-longueur', 'egal'] : kinds);
  let a, b;
  if (kind === 'piege-longueur') {
    // 3,5 et 3,45 : le plus long n'est pas le plus grand
    const d1 = randInt(rng, 1, 8);
    a = round(I + d1 / 10, 3);
    b = round(I + (d1 * 10 - randInt(rng, 1, 9)) / 100, 3);
  } else if (kind === 'zero') {
    const x = randInt(rng, 1, 9);
    a = round(I + x / 100, 3); // 2,08
    b = round(I + x / 10, 3); // 2,8
  } else if (kind === 'egal') {
    a = round(I + randInt(rng, 1, 9) / 10, 3);
    b = a;
  } else {
    a = rdec(rng, 50, 2) + I;
    b = rdec(rng, 50, 2) + I;
    a = round(a, 2); b = round(b, 2);
  }
  let sa = fmt(a), sb = kind === 'egal' ? fmt(b) + '0' : fmt(b);
  if (rng() < 0.5) [a, b, sa, sb] = [b, a, sb, sa];
  const sign = a < b ? '<' : a > b ? '>' : '=';
  return {
    type: 'qcm', notion: 'Comparer des décimaux',
    question: `Quel signe faut-il mettre entre ${sa} et ${sb} ?`,
    choices: ['<', '>', '='], answer: ['<', '>', '='].indexOf(sign),
    hint: 'Compare d’abord les parties entières, puis les dixièmes, puis les centièmes… Tu peux ajouter des zéros à la fin pour avoir autant de chiffres.',
    explanation: `${sa} ${sign} ${sb}. On compare chiffre par chiffre en partant de la gauche (au besoin : ${fmt(a)} = ${a.toFixed(3).replace('.', ',')} et ${fmt(b)} = ${b.toFixed(3).replace('.', ',')}).`,
  };
}

function genRanger(rng, level) {
  const I = randInt(rng, 1, 30);
  const set = new Set();
  while (set.size < (level === 1 ? 3 : 4)) {
    const d = pick(rng, [1, 2, 2, 3]);
    set.add(round(I + randInt(rng, 1, 10 ** d - 1) / 10 ** d, 3));
  }
  const sorted = [...set].sort((x, y) => x - y);
  return {
    type: 'ordre', notion: 'Ranger des décimaux',
    question: 'Range ces nombres dans l’ordre croissant (du plus petit au plus grand).',
    items: sorted.map((x) => fmt(x)), separator: ' < ',
    hint: 'Écris-les tous avec le même nombre de décimales (ajoute des zéros) pour mieux comparer.',
    explanation: `Ordre croissant : ${sorted.map((x) => fmt(x)).join(' < ')}.`,
  };
}

function genRang(rng) {
  // Nombre aux chiffres tous différents, ex. 352,817
  const digits = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6);
  const intPart = digits.slice(0, 3).join('');
  const decPart = digits.slice(3).join('');
  const s = `${intPart},${decPart}`;
  const pos = randInt(rng, 0, 5); // 0..2 partie entière, 3..5 décimales
  const digit = digits[pos];
  const rang = ['centaines', 'dizaines', 'unités', 'dixièmes', 'centièmes', 'millièmes'][pos];
  const { choices, answer } = buildChoices(rng, rang, RANGS, 4);
  return {
    type: 'qcm', notion: 'Valeur des chiffres',
    question: `Dans le nombre ${s}, quel est le rang du chiffre ${digit} ?`,
    choices, answer,
    hint: 'Après la virgule : dixièmes, centièmes, millièmes. Avant : unités, dizaines, centaines.',
    explanation: `Dans ${s}, le ${digit} est le chiffre des ${rang}.`,
  };
}

function genDecomposer(rng, level) {
  const u = randInt(rng, 0, level === 1 ? 9 : 99), di = randInt(rng, 0, 9), ce = randInt(rng, 1, 9);
  const v = round(u + di / 10 + ce / 100, 2);
  const forms = [
    { text: `${u} unité${u > 1 ? 's' : ''}, ${di} dixième${di > 1 ? 's' : ''} et ${ce} centième${ce > 1 ? 's' : ''} = ___`, why: `${u} + ${fmt(di / 10)} + ${fmt(ce / 100)} = ${fmt(v)}` },
    { text: `${Math.round(v * 100)} centièmes = ___`, why: `100 centièmes = 1 unité, donc ${Math.round(v * 100)} centièmes = ${fmt(v)}` },
    { text: `${Math.round(v * 100)}/100 = ___`, why: `diviser par 100 décale les chiffres de deux rangs vers la droite : ${fmt(v)}` },
  ];
  const f = pick(rng, forms);
  return {
    type: 'trous', notion: 'Écritures des décimaux',
    question: 'Écris ce nombre sous forme décimale (avec une virgule).',
    text: f.text, answers: [[fmt(v)]],
    hint: '1 unité = 10 dixièmes = 100 centièmes.',
    explanation: `${f.why}.`,
  };
}

function genEncadrer(rng, level) {
  const v = round(randInt(rng, 10, 999) + randInt(rng, 1, 99) / 100, 2);
  if (level === 1 || rng() < 0.4) {
    return {
      type: 'trous', notion: 'Encadrer',
      question: 'Encadre ce nombre entre deux nombres entiers consécutifs.',
      text: `___ < ${fmt(v)} < ___`, answers: [[String(Math.floor(v))], [String(Math.floor(v) + 1)]],
      hint: 'Regarde la partie entière (avant la virgule).',
      explanation: `${Math.floor(v)} < ${fmt(v)} < ${Math.floor(v) + 1} : la partie entière de ${fmt(v)} est ${Math.floor(v)}.`,
    };
  }
  const toTenth = rng() < 0.5;
  const ans = toTenth ? round(Math.round(v * 10) / 10, 1) : Math.round(v);
  return {
    type: 'trous', notion: 'Arrondir',
    question: `Arrondis ce nombre ${toTenth ? 'au dixième' : 'à l’unité'}.`,
    text: `${fmt(v)} ≈ ___`, answers: [[fmt(ans)]],
    hint: `Regarde le chiffre juste après celui ${toTenth ? 'des dixièmes' : 'des unités'} : s’il est 5 ou plus, on arrondit au-dessus.`,
    explanation: `${fmt(v)} arrondi ${toTenth ? 'au dixième' : 'à l’unité'} donne ${fmt(ans)}.`,
  };
}

function genVraiFaux(rng) {
  const I = randInt(rng, 1, 20), d1 = randInt(rng, 2, 9);
  const a = round(I + d1 / 10, 2), b = round(I + (d1 - 1) / 10 + randInt(rng, 1, 9) / 100, 2);
  const truth = rng() < 0.5;
  const [x, y] = truth ? [a, b] : [b, a];
  const good = 'On compare d’abord les parties entières, puis les dixièmes, puis les centièmes.';
  const justifications = shuffle(rng, [good, 'Le nombre qui a le plus de chiffres est le plus grand.', 'On compare seulement les derniers chiffres de chaque nombre.']);
  return {
    type: 'vraifaux', notion: 'Comparer des décimaux',
    statement: `${fmt(x)} est plus grand que ${fmt(y)}.`, answer: x > y,
    question: 'Vrai ou faux ? Choisis ensuite la bonne méthode.',
    justifications, justificationAnswer: justifications.indexOf(good),
    hint: 'Attention au piège : plus de chiffres ne veut pas dire plus grand !',
    explanation: `${fmt(a)} > ${fmt(b)} : mêmes unités, mais ${d1} dixièmes > ${d1 - 1} dixièmes.`,
  };
}

export default {
  id: 'math-nombres',
  subject: 'maths',
  subjectName: 'Mathématiques',
  domain: 'Nombres et calculs',
  title: 'Les nombres décimaux',
  emoji: '🔢',
  color: '#0984e3',
  summary: 'Nombres décimaux : valeur des chiffres, écriture fractionnaire décimale, décomposition, comparaison, rangement, encadrement, arrondi.',
  lesson: {
    intro: 'Un **nombre décimal** a une **partie entière** et une **partie décimale**, séparées par la **virgule**. Chaque chiffre a une valeur qui dépend de son **rang**.',
    rules: [
      { title: 'Les rangs', text: '… centaines, dizaines, **unités** , **dixièmes**, **centièmes**, **millièmes**. 1 unité = 10 dixièmes = 100 centièmes = 1 000 millièmes.', examples: ['Dans 352,817 : 8 est le chiffre des dixièmes, 1 des centièmes.'] },
      { title: 'Écritures', text: 'Un décimal peut s’écrire avec une **fraction décimale** ou une **décomposition**.', examples: ['3,47 = 347/100 = 3 + 4/10 + 7/100'] },
      { title: 'Comparer', text: 'On compare les **parties entières**, puis les **dixièmes**, puis les **centièmes**… On peut ajouter des **zéros inutiles** à droite.', examples: ['3,5 = 3,50 > 3,45'] },
      { title: 'Encadrer et arrondir', text: 'Encadrer à l’unité : 7 < 7,64 < 8. **Arrondir** : on prend la valeur la plus proche (si le chiffre suivant est 5 ou plus, on arrondit au-dessus).', examples: ['7,64 ≈ 8 à l’unité ; 7,64 ≈ 7,6 au dixième'] },
    ],
    pitfalls: [
      'Un nombre avec plus de chiffres n’est pas forcément plus grand : 3,5 > 3,45.',
      '2,08 et 2,8 ne sont pas égaux : 2,08 = 2 unités et 8 centièmes.',
      'Les zéros à la fin de la partie décimale ne changent rien : 4,50 = 4,5.',
    ],
    tip: 'Pour comparer, écris les nombres l’un sous l’autre en alignant les virgules !',
  },
  generators: [genComparer, genRanger, genRang, genDecomposer, genEncadrer, genVraiFaux],
};
