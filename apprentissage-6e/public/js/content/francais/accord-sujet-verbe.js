// Chapitre : l'accord du verbe avec son sujet (pièges : sujet éloigné, inversé, pronom écran, sujets multiples).
import { pick, buildChoices, shuffle, capitalize } from '../../core/utils.js';
import { conjugate, PERSON_LABELS } from './conjugaison-engine.js';

// [sujet] = groupe sujet ; {verbe} = infinitif à conjuguer ; p = personne (0..5) ; trap = explication du piège.
const FRAMES = [
  { t: '[Les élèves de la classe] {écouter} le professeur.', p: 5, trap: 'Le noyau du sujet est « élèves » (pluriel). Ne te laisse pas piéger par « classe » !' },
  { t: '[Le bruit des voitures] {gêner} les voisins.', p: 2, trap: 'Qui est-ce qui gêne ? « Le bruit » (singulier), pas « les voitures ».' },
  { t: '[Mon frère et moi] {aller} au cinéma.', p: 3, trap: '« Mon frère et moi », c’est « nous ».' },
  { t: '[Toi et tes amis] {faire} du vélo.', p: 4, trap: '« Toi et tes amis », c’est « vous » : vous faites.' },
  { t: '[Les enfants] {finir} leurs devoirs.', p: 5 },
  { t: '[Ma tante] {prendre} le train.', p: 2 },
  { t: '[Les oiseaux] {chanter} dans les arbres.', p: 5 },
  { t: '[Lucas] les {regarder} attentivement.', p: 2, trap: '« les » est un pronom placé devant le verbe, mais ce n’est pas le sujet. Qui est-ce qui regarde ? Lucas.' },
  { t: '[Tu] {choisir} un dessert.', p: 1 },
  { t: '[Nous] {manger} à la cantine.', p: 3, trap: 'Avec « nous », le verbe « manger » garde son « e » : nous mangeons.' },
  { t: '[Le loup et le renard] {chasser} la nuit.', p: 5, trap: 'Deux sujets reliés par « et » = un verbe au pluriel.' },
  { t: '[Chaque élève] {avoir} un casier.', p: 2, trap: '« Chaque » est toujours suivi du singulier.' },
  { t: '[Vous] {dire} la vérité.', p: 4, trap: 'Attention, c’est irrégulier : vous dites (et non « vous disez »).' },
  { t: '[Les feuilles de cet arbre] {tomber} en automne.', p: 5, trap: 'Qui est-ce qui tombe ? « Les feuilles » (pluriel), pas « l’arbre ».' },
  { t: 'Sur la branche {chanter} [les oiseaux].', p: 5, trap: 'Le sujet est placé après le verbe ! Qui est-ce qui chante ? Les oiseaux.' },
  { t: '[Mes cousins] {venir} demain.', p: 5 },
  { t: '[Elle] {vouloir} un chien.', p: 2 },
  { t: '[On] {voir} la mer depuis la fenêtre.', p: 2, trap: '« On » se conjugue comme « il » (3e personne du singulier).' },
  { t: '[Le maître des chevaux] {soigner} les animaux.', p: 2, trap: 'Le noyau du sujet est « maître » (singulier).' },
  { t: '[Les joueurs] nous {lancer} le ballon.', p: 5, trap: '« nous » est ici complément, pas sujet. Qui est-ce qui lance ? Les joueurs.' },
  { t: 'Dans la forêt {vivre} [des animaux étranges].', p: 5, verb: { inf: 'vivre', forms: ['vis', 'vis', 'vit', 'vivons', 'vivez', 'vivent'] }, trap: 'Le sujet est inversé : qui est-ce qui vit ? Des animaux étranges.' },
  { t: '[Julie et sa sœur] {être} en vacances.', p: 5 },
  { t: '[Le chat de mes voisins] {dormir} au soleil.', p: 2, verb: { inf: 'dormir', forms: ['dors', 'dors', 'dort', 'dormons', 'dormez', 'dorment'] }, trap: 'Qui est-ce qui dort ? « Le chat », pas « mes voisins ».' },
  { t: '[Ils] {pouvoir} entrer.', p: 5 },
];

function parseFrame(f) {
  const inf = f.verb?.inf || f.t.match(/\{([^}]+)\}/)[1];
  const forms = f.verb?.forms || [0, 1, 2, 3, 4, 5].map((p) => conjugate(inf, 'present', p));
  const subject = f.t.match(/\[([^\]]+)\]/)[1];
  return { ...f, inf, forms, subject, form: forms[f.p] };
}
const PARSED = FRAMES.map(parseFrame);

const display = (f, verbText) => capitalize(f.t.replace(/\[([^\]]+)\]/, '$1').replace(/\{[^}]+\}/, verbText));

function explain(f) {
  const base = `Le sujet est « ${f.subject} » → ${PERSON_LABELS[f.p]}, donc « ${f.form} ».`;
  return f.trap ? `${base} ${f.trap}` : base;
}

function genTrous(rng, level) {
  const pool = level === 1 ? PARSED.filter((f) => !f.trap) : PARSED;
  const f = pick(rng, pool);
  return {
    type: 'trous',
    notion: 'Accord sujet-verbe',
    question: `Conjugue le verbe « ${f.inf} » au présent.`,
    text: display(f, `___ (${f.inf})`),
    answers: [[f.form]],
    hint: 'Pose la question « Qui est-ce qui + verbe ? » pour trouver le sujet, puis remplace-le par un pronom (il, elle, ils, nous…).',
    explanation: explain(f),
  };
}

function genQcm(rng, level) {
  const pool = level === 1 ? PARSED.filter((f) => !f.trap) : PARSED.filter((f) => f.trap || rng() < 0.3);
  const f = pick(rng, pool);
  const { choices, answer } = buildChoices(rng, f.form, [...new Set(f.forms)], 4);
  return {
    type: 'qcm',
    notion: 'Accord sujet-verbe',
    question: `Choisis la bonne forme : « ${display(f, '…')} »`,
    choices, answer,
    hint: 'Trouve le sujet du verbe (attention, il peut être loin ou après le verbe !).',
    explanation: explain(f),
  };
}

function genIdentify(rng) {
  const f = pick(rng, PARSED);
  const sentence = display(f, f.form);
  const tokens = sentence.split(' ');
  const subjWords = capitalize(f.subject).split(' ');
  // Repère la position du groupe sujet dans les tokens (insensible à la majuscule).
  let start = tokens.findIndex((_, i) => subjWords.every((w, k) => tokens[i + k]?.replace(/[.,]$/, '').toLowerCase() === w.toLowerCase()));
  const targets = subjWords.map((_, k) => start + k);
  return {
    type: 'identification',
    notion: 'Trouver le sujet',
    question: `Clique sur tous les mots du groupe sujet du verbe « ${f.form} ».`,
    tokens,
    targets,
    hint: `Pose la question : « Qui est-ce qui ${f.form} ? »`,
    explanation: `Le sujet est « ${f.subject} ». ${f.trap || ''}`.trim(),
  };
}

function genVraiFaux(rng) {
  const f = pick(rng, PARSED.filter((x) => x.trap));
  const truth = rng() < 0.5;
  const wrongForm = pick(rng, [...new Set(f.forms)].filter((x) => x !== f.form));
  const shownForm = truth ? f.form : wrongForm;
  const goodJust = `Le sujet est « ${f.subject} » (${PERSON_LABELS[f.p]}).`;
  const justifications = shuffle(rng, [goodJust, 'Le verbe s’accorde avec le mot qui le précède directement.',
    'Le verbe s’accorde toujours avec le premier mot de la phrase.']);
  return {
    type: 'vraifaux',
    notion: 'Accord sujet-verbe',
    statement: `Le verbe est bien accordé : « ${display(f, shownForm)} »`,
    answer: truth,
    question: 'Vrai ou faux ? Choisis ensuite la bonne justification.',
    justifications,
    justificationAnswer: justifications.indexOf(goodJust),
    hint: 'Attention : le mot juste devant le verbe n’est pas toujours le sujet !',
    explanation: explain(f),
  };
}

export default {
  id: 'accord-sujet-verbe',
  subject: 'francais',
  domain: 'Orthographe',
  title: 'L’accord du verbe avec le sujet',
  emoji: '🤝',
  color: '#0984e3',
  summary: 'Accord sujet-verbe : trouver le sujet (éloigné, inversé, multiple), pronom écran, on/chaque.',
  lesson: {
    intro: 'Le verbe s’accorde **toujours** avec son **sujet** : en **personne** (je, tu, il…) et en **nombre** (singulier / pluriel). Pour bien accorder, il faut d’abord **trouver le sujet** !',
    rules: [
      { title: 'Trouver le sujet', text: 'Pose la question **« Qui est-ce qui + verbe ? »**. Puis remplace le sujet par un pronom.', examples: ['**Les enfants** finissent → ils finissent'] },
      { title: 'Plusieurs sujets', text: 'Deux sujets reliés par « et » → verbe au **pluriel**.', examples: ['Le loup et le renard chass**ent**.', 'Mon frère et moi (= nous) all**ons**.'] },
      { title: 'Le sujet inversé', text: 'Le sujet peut être placé **après** le verbe.', examples: ['Sur la branche chant**ent** les oiseaux.'] },
      { title: 'Le sujet éloigné', text: 'Un complément du nom peut s’intercaler : accorde avec le **noyau**.', examples: ['Le bruit des voitures gên**e** les voisins.'] },
    ],
    pitfalls: [
      'Le **pronom écran** : dans « Lucas **les** regarde », « les » n’est pas le sujet → regarde (sans -nt).',
      '« On » et « chaque » → 3e personne du **singulier**.',
      'Ne confonds pas « -ent » (verbe au pluriel) avec un nom : ils chantent / un chant.',
    ],
    tip: 'Encadre le sujet, souligne le verbe et relie-les par une flèche : c’est la méthode des pros !',
  },
  generators: [genTrous, genQcm, genIdentify, genVraiFaux],
};
