// Niveaux, XP, badges : règles de jeu (pures, sans DOM).

export const XP = { firstTry: 10, secondTry: 6, effort: 2, streakBonus: 5, perfectSeries: 20 };
export const DAILY_GOAL = 60;

const LEVEL_TITLES = ['Petite plume', 'Plume agile', 'Détective des mots', 'As de la grammaire', 'Virtuose des verbes',
  'Star de l’orthographe', 'Sage du dictionnaire', 'Légende de la langue'];

/** XP cumulée nécessaire pour atteindre le niveau n (n ≥ 1). */
export const xpForLevel = (n) => 50 * (n - 1) * n;

export function levelInfo(xp) {
  let n = 1;
  while (xp >= xpForLevel(n + 1)) n++;
  const start = xpForLevel(n), next = xpForLevel(n + 1);
  return { level: n, title: LEVEL_TITLES[Math.min(n - 1, LEVEL_TITLES.length - 1)], progress: (xp - start) / (next - start), toNext: next - xp };
}

export const MASTERY_LABELS = [
  [0, 'À découvrir'], [1, 'Débutant'], [40, 'En progrès'], [70, 'Solide'], [90, 'Maîtrisé'],
];
export function masteryLabel(m, attempts) {
  if (!attempts) return MASTERY_LABELS[0][1];
  let label = MASTERY_LABELS[1][1];
  for (const [min, l] of MASTERY_LABELS) if (m >= min && min > 0) label = l;
  return label;
}

/** Difficulté adaptative à partir de la maîtrise. */
export const levelFromMastery = (m = 0) => (m < 40 ? 1 : m < 75 ? 2 : 3);

export const BADGES = [
  { id: 'premier-pas', emoji: '👣', name: 'Premier pas', desc: 'Réussir ton premier exercice.', test: (s) => s.stats.correct >= 1 },
  { id: 'serie-parfaite', emoji: '🌟', name: 'Sans faute', desc: 'Terminer une série sans aucune erreur.', test: (s) => s.stats.perfectSeries >= 1 },
  { id: 'cinq-parfaites', emoji: '💎', name: 'Diamant', desc: 'Réussir 5 séries parfaites.', test: (s) => s.stats.perfectSeries >= 5 },
  { id: 'perseverant', emoji: '💪', name: 'Persévérant', desc: 'Trouver 10 fois la réponse au 2e essai.', test: (s) => s.stats.secondTry >= 10 },
  { id: 'flamme-3', emoji: '🔥', name: 'Petite flamme', desc: '3 jours d’entraînement d’affilée.', test: (s) => s.streak.best >= 3 },
  { id: 'flamme-7', emoji: '🚒', name: 'Feu de joie', desc: '7 jours d’affilée !', test: (s) => s.streak.best >= 7 },
  { id: 'xp-100', emoji: '🥉', name: '100 XP', desc: 'Gagner 100 points d’expérience.', test: (s) => s.xp >= 100 },
  { id: 'xp-500', emoji: '🥈', name: '500 XP', desc: 'Gagner 500 points d’expérience.', test: (s) => s.xp >= 500 },
  { id: 'xp-1500', emoji: '🥇', name: '1 500 XP', desc: 'Gagner 1 500 points d’expérience.', test: (s) => s.xp >= 1500 },
  { id: 'maitrise', emoji: '🎓', name: 'Expert', desc: 'Maîtriser une notion (90 %).', test: (s) => Object.values(s.notions).some((n) => n.mastery >= 90) },
  { id: 'explorateur', emoji: '🧭', name: 'Explorateur', desc: 'S’entraîner sur 6 chapitres différents.', test: (s) => Object.values(s.notions).filter((n) => n.attempts > 0).length >= 6 },
  { id: 'revision', emoji: '🔁', name: 'Rattrapage réussi', desc: 'Corriger 5 erreurs dans « À revoir ».', test: (s) => s.stats.reviewFixed >= 5 },
  { id: 'dictee', emoji: '🎧', name: 'Oreille fine', desc: 'Réussir une dictée sans faute.', test: (s) => s.stats.perfectDictees >= 1 },
  { id: 'createur', emoji: '✨', name: 'Créateur', desc: 'Créer ton propre module avec l’IA.', test: (s) => s.customChapters.length >= 1 },
  { id: 'objectif', emoji: '🎯', name: 'Objectif atteint', desc: 'Atteindre l’objectif du jour.', test: (s) => s.stats.dailyGoals >= 1 },
  { id: 'centurion', emoji: '🏛️', name: 'Centurion', desc: 'Répondre à 100 exercices.', test: (s) => s.stats.answered >= 100 },
];

export function newBadges(state) {
  return BADGES.filter((b) => !state.badges.includes(b.id) && b.test(state));
}

const PRAISE = ['Bravo !', 'Excellent !', 'Super !', 'Génial !', 'Bien joué !', 'Parfait !', 'Tu assures !', 'Magnifique !', 'Impressionnant !'];
const RETRY = ['Pas tout à fait…', 'Presque !', 'Bonne tentative !', 'Tu y es presque !', 'Encore un petit effort !'];
const LEARN = ['Pas grave, on apprend de ses erreurs !', 'Chaque erreur te fait progresser.', 'Maintenant tu sais : la prochaine fois sera la bonne !', 'Ce n’est pas facile, et tu t’accroches : bravo !'];
export const phrase = {
  praise: () => PRAISE[Math.floor(Math.random() * PRAISE.length)],
  retry: () => RETRY[Math.floor(Math.random() * RETRY.length)],
  learn: () => LEARN[Math.floor(Math.random() * LEARN.length)],
};

export function endMessage(ratio) {
  if (ratio === 1) return 'Série parfaite ! Tu es en feu 🔥';
  if (ratio >= 0.8) return 'Très belle série, continue comme ça !';
  if (ratio >= 0.5) return 'Bon travail ! Tu progresses à chaque série.';
  return 'Tu as osé t’entraîner sur une notion difficile : c’est comme ça qu’on progresse ! Relis la leçon et réessaie.';
}
