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
import mNombres from './maths/nombres.js';
import mCalcul from './maths/calcul.js';
import mFractions from './maths/fractions.js';
import mProp from './maths/proportionnalite.js';
import mGrandeurs from './maths/grandeurs.js';
import mGeometrie from './maths/geometrie.js';
import sMatiere from './sciences/matiere.js';
import sVivant from './sciences/vivant.js';
import sEnergie from './sciences/energie.js';
import sTerre from './sciences/terre.js';
import sTechno from './sciences/technologie.js';

export const SUBJECTS = [
  {
    id: 'francais',
    name: 'Français',
    emoji: '🇫🇷',
    color: '#7c5cff',
    domains: ['Grammaire', 'Orthographe', 'Conjugaison', 'Vocabulaire', 'Lecture'],
    chapters: [classes, fonctions, accordsGN, accordSV, present, imparfaitPasseSimple, futur, homophones, vocabulaire, figures, lecture, dictees],
  },
  {
    id: 'maths',
    name: 'Maths',
    emoji: '📐',
    color: '#0984e3',
    domains: ['Nombres et calculs', 'Grandeurs et mesures', 'Espace et géométrie'],
    chapters: [mNombres, mCalcul, mFractions, mProp, mGrandeurs, mGeometrie],
  },
  {
    id: 'sciences',
    name: 'Sciences',
    emoji: '🔬',
    color: '#00b894',
    domains: ['Matière et énergie', 'Le vivant', 'La planète Terre', 'Technologie'],
    chapters: [sMatiere, sEnergie, sVivant, sTerre, sTechno],
  },
];

// Les chapitres de français n'ont pas de subjectName : on le complète.
SUBJECTS[0].chapters.forEach((c) => { c.subjectName = c.subjectName || 'Français'; });
export const subjectOf = (chapter) => SUBJECTS.find((s) => s.id === chapter.subject) || null;

// Matières proposées pour les modules créés par l'IA (extension à d'autres disciplines de 6e).
export const AI_SUBJECTS = ['Français', 'Mathématiques', 'Histoire-Géographie', 'Sciences et technologie', 'Anglais', 'Enseignement moral et civique'];

export const DOMAIN_ORDER = [...new Set(SUBJECTS.flatMap((s) => s.domains)), 'Mes modules'];

export const BUILTIN_CHAPTERS = SUBJECTS.flatMap((s) => s.chapters);
