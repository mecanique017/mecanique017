// Technologie – objets techniques, matériaux, circuits électriques simples.
import { bankGenerators } from '../bank.js';

const CONDUCTEURS = ['le cuivre', 'le fer', 'l’aluminium', 'la mine de crayon (graphite)', 'l’or'];
const ISOLANTS = ['le plastique', 'le bois sec', 'le verre', 'le caoutchouc', 'le papier', 'la laine'];
const METAUX = ['le fer', 'le cuivre', 'l’aluminium', 'l’acier', 'l’or'];
const NON_METAUX = ['le bois', 'le verre', 'le plastique', 'le carton', 'la laine', 'le caoutchouc'];

export default {
  id: 'sci-techno',
  subject: 'sciences',
  subjectName: 'Sciences et technologie',
  domain: 'Technologie',
  title: 'Objets techniques et électricité',
  emoji: '🔌',
  color: '#e17055',
  summary: 'Objet technique et fonction d’usage, besoin, démarche de conception, familles de matériaux et propriétés, circuit électrique simple (pile, lampe, interrupteur), conducteurs et isolants, sécurité électrique.',
  lesson: {
    intro: 'Un **objet technique** est fabriqué par l’être humain pour répondre à un **besoin**. Pour le concevoir, on choisit des **matériaux** adaptés et, souvent, on le fait fonctionner avec de l’**électricité**.',
    rules: [
      { title: 'Besoin et fonction d’usage', text: 'La **fonction d’usage** dit **à quoi sert** l’objet. Pour le concevoir : besoin → recherche de solutions → **prototype** → tests et améliorations.', examples: ['Un parapluie sert à se protéger de la pluie.'] },
      { title: 'Les matériaux', text: 'Familles : **métaux**, **bois**, **plastiques**, **verre**, **textiles**… On les choisit selon leurs **propriétés** : solide, léger, transparent, conducteur, recyclable…', examples: ['Le verre est transparent : idéal pour les fenêtres.'] },
      { title: 'Le circuit électrique', text: 'Une **pile** (générateur), une **lampe**, des **fils** et un **interrupteur**. La lampe brille seulement si le circuit est **fermé**.', examples: ['Interrupteur ouvert = circuit ouvert = lampe éteinte.'] },
      { title: 'Conducteurs et isolants', text: 'Les **métaux** et le graphite laissent passer le courant (**conducteurs**). Le **plastique**, le **bois sec**, le **verre** ne le laissent pas passer (**isolants**).', examples: ['Les fils électriques : cuivre (conducteur) entouré de plastique (isolant).'] },
    ],
    pitfalls: [
      '⚠️ Les prises de la maison (230 V) sont DANGEREUSES : on n’expérimente qu’avec des piles.',
      'Relier directement les deux bornes d’une pile avec un fil crée un **court-circuit** : la pile chauffe.',
      'Seuls certains métaux (le fer, l’acier…) sont attirés par un aimant : pas le cuivre ni l’aluminium.',
    ],
    tip: 'Pour tester si un matériau est conducteur, place-le dans un circuit avec une pile et une lampe : si la lampe brille, il est conducteur !',
  },
  generators: bankGenerators({
    notion: 'Technologie',
    hint: 'Pense au circuit avec la pile, la lampe et l’interrupteur, ou à la propriété utile du matériau.',
    qcm: [
      { q: 'Comment appelle-t-on ce à quoi sert un objet technique ?', a: 'sa fonction d’usage', d: ['sa couleur', 'son prix', 'sa marque'], e: 'La fonction d’usage répond à la question « à quoi sert l’objet ? ».', n: 'Objet technique' },
      { q: 'Quel matériau est un bon conducteur électrique ?', a: 'le cuivre', d: ['le plastique', 'le bois sec', 'le verre'], e: 'Le cuivre est un métal : il conduit très bien le courant (on l’utilise dans les fils).', n: 'Conducteurs et isolants' },
      { q: 'Quel matériau est un isolant électrique ?', a: 'le plastique', d: ['le cuivre', 'l’aluminium', 'le fer'], e: 'Le plastique ne laisse pas passer le courant : il entoure les fils pour nous protéger.', n: 'Conducteurs et isolants' },
      { q: 'Pour qu’une lampe brille, le circuit doit être…', a: 'fermé', d: ['ouvert', 'coupé', 'sans pile'], e: 'Le courant ne circule que dans une boucle fermée.', n: 'Circuit électrique' },
      { q: 'Dans un circuit simple, quel élément fournit l’énergie ?', a: 'la pile', d: ['la lampe', 'l’interrupteur', 'le fil'], e: 'La pile est le générateur : elle fournit l’énergie électrique.', n: 'Circuit électrique' },
      { q: 'À quoi sert un interrupteur ?', a: 'à ouvrir ou fermer le circuit', d: ['à produire de l’électricité', 'à éclairer', 'à stocker l’énergie'], e: 'L’interrupteur permet d’allumer (circuit fermé) ou d’éteindre (circuit ouvert).', n: 'Circuit électrique' },
      { q: 'Quel matériau est attiré par un aimant ?', a: 'le fer', d: ['le cuivre', 'l’aluminium', 'le plastique'], e: 'Le fer (et l’acier, qui en contient) est attiré par un aimant ; le cuivre et l’aluminium ne le sont pas.', n: 'Matériaux', l: 2 },
      { q: 'Pourquoi les casseroles sont-elles souvent en métal ?', a: 'le métal conduit bien la chaleur', d: ['le métal est transparent', 'le métal est un isolant thermique', 'le métal est très mou'], e: 'Le métal transmet bien la chaleur des plaques aux aliments.', n: 'Matériaux' },
      { q: 'Pourquoi utilise-t-on le verre pour les fenêtres ?', a: 'il est transparent', d: ['il conduit le courant', 'il est attiré par les aimants', 'il est très souple'], e: 'La transparence du verre laisse passer la lumière.', n: 'Matériaux' },
      { q: 'Quel matériau est d’origine végétale ?', a: 'le bois', d: ['le plastique', 'l’acier', 'le verre'], e: 'Le bois vient des arbres : c’est un matériau d’origine végétale et renouvelable.', n: 'Matériaux' },
      { q: 'Peut-on faire des expériences avec les prises électriques de la maison ?', a: 'non, c’est très dangereux', d: ['oui, avec un fil de cuivre', 'oui, si la lampe est petite', 'oui, c’est sans danger'], e: 'Le courant du secteur (230 V) peut tuer. On expérimente uniquement avec des piles.', n: 'Sécurité électrique' },
    ],
    vf: [
      { s: 'Relier les deux bornes d’une pile par un simple fil fait chauffer la pile.', v: true, e: 'C’est un court-circuit : la pile chauffe et s’use, cela peut être dangereux.' },
      { s: 'Le bois sec conduit le courant électrique.', v: false, e: 'Le bois sec est un isolant électrique.' },
      { s: 'Dans un circuit en série, si une lampe grille, l’autre s’éteint aussi.', v: true, e: 'En série, il n’y a qu’une seule boucle : si elle est coupée, plus rien ne fonctionne.', l: 2 },
      { s: 'Le corps humain peut laisser passer le courant électrique.', v: true, e: 'Le corps humain est conducteur : c’est pour cela que l’électricité du secteur est dangereuse.' },
      { s: 'Un objet technique répond à un besoin.', v: true, e: 'Tout objet technique est conçu pour satisfaire un besoin de l’être humain.' },
      { s: 'Tous les métaux sont attirés par les aimants.', v: false, e: 'Seuls certains métaux comme le fer, l’acier ou le nickel sont attirés ; pas le cuivre ni l’aluminium.', l: 2 },
    ],
    ordre: [
      { q: 'Remets dans l’ordre les étapes de la conception d’un objet technique.', items: ['exprimer le besoin', 'rechercher des solutions', 'fabriquer un prototype', 'tester et améliorer'], e: 'On part du besoin, on cherche des solutions, on fabrique un prototype puis on le teste pour l’améliorer.' },
    ],
    cat: [
      { label: 'tous les matériaux conducteurs d’électricité', members: CONDUCTEURS, others: ISOLANTS, e: 'Les métaux et le graphite sont conducteurs.', n: 'Conducteurs et isolants' },
      { label: 'tous les isolants électriques', members: ISOLANTS, others: CONDUCTEURS, e: 'Plastique, bois sec, verre, caoutchouc, papier, laine ne laissent pas passer le courant.', n: 'Conducteurs et isolants' },
      { label: 'tous les métaux', members: METAUX, others: NON_METAUX, e: 'Fer, cuivre, aluminium, acier, or sont des métaux.', n: 'Matériaux' },
    ],
  }),
};
