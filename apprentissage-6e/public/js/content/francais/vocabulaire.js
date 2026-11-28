// Chapitre : vocabulaire (champs lexicaux, familles de mots, préfixes, synonymes, intensité).
import { pick, buildChoices, sample, shuffle } from '../../core/utils.js';

const CHAMPS = {
  'la mer': ['vague', 'plage', 'marée', 'sable', 'bateau', 'coquillage', 'écume', 'phare', 'mouette'],
  'l’école': ['cartable', 'cahier', 'récréation', 'professeur', 'leçon', 'cantine', 'trousse', 'élève', 'tableau'],
  'la forêt': ['arbre', 'feuillage', 'clairière', 'chêne', 'mousse', 'sentier', 'écureuil', 'champignon', 'branche'],
  'la peur': ['frisson', 'terreur', 'trembler', 'effrayé', 'angoisse', 'panique', 'cauchemar', 'épouvante', 'sursauter'],
  'la cuisine': ['casserole', 'recette', 'four', 'éplucher', 'cuillère', 'saladier', 'mijoter', 'tablier', 'poêle'],
  'le sport': ['ballon', 'match', 'équipe', 'arbitre', 'entraînement', 'stade', 'courir', 'médaille', 'champion'],
  'la météo': ['pluie', 'orage', 'nuage', 'soleil', 'neige', 'tempête', 'brouillard', 'averse', 'éclair'],
  'le Moyen Âge': ['chevalier', 'château fort', 'donjon', 'armure', 'seigneur', 'tournoi', 'pont-levis', 'épée', 'écuyer'],
};

const FAMILLES = [
  { base: 'terre', mots: ['terrain', 'terrestre', 'enterrer', 'atterrir'], intrus: 'terrible' },
  { base: 'lait', mots: ['laitier', 'laitage', 'allaiter'], intrus: 'laid' },
  { base: 'chant', mots: ['chanter', 'chanteur', 'chanson'], intrus: 'champ' },
  { base: 'mer', mots: ['marin', 'maritime', 'amerrir'], intrus: 'merci' },
  { base: 'fleur', mots: ['fleuriste', 'fleurir', 'floral'], intrus: 'fleuve' },
  { base: 'jour', mots: ['journal', 'journée', 'séjour'], intrus: 'jouer' },
  { base: 'dent', mots: ['dentiste', 'dentifrice', 'édenté'], intrus: 'dense' },
  { base: 'porte', mots: ['portail', 'portière', 'portier'], intrus: 'portrait' },
  { base: 'nuit', mots: ['nocturne', 'minuit', 'nuitée'], intrus: 'nuire' },
];

// [mot, préfixe, sens]
const PREFIXES = [
  ['impossible', 'im-', 'le contraire'], ['défaire', 'dé-', 'le contraire'], ['relire', 're-', 'de nouveau'],
  ['incapable', 'in-', 'le contraire'], ['malheureux', 'mal-', 'le contraire'], ['prévoir', 'pré-', 'avant'],
  ['sous-marin', 'sous-', 'en dessous'], ['inconnu', 'in-', 'le contraire'], ['désordre', 'dés-', 'le contraire'],
  ['refaire', 're-', 'de nouveau'], ['préhistoire', 'pré-', 'avant'], ['sous-sol', 'sous-', 'en dessous'],
  ['revenir', 're-', 'de nouveau'], ['survoler', 'sur-', 'au-dessus'], ['surmonter', 'sur-', 'au-dessus'],
  ['impatient', 'im-', 'le contraire'],
];
const SENS = ['le contraire', 'de nouveau', 'avant', 'en dessous', 'au-dessus'];

// [mot, contraire formé par préfixe]
const CONTRAIRES = [
  ['possible', 'impossible'], ['connu', 'inconnu'], ['faire', 'défaire'], ['ordre', 'désordre'],
  ['heureux', 'malheureux'], ['patient', 'impatient'], ['lisible', 'illisible'], ['honnête', 'malhonnête'],
  ['poli', 'impoli'], ['visible', 'invisible'], ['prudent', 'imprudent'], ['obéir', 'désobéir'],
  ['coller', 'décoller'], ['juste', 'injuste'], ['agréable', 'désagréable'], ['légal', 'illégal'],
];

// Synonymes : [mot, synonyme, distracteurs]
const SYNONYMES = [
  ['effrayé', 'apeuré', ['courageux', 'fatigué', 'pressé']],
  ['immense', 'gigantesque', ['minuscule', 'lointain', 'rapide']],
  ['commencer', 'débuter', ['terminer', 'continuer', 'oublier']],
  ['finir', 'terminer', ['commencer', 'choisir', 'grandir']],
  ['bâtir', 'construire', ['détruire', 'peindre', 'acheter']],
  ['content', 'ravi', ['déçu', 'inquiet', 'timide']],
  ['regarder', 'observer', ['écouter', 'ignorer', 'cacher']],
  ['peur', 'frayeur', ['joie', 'colère', 'surprise']],
  ['vieux', 'âgé', ['jeune', 'neuf', 'grand']],
  ['habitation', 'logement', ['jardin', 'quartier', 'voyage']],
  ['silencieux', 'muet', ['bavard', 'bruyant', 'joyeux']],
  ['rapide', 'véloce', ['lent', 'lourd', 'fragile']],
];

// Gradation (du plus faible au plus fort)
const INTENSITE = [
  ['tiède', 'chaud', 'brûlant'], ['frais', 'froid', 'glacial'], ['inquiétude', 'peur', 'terreur'],
  ['chuchoter', 'parler', 'hurler'], ['apprécier', 'aimer', 'adorer'], ['grignoter', 'manger', 'dévorer'],
  ['bruine', 'averse', 'déluge'], ['brise', 'vent', 'tempête'], ['murmure', 'bruit', 'vacarme'],
  ['marcher', 'courir', 'foncer'],
];

// Thèmes trop proches pour servir d'intrus l'un à l'autre (ex. « tempête » et la mer).
const TOO_CLOSE = { 'la mer': ['la météo'], 'la météo': ['la mer'] };
const otherThemes = (theme) => Object.keys(CHAMPS).filter((t) => t !== theme && !(TOO_CLOSE[theme] || []).includes(t));

function genChampIdentify(rng, level) {
  const themes = Object.keys(CHAMPS);
  const theme = pick(rng, themes);
  const nGood = level === 1 ? 3 : 4;
  const good = sample(rng, CHAMPS[theme], nGood);
  const others = sample(rng, otherThemes(theme), 3).map((t) => pick(rng, CHAMPS[t]));
  const tokens = shuffle(rng, [...good, ...others]);
  return {
    type: 'identification',
    notion: 'Champ lexical',
    question: `Clique sur tous les mots du champ lexical de ${theme}.`,
    tokens,
    targets: tokens.map((t, i) => (good.includes(t) ? i : -1)).filter((i) => i >= 0),
    hint: `Un champ lexical regroupe les mots qui se rapportent à un même thème. Lesquels te font penser à ${theme} ?`,
    explanation: `Les mots du champ lexical de ${theme} sont : ${good.join(', ')}.`,
  };
}

function genChampIntrus(rng) {
  const themes = Object.keys(CHAMPS);
  const theme = pick(rng, themes);
  const intrusTheme = pick(rng, otherThemes(theme));
  const intrus = pick(rng, CHAMPS[intrusTheme]);
  const words = sample(rng, CHAMPS[theme], 3);
  const choices = shuffle(rng, [...words, intrus]);
  return {
    type: 'qcm',
    notion: 'Champ lexical',
    question: `Quel mot n’appartient pas au champ lexical de ${theme} ?`,
    choices, answer: choices.indexOf(intrus),
    hint: `Trois mots parlent de ${theme}. Lequel parle d’autre chose ?`,
    explanation: `« ${intrus} » appartient plutôt au champ lexical de ${intrusTheme}.`,
  };
}

function genFamille(rng) {
  const f = pick(rng, FAMILLES);
  const choices = shuffle(rng, [...sample(rng, f.mots, 3), f.intrus]);
  return {
    type: 'qcm',
    notion: 'Famille de mots',
    question: `Quel mot ne fait PAS partie de la famille de « ${f.base} » ?`,
    choices, answer: choices.indexOf(f.intrus),
    hint: 'Les mots d’une même famille ont le même radical ET un sens lié. Attention aux mots qui se ressemblent seulement !',
    explanation: `« ${f.intrus} » ressemble à « ${f.base} », mais son sens n’a rien à voir. La famille de « ${f.base} » : ${f.mots.join(', ')}.`,
  };
}

function genPrefixe(rng) {
  const [mot, pre, sens] = pick(rng, PREFIXES);
  const { choices, answer } = buildChoices(rng, sens, SENS, 4);
  return {
    type: 'qcm',
    notion: 'Préfixes',
    question: `Dans « ${mot} », que signifie le préfixe « ${pre} » ?`,
    choices, answer,
    hint: 'Enlève le préfixe : que reste-t-il ? Compare le sens des deux mots.',
    explanation: `Le préfixe « ${pre} » signifie « ${sens} » : ${mot} = ${sens} + ${mot.replace(new RegExp('^' + pre.replace('-', '') + '-?'), '')}.`,
  };
}

function genContraire(rng) {
  const [mot, contraire] = pick(rng, CONTRAIRES);
  return {
    type: 'trous',
    notion: 'Préfixes',
    question: 'Forme le contraire en ajoutant un préfixe (in-, im-, il-, dé-, dés-, mal-).',
    text: `Le contraire de « ${mot} » est : ___`,
    answers: [[contraire]],
    hint: 'Devant m, b, p on écrit « im- » ; devant l, « il- » ; devant une voyelle, souvent « dés- ».',
    explanation: `${mot} → ${contraire}. Le préfixe ajoute le sens « le contraire ».`,
  };
}

function genSynonyme(rng) {
  const [mot, syn, dist] = pick(rng, SYNONYMES);
  const choices = shuffle(rng, [syn, ...dist]);
  return {
    type: 'qcm',
    notion: 'Synonymes',
    question: `Quel mot est un synonyme de « ${mot} » ?`,
    choices, answer: choices.indexOf(syn),
    hint: 'Un synonyme a un sens très proche et la même classe grammaticale. Essaie de le remplacer dans une phrase.',
    explanation: `« ${syn} » a presque le même sens que « ${mot} ». Attention : « ${dist[0]} » est plutôt un contraire ou un mot différent.`,
  };
}

function genIntensite(rng) {
  const items = pick(rng, INTENSITE);
  return {
    type: 'ordre',
    notion: 'Nuances de sens',
    question: 'Range les mots du plus faible au plus fort.',
    items: items.slice(),
    separator: ' < ',
    hint: 'Imagine chaque mot dans une phrase : lequel est le plus doux ? le plus intense ?',
    explanation: `Du plus faible au plus fort : ${items.join(' < ')}.`,
  };
}

export default {
  id: 'vocabulaire',
  subject: 'francais',
  domain: 'Vocabulaire',
  title: 'Les mots et leur sens',
  emoji: '📚',
  color: '#00cec9',
  summary: 'Vocabulaire : champs lexicaux, familles de mots, préfixes, contraires, synonymes, nuances d’intensité.',
  lesson: {
    intro: 'Plus tu connais de mots, plus tu comprends et t’exprimes avec précision. Voici les outils pour les **classer** et les **fabriquer**.',
    rules: [
      { title: 'Le champ lexical', text: 'Ensemble de mots qui se rapportent à un **même thème**.', examples: ['La mer : vague, plage, marée, écume, phare…'] },
      { title: 'La famille de mots', text: 'Mots formés sur le **même radical**, avec un sens lié.', examples: ['terre → terrain, terrestre, enterrer, atterrir'] },
      { title: 'Préfixes et suffixes', text: 'Le **préfixe** se place **avant** le radical, le **suffixe** **après**.', examples: ['**re**lire (de nouveau)', '**im**possible (le contraire)', 'chant**eur** (celui qui…)'] },
      { title: 'Synonymes et antonymes', text: '**Synonyme** = sens proche. **Antonyme** = sens contraire.', examples: ['débuter = commencer', 'possible ≠ impossible'] },
    ],
    pitfalls: [
      'Deux mots qui se ressemblent ne sont pas forcément de la même famille : « laid » n’a rien à voir avec « lait » !',
      'im- devant m, b, p (impossible) ; il- devant l (illisible).',
      'Un synonyme doit être de la même classe grammaticale (un verbe ↔ un verbe).',
    ],
    tip: 'Quand tu écris, cherche le mot le plus précis : « dévorer » dit beaucoup plus que « manger » !',
  },
  generators: [genChampIdentify, genChampIntrus, genFamille, genPrefixe, genContraire, genSynonyme, genIntensite],
};
