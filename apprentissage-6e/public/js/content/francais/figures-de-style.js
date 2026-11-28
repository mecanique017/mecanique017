// Chapitre : les figures de style simples (comparaison, métaphore, personnification, énumération).
import { pick, shuffle } from '../../core/utils.js';

export const FIGURES = {
  comparaison: 'La **comparaison** rapproche deux éléments grâce à un **outil de comparaison** (comme, tel, pareil à, semblable à, ressembler à…).',
  métaphore: 'La **métaphore** rapproche deux éléments **sans outil de comparaison** : on dit directement que l’un EST l’autre.',
  personnification: 'La **personnification** donne à un objet, un animal ou une idée des **comportements humains** (parler, pleurer, danser…).',
  énumération: 'L’**énumération** est une **liste** de plusieurs éléments à la suite, souvent séparés par des virgules.',
};

// [phrase, figure, outil (pour les comparaisons) ou mot clé]
const ITEMS = [
  ['Ses yeux brillent comme des étoiles.', 'comparaison', 'comme'],
  ['Il est rusé comme un renard.', 'comparaison', 'comme'],
  ['La mer, pareille à un miroir, reflétait le ciel.', 'comparaison', 'pareille à'],
  ['Ce garçon est fort tel un lion.', 'comparaison', 'tel'],
  ['Ta chambre ressemble à un champ de bataille.', 'comparaison', 'ressemble à'],
  ['Les nuages, semblables à des moutons, couraient dans le ciel.', 'comparaison', 'semblables à'],
  ['Ses yeux sont des étoiles.', 'métaphore'],
  ['Cette ville est une fourmilière.', 'métaphore'],
  ['La vie est un long fleuve tranquille.', 'métaphore'],
  ['Ce footballeur est une fusée.', 'métaphore'],
  ['Le ciel est un océan de nuages.', 'métaphore'],
  ['Le vent hurle dans la nuit.', 'personnification'],
  ['Les arbres dansent sous l’orage.', 'personnification'],
  ['La pluie pleure sur les vitres.', 'personnification'],
  ['Le soleil nous sourit ce matin.', 'personnification'],
  ['La vieille maison soupirait à chaque rafale.', 'personnification'],
  ['Le réveil a crié à sept heures.', 'personnification'],
  ['Dans son sac, il y avait des crayons, des cahiers, une gomme, une règle et un vieux goûter.', 'énumération'],
  ['Il courait, sautait, criait, riait sans jamais s’arrêter.', 'énumération'],
  ['Le marché offrait des pommes, des poires, des cerises et des abricots.', 'énumération'],
  ['Le dragon avait des griffes, des écailles, des cornes et des ailes immenses.', 'énumération'],
];

const FIG_BY_LEVEL = { 1: ['comparaison', 'personnification'], 2: ['comparaison', 'métaphore', 'personnification'], 3: Object.keys(FIGURES) };
const clean = (s) => s.replace(/\*\*/g, '');

function genQcm(rng, level) {
  const allowed = FIG_BY_LEVEL[level];
  const [phrase, fig] = pick(rng, ITEMS.filter((i) => allowed.includes(i[1])));
  const choices = shuffle(rng, Object.keys(FIGURES));
  return {
    type: 'qcm',
    notion: 'Figures de style',
    question: `Quelle figure de style reconnais-tu ? « ${phrase} »`,
    choices, answer: choices.indexOf(fig),
    hint: 'Y a-t-il un outil de comparaison (comme, tel…) ? Une chose agit-elle comme un humain ? Une liste ?',
    explanation: clean(FIGURES[fig]),
  };
}

function genOutil(rng) {
  const [phrase, , outil] = pick(rng, ITEMS.filter((i) => i[1] === 'comparaison'));
  const tokens = phrase.split(' ');
  const outilWords = outil.split(' ');
  const start = tokens.findIndex((t, i) => outilWords.every((w, k) => tokens[i + k]?.replace(/[,.]/g, '') === w));
  return {
    type: 'identification',
    notion: 'La comparaison',
    question: 'Clique sur le ou les mots qui forment l’outil de comparaison.',
    tokens,
    targets: outilWords.map((_, k) => start + k),
    hint: 'Les outils de comparaison les plus courants : comme, tel, pareil à, semblable à, ressembler à.',
    explanation: `L’outil de comparaison est « ${outil} ». ${clean(FIGURES.comparaison)}`,
  };
}

function genVraiFaux(rng, level) {
  const allowed = FIG_BY_LEVEL[Math.max(2, level)];
  const [phrase, fig] = pick(rng, ITEMS.filter((i) => allowed.includes(i[1])));
  const truth = rng() < 0.5;
  const claimed = truth ? fig : pick(rng, allowed.filter((f) => f !== fig));
  const justifications = shuffle(rng, Object.keys(FIGURES).slice(0, 3).includes(fig)
    ? [clean(FIGURES[fig]), ...Object.keys(FIGURES).filter((f) => f !== fig).slice(0, 2).map((f) => clean(FIGURES[f]))]
    : [clean(FIGURES[fig]), clean(FIGURES.comparaison), clean(FIGURES.métaphore)]);
  return {
    type: 'vraifaux',
    notion: 'Figures de style',
    statement: `« ${phrase} » est une ${claimed}.`,
    answer: truth,
    question: 'Vrai ou faux ? Choisis ensuite la définition qui correspond vraiment à cette phrase.',
    justifications,
    justificationAnswer: justifications.indexOf(clean(FIGURES[fig])),
    hint: 'Cherche d’abord s’il y a un outil de comparaison : c’est la grande différence entre comparaison et métaphore.',
    explanation: `C’est une ${fig}. ${clean(FIGURES[fig])}`,
  };
}

export default {
  id: 'figures-de-style',
  subject: 'francais',
  domain: 'Lecture',
  title: 'Les figures de style',
  emoji: '🎨',
  color: '#6c5ce7',
  summary: 'Figures de style simples : comparaison (outils), métaphore, personnification, énumération.',
  lesson: {
    intro: 'Les écrivains jouent avec les mots pour créer des **images** dans notre tête. Ces procédés s’appellent des **figures de style**.',
    rules: [
      { title: 'La comparaison', text: 'Deux éléments + un **outil** : comme, tel, pareil à, semblable à, ressembler à.', examples: ['Ses yeux brillent **comme** des étoiles.'] },
      { title: 'La métaphore', text: 'Même idée, mais **sans outil** : c’est une comparaison « cachée ».', examples: ['Ses yeux **sont** des étoiles.'] },
      { title: 'La personnification', text: 'Une chose ou un animal **agit comme un humain**.', examples: ['Le vent **hurle**. Les arbres **dansent**.'] },
      { title: 'L’énumération', text: 'Une **liste** d’éléments, pour insister ou donner une impression d’abondance.', examples: ['des pommes, des poires, des cerises et des abricots'] },
    ],
    pitfalls: [
      '« Il est grand comme son père » compare deux personnes réelles : on parle plutôt de comparaison simple, sans image.',
      'Pour distinguer comparaison et métaphore, cherche l’outil : pas d’outil = métaphore.',
    ],
    tip: 'Pour inventer une métaphore, pars d’une comparaison et enlève le « comme » : « fort comme un lion » → « ce garçon est un lion » !',
  },
  generators: [genQcm, genQcm, genOutil, genVraiFaux],
};
