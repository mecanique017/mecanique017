// Maths – Proportionnalité : situations, recettes, tableaux, pourcentages simples.
import { pick, randInt, shuffle, fmt, round } from '../../core/utils.js';

const OBJETS = [['cahiers', '€'], ['croissants', '€'], ['places de cinéma', '€'], ['stylos', '€'], ['kg de pommes', '€'], ['litres d’essence', '€']];

function genPrix(rng, level) {
  const [obj, unit] = pick(rng, OBJETS);
  const pu = level === 1 ? randInt(rng, 1, 9) : round(randInt(rng, 3, 30) / 2, 1); // prix unitaire
  const n1 = randInt(rng, 2, 6);
  let n2 = randInt(rng, 2, 12); if (n2 === n1) n2 += 1;
  const p1 = round(pu * n1, 2), p2 = round(pu * n2, 2);
  return {
    type: 'trous', notion: 'Situations de proportionnalité',
    question: 'Le prix est proportionnel à la quantité achetée. Complète.',
    text: `${n1} ${obj} coûtent ${fmt(p1)} ${unit}. Donc ${n2} ${obj} coûtent ___ ${unit}.`, answers: [[fmt(p2)]],
    hint: `Calcule d’abord le prix pour 1 (${fmt(p1)} ÷ ${n1}), puis multiplie par ${n2}.`,
    explanation: `Prix pour 1 : ${fmt(p1)} ÷ ${n1} = ${fmt(pu)} ${unit}. Pour ${n2} : ${fmt(pu)} × ${n2} = ${fmt(p2)} ${unit}.`,
  };
}

function genRecette(rng) {
  const ingr = pick(rng, [['g de farine', 50], ['g de sucre', 25], ['œufs', 1], ['cL de lait', 10], ['g de beurre', 20]]);
  const per = ingr[1] * randInt(rng, 1, 4); // quantité par personne
  const p1 = pick(rng, [2, 4, 6]);
  const p2 = pick(rng, [2, 3, 4, 6, 8, 10, 12].filter((x) => x !== p1));
  return {
    type: 'trous', notion: 'Recettes et proportionnalité',
    question: 'Les quantités sont proportionnelles au nombre de personnes.',
    text: `Pour ${p1} personnes, il faut ${per * p1} ${ingr[0]}. Pour ${p2} personnes, il faut ___ ${ingr[0]}.`, answers: [[String(per * p2)]],
    hint: `Combien faut-il pour 1 personne ? (${per * p1} ÷ ${p1})`,
    explanation: `Pour 1 personne : ${per * p1} ÷ ${p1} = ${per}. Pour ${p2} personnes : ${per} × ${p2} = ${per * p2} ${ingr[0]}.`,
  };
}

function genPourcentage(rng, level) {
  const p = pick(rng, level === 1 ? [50, 10, 25] : [10, 20, 25, 50, 75, 5]);
  const base = { 50: 2, 10: 10, 25: 4, 20: 5, 75: 4, 5: 20 }[p] * randInt(rng, 2, level === 3 ? 60 : 25);
  const r = (base * p) / 100;
  const tips = { 50: 'la moitié', 25: 'le quart', 10: 'le dixième (on divise par 10)', 20: 'le cinquième (ou 2 × 10 %)', 75: 'les trois quarts', 5: 'la moitié de 10 %' };
  return {
    type: 'trous', notion: 'Pourcentages',
    question: 'Calcule.', text: `${p} % de ${base} = ___`, answers: [[fmt(r)]],
    hint: `${p} %, c’est ${tips[p]}.`,
    explanation: `${p} % de ${base} = ${base} × ${p} ÷ 100 = ${fmt(r)} (c’est ${tips[p]} de ${base}).`,
  };
}

function genTableau(rng, level) {
  const k = randInt(rng, 2, level === 1 ? 5 : 9);
  const xs = [...new Set([randInt(rng, 1, 4), randInt(rng, 5, 8), randInt(rng, 9, 12)])];
  const ys = xs.map((x) => x * k);
  const prop = rng() < 0.5;
  if (!prop) ys[randInt(rng, 1, ys.length - 1)] += pick(rng, [1, 2, -1]);
  const table = xs.map((x, i) => `${x} → ${ys[i]}`).join(' ; ');
  return {
    type: 'qcm', notion: 'Reconnaître la proportionnalité',
    question: `Ce tableau est-il un tableau de proportionnalité ?  ${table}`,
    choices: ['Oui', 'Non'], answer: prop ? 0 : 1,
    hint: 'Divise chaque nombre du bas par celui du haut : obtiens-tu toujours le même résultat ?',
    explanation: prop ? `Oui : on multiplie toujours par ${k} (coefficient de proportionnalité).` : `Non : ${xs.map((x, i) => `${ys[i]} ÷ ${x} = ${fmt(ys[i] / x, 2)}`).join(', ')} — ce n’est pas toujours le même nombre.`,
  };
}

const SITUATIONS = [
  ['Le prix payé et le nombre de baguettes achetées (même prix pour chacune)', true],
  ['L’âge d’un enfant et sa taille', false],
  ['La distance parcourue et la durée, pour une voiture roulant toujours à la même vitesse', true],
  ['La pointure de chaussures et l’âge', false],
  ['Le nombre de tickets de bus et le prix total (sans réduction)', true],
  ['La note à un contrôle et le temps passé à le faire', false],
  ['Le périmètre d’un carré et la longueur de son côté', true],
];

function genSituation(rng) {
  const [s, prop] = pick(rng, SITUATIONS);
  const good = prop ? 'Si l’une est multipliée par 2, l’autre aussi.' : 'Si l’une double, l’autre ne double pas forcément.';
  const justifications = shuffle(rng, [good, prop ? 'Si l’une double, l’autre ne double pas forcément.' : 'Si l’une est multipliée par 2, l’autre aussi.', 'Les deux grandeurs augmentent, donc elles sont proportionnelles.']);
  return {
    type: 'vraifaux', notion: 'Reconnaître la proportionnalité',
    statement: `${s} sont deux grandeurs proportionnelles.`, answer: prop,
    question: 'Vrai ou faux ? Choisis ensuite la bonne justification.',
    justifications, justificationAnswer: justifications.indexOf(good),
    hint: 'Imagine que l’une des grandeurs double : l’autre double-t-elle aussi, à coup sûr ?',
    explanation: prop ? 'Oui : quand l’une est multipliée par un nombre, l’autre est multipliée par le même nombre.' : 'Non : les deux grandeurs peuvent augmenter ensemble sans être proportionnelles.',
  };
}

export default {
  id: 'math-proportionnalite',
  subject: 'maths',
  subjectName: 'Mathématiques',
  domain: 'Nombres et calculs',
  title: 'La proportionnalité',
  emoji: '⚖️',
  color: '#a29bfe',
  summary: 'Proportionnalité : passage par l’unité, recettes, tableaux et coefficient de proportionnalité, reconnaître une situation proportionnelle, pourcentages simples (10 %, 25 %, 50 %, 75 %).',
  lesson: {
    intro: 'Deux grandeurs sont **proportionnelles** quand on passe de l’une à l’autre en **multipliant toujours par le même nombre** (le **coefficient de proportionnalité**).',
    rules: [
      { title: 'Le passage par l’unité', text: 'On calcule d’abord la valeur pour **1**, puis pour la quantité demandée.', examples: ['3 cahiers = 6 € → 1 cahier = 2 € → 5 cahiers = 10 €'] },
      { title: 'Le tableau de proportionnalité', text: 'Chaque nombre de la 2e ligne = nombre de la 1re ligne × **coefficient**.', examples: ['2 → 6 ; 3 → 9 ; 5 → 15 (× 3)'] },
      { title: 'Les pourcentages', text: '**p %** de N = N × p ÷ 100. Repères : **50 %** = la moitié, **25 %** = le quart, **10 %** = on divise par 10.', examples: ['10 % de 250 = 25', '75 % de 40 = 30'] },
    ],
    pitfalls: [
      'Deux grandeurs qui augmentent ensemble ne sont pas forcément proportionnelles (âge et taille).',
      'Dans une recette, on ne rajoute pas : on multiplie. Pour 6 au lieu de 4 personnes, on multiplie par 1,5.',
    ],
    tip: 'Pose-toi la question : « Si je double l’un, est-ce que l’autre double ? » Si oui à chaque fois, c’est proportionnel.',
  },
  generators: [genPrix, genRecette, genPourcentage, genTableau, genSituation],
};
