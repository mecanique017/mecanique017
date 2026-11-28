// Sciences – La planète Terre dans le système solaire ; phénomènes géologiques.
import { bankGenerators } from '../bank.js';

export default {
  id: 'sci-terre',
  subject: 'sciences',
  subjectName: 'Sciences et technologie',
  domain: 'La planète Terre',
  title: 'La Terre dans l’Univers',
  emoji: '🌍',
  color: '#6c5ce7',
  summary: 'Système solaire (Soleil étoile, 8 planètes, Lune satellite), rotation de la Terre (jour/nuit), révolution (année), saisons (inclinaison de l’axe), phénomènes géologiques (volcans, séismes).',
  lesson: {
    intro: 'La Terre est une **planète** qui tourne autour d’une **étoile** : le **Soleil**. Avec 7 autres planètes, elle forme le **système solaire**.',
    rules: [
      { title: 'Le système solaire', text: 'Le **Soleil** est une étoile (il produit sa lumière). **8 planètes** tournent autour : Mercure, Vénus, la Terre, Mars, Jupiter, Saturne, Uranus, Neptune. La **Lune** est le **satellite** naturel de la Terre.', examples: ['Moyen mnémotechnique : « Me Voici Toute Mignonne, Je Suis Une Nébuleuse »'] },
      { title: 'Le jour et la nuit', text: 'La Terre tourne sur elle-même en environ **24 heures** (rotation). La moitié éclairée par le Soleil est dans le jour, l’autre dans la nuit.', examples: ['Le Soleil semble se lever à l’est et se coucher à l’ouest.'] },
      { title: 'L’année et les saisons', text: 'La Terre fait le tour du Soleil en environ **365 jours** (révolution). Les **saisons** existent parce que l’**axe de la Terre est incliné**.', examples: ['En été, les rayons du Soleil arrivent plus droit et les jours sont plus longs.'] },
      { title: 'Une planète active', text: 'Les **volcans** rejettent de la lave, des gaz et des cendres. Les **séismes** (tremblements de terre) sont des secousses du sol. Ils sont plus fréquents à certains endroits du globe.', examples: [] },
    ],
    pitfalls: [
      'Ce n’est pas le Soleil qui tourne autour de la Terre : c’est la Terre qui tourne sur elle-même et autour du Soleil.',
      'Les saisons ne viennent pas de la distance Terre-Soleil mais de l’inclinaison de l’axe de la Terre.',
      'La Lune ne produit pas de lumière : elle renvoie celle du Soleil.',
    ],
    tip: 'Avec une lampe (le Soleil) et un ballon (la Terre) dans le noir, fais tourner le ballon : tu verras le jour et la nuit !',
  },
  generators: bankGenerators({
    notion: 'La Terre et l’Univers',
    hint: 'Pense à la rotation (sur elle-même, 24 h) et à la révolution (autour du Soleil, 1 an).',
    qcm: [
      { q: 'Combien de temps met la Terre pour faire un tour sur elle-même ?', a: 'environ 24 heures', d: ['environ 365 jours', 'environ 1 mois', 'environ 1 heure'], e: 'La rotation de la Terre dure environ 24 heures : c’est une journée.', n: 'Mouvements de la Terre' },
      { q: 'Combien de temps met la Terre pour faire le tour du Soleil ?', a: 'environ 365 jours', d: ['environ 24 heures', 'environ 28 jours', 'environ 10 ans'], e: 'La révolution de la Terre autour du Soleil dure environ 365 jours : c’est une année.', n: 'Mouvements de la Terre' },
      { q: 'Qu’est-ce qui explique l’alternance du jour et de la nuit ?', a: 'la rotation de la Terre sur elle-même', d: ['le Soleil qui tourne autour de la Terre', 'les nuages qui cachent le Soleil', 'la Lune qui passe devant le Soleil'], e: 'En tournant sur elle-même, chaque région de la Terre passe de la partie éclairée à la partie sombre.', n: 'Mouvements de la Terre' },
      { q: 'Qu’est-ce qui explique les saisons ?', a: 'l’inclinaison de l’axe de la Terre', d: ['la distance entre la Terre et le Soleil', 'la Lune', 'les nuages'], e: 'Comme l’axe de la Terre est incliné, les rayons du Soleil n’arrivent pas avec le même angle au cours de l’année.', n: 'Saisons', l: 2 },
      { q: 'Quelle est la planète la plus proche du Soleil ?', a: 'Mercure', d: ['Vénus', 'la Terre', 'Mars'], e: 'Dans l’ordre : Mercure, Vénus, la Terre, Mars, Jupiter, Saturne, Uranus, Neptune.', n: 'Système solaire' },
      { q: 'Quelle est la plus grosse planète du système solaire ?', a: 'Jupiter', d: ['Saturne', 'la Terre', 'Neptune'], e: 'Jupiter est une planète géante gazeuse : la plus grosse du système solaire.', n: 'Système solaire' },
      { q: 'Le Soleil est…', a: 'une étoile', d: ['une planète', 'un satellite', 'une comète'], e: 'Le Soleil est une étoile : il produit sa propre lumière.', n: 'Système solaire' },
      { q: 'La Lune est…', a: 'le satellite naturel de la Terre', d: ['une étoile', 'une planète', 'une comète'], e: 'La Lune tourne autour de la Terre : c’est son satellite naturel.', n: 'Système solaire' },
      { q: 'Combien de planètes compte le système solaire ?', a: '8', d: ['9', '7', '12'], e: 'Il y a 8 planètes (Pluton n’est plus considérée comme une planète depuis 2006).', n: 'Système solaire' },
      { q: 'De quel côté le Soleil semble-t-il se lever ?', a: 'à l’est', d: ['à l’ouest', 'au nord', 'au sud'], e: 'Le Soleil semble se lever à l’est et se coucher à l’ouest, à cause de la rotation de la Terre.', n: 'Mouvements de la Terre' },
      { q: 'Pourquoi voit-on la Lune briller ?', a: 'elle renvoie la lumière du Soleil', d: ['elle produit sa propre lumière', 'elle est très chaude', 'elle est en feu'], e: 'La Lune est éclairée par le Soleil et renvoie une partie de sa lumière.', n: 'Système solaire' },
      { q: 'Que rejette un volcan en éruption ?', a: 'de la lave, des gaz et des cendres', d: ['de l’eau de mer', 'de la neige', 'du sable de plage'], e: 'La lave est de la roche fondue ; elle s’accompagne de gaz et de cendres.', n: 'Phénomènes géologiques', l: 2 },
    ],
    vf: [
      { s: 'La Terre tourne autour du Soleil.', v: true, e: 'La Terre fait le tour du Soleil en environ 365 jours.' },
      { s: 'Le Soleil tourne autour de la Terre.', v: false, e: 'C’est la rotation de la Terre sur elle-même qui donne l’impression que le Soleil se déplace dans le ciel.' },
      { s: 'Il fait nuit sur la partie de la Terre qui n’est pas éclairée par le Soleil.', v: true, e: 'À chaque instant, une moitié de la Terre est éclairée (jour) et l’autre est dans l’ombre (nuit).' },
      { s: 'En été, il fait chaud parce que la Terre est beaucoup plus proche du Soleil.', v: false, e: 'Les saisons sont dues à l’inclinaison de l’axe de la Terre, pas à la distance au Soleil.', l: 2 },
      { s: 'La Lune fait le tour de la Terre en environ un mois.', v: true, e: 'La Lune tourne autour de la Terre en un peu moins d’un mois.' },
      { s: 'Les étoiles disparaissent pendant la journée.', v: false, e: 'Les étoiles sont toujours là, mais la lumière du Soleil nous empêche de les voir le jour.' },
    ],
    ordre: [
      { q: 'Range ces planètes de la plus proche à la plus éloignée du Soleil.', items: ['Mercure', 'Vénus', 'la Terre', 'Mars'], e: 'Les quatre planètes rocheuses : Mercure, Vénus, la Terre, Mars.' },
      { q: 'Range ces planètes de la plus proche à la plus éloignée du Soleil.', items: ['Mars', 'Jupiter', 'Saturne', 'Uranus', 'Neptune'], e: 'Après Mars viennent les géantes : Jupiter, Saturne, Uranus, Neptune.', l: 2 },
      { q: 'Range ces durées de la plus courte à la plus longue.', items: ['une rotation de la Terre', 'un tour de la Lune autour de la Terre', 'un tour de la Terre autour du Soleil'], e: 'Environ 24 heures < environ 1 mois < environ 365 jours.', sep: ' < ' },
    ],
    cat: [
      { label: 'toutes les planètes', members: ['Mercure', 'Vénus', 'Mars', 'Jupiter', 'Saturne', 'Neptune'], others: ['la Lune', 'le Soleil', 'l’étoile Polaire', 'une comète'], e: 'Une planète tourne autour d’une étoile (ici le Soleil) ; la Lune est un satellite, le Soleil et l’étoile Polaire sont des étoiles.', n: 'Système solaire' },
    ],
  }),
};
