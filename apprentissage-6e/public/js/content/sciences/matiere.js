// Sciences – La matière : états, changements d'état, mélanges, mesures.
import { bankGenerators } from '../bank.js';

const D_ETATS = ['la fusion', 'la solidification', 'la vaporisation', 'la liquéfaction'];
const without = (arr, x) => arr.filter((y) => y !== x);

export default {
  id: 'sci-matiere',
  subject: 'sciences',
  subjectName: 'Sciences et technologie',
  domain: 'Matière et énergie',
  title: 'La matière et ses états',
  emoji: '🧊',
  color: '#0984e3',
  summary: 'États de la matière (solide, liquide, gaz), changements d’état de l’eau, conservation de la masse, mélanges homogènes et hétérogènes, dissolution, séparation, instruments de mesure.',
  lesson: {
    intro: 'Tout ce qui nous entoure est fait de **matière**. Elle existe sous trois **états** : **solide**, **liquide** et **gazeux**. L’eau est la seule matière que l’on rencontre facilement dans les trois états !',
    rules: [
      { title: 'Les trois états', text: '**Solide** : forme propre. **Liquide** : prend la forme du récipient, surface libre plane et horizontale. **Gaz** : occupe tout l’espace disponible.', examples: ['glace (solide), eau (liquide), vapeur d’eau (gaz)'] },
      { title: 'Les changements d’état', text: 'solide → liquide : **fusion** ; liquide → solide : **solidification** ; liquide → gaz : **vaporisation** ; gaz → liquide : **liquéfaction** (ou condensation liquide).', examples: ['La glace pure fond à **0 °C**, l’eau pure bout à **100 °C**.'] },
      { title: 'Ce qui se conserve', text: 'Lors d’un changement d’état, la **masse se conserve** mais le **volume change** (l’eau qui gèle prend plus de place).', examples: ['100 g de glace donnent 100 g d’eau liquide.'] },
      { title: 'Les mélanges', text: 'Mélange **homogène** : on ne distingue pas les constituants (eau salée). **Hétérogène** : on les distingue (eau + sable). Pour séparer : **décantation**, **filtration**, **évaporation**.', examples: ['Le sel dissous se récupère en faisant évaporer l’eau.'] },
    ],
    pitfalls: [
      'Un sucre dissous n’a pas disparu : il est toujours là (l’eau a un goût sucré et la masse totale ne change pas).',
      'La « fumée » blanche au-dessus d’une casserole n’est pas de la vapeur (invisible) mais de fines gouttelettes d’eau liquide.',
      'L’air est de la matière : il a une masse !',
    ],
    tip: 'Pense aux glaçons dans un verre : fusion quand ils fondent, buée sur le verre froid = liquéfaction de la vapeur de l’air.',
  },
  generators: bankGenerators({
    notion: 'La matière',
    hint: 'Repense aux trois états de la matière et aux mots de la leçon.',
    qcm: [
      { q: 'Comment appelle-t-on le passage de l’état solide à l’état liquide ?', a: 'la fusion', d: without(D_ETATS, 'la fusion'), e: 'Solide → liquide : c’est la fusion (la glace fond).', n: 'Changements d’état' },
      { q: 'Comment appelle-t-on le passage de l’état liquide à l’état solide ?', a: 'la solidification', d: without(D_ETATS, 'la solidification'), e: 'Liquide → solide : c’est la solidification (l’eau gèle).', n: 'Changements d’état' },
      { q: 'Comment appelle-t-on le passage de l’état liquide à l’état gazeux ?', a: 'la vaporisation', d: without(D_ETATS, 'la vaporisation'), e: 'Liquide → gaz : c’est la vaporisation (ébullition ou évaporation).', n: 'Changements d’état' },
      { q: 'Comment appelle-t-on le passage de l’état gazeux à l’état liquide ?', a: 'la liquéfaction', d: without(D_ETATS, 'la liquéfaction'), e: 'Gaz → liquide : c’est la liquéfaction (on dit aussi condensation liquide), comme la buée sur une vitre froide.', n: 'Changements d’état' },
      { q: 'À quelle température la glace pure fond-elle ?', a: '0 °C', d: ['100 °C', '−10 °C', '37 °C'], e: 'Sous la pression atmosphérique normale, la glace pure fond à 0 °C.', n: 'Températures de changement d’état' },
      { q: 'À quelle température l’eau pure bout-elle ?', a: '100 °C', d: ['0 °C', '50 °C', '200 °C'], e: 'Sous la pression atmosphérique normale, l’eau pure bout à 100 °C.', n: 'Températures de changement d’état' },
      { q: 'Quand un glaçon fond complètement, que devient sa masse ?', a: 'elle reste la même', d: ['elle augmente', 'elle diminue', 'elle devient nulle'], e: 'Lors d’un changement d’état, la masse se conserve.', n: 'Conservation de la masse' },
      { q: 'Dans quel état est la vapeur d’eau ?', a: 'gazeux', d: ['liquide', 'solide', 'aucun état'], e: 'La vapeur d’eau est un gaz, et elle est invisible.' },
      { q: 'Comment séparer le sable de l’eau ?', a: 'par filtration', d: ['par évaporation du sable', 'avec un aimant', 'en ajoutant du sel'], e: 'Le filtre retient les grains de sable et laisse passer l’eau (on peut aussi laisser décanter).', n: 'Séparer un mélange' },
      { q: 'Comment récupérer le sel dissous dans de l’eau salée ?', a: 'en faisant évaporer l’eau', d: ['par filtration', 'par décantation', 'avec un aimant'], e: 'Le sel dissous traverse le filtre ; il faut faire évaporer l’eau pour le récupérer.', n: 'Séparer un mélange', l: 2 },
      { q: 'Un mélange dont on ne distingue pas les constituants à l’œil nu est un mélange…', a: 'homogène', d: ['hétérogène', 'solide', 'gazeux'], e: 'Homogène = on ne voit qu’une seule « phase » (eau salée, eau sucrée).', n: 'Mélanges' },
      { q: 'Quel instrument permet de mesurer un volume de liquide ?', a: 'une éprouvette graduée', d: ['une balance', 'un thermomètre', 'un chronomètre'], e: 'On mesure un volume avec une éprouvette graduée (en mL).', n: 'Mesures' },
      { q: 'Quel instrument permet de mesurer une masse ?', a: 'une balance', d: ['une éprouvette graduée', 'un thermomètre', 'une règle'], e: 'La masse se mesure avec une balance (en g ou en kg).', n: 'Mesures' },
      { q: 'Quel instrument permet de mesurer une température ?', a: 'un thermomètre', d: ['une balance', 'une éprouvette graduée', 'un rapporteur'], e: 'La température se mesure avec un thermomètre (en °C).', n: 'Mesures' },
      { q: 'Un liquide prend la forme…', a: 'du récipient qui le contient', d: ['d’une boule', 'd’un cube', 'qu’il avait avant'], e: 'Un liquide n’a pas de forme propre : il prend celle du récipient.', n: 'États de la matière' },
    ],
    vf: [
      { s: 'Un solide a une forme propre.', v: true, e: 'Un solide garde sa forme : on peut le prendre dans la main.' },
      { s: 'Un gaz occupe tout l’espace qui lui est offert.', v: true, e: 'Un gaz n’a ni forme propre ni volume propre : il remplit tout le récipient.' },
      { s: 'La surface d’un liquide au repos est plane et horizontale.', v: true, e: 'Quelle que soit l’inclinaison du verre, la surface libre d’un liquide au repos reste horizontale.' },
      { s: 'Quand l’eau gèle, son volume diminue.', v: false, e: 'En gelant, l’eau augmente de volume : c’est pour cela qu’une bouteille pleine peut éclater au congélateur.' },
      { s: 'L’air n’a pas de masse.', v: false, e: 'L’air est de la matière : un ballon gonflé est un peu plus lourd qu’un ballon vide.' },
      { s: 'Le sucre disparaît quand il se dissout dans l’eau.', v: false, e: 'Le sucre dissous est toujours présent : l’eau est sucrée et la masse totale est conservée.' },
      { s: 'La buée sur une vitre froide vient de la vapeur d’eau contenue dans l’air.', v: true, e: 'Au contact de la vitre froide, la vapeur d’eau de l’air se liquéfie en fines gouttelettes.', l: 2 },
      { s: 'La masse se conserve lors d’un changement d’état.', v: true, e: 'Fusion, solidification, vaporisation… la masse ne change jamais lors d’un changement d’état.' },
    ],
    ordre: [
      { q: 'Range ces états de l’eau du plus froid au plus chaud.', items: ['la glace', 'l’eau liquide', 'la vapeur d’eau'], e: 'Glace (sous 0 °C) → eau liquide → vapeur d’eau (l’eau bout à 100 °C).', sep: ' → ' },
      { q: 'Remets dans l’ordre les étapes pour obtenir du sel à partir d’eau de mer boueuse.', items: ['laisser décanter', 'filtrer le liquide', 'faire évaporer l’eau', 'récupérer les cristaux de sel'], e: 'On sépare d’abord ce qui n’est pas dissous (décantation, filtration), puis on évapore l’eau pour récupérer le sel dissous.', l: 2 },
    ],
    cat: [
      { label: 'toutes les matières qui sont liquides à température ambiante', members: ['l’huile', 'le lait', 'l’eau', 'le vinaigre', 'le jus de fruit'], others: ['le bois', 'la glace', 'le fer', 'le verre', 'l’air', 'la vapeur d’eau', 'le sable'], e: 'Un liquide coule et prend la forme du récipient.', n: 'États de la matière' },
      { label: 'tous les gaz', members: ['l’air', 'la vapeur d’eau', 'le dioxygène', 'le dioxyde de carbone', 'l’hélium'], others: ['l’eau', 'l’huile', 'la glace', 'le sable', 'le bois', 'le lait'], e: 'Un gaz n’a pas de forme propre et occupe tout l’espace disponible.', n: 'États de la matière' },
      { label: 'tous les mélanges hétérogènes', members: ['l’eau et le sable', 'l’eau et l’huile', 'l’eau boueuse', 'le jus d’orange avec pulpe'], others: ['l’eau salée', 'l’eau sucrée', 'le sirop dilué dans l’eau', 'l’air'], e: 'Dans un mélange hétérogène, on distingue au moins deux constituants à l’œil nu.', n: 'Mélanges' },
    ],
  }),
};
