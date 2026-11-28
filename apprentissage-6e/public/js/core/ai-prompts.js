// Consignes, schémas JSON et post-traitement de la génération IA.
// Module partagé : utilisé par le serveur Node (server.js) ET par le mode « clé sur l'appareil » du navigateur.
import { validateExercise } from './exercise.js';

export const AI_MODES = ['exercises', 'reading', 'dictee', 'module'];
// Modèles qui acceptent la reprise automatique côté serveur en cas de refus (« fallbacks »).
export const FALLBACK_MODELS = ['claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];

// --- Schémas JSON imposés à l'IA (structured outputs) ------------------------
const str = { type: 'string' };
const strArr = { type: 'array', items: str };
const common = { hint: str, explanation: str, notion: str };
const variant = (type, props) => ({
  type: 'object',
  additionalProperties: false,
  properties: { type: { type: 'string', enum: [type] }, ...props, ...common },
  required: ['type', ...Object.keys(props), ...Object.keys(common)],
});
const EXERCISE_SCHEMA = {
  anyOf: [
    variant('qcm', { question: str, choices: strArr, answer: { type: 'integer' } }),
    variant('trous', { question: str, text: str, answers: { type: 'array', items: strArr }, choices: strArr }),
    variant('ordre', { question: str, items: strArr }),
    variant('identification', { question: str, tokens: strArr, targets: { type: 'array', items: { type: 'integer' } } }),
    variant('vraifaux', { question: str, statement: str, answer: { type: 'boolean' }, justifications: strArr, justificationAnswer: { type: 'integer' } }),
    variant('dictee', { question: str, text: str }),
  ],
};
const obj = (props) => ({ type: 'object', additionalProperties: false, properties: props, required: Object.keys(props) });
export const SCHEMAS = {
  exercises: obj({ exercises: { type: 'array', items: EXERCISE_SCHEMA } }),
  reading: obj({ passageTitle: str, passage: str, exercises: { type: 'array', items: EXERCISE_SCHEMA } }),
  module: obj({
    title: str, emoji: str, summary: str,
    lesson: obj({
      intro: str,
      rules: { type: 'array', items: obj({ title: str, text: str, examples: strArr }) },
      pitfalls: strArr,
      tip: str,
    }),
    exercises: { type: 'array', items: EXERCISE_SCHEMA },
  }),
};
SCHEMAS.dictee = SCHEMAS.exercises;

// --- Consignes données à l'IA --------------------------------------------------
export const SYSTEM = `Tu es un professeur expérimenté de collège en France, spécialiste de la classe de 6e (cycle 3), et concepteur d'exercices pour une application d'apprentissage ludique destinée à un élève de 11-12 ans.

Exigences :
- Respecte strictement les programmes officiels de l'Éducation nationale pour la 6e (attendus de fin de cycle 3).
- Langue française impeccable (orthographe, accords, accents, typographie française : guillemets « », espace avant ? ! : ;).
- Ton bienveillant, clair, motivant, adapté à 11-12 ans, sans être bébé. Jamais punitif.
- Contenus 100 % originaux (pas d'extraits protégés). Exemples concrets et variés, tirés de la vie d'un collégien, de contes, de mythes, d'aventures.
- Chaque exercice a UNE seule bonne réponse, sans ambiguïté. Vérifie-la deux fois.
- "hint" : un indice qui aide à réfléchir SANS donner la réponse (une méthode, une question à se poser).
- "explanation" : explique simplement POURQUOI c'est la bonne réponse (1 à 3 phrases), en rappelant la règle.
- "notion" : la notion précise travaillée (ex. « Accord de l'adjectif », « Passé simple 1er groupe »).
- Varie les types d'exercices.

Format de chaque type :
- qcm : "question", "choices" (3 ou 4 propositions distinctes), "answer" = index (0-based) de la bonne proposition. Place la bonne réponse à une position aléatoire.
- trous : "text" contient exactement autant de "___" (trois tirets bas) que d'éléments dans "answers" ; chaque élément de "answers" est la liste des réponses acceptées pour ce trou (souvent une seule). "choices" : banque de mots (2 à 6 mots contenant toutes les bonnes réponses) ou [] pour une saisie libre.
- ordre : "items" = éléments dans le BON ordre (3 à 8 éléments) ; l'application les mélange. Un seul ordre doit être possible.
- identification : "tokens" = la phrase découpée en mots ou groupes de mots cliquables ; "targets" = index (0-based) de TOUS les tokens à sélectionner.
- vraifaux : "statement" = affirmation ; "answer" = true/false ; "justifications" = 3 justifications dont une seule correcte ; "justificationAnswer" = son index.
- dictee : "text" = une phrase de dictée (8 à 20 mots) adaptée au niveau, qui réinvestit des règles d'orthographe.
Pour "question", écris la consigne destinée à l'élève.`;

const LEVELS = { 1: 'facile (découverte)', 2: 'moyen (consolidation)', 3: 'difficile (approfondissement, avec pièges classiques)' };

export function buildPrompt(b) {
  const lvl = LEVELS[b.level] || LEVELS[2];
  const avoid = b.avoid?.length ? `\nÉvite de reproduire ces exercices déjà vus :\n- ${b.avoid.join('\n- ')}` : '';
  const focus = b.focus && (b.focus.top?.length || b.focus.examples?.length)
    ? `\nL'élève a des difficultés sur : ${(b.focus.top || []).join(', ') || 'non précisé'}.\nExemples d'exercices ratés : ${(b.focus.examples || []).join(' | ') || 'aucun'}.\nCible ces difficultés avec des exercices progressifs et rassurants.`
    : '';
  const chap = b.chapter ? `Chapitre : « ${b.chapter.title} ».\nRésumé : ${b.chapter.summary}\nLeçon de référence :\n${b.chapter.lesson}` : '';
  switch (b.mode) {
    case 'module':
      return `Matière : ${b.subject}. Crée un module d'apprentissage complet pour un élève de 6e sur la demande suivante : « ${b.request} ».
Niveau : ${lvl}.
Le module contient :
- "title" (court), "emoji" (un seul emoji), "summary" (une phrase décrivant les notions) ;
- "lesson" : "intro" (2-3 phrases accrocheuses), "rules" (3 à 5 règles, chacune avec "title", "text" court et 1 à 3 "examples"), "pitfalls" (2 à 4 pièges fréquents), "tip" (une astuce mémo) ; tu peux mettre en gras avec **mot** ;
- "exercises" : ${b.count} exercices variés (au moins 4 types différents), du plus facile au plus difficile.
Si la demande ne relève pas du programme de 6e, adapte-la au niveau 6e le plus proche.`;
    case 'reading':
      return `${chap}
Écris un texte narratif ORIGINAL de 150 à 250 mots (conte, récit des origines, récit d'aventure, fable ou récit mythologique, comme au programme de 6e), avec un titre ("passageTitle") et le texte ("passage", paragraphes séparés par des retours à la ligne).
Puis ${b.count} questions de compréhension variées sur ce texte : informations explicites, implicites (sentiments, intentions), vocabulaire en contexte, genre du texte, figures de style éventuelles, et un exercice "ordre" de chronologie des événements.
Niveau : ${lvl}.${avoid}`;
    case 'dictee':
      return `${chap}
Crée ${b.count} exercices de type "dictee" uniquement, de niveau ${lvl}, qui réinvestissent les accords, les homophones et la conjugaison de 6e. Pour chacun, "hint" rappelle une règle utile pour la phrase, "explanation" détaille les pièges de la phrase.${avoid}${focus}`;
    default:
      return `Matière : ${b.subject || 'Français'}.
${chap}
Crée ${b.count} nouveaux exercices variés (au moins 3 types différents parmi qcm, trous, ordre, identification, vraifaux) sur ce chapitre.
Niveau : ${lvl}.${focus}${avoid}`;
  }
}

/** Extrait le JSON d'une réponse texte (secours si le format structuré n'est pas disponible). */
export function parseJson(text) {
  try { return JSON.parse(text); } catch { /* on tente d'extraire le bloc JSON */ }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error('Réponse illisible');
}

/** Valide les exercices produits et attache le texte de lecture le cas échéant. */
export function postProcess(mode, data) {
  const clean = (list, extra = {}) => (Array.isArray(list) ? list : []).map((ex) => validateExercise({ ...ex, ...extra })).filter(Boolean);
  if (mode === 'module') return { module: { ...data, exercises: clean(data.exercises) } };
  if (mode === 'reading') return { exercises: clean(data.exercises, { passage: data.passage, passageTitle: data.passageTitle }) };
  return { exercises: clean(data.exercises) };
}

/** Nettoie et borne les paramètres d'une demande de génération. */
export function sanitizeBody(b) {
  const s = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  return {
    mode: s(b.mode, 20),
    subject: s(b.subject, 60) || 'Français',
    request: s(b.request, 300),
    level: [1, 2, 3].includes(Number(b.level)) ? Number(b.level) : 2,
    count: Math.min(10, Math.max(3, Number(b.count) || 6)),
    chapter: b.chapter ? { title: s(b.chapter.title, 120), summary: s(b.chapter.summary, 400), lesson: s(b.chapter.lesson, 3000) } : null,
    focus: b.focus ? {
      top: Array.isArray(b.focus.top) ? b.focus.top.slice(0, 5).map((x) => s(x, 100)) : [],
      examples: Array.isArray(b.focus.examples) ? b.focus.examples.slice(0, 5).map((x) => s(x, 200)) : [],
    } : null,
    avoid: Array.isArray(b.avoid) ? b.avoid.slice(0, 15).map((x) => s(x, 120)).filter(Boolean) : [],
  };
}
