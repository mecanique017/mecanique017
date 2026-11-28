// Chapitre : les accords dans le groupe nominal (déterminant, nom, adjectif) + pluriels particuliers.
import { pick, buildChoices, sample, shuffle, capitalize } from '../../core/utils.js';

// Noms : genre, singulier, pluriel (tous commencent par une consonne pour éviter l'élision).
const NOUNS = {
  chat: ['m', 'chat', 'chats'], cheval: ['m', 'cheval', 'chevaux'], bateau: ['m', 'bateau', 'bateaux'],
  jeu: ['m', 'jeu', 'jeux'], journal: ['m', 'journal', 'journaux'], bijou: ['m', 'bijou', 'bijoux'],
  gâteau: ['m', 'gâteau', 'gâteaux'], livre: ['m', 'livre', 'livres'], chemin: ['m', 'chemin', 'chemins'],
  château: ['m', 'château', 'châteaux'], caillou: ['m', 'caillou', 'cailloux'], feu: ['m', 'feu', 'feux'],
  maison: ['f', 'maison', 'maisons'], fleur: ['f', 'fleur', 'fleurs'], robe: ['f', 'robe', 'robes'],
  voiture: ['f', 'voiture', 'voitures'], chanson: ['f', 'chanson', 'chansons'], rue: ['f', 'rue', 'rues'],
  voix: ['f', 'voix', 'voix'], table: ['f', 'table', 'tables'], plume: ['f', 'plume', 'plumes'],
};

// Adjectifs : [masc. sing., fém. sing., masc. plur., fém. plur.], pre = placé avant le nom.
const ADJ = {
  petit: { f: ['petit', 'petite', 'petits', 'petites'], pre: true },
  grand: { f: ['grand', 'grande', 'grands', 'grandes'], pre: true },
  beau: { f: ['beau', 'belle', 'beaux', 'belles'], pre: true },
  nouveau: { f: ['nouveau', 'nouvelle', 'nouveaux', 'nouvelles'], pre: true },
  vieux: { f: ['vieux', 'vieille', 'vieux', 'vieilles'], pre: true },
  long: { f: ['long', 'longue', 'longs', 'longues'], pre: true },
  blanc: { f: ['blanc', 'blanche', 'blancs', 'blanches'] },
  noir: { f: ['noir', 'noire', 'noirs', 'noires'] },
  rond: { f: ['rond', 'ronde', 'ronds', 'rondes'] },
  doux: { f: ['doux', 'douce', 'doux', 'douces'] },
  frais: { f: ['frais', 'fraîche', 'frais', 'fraîches'] },
  délicieux: { f: ['délicieux', 'délicieuse', 'délicieux', 'délicieuses'] },
  gentil: { f: ['gentil', 'gentille', 'gentils', 'gentilles'] },
  étroit: { f: ['étroit', 'étroite', 'étroits', 'étroites'] },
  rapide: { f: ['rapide', 'rapide', 'rapides', 'rapides'] },
  amusant: { f: ['amusant', 'amusante', 'amusants', 'amusantes'] },
  ancien: { f: ['ancien', 'ancienne', 'anciens', 'anciennes'] },
  précieux: { f: ['précieux', 'précieuse', 'précieux', 'précieuses'] },
  passionnant: { f: ['passionnant', 'passionnante', 'passionnants', 'passionnantes'] },
  joyeux: { f: ['joyeux', 'joyeuse', 'joyeux', 'joyeuses'] },
  roux: { f: ['roux', 'rousse', 'roux', 'rousses'] },
  sauvage: { f: ['sauvage', 'sauvage', 'sauvages', 'sauvages'] },
};

// Associations nom + adjectif qui ont du sens.
const PAIRS = [
  ['maison', 'petit'], ['cheval', 'blanc'], ['robe', 'long'], ['voix', 'doux'], ['chanson', 'nouveau'],
  ['bateau', 'vieux'], ['fleur', 'frais'], ['gâteau', 'délicieux'], ['chat', 'gentil'], ['rue', 'étroit'],
  ['table', 'rond'], ['voiture', 'rapide'], ['jeu', 'amusant'], ['journal', 'ancien'], ['bijou', 'précieux'],
  ['livre', 'passionnant'], ['chemin', 'long'], ['robe', 'beau'], ['fleur', 'beau'], ['bateau', 'grand'],
  ['chanson', 'joyeux'], ['voiture', 'noir'], ['chat', 'roux'], ['maison', 'blanc'], ['château', 'vieux'],
  ['cheval', 'sauvage'], ['plume', 'blanc'], ['caillou', 'rond'], ['feu', 'joyeux'], ['château', 'beau'],
];

const DETS = { m: ['le', 'un', 'ce', 'mon'], f: ['la', 'une', 'cette', 'ma'], p: ['les', 'ces', 'mes'] };

function makeGN(rng, noun, adj, plural) {
  const [g, sg, pl] = NOUNS[noun];
  const det = pick(rng, plural ? DETS.p : DETS[g]);
  const idx = (g === 'f' ? 1 : 0) + (plural ? 2 : 0);
  const a = ADJ[adj];
  const n = plural ? pl : sg;
  return { det, n, a, idx, g, plural, adj, noun, form: a.f[idx], pre: !!a.pre };
}
const gnText = (gn, adjForm, nounForm = gn.n) => (gn.pre ? `${gn.det} ${adjForm} ${nounForm}` : `${gn.det} ${nounForm} ${adjForm}`);
const genreLabel = (gn) => `${gn.g === 'f' ? 'féminin' : 'masculin'} ${gn.plural ? 'pluriel' : 'singulier'}`;

function rulePlural(sg, pl) {
  if (sg === pl) return `« ${sg} » se termine déjà par -s, -x ou -z : il ne change pas au pluriel.`;
  if (sg.endsWith('al')) return 'Les noms en **-al** font leur pluriel en **-aux** (un cheval → des chevaux).';
  if (sg.endsWith('eau') || sg.endsWith('eu')) return 'Les noms en **-eau** et **-eu** prennent un **x** au pluriel (un bateau → des bateaux).';
  if (sg.endsWith('ou') && pl.endsWith('x')) return '7 noms en **-ou** prennent un **x** : bijou, caillou, chou, genou, hibou, joujou, pou.';
  return 'En général, on ajoute un **-s** au pluriel.';
}

function genAccordTrous(rng) {
  const [noun, adj] = pick(rng, PAIRS);
  const gn = makeGN(rng, noun, adj, rng() < 0.6);
  const text = gn.pre ? `${capitalize(gn.det)} ___ (${adj}) ${gn.n}` : `${capitalize(gn.det)} ${gn.n} ___ (${adj})`;
  return {
    type: 'trous',
    notion: 'Accord de l’adjectif',
    question: 'Accorde l’adjectif entre parenthèses avec le nom.',
    text,
    answers: [[gn.form]],
    hint: `Cherche le genre et le nombre du nom « ${gn.n} » : est-il masculin ou féminin ? singulier ou pluriel ?`,
    explanation: `« ${gn.n} » est ${genreLabel(gn)}, donc l’adjectif s’écrit « ${gn.form} » : ${gnText(gn, gn.form)}.`,
  };
}

function genPluralTrous(rng, level) {
  const pool = Object.keys(NOUNS).filter((k) => level > 1 || !k.endsWith('ou'));
  const [, sg, pl] = NOUNS[pick(rng, pool)];
  return {
    type: 'trous',
    notion: 'Pluriel des noms',
    question: 'Écris le nom au pluriel.',
    text: `un ${sg} → des ___`.replace(/^un (\S+)/, (m, w) => (NOUNS[w]?.[0] === 'f' ? `une ${w}` : m)),
    answers: [[pl]],
    hint: 'Regarde bien la fin du nom : -al, -eau, -eu, -ou ou déjà -s / -x ?',
    explanation: `Un(e) ${sg} → des ${pl}. ${rulePlural(sg, pl).replace(/\*\*/g, '')}`,
  };
}

function genQcm(rng) {
  const [noun, adj] = pick(rng, PAIRS);
  const gn = makeGN(rng, noun, adj, rng() < 0.7);
  const [, sg, pl] = NOUNS[noun];
  const correct = gnText(gn, gn.form);
  const wrong = new Set();
  gn.a.f.forEach((f) => wrong.add(gnText(gn, f)));
  wrong.add(gnText(gn, gn.form, gn.plural ? sg : pl));
  if (gn.plural && sg !== pl) wrong.add(gnText(gn, gn.a.f[gn.idx - 2], sg));
  const { choices, answer } = buildChoices(rng, correct, [...wrong], 4);
  return {
    type: 'qcm',
    notion: 'Accord dans le GN',
    question: 'Quel groupe nominal est correctement accordé ?',
    choices, answer,
    hint: 'Dans le groupe nominal, le déterminant, le nom et l’adjectif vont ensemble : même genre, même nombre.',
    explanation: `« ${gn.n} » est ${genreLabel(gn)} : on écrit « ${correct} ». ${gn.plural ? rulePlural(sg, pl).replace(/\*\*/g, '') : ''}`.trim(),
  };
}

function genVraiFaux(rng) {
  const [noun, adj] = pick(rng, PAIRS);
  const gn = makeGN(rng, noun, adj, true);
  const [, sg] = NOUNS[noun];
  const truth = rng() < 0.45;
  const errors = [
    { text: gnText(gn, gn.form, sg), why: 'Le nom doit lui aussi être au pluriel.' },
    { text: gnText(gn, gn.a.f[gn.idx === 3 ? 2 : 3]), why: `L’adjectif doit être au ${gn.g === 'f' ? 'féminin' : 'masculin'}, comme le nom.` },
    { text: gnText(gn, gn.a.f[gn.idx - 2]), why: 'L’adjectif doit être au pluriel, comme le nom.' },
  ].filter((e) => e.text !== gnText(gn, gn.form));
  const err = pick(rng, errors);
  const goodJust = 'Le déterminant, le nom et l’adjectif sont tous accordés en genre et en nombre.';
  const shown = truth ? gnText(gn, gn.form) : err.text;
  const correctJust = truth ? goodJust : err.why;
  const allWhy = [goodJust, 'Le nom doit lui aussi être au pluriel.', 'L’adjectif doit être au pluriel, comme le nom.',
    `L’adjectif doit être au ${gn.g === 'f' ? 'féminin' : 'masculin'}, comme le nom.`];
  const justifications = shuffle(rng, [correctJust, ...sample(rng, allWhy.filter((w) => w !== correctJust), 2)]);
  return {
    type: 'vraifaux',
    notion: 'Accord dans le GN',
    statement: `Le groupe nominal « ${shown} » est bien orthographié.`,
    answer: truth,
    question: 'Vrai ou faux ? Puis choisis la bonne justification.',
    justifications,
    justificationAnswer: justifications.indexOf(correctJust),
    hint: 'Vérifie chaque mot : le nom porte-t-il la marque du pluriel ? l’adjectif est-il au bon genre ?',
    explanation: `La bonne écriture est « ${gnText(gn, gn.form)} » (${genreLabel(gn)}).`,
  };
}

export default {
  id: 'accords-gn',
  subject: 'francais',
  domain: 'Orthographe',
  title: 'Les accords dans le groupe nominal',
  emoji: '🔗',
  color: '#00b894',
  summary: 'Accord en genre et en nombre du déterminant, du nom et de l’adjectif ; pluriels en -s, -x, -aux.',
  lesson: {
    intro: 'Dans un **groupe nominal**, le nom est le chef ! Le **déterminant** et l’**adjectif** prennent son **genre** (masculin / féminin) et son **nombre** (singulier / pluriel).',
    rules: [
      { title: 'Le féminin de l’adjectif', text: 'En général on ajoute **-e**. Certains changent davantage.', examples: ['petit → petite', 'beau → belle', 'doux → douce', 'blanc → blanche', 'joyeux → joyeuse', 'ancien → ancienne'] },
      { title: 'Le pluriel', text: 'En général on ajoute **-s** au nom et à l’adjectif.', examples: ['une fleur fraîche → des fleurs fraîches'] },
      { title: 'Les pluriels en -x', text: 'Noms en **-eau**, **-eu** → **-x**. Noms en **-al** → **-aux**. 7 noms en -ou → **-x** : bijou, caillou, chou, genou, hibou, joujou, pou.', examples: ['un bateau → des bateaux', 'un cheval → des chevaux', 'un bijou → des bijoux'] },
      { title: 'Les mots qui ne bougent pas', text: 'Un nom ou un adjectif qui finit déjà par **-s, -x, -z** ne change pas au pluriel.', examples: ['une voix douce → des voix douces', 'un vieux livre → des vieux livres*'] },
    ],
    pitfalls: [
      'L’adjectif peut être loin du nom ou avant lui : « de **belles** robes », « les **vieilles** maisons ».',
      'Les adjectifs déjà terminés par -e ne changent pas au féminin : rapide, sauvage.',
      '* À l’écrit soigné, on écrit souvent « de vieux livres » quand l’adjectif est placé avant le nom.',
    ],
    tip: 'Pose la question : « De quel nom parle cet adjectif ? » puis regarde son déterminant : il te dit souvent le genre et le nombre !',
  },
  generators: [genAccordTrous, genPluralTrous, genQcm, genVraiFaux],
};
