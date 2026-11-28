// Chapitre : dictées courtes (lecture par la synthèse vocale du navigateur).
import { pick } from '../../core/utils.js';

const DICTEES = {
  1: [
    'Le petit chat dort sur le canapé.',
    'Les enfants jouent dans la cour.',
    'Ma sœur a un nouveau vélo rouge.',
    'Nous mangeons des pommes et des poires.',
    'Le ciel est bleu et le soleil brille.',
    'Mes amis sont partis à la plage.',
  ],
  2: [
    'Les oiseaux du jardin chantent chaque matin.',
    'Ces belles fleurs blanches sentent très bon.',
    'Le vieux marin raconte des histoires étranges.',
    'Mes parents ont acheté de nouveaux livres.',
    'On voit la mer depuis la fenêtre de ma chambre.',
    'Les chevaux sauvages galopent dans la prairie.',
  ],
  3: [
    'Soudain, le chevalier saisit son épée et s’élança vers le dragon.',
    'Il faisait nuit et les vagues frappaient les rochers avec fureur.',
    'Les feuilles de ce grand arbre tombent toutes en automne.',
    'Nous commençâmes notre voyage par une longue marche dans la forêt.',
    'La princesse poussa un cri, puis elle s’enfuit dans le château.',
    'Les élèves de la classe écoutent attentivement leur professeur.',
  ],
};

function genDictee(rng, level) {
  const text = pick(rng, DICTEES[level]);
  return {
    type: 'dictee',
    notion: 'Dictée',
    question: 'Écoute la phrase (tu peux la réécouter) puis écris-la.',
    text,
    hint: 'Réécoute lentement. Vérifie les accords : sujet → verbe, nom → adjectif. N’oublie pas la majuscule et le point.',
    explanation: 'Relis-toi toujours en cherchant les accords : c’est là que se cachent la plupart des erreurs !',
  };
}

export default {
  id: 'dictees',
  subject: 'francais',
  domain: 'Orthographe',
  title: 'Dictées flash',
  emoji: '🎧',
  color: '#fd79a8',
  summary: 'Dictées courtes de phrases réinvestissant les accords, les homophones et la conjugaison.',
  lesson: {
    intro: 'La dictée t’entraîne à **écrire sans fautes** en mobilisant toutes tes connaissances. On l’écoute, on écrit, puis on se **relit**.',
    rules: [
      { title: '1. Écouter', text: 'Écoute la phrase **en entier** une première fois sans écrire.', examples: [] },
      { title: '2. Écrire', text: 'Réécoute et écris **groupe par groupe**.', examples: [] },
      { title: '3. Se relire', text: 'Relis 3 fois : une fois pour le **sens**, une fois pour les **accords** (sujet-verbe, nom-adjectif), une fois pour les **homophones**.', examples: ['Les fleurs (pluriel) → blanches, sentent'] },
    ],
    pitfalls: [
      'Les lettres muettes du pluriel (-s, -nt) ne s’entendent pas : il faut réfléchir !',
      'Majuscule en début de phrase, point à la fin.',
    ],
    tip: 'Souligne mentalement chaque verbe et demande-toi : qui est son sujet ?',
  },
  generators: [genDictee],
};
