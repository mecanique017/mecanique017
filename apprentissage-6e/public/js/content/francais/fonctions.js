// Chapitre : les fonctions dans la phrase (sujet, COD, COI, attribut, compléments circonstanciels).
import { pick, buildChoices, sample } from '../../core/utils.js';

export const FUNCS = {
  S: { label: 'sujet', rule: 'Le **sujet** indique qui fait l’action ou de qui on parle. Question : « Qui est-ce qui + verbe ? » Le verbe s’accorde avec lui.' },
  COD: { label: 'complément d’objet direct (COD)', rule: 'Le **COD** complète le verbe **sans préposition**. Question : « sujet + verbe + qui ? / quoi ? »' },
  COI: { label: 'complément d’objet indirect (COI)', rule: 'Le **COI** complète le verbe **avec une préposition** (à, de). Question : « sujet + verbe + à qui ? à quoi ? de qui ? de quoi ? »' },
  ATT: { label: 'attribut du sujet', rule: 'L’**attribut du sujet** suit un **verbe d’état** (être, sembler, paraître, devenir, rester, demeurer, avoir l’air) et donne une caractéristique du sujet.' },
  CCL: { label: 'complément circonstanciel de lieu', rule: 'Le **CC de lieu** répond à « où ? ». On peut le **supprimer** ou le **déplacer**.' },
  CCT: { label: 'complément circonstanciel de temps', rule: 'Le **CC de temps** répond à « quand ? ». On peut le **supprimer** ou le **déplacer**.' },
  CCM: { label: 'complément circonstanciel de manière', rule: 'Le **CC de manière** répond à « comment ? ». On peut le **supprimer** ou le **déplacer**.' },
};

// Phrases découpées en groupes : « texte|FONCTION » ; « V » = verbe.
const SENTENCES = [
  'Le chat|S attrape|V une souris|COD dans le grenier|CCL',
  'Mon frère|S prend|V le bus|COD chaque matin|CCT',
  'Les élèves|S parlent|V à leur professeur|COI',
  'Ma grand-mère|S est|V très gentille|ATT',
  'Le soleil|S brille|V dans le ciel|CCL',
  'Julie|S range|V sa chambre|COD avec soin|CCM',
  'Nous|S pensons|V à nos vacances|COI',
  'Ce gâteau|S semble|V délicieux|ATT',
  'Les hirondelles|S reviennent|V au printemps|CCT',
  'Le chevalier|S combat|V le dragon|COD avec courage|CCM',
  'Tom|S téléphone|V à sa cousine|COI le dimanche|CCT',
  'Ces fleurs|S deviennent|V magnifiques|ATT en été|CCT',
  'Le pêcheur|S attend|V patiemment|CCM',
  'Mes amis|S pique-niquent|V au bord du lac|CCL',
  'La neige|S recouvre|V les montagnes|COD',
  'Le petit garçon|S obéit|V à ses parents|COI',
  'Le roi|S paraissait|V inquiet|ATT',
  'Les touristes|S visitent|V le château|COD en silence|CCM',
  'Léo|S mange|V une pomme|COD à la récréation|CCT',
  'Le vent|S souffle|V sur la plage|CCL',
  'Cette histoire|S parle|V de dragons|COI',
  'Les spectateurs|S applaudissent|V les acteurs|COD avec enthousiasme|CCM',
];

const PARSED = SENTENCES.map((s) => {
  const groups = s.split(/(?<=\|[A-Z]+) /).map((g) => {
    const [text, fn] = g.split('|');
    return { text, fn };
  });
  return { groups, text: groups.map((g) => g.text).join(' ') + '.' };
});

const FUNCS_BY_LEVEL = { 1: ['S', 'COD'], 2: ['S', 'COD', 'COI', 'ATT'], 3: Object.keys(FUNCS) };
const clean = (r) => r.replace(/\*\*/g, '');

function genQcm(rng, level) {
  const allowed = FUNCS_BY_LEVEL[level];
  const s = pick(rng, PARSED.filter((p) => p.groups.some((g) => allowed.includes(g.fn))));
  const g = pick(rng, s.groups.filter((x) => allowed.includes(x.fn)));
  const correct = FUNCS[g.fn].label;
  const pool = Object.keys(FUNCS).filter((k) => k !== g.fn && (level === 3 || FUNCS_BY_LEVEL[Math.min(3, level + 1)].includes(k)));
  const { choices, answer } = buildChoices(rng, correct, pool.map((k) => FUNCS[k].label), 4);
  return {
    type: 'qcm',
    notion: 'Fonctions',
    question: `Dans « ${s.text} », quelle est la fonction du groupe « ${g.text} » ?`,
    choices, answer,
    hint: 'Repère d’abord le verbe, puis pose les questions : qui est-ce qui ? / quoi ? / à qui ? / où ? quand ? comment ?',
    explanation: `« ${g.text} » est ${g.fn === 'ATT' ? 'l’' : 'le '}${correct}. ${clean(FUNCS[g.fn].rule)}`,
  };
}

function genIdentify(rng, level) {
  const allowed = FUNCS_BY_LEVEL[level];
  const s = pick(rng, PARSED.filter((p) => p.groups.some((g) => allowed.includes(g.fn))));
  const fn = pick(rng, [...new Set(s.groups.map((g) => g.fn))].filter((f) => allowed.includes(f)));
  const tokens = s.groups.map((g, i) => (i === s.groups.length - 1 ? g.text + '.' : g.text));
  return {
    type: 'identification',
    notion: 'Fonctions',
    question: `Clique sur le groupe qui est ${fn === 'ATT' ? 'l’' : 'le '}${FUNCS[fn].label}.`,
    tokens,
    targets: s.groups.map((g, i) => (g.fn === fn ? i : -1)).filter((i) => i >= 0),
    hint: clean(FUNCS[fn].rule),
    explanation: `Le ${FUNCS[fn].label} est « ${s.groups.filter((g) => g.fn === fn).map((g) => g.text).join(' ')} ». ${clean(FUNCS[fn].rule)}`,
  };
}

function genVraiFaux(rng, level) {
  const allowed = FUNCS_BY_LEVEL[Math.max(2, level)];
  const s = pick(rng, PARSED);
  const g = pick(rng, s.groups.filter((x) => allowed.includes(x.fn)).concat(s.groups.filter((x) => x.fn === 'S')));
  const truth = rng() < 0.5;
  const claimed = truth ? g.fn : pick(rng, allowed.filter((f) => f !== g.fn));
  const good = clean(FUNCS[g.fn].rule);
  const bad = sample(rng, Object.keys(FUNCS).filter((k) => k !== g.fn), 2).map((k) => clean(FUNCS[k].rule));
  const justifications = sample(rng, [good, ...bad], 3);
  return {
    type: 'vraifaux',
    notion: 'Fonctions',
    statement: `Dans « ${s.text} », « ${g.text} » est ${claimed === 'ATT' ? 'l’' : 'le '}${FUNCS[claimed].label}.`,
    answer: truth,
    question: 'Vrai ou faux ? Choisis ensuite la règle qui décrit vraiment ce groupe.',
    justifications,
    justificationAnswer: justifications.indexOf(good),
    hint: 'Essaie de supprimer ou de déplacer le groupe : si c’est possible, c’est un complément circonstanciel.',
    explanation: `« ${g.text} » est ${g.fn === 'ATT' ? 'l’' : 'le '}${FUNCS[g.fn].label}. ${good}`,
  };
}

function genOrdre(rng) {
  // Phrases sans complément circonstanciel (déplaçable) → un seul ordre.
  const s = pick(rng, PARSED.filter((p) => !p.groups.some((g) => g.fn.startsWith('CC'))));
  return {
    type: 'ordre',
    notion: 'Construire une phrase',
    question: 'Remets les groupes dans l’ordre : sujet, verbe, complément.',
    items: s.groups.map((g) => g.text),
    hint: 'Commence par le groupe sujet (il a une majuscule), puis le verbe conjugué.',
    explanation: `« ${s.text} » : ${s.groups.map((g) => `${g.text} = ${g.fn === 'V' ? 'verbe' : FUNCS[g.fn].label}`).join(' ; ')}.`,
  };
}

export default {
  id: 'fonctions',
  subject: 'francais',
  domain: 'Grammaire',
  title: 'Les fonctions dans la phrase',
  emoji: '🎯',
  color: '#ff7a59',
  summary: 'Fonctions : sujet, COD, COI, attribut du sujet, compléments circonstanciels de lieu, temps et manière.',
  lesson: {
    intro: 'La **nature** d’un mot dit ce qu’il **est**. Sa **fonction** dit le **rôle** qu’il joue dans la phrase, un peu comme un joueur dans une équipe : attaquant, défenseur, gardien…',
    rules: [
      { title: 'Le sujet', text: 'Il fait l’action. Question : **Qui est-ce qui** + verbe ? Le verbe s’accorde avec lui.', examples: ['**Le chat** attrape une souris. → Qui est-ce qui attrape ? Le chat.'] },
      { title: 'COD et COI', text: 'Ils complètent le verbe et ne se suppriment pas facilement. Le **COD** se rattache directement ; le **COI** avec **à** ou **de**.', examples: ['Julie range **sa chambre** (COD).', 'Nous pensons **à nos vacances** (COI).'] },
      { title: 'L’attribut du sujet', text: 'Après un **verbe d’état** (être, sembler, paraître, devenir, rester…), il dit comment est le sujet.', examples: ['Ce gâteau semble **délicieux**.'] },
      { title: 'Les compléments circonstanciels', text: 'Ils donnent des précisions : **où** (lieu), **quand** (temps), **comment** (manière). On peut les **supprimer** ou les **déplacer**.', examples: ['**Au printemps**, les hirondelles reviennent.', 'Le chevalier combat le dragon **avec courage**.'] },
    ],
    pitfalls: [
      'Le sujet n’est pas toujours au début : « Sur la branche chantent **les oiseaux** ».',
      'Un groupe avec « à » n’est pas toujours un COI : « Léo mange **à la récréation** » → quand ? C’est un CC de temps (on peut le déplacer).',
      'Après un verbe d’état, ce n’est pas un COD mais un **attribut** : « Il est **content** ».',
    ],
    tip: 'Test magique : si tu peux supprimer ou déplacer le groupe et que la phrase reste correcte, c’est un complément circonstanciel !',
  },
  generators: [genQcm, genIdentify, genVraiFaux, genOrdre],
};
