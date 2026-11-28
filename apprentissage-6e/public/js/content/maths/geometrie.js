// Maths – Géométrie : angles, droites, triangles, quadrilatères, cercle, symétrie axiale.
import { pick, randInt, shuffle, buildChoices } from '../../core/utils.js';
import { bankGenerators } from '../bank.js';

function genAngleType(rng, level) {
  const kind = pick(rng, level === 1 ? ['aigu', 'droit', 'obtus'] : ['aigu', 'droit', 'obtus', 'plat']);
  const deg = { aigu: randInt(rng, 20, 75), droit: 90, obtus: randInt(rng, 105, 165), plat: 180 }[kind];
  const choices = ['aigu', 'droit', 'obtus', 'plat'];
  return {
    type: 'qcm', notion: 'Les angles',
    question: 'Quelle est la nature de cet angle ?',
    figure: { kind: 'angle', degrees: deg, rotation: randInt(rng, 0, 40) },
    choices, answer: choices.indexOf(kind),
    hint: 'Compare-le à un angle droit (le coin d’une feuille, 90°).',
    explanation: { aigu: 'Il est plus petit qu’un angle droit : c’est un angle aigu (moins de 90°).', droit: 'Il mesure 90° (marqué par un petit carré) : c’est un angle droit.', obtus: 'Il est plus grand qu’un angle droit mais plus petit qu’un angle plat : c’est un angle obtus (entre 90° et 180°).', plat: 'Ses deux côtés forment une droite : c’est un angle plat (180°).' }[kind],
  };
}

function genAngleMesure(rng) {
  const deg = pick(rng, [30, 60, 90, 120, 150]);
  const { choices, answer } = buildChoices(rng, `${deg}°`, ['30°', '60°', '90°', '120°', '150°'], 4);
  return {
    type: 'qcm', notion: 'Mesurer un angle',
    question: 'Quelle est, environ, la mesure de cet angle ?',
    figure: { kind: 'angle', degrees: deg, rotation: randInt(rng, 0, 30) },
    choices, answer,
    hint: 'Repère d’abord s’il est aigu (< 90°) ou obtus (> 90°). Un tiers d’angle droit fait 30°.',
    explanation: `Cet angle mesure environ ${deg}° : il est ${deg < 90 ? 'aigu' : deg === 90 ? 'droit' : 'obtus'}. Avec un rapporteur, on place le centre sur le sommet et le zéro sur un côté.`,
  };
}

function genDroites(rng) {
  const kind2 = pick(rng, ['parallel', 'perpendicular', 'secant']);
  const label = { parallel: 'parallèles', perpendicular: 'perpendiculaires', secant: 'sécantes (non perpendiculaires)' }[kind2];
  const choices = shuffle(rng, ['parallèles', 'perpendiculaires', 'sécantes (non perpendiculaires)']);
  return {
    type: 'qcm', notion: 'Droites',
    question: 'Comment sont ces deux droites ?',
    figure: { kind: 'lines', kind2 },
    choices, answer: choices.indexOf(label),
    hint: 'Se coupent-elles ? Si oui, forment-elles un angle droit ?',
    explanation: { parallel: 'Elles ne se coupent jamais, même prolongées : elles sont parallèles.', perpendicular: 'Elles se coupent en formant un angle droit : elles sont perpendiculaires.', secant: 'Elles se coupent sans former d’angle droit : elles sont sécantes.' }[kind2],
  };
}

const bank = bankGenerators({
  notion: 'Figures géométriques',
  hint: 'Pense aux propriétés : côtés de même longueur, angles droits, côtés parallèles.',
  qcm: [
    { q: 'Un triangle qui a deux côtés de même longueur est un triangle…', a: 'isocèle', d: ['équilatéral', 'rectangle', 'quelconque'], e: 'Isocèle = au moins deux côtés de même longueur.', n: 'Triangles' },
    { q: 'Un triangle qui a ses trois côtés de même longueur est un triangle…', a: 'équilatéral', d: ['isocèle seulement', 'rectangle', 'quelconque'], e: 'Équilatéral = trois côtés de même longueur (et trois angles de 60°).', n: 'Triangles' },
    { q: 'Un triangle qui a un angle droit est un triangle…', a: 'rectangle', d: ['isocèle', 'équilatéral', 'obtus'], e: 'Un triangle rectangle possède un angle droit.', n: 'Triangles' },
    { q: 'Quel quadrilatère a quatre angles droits et quatre côtés de même longueur ?', a: 'le carré', d: ['le rectangle', 'le losange', 'le trapèze'], e: 'Le carré est à la fois un rectangle (4 angles droits) et un losange (4 côtés égaux).', n: 'Quadrilatères' },
    { q: 'Quel quadrilatère a quatre côtés de même longueur ?', a: 'le losange', d: ['le rectangle', 'le trapèze', 'le cerf-volant'], e: 'Le losange a quatre côtés de même longueur (le carré est un losange particulier).', n: 'Quadrilatères' },
    { q: 'Dans un cercle, comment s’appelle un segment qui relie le centre à un point du cercle ?', a: 'un rayon', d: ['un diamètre', 'une corde', 'un arc'], e: 'Le rayon relie le centre à un point du cercle ; le diamètre passe par le centre et relie deux points du cercle.', n: 'Le cercle' },
    { q: 'Combien d’axes de symétrie possède un carré ?', a: '4', d: ['2', '1', '0'], e: 'Le carré a 4 axes : ses 2 diagonales et ses 2 médianes.', n: 'Symétrie axiale', l: 2 },
    { q: 'Combien d’axes de symétrie possède un rectangle (qui n’est pas un carré) ?', a: '2', d: ['4', '1', '0'], e: 'Le rectangle a 2 axes : les droites qui passent par les milieux des côtés opposés (pas ses diagonales !).', n: 'Symétrie axiale', l: 2 },
    { q: 'Combien d’axes de symétrie possède un triangle équilatéral ?', a: '3', d: ['1', '2', '0'], e: 'Le triangle équilatéral a 3 axes de symétrie.', n: 'Symétrie axiale', l: 2 },
    { q: 'Combien d’axes de symétrie possède un triangle isocèle (non équilatéral) ?', a: '1', d: ['2', '3', '0'], e: 'Le triangle isocèle a un seul axe de symétrie, qui passe par son sommet principal.', n: 'Symétrie axiale', l: 3 },
    { q: 'Quel instrument utilise-t-on pour tracer un angle droit ?', a: 'l’équerre', d: ['le compas', 'le rapporteur seulement', 'la calculatrice'], e: 'L’équerre sert à tracer et vérifier les angles droits.', n: 'Instruments' },
    { q: 'Quel instrument utilise-t-on pour tracer un cercle ?', a: 'le compas', d: ['l’équerre', 'la règle', 'le rapporteur'], e: 'On trace un cercle avec un compas, dont l’écartement est égal au rayon.', n: 'Instruments' },
  ],
  vf: [
    { s: 'Un carré est un rectangle particulier.', v: true, e: 'Le carré a quatre angles droits : c’est un rectangle dont tous les côtés sont égaux.' },
    { s: 'Un rectangle a toujours quatre côtés de même longueur.', v: false, e: 'Un rectangle a quatre angles droits, mais ses côtés ne sont pas tous égaux (sauf s’il est carré).' },
    { s: 'Les diagonales d’un rectangle ont la même longueur.', v: true, e: 'Dans un rectangle, les diagonales sont de même longueur et se coupent en leur milieu.', l: 2 },
    { s: 'Un losange a toujours quatre angles droits.', v: false, e: 'Un losange a quatre côtés égaux, mais ses angles ne sont pas forcément droits.' },
    { s: 'Le diamètre d’un cercle mesure deux fois son rayon.', v: true, e: 'Diamètre = 2 × rayon, car il passe par le centre.' },
    { s: 'Deux droites perpendiculaires se coupent en formant un angle droit.', v: true, e: 'C’est la définition de deux droites perpendiculaires.' },
    { s: 'Dans une symétrie axiale, la figure symétrique est plus petite que la figure de départ.', v: false, e: 'La symétrie axiale conserve les longueurs, les angles et les aires : c’est comme un pliage.', l: 2 },
  ],
});

export default {
  id: 'math-geometrie',
  subject: 'maths',
  subjectName: 'Mathématiques',
  domain: 'Espace et géométrie',
  title: 'La géométrie',
  emoji: '📐',
  color: '#6c5ce7',
  summary: 'Angles (aigu, droit, obtus, plat, estimation de mesure), droites parallèles, perpendiculaires et sécantes, triangles et quadrilatères particuliers, cercle (rayon, diamètre), symétrie axiale, instruments.',
  lesson: {
    intro: 'La géométrie, c’est l’art de décrire les **figures** avec précision, grâce à un **vocabulaire** et des **instruments** (règle, équerre, compas, rapporteur).',
    rules: [
      { title: 'Les angles', text: '**Aigu** : moins de 90°. **Droit** : 90°. **Obtus** : entre 90° et 180°. **Plat** : 180°. On les mesure avec un **rapporteur**.', examples: ['Le coin d’une feuille est un angle droit.'] },
      { title: 'Les droites', text: '**Parallèles** : ne se coupent jamais. **Perpendiculaires** : se coupent en formant un angle droit. **Sécantes** : se coupent.', examples: ['Les rails d’un train sont parallèles.'] },
      { title: 'Triangles et quadrilatères', text: 'Triangle **isocèle** (2 côtés égaux), **équilatéral** (3 côtés égaux), **rectangle** (un angle droit). **Rectangle** : 4 angles droits. **Losange** : 4 côtés égaux. **Carré** : les deux !', examples: [] },
      { title: 'Cercle et symétrie', text: 'Tous les points d’un cercle sont à la même distance du **centre** : le **rayon**. **Diamètre = 2 × rayon**. La **symétrie axiale** est un pliage : elle conserve les longueurs et les angles.', examples: ['Le carré a 4 axes de symétrie, le rectangle 2.'] },
    ],
    pitfalls: [
      'Les diagonales d’un rectangle ne sont PAS des axes de symétrie (sauf pour le carré).',
      'Un angle ne dépend pas de la longueur de ses côtés tracés.',
      'Sur un rapporteur, choisis la bonne graduation (intérieure ou extérieure) en partant du 0.',
    ],
    tip: 'Pour vérifier un angle droit, place ton équerre : si elle colle parfaitement, c’est gagné !',
  },
  generators: [genAngleType, genAngleMesure, genDroites, ...bank, ...bank],
};
