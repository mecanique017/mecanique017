// Chapitres de conjugaison générés par le moteur : présent, futur, imparfait & passé simple.
import { pick, buildChoices, shuffle, capitalize } from '../../core/utils.js';
import {
  conjugate, withPronoun, endingsHint, auTemps, TENSES, PRONOUN_VARIANTS, PERSON_LABELS,
  VERBS_G1, VERBS_G2, VERBS_IRREG, verbGroup,
} from './conjugaison-engine.js';

const EASY_G1 = VERBS_G1.filter((v) => !/[gc]er$/.test(v));
const SOFT_G1 = VERBS_G1.filter((v) => /[gc]er$/.test(v));

function verbPool(level) {
  if (level === 1) return [...EASY_G1, 'être', 'avoir'];
  if (level === 2) return [...EASY_G1, ...SOFT_G1, ...VERBS_G2, 'être', 'avoir', 'aller', 'faire'];
  return [...VERBS_G1, ...VERBS_G2, ...VERBS_IRREG, ...VERBS_IRREG]; // plus d'irréguliers au niveau 3
}

function pickPerson(rng, inf, tense, avoidElision = true) {
  for (let k = 0; k < 10; k++) {
    const p = Math.floor(rng() * 6);
    const form = conjugate(inf, tense, p);
    if (avoidElision && p === 0 && /^[aeiouyéèêâîôûh]/i.test(form)) continue;
    return { p, form, pronoun: pick(rng, PRONOUN_VARIANTS[p]) };
  }
  return { p: 1, form: conjugate(inf, tense, 1), pronoun: 'tu' };
}

function makeTrous(tenses) {
  return function genTrous(rng, level) {
    const tense = pick(rng, tenses);
    const inf = pick(rng, verbPool(level));
    const { p, form, pronoun } = pickPerson(rng, inf, tense);
    return {
      type: 'trous',
      notion: `Conjugaison – ${TENSES[tense]}`,
      question: `Conjugue le verbe ${auTemps(tense)} de l’indicatif.`,
      text: `${capitalize(pronoun)} ___ (${inf}).`,
      answers: [[form]],
      hint: endingsHint(inf, tense),
      explanation: `${capitalize(withPronoun(pronoun, form))} : ${PERSON_LABELS[p]} du ${TENSES[tense]}. ${endingsHint(inf, tense)}`,
    };
  };
}

function makeQcm(tenses) {
  return function genQcm(rng, level) {
    const tense = pick(rng, tenses);
    const inf = pick(rng, verbPool(level));
    const { p, form, pronoun } = pickPerson(rng, inf, tense, false);
    const distract = [
      ...Object.keys(TENSES).filter((t) => t !== tense).map((t) => conjugate(inf, t, p)),
      ...[0, 1, 2, 3, 4, 5].filter((q) => q !== p).map((q) => conjugate(inf, tense, q)),
    ];
    const { choices, answer } = buildChoices(rng, form, distract, 4);
    return {
      type: 'qcm',
      notion: `Conjugaison – ${TENSES[tense]}`,
      question: `Complète ${auTemps(tense)} : « ${capitalize(pronoun === 'je' ? 'je / j’' : pronoun)} … » (${inf})`,
      choices, answer,
      hint: endingsHint(inf, tense),
      explanation: `On écrit « ${withPronoun(pronoun, form)} ». ${endingsHint(inf, tense)}`,
    };
  };
}

function makeTenseRecognition(tenses) {
  return function genTenseQcm(rng, level) {
    // On évite les formes ambiguës (ex. « il finit » = présent ET passé simple).
    let tense, inf, form, pronoun;
    for (let k = 0; k < 30; k++) {
      tense = pick(rng, tenses);
      inf = pick(rng, verbPool(level));
      ({ form, pronoun } = pickPerson(rng, inf, tense, false));
      const p = PRONOUN_VARIANTS.findIndex((v) => v.includes(pronoun));
      if (!Object.keys(TENSES).some((t) => t !== tense && conjugate(inf, t, p) === form)) break;
    }
    const labels = Object.values(TENSES);
    const { choices, answer } = buildChoices(rng, TENSES[tense], labels, 4);
    return {
      type: 'qcm',
      notion: 'Reconnaître un temps',
      question: `À quel temps est conjugué « ${withPronoun(pronoun, form)} » (verbe ${inf}) ?`,
      choices, answer,
      hint: 'Observe la terminaison : -ais/-ait → imparfait ; -ai/-as/-a, -is/-it, -us/-ut → souvent passé simple ; -rai/-ras → futur.',
      explanation: `« ${withPronoun(pronoun, form)} » est ${auTemps(tense)}. ${endingsHint(inf, tense)}`,
    };
  };
}

/** Fabrique une faute plausible (cédille oubliée, mauvaise terminaison…). */
function misspell(rng, inf, tense, p, form) {
  if (/ger$/.test(inf) && form.includes('ge') && /ge[aoâ]/.test(form)) return form.replace(/ge([aoâ])/, 'g$1');
  if (/cer$/.test(inf) && form.includes('ç')) return form.replace('ç', 'c');
  if (tense === 'passe_simple' && verbGroup(inf) === 1 && p === 5) return form.replace(/èrent$/, 'airent');
  const others = [0, 1, 2, 3, 4, 5].map((q) => conjugate(inf, tense, q)).filter((f) => f !== form);
  if (others.length) return pick(rng, others);
  return form + 's';
}

function makeVraiFaux(tenses) {
  return function genVF(rng, level) {
    const tense = pick(rng, tenses);
    const inf = pick(rng, verbPool(Math.max(2, level)));
    const { p, form, pronoun } = pickPerson(rng, inf, tense, false);
    const truth = rng() < 0.5;
    const shown = truth ? form : misspell(rng, inf, tense, p, form);
    const good = endingsHint(inf, tense);
    const justifications = shuffle(rng, [
      good,
      'Au passé, tous les verbes se terminent par -ait.',
      'La terminaison ne dépend pas de la personne.',
    ]);
    return {
      type: 'vraifaux',
      notion: `Conjugaison – ${TENSES[tense]}`,
      statement: `« ${withPronoun(pronoun, shown)} » est correctement écrit ${auTemps(tense)}.`,
      answer: truth,
      question: 'Vrai ou faux ? Choisis ensuite la règle qui t’aide.',
      justifications,
      justificationAnswer: justifications.indexOf(good),
      hint: 'Récite la conjugaison dans ta tête avec la bonne personne.',
      explanation: `La bonne forme est « ${withPronoun(pronoun, form)} ». ${good}`,
    };
  };
}

function makeOrdre(tenses) {
  return function genOrdre(rng, level) {
    const tense = pick(rng, tenses);
    const inf = pick(rng, verbPool(level));
    const items = [0, 1, 2, 3, 4, 5].map((p) => conjugate(inf, tense, p));
    const full = items.map((f, p) => withPronoun(PRONOUN_VARIANTS[p][0], f));
    return {
      type: 'ordre',
      notion: `Conjugaison – ${TENSES[tense]}`,
      question: `Range les formes de « ${inf} » ${auTemps(tense)} dans l’ordre des personnes : je, tu, il, nous, vous, ils.`,
      items,
      separator: ' · ',
      hint: 'Ordre des personnes : je, tu, il, nous, vous, ils.',
      explanation: `${capitalize(inf)} ${auTemps(tense)} : ${full.join(', ')}.`,
    };
  };
}

// Récit : choisir entre imparfait (arrière-plan) et passé simple (premier plan).
const RECIT = [
  ['Il faisait nuit. Soudain, un loup ___ du bois.', 'sortit', 'sortait', 'ps', '« Soudain » annonce une action brève de premier plan.'],
  ['Chaque matin, le berger ___ ses moutons dans la prairie.', 'menait', 'mena', 'imp', '« Chaque matin » exprime une habitude.'],
  ['Le château ___ sur une colline et dominait la vallée.', 'se dressait', 'se dressa', 'imp', 'C’est une description du décor.'],
  ['Tout à coup, la princesse ___ un cri.', 'poussa', 'poussait', 'ps', '« Tout à coup » signale une action soudaine.'],
  ['La mer ___ calme et les mouettes tournoyaient dans le ciel.', 'était', 'fut', 'imp', 'C’est une description (arrière-plan).'],
  ['Ulysse saisit son arc et ___ une flèche.', 'tira', 'tirait', 'ps', 'Les actions s’enchaînent les unes après les autres.'],
  ['Pendant que les enfants jouaient, l’orage ___.', 'éclata', 'éclatait', 'ps', 'Une action brève vient interrompre une action en cours.'],
  ['Autrefois, les chevaliers ___ de lourdes armures.', 'portaient', 'portèrent', 'imp', '« Autrefois » exprime une habitude dans le passé.'],
  ['Le géant ouvrit la porte, ___ dans la salle et s’assit.', 'entra', 'entrait', 'ps', 'Les actions s’enchaînent : premier plan.'],
  ['Le soleil ___ quand nous arrivâmes au village.', 'brillait', 'brilla', 'imp', 'C’est le décor, l’arrière-plan de l’action.'],
  ['Un matin, le roi ___ ses conseillers.', 'convoqua', 'convoquait', 'ps', '« Un matin » : un moment précis, une action unique.'],
  ['Le vieil homme ___ seul au bord de la forêt depuis des années.', 'vivait', 'vécut', 'imp', 'C’est une situation qui dure (arrière-plan).'],
];

function genRecit(rng) {
  const [text, good, other, kind, why] = pick(rng, RECIT);
  const choices = shuffle(rng, [good, other]);
  return {
    type: 'trous',
    notion: 'Imparfait ou passé simple ?',
    question: 'Choisis le temps qui convient dans ce récit.',
    text,
    answers: [[good]],
    choices,
    hint: 'Action brève, soudaine, qui fait avancer l’histoire → passé simple. Description, habitude, action qui dure → imparfait.',
    explanation: `« ${good} » (${kind === 'ps' ? 'passé simple' : 'imparfait'}). ${why} ${kind === 'ps' ? 'Le passé simple exprime les actions de premier plan.' : 'L’imparfait exprime l’arrière-plan : décor, descriptions, habitudes.'}`,
  };
}

export const present = {
  id: 'conj-present',
  subject: 'francais',
  domain: 'Conjugaison',
  title: 'Le présent de l’indicatif',
  emoji: '⏱️',
  color: '#fdcb6e',
  summary: 'Présent de l’indicatif : 1er groupe (dont -ger/-cer), 2e groupe (-iss-), verbes irréguliers être, avoir, aller, faire, prendre, venir, voir, dire, pouvoir, vouloir.',
  lesson: {
    intro: 'Le **présent** exprime ce qui se passe maintenant, une habitude ou une vérité générale. Pour le conjuguer, on regarde le **groupe** du verbe.',
    rules: [
      { title: '1er groupe (-er)', text: 'Terminaisons : **-e, -es, -e, -ons, -ez, -ent**.', examples: ['je chante, tu chantes, il chante, nous chantons, vous chantez, ils chantent'] },
      { title: '2e groupe (-ir, -issons)', text: 'Terminaisons : **-is, -is, -it, -issons, -issez, -issent**.', examples: ['je finis, nous finissons, ils finissent'] },
      { title: 'Les irréguliers', text: 'À apprendre par cœur !', examples: ['être : je suis, nous sommes, ils sont', 'avoir : j’ai, nous avons, ils ont', 'aller : je vais, nous allons, ils vont', 'faire : je fais, vous faites, ils font', 'dire : vous dites'] },
    ],
    pitfalls: [
      '-ger : nous mang**e**ons ; -cer : nous commen**ç**ons.',
      'Ne pas oublier le **-s** à la 2e personne : tu chantes, tu finis.',
      '« Vous faites, vous dites » (et non « faisez, disez »).',
    ],
    tip: 'Chante la conjugaison comme une comptine : je, tu, il, nous, vous, ils… Tu la retiendras mieux !',
  },
  generators: [makeTrous(['present']), makeQcm(['present']), makeVraiFaux(['present']), makeOrdre(['present'])],
};

export const futur = {
  id: 'conj-futur',
  subject: 'francais',
  domain: 'Conjugaison',
  title: 'Le futur simple',
  emoji: '🚀',
  color: '#a29bfe',
  summary: 'Futur simple : infinitif + -ai, -as, -a, -ons, -ez, -ont ; radicaux irréguliers (ser-, aur-, ir-, fer-, viendr-, verr-, pourr-, voudr-).',
  lesson: {
    intro: 'Le **futur simple** exprime une action qui se passera **plus tard**.',
    rules: [
      { title: 'La recette', text: 'Pour la plupart des verbes : **infinitif + -ai, -as, -a, -ons, -ez, -ont**.', examples: ['je chanterai, tu finiras, nous jouerons'] },
      { title: 'Les radicaux irréguliers', text: 'Le radical change, mais les terminaisons restent les mêmes.', examples: ['être → je **ser**ai', 'avoir → j’**aur**ai', 'aller → j’**ir**ai', 'faire → je **fer**ai', 'venir → je **viendr**ai', 'voir → je **verr**ai', 'pouvoir → je **pourr**ai'] },
    ],
    pitfalls: [
      'On entend toujours le son **r** avant la terminaison : je chante**r**ai.',
      'Ne confonds pas « je chanterai » (futur) et « je chanterais » (conditionnel).',
      'Les verbes comme « crier, jouer » gardent leur « e » : je crierai, je jouerai.',
    ],
    tip: 'Les terminaisons du futur ressemblent au verbe « avoir » au présent : ai, as, a, (av)ons, (av)ez, ont !',
  },
  generators: [makeTrous(['futur']), makeQcm(['futur']), makeVraiFaux(['futur']), makeOrdre(['futur'])],
};

export const imparfaitPasseSimple = {
  id: 'conj-imparfait-ps',
  subject: 'francais',
  domain: 'Conjugaison',
  title: 'Imparfait et passé simple',
  emoji: '📜',
  color: '#e17055',
  summary: 'Imparfait (-ais, -ait, -ions…) et passé simple (-ai/-a/-èrent ; -is/-it/-irent ; -us/-ut/-urent) ; emploi dans le récit : premier plan / arrière-plan.',
  lesson: {
    intro: 'Dans un **récit au passé**, deux temps travaillent en équipe : l’**imparfait** pose le **décor**, le **passé simple** fait **avancer l’action**.',
    rules: [
      { title: 'L’imparfait', text: 'Terminaisons pour tous les verbes : **-ais, -ais, -ait, -ions, -iez, -aient**.', examples: ['je chantais, nous finissions, ils étaient'] },
      { title: 'Le passé simple – 1er groupe', text: '**-ai, -as, -a, -âmes, -âtes, -èrent**.', examples: ['il chanta, ils chantèrent'] },
      { title: 'Le passé simple – autres verbes', text: '**-is, -is, -it, -îmes, -îtes, -irent** ou **-us, -us, -ut, -ûmes, -ûtes, -urent**.', examples: ['il finit, ils prirent', 'il fut, ils eurent, il put'] },
      { title: 'Qui fait quoi ?', text: '**Imparfait** : description, habitude, action qui dure. **Passé simple** : action brève, soudaine, actions qui s’enchaînent.', examples: ['Il **pleuvait** (décor). Soudain, la porte **s’ouvrit** (action).'] },
    ],
    pitfalls: [
      '1er groupe au passé simple : « il chant**a** » (sans t) et « ils chant**èrent** ».',
      'Accent circonflexe à nous / vous : nous chant**âmes**, vous fin**îtes**.',
      '« Soudain, tout à coup, un jour » annoncent souvent le passé simple.',
    ],
    tip: 'Imagine un film : l’imparfait, c’est le décor ; le passé simple, ce sont les acteurs qui bougent !',
  },
  generators: [makeTrous(['imparfait', 'passe_simple']), makeQcm(['imparfait', 'passe_simple']), makeTenseRecognition(['imparfait', 'passe_simple', 'present', 'futur']),
    genRecit, genRecit, makeVraiFaux(['imparfait', 'passe_simple']), makeOrdre(['passe_simple', 'imparfait'])],
};
