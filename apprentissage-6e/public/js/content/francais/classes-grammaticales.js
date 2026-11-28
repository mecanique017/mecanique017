// Chapitre : la nature (classe grammaticale) des mots.
import { pick, buildChoices, sample } from '../../core/utils.js';

export const CLASSES = {
  // art : forme avec article indéfini (« un nom », « une préposition »)
  N: { label: 'nom', art: 'un nom', rule: 'Un **nom** désigne une personne, un animal, une chose ou une idée. On peut mettre un déterminant devant (le, un, ma…). Les noms propres (Léa, Paris) prennent une majuscule.' },
  V: { label: 'verbe', art: 'un verbe', rule: 'Un **verbe** exprime une action ou un état et se conjugue : on peut changer son temps (il mange → il mangeait).' },
  A: { label: 'adjectif', art: 'un adjectif', rule: 'Un **adjectif** qualifie un nom : il dit comment est la personne ou la chose. Il s’accorde avec le nom.' },
  D: { label: 'déterminant', art: 'un déterminant', rule: 'Un **déterminant** se place devant le nom et l’annonce (le, la, un, des, mon, ce, trois, chaque…).' },
  P: { label: 'pronom', art: 'un pronom', rule: 'Un **pronom** remplace un nom ou un groupe nominal (je, tu, il, elle, nous, vous, ils…).' },
  ADV: { label: 'adverbe', art: 'un adverbe', rule: 'Un **adverbe** est invariable : il précise le sens d’un verbe, d’un adjectif ou d’un autre adverbe (vite, très, souvent, demain, lentement…).' },
  PREP: { label: 'préposition', art: 'une préposition', rule: 'Une **préposition** est un petit mot invariable qui introduit un complément (à, de, dans, sur, avec, pour, sous, chez, depuis…).' },
  C: { label: 'conjonction de coordination', art: 'une conjonction de coordination', rule: 'Une **conjonction de coordination** relie deux mots ou deux groupes de même nature : mais, ou, et, donc, or, ni, car.' },
};

// Phrases annotées : « mot/CLASSE ». La ponctuation finale est stockée à part.
const SENTENCES = [
  ['Le/D petit/A chat/N dort/V tranquillement/ADV sur/PREP le/D canapé/N', '.'],
  ['Ma/D sœur/N lit/V un/D roman/N passionnant/A', '.'],
  ['Nous/P partirons/V demain/ADV pour/PREP la/D montagne/N', '.'],
  ['Les/D enfants/N jouent/V et/C rient/V dans/PREP la/D cour/N', '.'],
  ['Ce/D vieux/A marin/N raconte/V souvent/ADV des/D histoires/N étranges/A', '.'],
  ['Elle/P mange/V une/D pomme/N rouge/A', '.'],
  ['Mon/D voisin/N répare/V sa/D voiture/N avec/PREP soin/N', '.'],
  ['Le/D chien/N aboie/V mais/C le/D facteur/N avance/V calmement/ADV', '.'],
  ['Ils/P regardent/V les/D étoiles/N brillantes/A', '.'],
  ['Cette/D forêt/N sombre/A effraie/V les/D voyageurs/N', '.'],
  ['Tu/P chantes/V très/ADV bien/ADV', ' !'],
  ['Léa/N écrit/V une/D lettre/N à/PREP sa/D grand-mère/N', '.'],
  ['Le/D professeur/N explique/V la/D leçon/N lentement/ADV', '.'],
  ['Vous/P aimez/V les/D gâteaux/N ou/C les/D fruits/N', ' ?'],
  ['Trois/D oiseaux/N bleus/A chantent/V sous/PREP ma/D fenêtre/N', '.'],
  ['Nos/D amis/N arrivent/V bientôt/ADV chez/PREP nous/P', '.'],
  ['Le/D boulanger/N prépare/V du/D pain/N frais/A chaque/D matin/N', '.'],
  ['La/D jeune/A fille/N porte/V une/D robe/N élégante/A', '.'],
  ['Mes/D parents/N travaillent/V beaucoup/ADV', '.'],
  ['Paul/N et/C Julie/N visitent/V un/D musée/N immense/A', '.'],
  ['Le/D renard/N rusé/A observe/V les/D poules/N', '.'],
  ['Il/P range/V ses/D livres/N dans/PREP une/D grande/A armoire/N', '.'],
];

function parse([s, punct]) {
  const words = s.split(' ').map((w) => {
    const [word, tag] = w.split('/');
    return { word, tag };
  });
  return { words, punct, text: words.map((w) => w.word).join(' ') + punct };
}
const PARSED = SENTENCES.map(parse);

const CLASSES_BY_LEVEL = { 1: ['N', 'V', 'A', 'D'], 2: ['N', 'V', 'A', 'D', 'P', 'ADV'], 3: Object.keys(CLASSES) };

function tokensOf(s) {
  return s.words.map((w, i) => (i === s.words.length - 1 ? w.word + s.punct.trim() : w.word));
}

// --- Générateurs ---------------------------------------------------------

function genIdentify(rng, level) {
  const allowed = CLASSES_BY_LEVEL[level];
  const s = pick(rng, PARSED.filter((p) => p.words.some((w) => allowed.includes(w.tag))));
  const present = [...new Set(s.words.map((w) => w.tag))].filter((t) => allowed.includes(t));
  const tag = pick(rng, present);
  const label = CLASSES[tag].label;
  const plural = tag === 'C' ? 'les conjonctions de coordination' : `les ${label}s`;
  return {
    type: 'identification',
    notion: 'Nature des mots',
    question: `Clique sur tous ${plural} de la phrase.`,
    tokens: tokensOf(s),
    targets: s.words.map((w, i) => (w.tag === tag ? i : -1)).filter((i) => i >= 0),
    hint: CLASSES[tag].rule.replace(/\*\*/g, ''),
    explanation: `${CLASSES[tag].rule} Ici : ${s.words.filter((w) => w.tag === tag).map((w) => `« ${w.word} »`).join(', ')}.`,
  };
}

function genQcm(rng, level) {
  const allowed = CLASSES_BY_LEVEL[level];
  const s = pick(rng, PARSED);
  const candidates = s.words.filter((w) => allowed.includes(w.tag));
  const w = pick(rng, candidates);
  const correct = CLASSES[w.tag].label;
  const others = Object.keys(CLASSES).filter((k) => k !== w.tag).map((k) => CLASSES[k].label);
  const { choices, answer } = buildChoices(rng, correct, others, 4);
  return {
    type: 'qcm',
    notion: 'Nature des mots',
    question: `Quelle est la nature du mot « ${w.word} » dans la phrase : « ${s.text} » ?`,
    choices,
    answer,
    hint: 'Essaie de remplacer le mot, de changer le temps de la phrase ou de mettre un déterminant devant : cela aide à trouver sa nature.',
    explanation: `« ${w.word} » est ${CLASSES[w.tag].art}. ${CLASSES[w.tag].rule}`,
  };
}

function genVraiFaux(rng, level) {
  const allowed = CLASSES_BY_LEVEL[level];
  const s = pick(rng, PARSED);
  const w = pick(rng, s.words.filter((x) => allowed.includes(x.tag)));
  const truth = rng() < 0.5;
  const claimed = truth ? w.tag : pick(rng, allowed.filter((t) => t !== w.tag));
  const justTrue = CLASSES[w.tag].rule.replace(/\*\*/g, '');
  const wrongs = sample(rng, Object.keys(CLASSES).filter((k) => k !== w.tag), 2).map((k) => CLASSES[k].rule.replace(/\*\*/g, ''));
  const justifications = sample(rng, [justTrue, ...wrongs], 3);
  return {
    type: 'vraifaux',
    notion: 'Nature des mots',
    statement: `Dans « ${s.text} », le mot « ${w.word} » est ${CLASSES[claimed].art}.`,
    answer: truth,
    question: 'Vrai ou faux ? Choisis ensuite la bonne justification (celle qui décrit vraiment ce mot).',
    justifications,
    justificationAnswer: justifications.indexOf(justTrue),
    hint: `Demande-toi ce que fait « ${w.word} » dans la phrase : il annonce un nom ? il se conjugue ? il le décrit ?`,
    explanation: `« ${w.word} » est ${CLASSES[w.tag].art}. ${CLASSES[w.tag].rule}`,
  };
}

function genOrdre(rng) {
  // Phrases courtes (sans adverbe ni complément déplaçable) : un seul ordre possible.
  const pool = PARSED.filter((s) => s.words.length <= 7 && !s.words.some((w) => w.tag === 'ADV' || w.tag === 'PREP' || w.tag === 'C'));
  const s = pick(rng, pool);
  const items = s.words.map((w) => w.word);
  return {
    type: 'ordre',
    notion: 'Construire une phrase',
    question: 'Remets les mots dans l’ordre pour former une phrase correcte.',
    items,
    hint: 'Une phrase commence par une majuscule. Cherche d’abord le groupe sujet (déterminant + nom), puis le verbe.',
    explanation: `La phrase correcte est : « ${s.text} ». Ordre habituel : sujet → verbe → complément.`,
  };
}

export default {
  id: 'classes-grammaticales',
  subject: 'francais',
  domain: 'Grammaire',
  title: 'La nature des mots',
  emoji: '🧩',
  color: '#7c5cff',
  summary: 'Classes grammaticales : nom, verbe, adjectif, déterminant, pronom, adverbe, préposition, conjonction de coordination.',
  lesson: {
    intro: 'Chaque mot appartient à une **classe grammaticale** (on dit aussi sa **nature**). Comme une carte d’identité, elle ne change pas… sauf si le mot change de rôle ! La connaître aide à bien accorder et à bien écrire.',
    rules: [
      { title: 'Les mots variables', text: 'Ils changent de forme (genre, nombre, temps) : le **nom**, le **déterminant**, l’**adjectif**, le **pronom** et le **verbe**.', examples: ['un chat noir → des chats noirs', 'il chante → ils chantaient'] },
      { title: 'Les mots invariables', text: 'Ils ne changent jamais : l’**adverbe**, la **préposition**, la **conjonction de coordination**.', examples: ['Elle court **vite**. Ils courent **vite**.', 'Le livre est **sur** la table.'] },
      { title: 'Le trio du groupe nominal', text: 'Le **déterminant** annonce le nom, le **nom** est le noyau, l’**adjectif** le décrit.', examples: ['**une** (D) **robe** (N) **élégante** (A)'] },
      { title: 'Retenir les conjonctions', text: 'Phrase magique : « **Mais où est donc Ornicar ?** » → mais, ou, et, donc, or, ni, car.', examples: ['Il pleut **mais** je sors.'] },
    ],
    pitfalls: [
      '« le, la, les » sont des **déterminants** devant un nom (le chat), mais des **pronoms** devant un verbe (je **le** vois).',
      '« fort » peut être un adjectif (un vent fort) ou un adverbe (il souffle fort) : regarde le mot qu’il précise.',
      'Les noms propres (Léa, Paul) sont des noms, même sans déterminant.',
    ],
    tip: 'Pour reconnaître un verbe, change le temps de la phrase : le mot qui bouge est le verbe !',
  },
  generators: [genIdentify, genQcm, genVraiFaux, genOrdre],
};
