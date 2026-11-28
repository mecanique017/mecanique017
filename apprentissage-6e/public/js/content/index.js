// Registre des matières et des chapitres.
// Pour ajouter une matière : créer un dossier (ex. ./maths/), des chapitres au même format,
// puis les déclarer dans SUBJECTS ci-dessous.
import classes from './francais/classes-grammaticales.js';
import fonctions from './francais/fonctions.js';
import accordsGN from './francais/accords-gn.js';
import accordSV from './francais/accord-sujet-verbe.js';
import { present, futur, imparfaitPasseSimple } from './francais/conjugaison.js';
import homophones from './francais/homophones.js';
import vocabulaire from './francais/vocabulaire.js';
import figures from './francais/figures-de-style.js';
import lecture from './francais/lecture.js';
import dictees from './francais/dictees.js';

export const SUBJECTS = [
  {
    id: 'francais',
    name: 'Français',
    emoji: '🇫🇷',
    chapters: [classes, fonctions, accordsGN, accordSV, present, imparfaitPasseSimple, futur, homophones, vocabulaire, figures, lecture, dictees],
  },
];

// Matières proposées pour les modules créés par l'IA (extension à d'autres disciplines de 6e).
export const AI_SUBJECTS = ['Français', 'Mathématiques', 'Histoire-Géographie', 'Sciences et technologie', 'Anglais', 'Enseignement moral et civique'];

export const DOMAIN_ORDER = ['Grammaire', 'Orthographe', 'Conjugaison', 'Vocabulaire', 'Lecture', 'Mes modules'];

export const BUILTIN_CHAPTERS = SUBJECTS.flatMap((s) => s.chapters);
