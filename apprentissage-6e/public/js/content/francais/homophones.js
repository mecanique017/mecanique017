// Chapitre : les homophones grammaticaux (a/à, et/est, son/sont, ou/où, on/ont, ces/ses).
import { pick, shuffle } from '../../core/utils.js';

export const PAIRS = {
  'a/à': { words: ['a', 'à'], tip: '« a » est le verbe avoir : on peut le remplacer par « avait ». « à » est une préposition : on ne peut pas.' },
  'et/est': { words: ['et', 'est'], tip: '« est » est le verbe être : on peut le remplacer par « était ». « et » relie deux mots : on peut dire « et puis ».' },
  'son/sont': { words: ['son', 'sont'], tip: '« sont » est le verbe être : on peut le remplacer par « étaient ». « son » est un déterminant : on peut dire « mon » ou « ton ».' },
  'ou/où': { words: ['ou', 'où'], tip: '« ou » marque un choix : on peut dire « ou bien ». « où » indique le lieu ou le moment.' },
  'on/ont': { words: ['on', 'ont'], tip: '« ont » est le verbe avoir : on peut le remplacer par « avaient ». « on » est un pronom : on peut le remplacer par « il ».' },
  'ces/ses': { words: ['ces', 'ses'], tip: '« ses » = les siens, les siennes (possession). « ces » montre quelque chose (on peut ajouter « -là » : ces nuages-là).' },
};

// [phrase avec ___, réponse, paire]
const ITEMS = [
  ['Léo ___ un nouveau vélo.', 'a', 'a/à'], ['Nous allons ___ la plage.', 'à', 'a/à'],
  ['Elle ___ mangé toute la tarte.', 'a', 'a/à'], ['Il pense ___ ses vacances.', 'à', 'a/à'],
  ['Ma sœur ___ peur du noir.', 'a', 'a/à'], ['Ce gâteau ___ la fraise est délicieux.', 'à', 'a/à'],
  ['Le train part ___ huit heures.', 'à', 'a/à'], ['Mon chat ___ attrapé une souris.', 'a', 'a/à'],
  ['Le ciel ___ tout bleu.', 'est', 'et/est'], ['Paul ___ Marie sont amis.', 'et', 'et/est'],
  ['Il ___ en retard ce matin.', 'est', 'et/est'], ['J’ai acheté du pain ___ du fromage.', 'et', 'et/est'],
  ['Ce film ___ vraiment drôle.', 'est', 'et/est'], ['Elle chante ___ elle danse.', 'et', 'et/est'],
  ['Mes amis ___ partis en vacances.', 'sont', 'son/sont'], ['Tom range ___ cartable.', 'son', 'son/sont'],
  ['Les fleurs ___ fanées.', 'sont', 'son/sont'], ['Elle a perdu ___ parapluie.', 'son', 'son/sont'],
  ['Ils ___ très contents de leur journée.', 'sont', 'son/sont'], ['Le chien remue ___ museau.', 'son', 'son/sont'],
  ['Veux-tu du thé ___ du café ?', 'ou', 'ou/où'], ['Je ne sais pas ___ est mon livre.', 'où', 'ou/où'],
  ['La ville ___ je suis né est petite.', 'où', 'ou/où'], ['Tu viens à pied ___ à vélo ?', 'ou', 'ou/où'],
  ['Le jour ___ il est arrivé, il pleuvait.', 'où', 'ou/où'],
  ['Mes parents ___ acheté une maison.', 'ont', 'on/ont'], ['Ce soir, ___ mange des crêpes.', 'on', 'on/ont'],
  ['Les élèves ___ fini leur travail.', 'ont', 'on/ont'], ['Demain, ___ partira tôt.', 'on', 'on/ont'],
  ['Les chats ___ faim.', 'ont', 'on/ont'],
  ['Julie cherche ___ lunettes.', 'ses', 'ces/ses'], ['Regarde ___ beaux nuages là-bas !', 'ces', 'ces/ses'],
  ['Le chat lèche ___ pattes.', 'ses', 'ces/ses'], ['J’adore ___ chansons que tu écoutes.', 'ces', 'ces/ses'],
  ['Le roi parle à ___ soldats.', 'ses', 'ces/ses'],
];

const PAIRS_BY_LEVEL = { 1: ['a/à', 'et/est', 'son/sont'], 2: ['a/à', 'et/est', 'son/sont', 'on/ont', 'ou/où'], 3: Object.keys(PAIRS) };

function poolFor(level) {
  return ITEMS.filter((i) => PAIRS_BY_LEVEL[level].includes(i[2]));
}

function genTrous(rng, level) {
  const [text, ans, pair] = pick(rng, poolFor(level));
  return {
    type: 'trous',
    notion: `Homophones ${pair}`,
    question: 'Choisis le bon homophone.',
    text,
    answers: [[ans]],
    choices: shuffle(rng, PAIRS[pair].words),
    hint: PAIRS[pair].tip,
    explanation: `On écrit « ${ans} ». ${PAIRS[pair].tip}`,
  };
}

function genDouble(rng, level) {
  // Deux phrases de la même paire dans un seul texte à trous.
  const pair = pick(rng, PAIRS_BY_LEVEL[level]);
  const items = shuffle(rng, ITEMS.filter((i) => i[2] === pair));
  const a = items[0];
  const b = items.find((i) => i[1] !== a[1]) || items[1];
  return {
    type: 'trous',
    notion: `Homophones ${pair}`,
    question: `Complète avec « ${PAIRS[pair].words[0]} » ou « ${PAIRS[pair].words[1]} ».`,
    text: `${a[0]} ${b[0]}`,
    answers: [[a[1]], [b[1]]],
    choices: shuffle(rng, PAIRS[pair].words),
    hint: PAIRS[pair].tip,
    explanation: `${a[0].replace('___', `[${a[1]}]`)} / ${b[0].replace('___', `[${b[1]}]`)}. ${PAIRS[pair].tip}`,
  };
}

function genVraiFaux(rng, level) {
  const [text, ans, pair] = pick(rng, poolFor(level));
  const truth = rng() < 0.5;
  const other = PAIRS[pair].words.find((w) => w !== ans);
  const shown = text.replace('___', truth ? ans : other);
  const tests = {
    'a/à': ['On peut remplacer par « avait ».', 'On ne peut pas remplacer par « avait ».'],
    'et/est': ['On peut remplacer par « était ».', 'On peut remplacer par « et puis ».'],
    'son/sont': ['On peut remplacer par « étaient ».', 'On peut remplacer par « mon » ou « ton ».'],
    'ou/où': ['On peut remplacer par « ou bien ».', 'Le mot indique un lieu ou un moment.'],
    'on/ont': ['On peut remplacer par « avaient ».', 'On peut remplacer par « il ».'],
    'ces/ses': ['On peut remplacer par « les siens / les siennes ».', 'On montre quelque chose (on peut ajouter « -là »).'],
  };
  // La justification correcte dépend du mot attendu.
  const map = {
    a: 0, 'à': 1, est: 0, et: 1, sont: 0, son: 1, ou: 0, 'où': 1, ont: 0, on: 1, ses: 0, ces: 1,
  };
  const justifications = tests[pair].slice();
  return {
    type: 'vraifaux',
    notion: `Homophones ${pair}`,
    statement: `Cette phrase est bien écrite : « ${shown} »`,
    answer: truth,
    question: 'Vrai ou faux ? Puis choisis le test qui donne la bonne réponse.',
    justifications,
    justificationAnswer: map[ans],
    hint: PAIRS[pair].tip,
    explanation: `Il faut écrire « ${text.replace('___', ans)} ». ${PAIRS[pair].tip}`,
  };
}

export default {
  id: 'homophones',
  subject: 'francais',
  domain: 'Orthographe',
  title: 'Les homophones grammaticaux',
  emoji: '👯',
  color: '#e84393',
  summary: 'Homophones grammaticaux : a/à, et/est, son/sont, ou/où, on/ont, ces/ses, avec les astuces de remplacement.',
  lesson: {
    intro: 'Des **homophones** se prononcent pareil mais s’écrivent différemment. Bonne nouvelle : il existe une **astuce de remplacement** pour chacun !',
    rules: [
      { title: 'a / à', text: '**a** = verbe avoir → remplaçable par **avait**.', examples: ['Il **a** (avait) faim. Il va **à** l’école.'] },
      { title: 'et / est', text: '**est** = verbe être → remplaçable par **était**.', examples: ['Le ciel **est** (était) bleu **et** calme.'] },
      { title: 'son / sont', text: '**sont** = verbe être → **étaient**. **son** = **mon / ton**.', examples: ['Ils **sont** partis avec **son** frère.'] },
      { title: 'on / ont', text: '**ont** = verbe avoir → **avaient**. **on** = **il**.', examples: ['**On** dit qu’ils **ont** gagné.'] },
      { title: 'ou / où', text: '**ou** = **ou bien** (choix). **où** = lieu ou temps.', examples: ['Tu viens **ou** pas ? **Où** vas-tu ?'] },
      { title: 'ces / ses', text: '**ses** = les siens (à lui / à elle). **ces** = ceux-là, celles-là (on montre).', examples: ['Il range **ses** jouets. Regarde **ces** étoiles !'] },
    ],
    pitfalls: [
      'Fais toujours le test de remplacement **dans ta tête** avant d’écrire.',
      '« à » prend toujours un accent : c’est une préposition, pas un verbe.',
      'Le « ù » avec accent n’existe que dans le mot « où » !',
    ],
    tip: 'Verbe avoir ou être ? Mets la phrase à l’imparfait : si ça marche, c’est le verbe (a, est, sont, ont).',
  },
  generators: [genTrous, genTrous, genDouble, genVraiFaux],
};
