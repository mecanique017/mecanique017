// Sciences – L'énergie : sources, renouvelables ou non, conversions.
import { bankGenerators } from '../bank.js';

const RENOUV = ['le Soleil', 'le vent', 'l’eau des rivières', 'le bois (si on replante)', 'la géothermie', 'les marées'];
const NON_RENOUV = ['le pétrole', 'le charbon', 'le gaz naturel', 'l’uranium'];

export default {
  id: 'sci-energie',
  subject: 'sciences',
  subjectName: 'Sciences et technologie',
  domain: 'Matière et énergie',
  title: 'Les sources d’énergie',
  emoji: '⚡',
  color: '#fdcb6e',
  summary: 'Sources d’énergie renouvelables et non renouvelables, formes d’énergie (électrique, lumineuse, thermique, chimique, de mouvement), conversions d’énergie, chaîne d’énergie.',
  lesson: {
    intro: 'Pour se déplacer, s’éclairer, se chauffer ou grandir, il faut de l’**énergie**. Elle ne se crée pas à partir de rien : elle provient d’une **source** et se **convertit** d’une forme à une autre.',
    rules: [
      { title: 'Les formes d’énergie', text: 'Énergie **électrique**, **lumineuse**, **thermique** (chaleur), **chimique** (aliments, pile, carburant), **de mouvement**.', examples: ['Une pile stocke de l’énergie chimique.'] },
      { title: 'Sources renouvelables', text: 'Elles se renouvellent rapidement à notre échelle : **Soleil**, **vent**, **eau** en mouvement, **bois** (si on replante), **géothermie**.', examples: ['Une éolienne utilise l’énergie du vent.'] },
      { title: 'Sources non renouvelables', text: 'Leurs réserves s’épuisent car elles ont mis des **millions d’années** à se former : **pétrole**, **charbon**, **gaz naturel**, **uranium**.', examples: ['Brûler du pétrole rejette du dioxyde de carbone.'] },
      { title: 'Les conversions', text: 'Un **convertisseur** transforme une forme d’énergie en une autre.', examples: ['Lampe : électrique → lumineuse (+ chaleur)', 'Panneau solaire : lumineuse → électrique', 'Moteur : électrique → mouvement'] },
    ],
    pitfalls: [
      'L’électricité n’est pas une source d’énergie : c’est une forme d’énergie produite à partir d’une source (vent, Soleil, charbon…).',
      'Renouvelable ne veut pas dire sans impact : un barrage modifie la rivière.',
    ],
    tip: 'Pour chaque appareil, demande-toi : « Qu’est-ce qui entre ? Qu’est-ce qui sort ? » (ex. lampe : électricité → lumière).',
  },
  generators: bankGenerators({
    notion: 'L’énergie',
    hint: 'Demande-toi d’où vient l’énergie et en quoi elle est transformée.',
    qcm: [
      { q: 'Quelle source d’énergie est renouvelable ?', a: 'le vent', d: ['le pétrole', 'le charbon', 'le gaz naturel'], e: 'Le vent se renouvelle sans cesse : c’est une source renouvelable.', n: 'Sources d’énergie' },
      { q: 'Quelle source d’énergie n’est PAS renouvelable ?', a: 'le charbon', d: ['le Soleil', 'le vent', 'l’eau des rivières'], e: 'Le charbon a mis des millions d’années à se former : ses réserves s’épuisent.', n: 'Sources d’énergie' },
      { q: 'Dans une éolienne, l’énergie du vent est convertie en…', a: 'énergie électrique', d: ['énergie chimique', 'énergie lumineuse', 'pétrole'], e: 'Le vent fait tourner les pales, qui entraînent un alternateur produisant de l’électricité.', n: 'Conversions' },
      { q: 'Un panneau solaire photovoltaïque convertit la lumière en…', a: 'électricité', d: ['vent', 'charbon', 'énergie chimique'], e: 'Photovoltaïque : énergie lumineuse → énergie électrique.', n: 'Conversions' },
      { q: 'Sous quelle forme l’énergie est-elle stockée dans les aliments ?', a: 'énergie chimique', d: ['énergie électrique', 'énergie lumineuse', 'énergie du vent'], e: 'Les aliments, comme les piles et les carburants, contiennent de l’énergie chimique.', n: 'Formes d’énergie' },
      { q: 'Dans une lampe, l’énergie électrique est surtout convertie en…', a: 'lumière (et un peu de chaleur)', d: ['mouvement', 'énergie chimique', 'son'], e: 'Une lampe est un convertisseur : électrique → lumineuse (+ thermique).', n: 'Conversions' },
      { q: 'Dans un moteur électrique, l’énergie électrique est convertie en…', a: 'mouvement', d: ['lumière', 'énergie chimique', 'vent'], e: 'Le moteur transforme l’énergie électrique en énergie de mouvement.', n: 'Conversions' },
      { q: 'D’où vient l’énergie d’un barrage hydroélectrique ?', a: 'de l’eau en mouvement', d: ['du charbon', 'du pétrole', 'de l’uranium'], e: 'L’eau qui descend fait tourner des turbines : c’est une énergie renouvelable.', n: 'Sources d’énergie' },
      { q: 'Pourquoi le pétrole est-il une énergie non renouvelable ?', a: 'il met des millions d’années à se former', d: ['il est liquide', 'il est noir', 'il sent mauvais'], e: 'Nous consommons le pétrole bien plus vite qu’il ne se forme : ses réserves diminuent.', n: 'Sources d’énergie', l: 2 },
    ],
    vf: [
      { s: 'Le Soleil est une source d’énergie renouvelable.', v: true, e: 'Le Soleil brille chaque jour : son énergie se renouvelle à notre échelle.' },
      { s: 'Le gaz naturel est une source d’énergie renouvelable.', v: false, e: 'Le gaz naturel est une énergie fossile : ses réserves s’épuisent.' },
      { s: 'On peut créer de l’énergie à partir de rien.', v: false, e: 'L’énergie ne se crée pas : elle se transforme d’une forme à une autre.' },
      { s: 'Une pile stocke de l’énergie sous forme chimique.', v: true, e: 'Dans une pile, l’énergie chimique est convertie en énergie électrique.' },
      { s: 'Brûler du charbon rejette du dioxyde de carbone dans l’air.', v: true, e: 'La combustion des énergies fossiles rejette du dioxyde de carbone, qui contribue au réchauffement climatique.', l: 2 },
      { s: 'L’électricité est une source d’énergie naturelle qu’on trouve dans le sol.', v: false, e: 'L’électricité est produite à partir d’une source (vent, Soleil, eau, charbon, uranium…).' },
    ],
    ordre: [
      { q: 'Remets dans l’ordre la chaîne d’énergie d’une éolienne.', items: ['le vent fait tourner les pales', 'les pales entraînent l’alternateur', 'l’alternateur produit de l’électricité', 'l’électricité arrive dans les maisons'], e: 'Énergie du vent → mouvement des pales → électricité → utilisation.' },
      { q: 'Remets dans l’ordre le trajet de l’énergie quand on allume une lampe de poche.', items: ['la pile fournit l’énergie', 'le courant circule dans les fils', 'la lampe s’allume'], e: 'Énergie chimique de la pile → énergie électrique dans le circuit → lumière.' },
    ],
    cat: [
      { label: 'toutes les sources d’énergie renouvelables', members: RENOUV, others: NON_RENOUV, e: 'Les sources renouvelables se reconstituent rapidement à notre échelle.', n: 'Sources d’énergie' },
      { label: 'toutes les sources d’énergie non renouvelables', members: NON_RENOUV, others: RENOUV, e: 'Les sources non renouvelables (fossiles et uranium) s’épuisent.', n: 'Sources d’énergie' },
    ],
  }),
};
