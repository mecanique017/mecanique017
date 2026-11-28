// Sciences – Le vivant : classification, besoins, régimes alimentaires, chaînes alimentaires, développement.
import { bankGenerators } from '../bank.js';

const MAMMIFERES = ['le chat', 'le dauphin', 'la chauve-souris', 'la baleine', 'le lapin', 'la vache'];
const OISEAUX = ['l’aigle', 'le pingouin', 'la poule', 'l’autruche', 'la mésange'];
const POISSONS = ['le requin', 'la truite', 'le saumon', 'le thon', 'la sardine'];
const INSECTES = ['l’abeille', 'la fourmi', 'la coccinelle', 'le papillon', 'la sauterelle'];
const AUTRES_VERTEBRES = ['la grenouille', 'le serpent', 'le lézard'];
const INVERTEBRES = [...INSECTES, 'l’escargot', 'l’araignée', 'le ver de terre', 'la méduse'];

export default {
  id: 'sci-vivant',
  subject: 'sciences',
  subjectName: 'Sciences et technologie',
  domain: 'Le vivant',
  title: 'Le vivant et sa diversité',
  emoji: '🐸',
  color: '#00b894',
  summary: 'Classification du vivant par attributs (vertébrés, mammifères, oiseaux, poissons, insectes), cellule, besoins des plantes, régimes alimentaires, chaînes alimentaires, décomposeurs, développement et métamorphose.',
  lesson: {
    intro: 'Les êtres vivants naissent, se nourrissent, grandissent, se reproduisent et meurent. Ils sont tous faits de **cellules**. Pour s’y retrouver, on les **classe** selon ce qu’ils **ont** (leurs attributs), pas selon où ils vivent !',
    rules: [
      { title: 'Classer par attributs', text: '**Vertébrés** : squelette interne avec colonne vertébrale. **Mammifères** : poils et mamelles. **Oiseaux** : plumes. **Poissons** : nageoires (et souvent des écailles). **Insectes** : 6 pattes. **Araignées** : 8 pattes.', examples: ['La baleine vit dans l’eau, mais elle a des mamelles : c’est un mammifère.'] },
      { title: 'Se nourrir', text: 'Les **plantes vertes** fabriquent leur matière avec la **lumière**, l’**eau**, les **sels minéraux** et le **dioxyde de carbone** : ce sont des producteurs. Les animaux mangent d’autres êtres vivants : **herbivores**, **carnivores**, **omnivores**.', examples: ['La vache est herbivore, l’humain est omnivore.'] },
      { title: 'Les chaînes alimentaires', text: 'La flèche signifie « **est mangé par** ». Une chaîne commence toujours par un **végétal**. Les **décomposeurs** (champignons, bactéries, vers de terre) recyclent la matière morte.', examples: ['herbe → sauterelle → grenouille → héron'] },
      { title: 'Le développement', text: 'Certains animaux changent complètement de forme : c’est la **métamorphose**. Les plantes à fleurs se développent à partir d’une **graine** qui **germe**.', examples: ['œuf → chenille → chrysalide → papillon'] },
    ],
    pitfalls: [
      'Le milieu de vie ne sert pas à classer : le dauphin et le requin vivent dans la mer mais ne sont pas dans le même groupe.',
      'La chauve-souris vole mais a des poils et des mamelles : c’est un mammifère.',
      'Dans une chaîne alimentaire, la flèche part de celui qui est mangé.',
    ],
    tip: 'Pour classer un animal, demande-toi : « Qu’est-ce qu’il A ? » (des plumes, des poils, 6 pattes…).',
  },
  generators: bankGenerators({
    notion: 'Le vivant',
    hint: 'Pour classer, regarde ce que l’animal possède (poils, plumes, nageoires, nombre de pattes…).',
    qcm: [
      { q: 'Quels attributs partagent tous les mammifères ?', a: 'des poils et des mamelles', d: ['des plumes', 'des nageoires', 'six pattes'], e: 'Tous les mammifères ont des poils et des mamelles (les femelles allaitent leurs petits).', n: 'Classification' },
      { q: 'Un animal qui a six pattes est…', a: 'un insecte', d: ['une araignée', 'un mammifère', 'un oiseau'], e: 'Les insectes ont 6 pattes ; les araignées en ont 8.', n: 'Classification' },
      { q: 'Combien de pattes a une araignée ?', a: '8', d: ['6', '4', '10'], e: 'L’araignée a 8 pattes : ce n’est pas un insecte.', n: 'Classification' },
      { q: 'Lequel de ces animaux est un vertébré ?', a: 'la grenouille', d: ['l’escargot', 'la fourmi', 'le ver de terre'], e: 'La grenouille a un squelette interne avec une colonne vertébrale.', n: 'Classification' },
      { q: 'De quoi une plante verte a-t-elle besoin pour fabriquer sa propre matière ?', a: 'de lumière, d’eau, de sels minéraux et de dioxyde de carbone', d: ['de sucre et de viande', 'uniquement de terre', 'seulement d’obscurité et d’eau'], e: 'Grâce à la lumière, la plante fabrique sa matière à partir de l’eau, des sels minéraux du sol et du dioxyde de carbone de l’air.', n: 'Besoins des plantes', l: 2 },
      { q: 'Comment appelle-t-on un animal qui ne mange que des végétaux ?', a: 'un herbivore', d: ['un carnivore', 'un omnivore', 'un décomposeur'], e: 'Herbivore = se nourrit de végétaux (vache, lapin…).', n: 'Régimes alimentaires' },
      { q: 'Comment appelle-t-on un animal qui mange à la fois des végétaux et des animaux ?', a: 'un omnivore', d: ['un herbivore', 'un carnivore', 'un producteur'], e: 'Omnivore = mange de tout (humain, sanglier, ours…).', n: 'Régimes alimentaires' },
      { q: 'Dans la chaîne « herbe → lapin → renard », que signifie la flèche ?', a: '« est mangé par »', d: ['« mange »', '« est plus grand que »', '« vit avec »'], e: 'La flèche va de celui qui est mangé vers celui qui mange : l’herbe est mangée par le lapin.', n: 'Chaînes alimentaires' },
      { q: 'Quelle est l’unité de base de tous les êtres vivants ?', a: 'la cellule', d: ['l’organe', 'le squelette', 'le sang'], e: 'Tous les êtres vivants sont constitués d’une ou de plusieurs cellules.', n: 'La cellule' },
      { q: 'Comment appelle-t-on la transformation d’une chenille en papillon ?', a: 'une métamorphose', d: ['une germination', 'une floraison', 'une pollinisation'], e: 'Quand un animal change complètement de forme au cours de sa vie, c’est une métamorphose.', n: 'Développement' },
      { q: 'Comment appelle-t-on les êtres vivants qui transforment les feuilles mortes et les cadavres en sels minéraux ?', a: 'les décomposeurs', d: ['les producteurs', 'les prédateurs', 'les herbivores'], e: 'Champignons, bactéries et petits animaux du sol (vers de terre…) décomposent la matière morte.', n: 'Chaînes alimentaires', l: 2 },
      { q: 'À quel groupe appartient la baleine ?', a: 'aux mammifères', d: ['aux poissons', 'aux oiseaux', 'aux insectes'], e: 'La baleine respire avec des poumons et allaite ses petits : c’est un mammifère.', n: 'Classification' },
    ],
    vf: [
      { s: 'La baleine est un poisson.', v: false, e: 'La baleine a des mamelles et des poumons : c’est un mammifère marin.' },
      { s: 'La chauve-souris est un oiseau.', v: false, e: 'La chauve-souris a des poils et des mamelles : c’est un mammifère qui vole.' },
      { s: 'Tous les êtres vivants sont constitués de cellules.', v: true, e: 'La cellule est l’unité de base du vivant, des bactéries aux humains.' },
      { s: 'Une plante verte fabrique sa propre matière grâce à la lumière.', v: true, e: 'Les plantes vertes sont des producteurs : elles utilisent la lumière pour fabriquer leur matière.' },
      { s: 'Le pingouin ne vole presque pas, mais c’est un oiseau.', v: true, e: 'Le pingouin a des plumes et un bec : c’est un oiseau.' },
      { s: 'Le dauphin respire dans l’eau grâce à des branchies.', v: false, e: 'Le dauphin est un mammifère : il respire avec des poumons et remonte à la surface.' },
      { s: 'L’escargot est un vertébré.', v: false, e: 'L’escargot n’a pas de squelette interne : c’est un invertébré.' },
      { s: 'Une chaîne alimentaire commence toujours par un végétal.', v: true, e: 'Le premier maillon est un producteur (un végétal), qui fabrique sa propre matière.', l: 2 },
    ],
    ordre: [
      { q: 'Remets cette chaîne alimentaire dans l’ordre (« est mangé par »).', items: ['l’herbe', 'la sauterelle', 'la grenouille', 'le héron'], e: 'herbe → sauterelle → grenouille → héron : la chaîne commence par un végétal.' },
      { q: 'Remets dans l’ordre le développement du papillon.', items: ['l’œuf', 'la chenille', 'la chrysalide', 'le papillon'], e: 'œuf → chenille → chrysalide → papillon adulte : c’est une métamorphose.' },
      { q: 'Remets dans l’ordre le développement de la grenouille.', items: ['l’œuf', 'le têtard', 'la jeune grenouille', 'la grenouille adulte'], e: 'Le têtard vit dans l’eau et respire avec des branchies, puis se transforme en grenouille.' },
      { q: 'Remets dans l’ordre le développement d’une plante à fleurs.', items: ['la graine', 'la germination', 'la jeune plante', 'la plante en fleur', 'le fruit avec des graines'], e: 'La graine germe, la plante grandit, fleurit puis donne des fruits qui contiennent de nouvelles graines.', l: 2 },
    ],
    cat: [
      { label: 'tous les mammifères', members: MAMMIFERES, others: [...OISEAUX, ...POISSONS, ...INSECTES, 'la grenouille'], e: 'Les mammifères ont des poils et des mamelles.', n: 'Classification' },
      { label: 'tous les oiseaux', members: OISEAUX, others: [...MAMMIFERES, ...POISSONS, ...INSECTES], e: 'Les oiseaux ont des plumes.', n: 'Classification' },
      { label: 'tous les insectes', members: INSECTES, others: [...MAMMIFERES, ...OISEAUX, 'l’araignée', 'l’escargot', 'le ver de terre'], e: 'Les insectes ont 6 pattes (l’araignée en a 8 : ce n’est pas un insecte).', n: 'Classification' },
      { label: 'tous les vertébrés', members: [...MAMMIFERES, ...OISEAUX, ...POISSONS, ...AUTRES_VERTEBRES], others: INVERTEBRES, e: 'Les vertébrés ont un squelette interne avec une colonne vertébrale.', n: 'Classification' },
    ],
  }),
};
