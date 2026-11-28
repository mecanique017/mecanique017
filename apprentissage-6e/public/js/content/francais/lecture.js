// Chapitre : compréhension de lecture (textes originaux + questions explicites / implicites + ordre des événements).
import { pick, shuffle, sample } from '../../core/utils.js';

const TEXTS = [
  {
    title: 'Le gardien du phare',
    text: `Sur une île battue par les vents vivait Élias, le vieux gardien du phare. Chaque soir, il montait les cent vingt marches de la tour pour allumer la grande lampe.
Une nuit de novembre, une tempête terrible se leva. Les vagues frappaient les rochers avec fureur. Soudain, Élias aperçut au loin une petite lumière qui clignotait : un bateau de pêche était en difficulté !
La lampe du phare s’était éteinte. Le cœur battant, le vieil homme grimpa l’escalier aussi vite qu’il le put. Ses mains tremblaient, mais il réussit à rallumer la mèche.
Le faisceau lumineux balaya la mer. Guidé par la lumière, le bateau évita les récifs et entra dans le port. Le lendemain matin, les pêcheurs vinrent remercier Élias avec un panier de poissons frais.`,
    questions: [
      { type: 'qcm', question: 'Où vit Élias ?', choices: ['Sur une île', 'Dans un village de montagne', 'Sur un bateau', 'Dans une grande ville'], answer: 0, hint: 'Relis la première phrase.', explanation: 'Le texte dit : « Sur une île battue par les vents vivait Élias ». C’est une information explicite.' },
      { type: 'qcm', question: 'Pourquoi le bateau est-il en danger ?', choices: ['Il y a une tempête et la lampe du phare est éteinte', 'Le bateau n’a plus d’essence', 'Les pêcheurs se sont endormis', 'Élias a fermé le port'], answer: 0, hint: 'Cherche ce qui se passe pendant la nuit de novembre.', explanation: 'La tempête fait rage et le phare ne guide plus les bateaux : sans lumière, ils risquent de heurter les récifs.' },
      { type: 'qcm', question: 'Que ressent Élias quand il monte l’escalier ?', choices: ['De l’inquiétude', 'De l’ennui', 'De la colère', 'De la fierté'], answer: 0, hint: 'Observe les indices : « le cœur battant », « ses mains tremblaient ».', explanation: '« Le cœur battant » et « ses mains tremblaient » montrent qu’il est inquiet. C’est une information implicite : il faut la déduire.' },
      { type: 'vraifaux', statement: 'Les pêcheurs sont reconnaissants envers Élias.', answer: true, justifications: ['Ils viennent le remercier avec un panier de poissons.', 'Ils lui demandent de quitter le phare.', 'Le texte ne parle pas des pêcheurs.'], justificationAnswer: 0, hint: 'Relis la dernière phrase.', explanation: 'Les pêcheurs viennent le remercier : ils sont reconnaissants.' },
      { type: 'qcm', question: 'Quel est le sens du mot « récifs » dans le texte ?', choices: ['Des rochers dans la mer', 'Des poissons', 'Des voiles de bateau', 'Des vagues géantes'], answer: 0, hint: 'Le bateau doit les « éviter » pour entrer dans le port…', explanation: 'Les récifs sont des rochers à fleur d’eau, dangereux pour les bateaux. Le contexte (« évita les récifs ») aide à comprendre.' },
      { type: 'trous', question: 'Complète avec un mot du texte.', text: 'Chaque soir, Élias montait les ___ marches de la tour.', answers: [['cent vingt', '120']], hint: 'C’est un nombre, au début du texte.', explanation: 'Le texte précise : « les cent vingt marches de la tour ».' },
    ],
    events: ['Élias allume la lampe chaque soir.', 'Une tempête se lève.', 'Élias aperçoit un bateau en difficulté.', 'Il rallume la mèche du phare.', 'Le bateau entre dans le port.', 'Les pêcheurs remercient Élias.'],
  },
  {
    title: 'La forêt aux mille murmures',
    text: `Nora avait toujours entendu dire qu’il ne fallait pas entrer dans la forêt aux mille murmures. Pourtant, un après-midi, elle suivit un renard blanc qui avait volé son écharpe.
Sous les arbres, il faisait sombre. Les feuilles chuchotaient des mots étranges. Au centre d’une clairière se dressait un chêne immense dont l’écorce formait un visage ridé.
« Pour sortir d’ici, tu dois répondre à mon énigme, dit l’arbre d’une voix grave. Qu’est-ce qui grandit quand on le partage ? »
Nora réfléchit longtemps. Elle pensa à son goûter, à ses jouets, puis elle sourit : « Le bonheur ! »
Le chêne éclata d’un rire qui fit trembler ses branches. Le renard déposa l’écharpe à ses pieds, et un sentier lumineux apparut pour la ramener chez elle.`,
    questions: [
      { type: 'qcm', question: 'Pourquoi Nora entre-t-elle dans la forêt ?', choices: ['Elle suit un renard qui a volé son écharpe', 'Elle cherche des champignons', 'Elle veut voir le chêne', 'Elle s’est perdue en promenade'], answer: 0, hint: 'Relis la deuxième phrase.', explanation: 'Elle suit le renard blanc qui a volé son écharpe.' },
      { type: 'qcm', question: 'De quel genre de récit s’agit-il ?', choices: ['Un conte merveilleux', 'Un article de journal', 'Une recette', 'Un documentaire scientifique'], answer: 0, hint: 'Un arbre qui parle, une énigme, un sentier lumineux… est-ce réaliste ?', explanation: 'Des éléments magiques (arbre qui parle, sentier lumineux) montrent que c’est un conte merveilleux.' },
      { type: 'qcm', question: 'Quelle est la réponse à l’énigme du chêne ?', choices: ['Le bonheur', 'Le goûter', 'Les jouets', 'La forêt'], answer: 0, hint: 'Nora sourit avant de répondre…', explanation: 'Le bonheur grandit quand on le partage : c’est la bonne réponse, puisque l’arbre la laisse partir.' },
      { type: 'vraifaux', statement: 'Le chêne est en colère contre Nora à la fin.', answer: false, justifications: ['Il éclate de rire et la laisse partir.', 'Il garde l’écharpe.', 'Il crie très fort.'], justificationAnswer: 0, hint: 'Comment réagit le chêne après la réponse ?', explanation: 'Le chêne « éclata d’un rire » : il est content de la réponse.' },
      { type: 'qcm', question: 'Dans « Les feuilles chuchotaient », quelle figure de style est utilisée ?', choices: ['Une personnification', 'Une comparaison', 'Une énumération', 'Aucune'], answer: 0, hint: 'Qui chuchote, normalement ?', explanation: 'Chuchoter est une action humaine attribuée aux feuilles : c’est une personnification.' },
      { type: 'identification', question: 'Clique sur les deux personnages qui ne sont pas humains.', tokens: ['Nora', 'le renard blanc', 'le chêne', 'la maman de Nora'], targets: [1, 2], hint: 'Un animal et un arbre…', explanation: 'Le renard blanc et le chêne sont des personnages non humains. La maman de Nora n’apparaît pas dans le texte.' },
    ],
    events: ['Un renard vole l’écharpe de Nora.', 'Nora entre dans la forêt.', 'Elle arrive dans une clairière.', 'Le chêne lui pose une énigme.', 'Nora trouve la réponse.', 'Un sentier lumineux apparaît.'],
  },
  {
    title: 'Pourquoi la Lune change de forme',
    text: `Au commencement du monde, la Lune était toujours pleine et ronde. Elle brillait chaque nuit avec fierté et se moquait des étoiles, qu’elle trouvait trop petites.
Un jour, le Soleil se fâcha : « Tu es bien orgueilleuse, ma sœur. Puisque tu méprises les plus petits que toi, tu deviendras petite à ton tour. »
Dès lors, chaque mois, la Lune se mit à maigrir, jusqu’à disparaître complètement du ciel. Seules les étoiles, qu’elle avait tant moquées, éclairaient alors la nuit.
Mais le Soleil n’était pas cruel. Il permit à la Lune de grossir à nouveau, peu à peu, afin qu’elle n’oublie jamais la leçon. C’est pourquoi, depuis ce temps, la Lune change de forme tout au long du mois.`,
    questions: [
      { type: 'qcm', question: 'Quel défaut avait la Lune au début du récit ?', choices: ['Elle était orgueilleuse', 'Elle était paresseuse', 'Elle était peureuse', 'Elle était gourmande'], answer: 0, hint: 'Que dit le Soleil quand il se fâche ?', explanation: 'Le Soleil lui dit : « Tu es bien orgueilleuse ». Elle se moquait des étoiles.' },
      { type: 'qcm', question: 'Ce texte est un récit des origines. Que cherche-t-il à expliquer ?', choices: ['Pourquoi la Lune change de forme', 'Comment naissent les étoiles', 'Pourquoi il fait froid en hiver', 'Comment fonctionne le Soleil'], answer: 0, hint: 'Regarde le titre et la dernière phrase.', explanation: 'Un récit des origines (comme un mythe) explique un phénomène naturel de façon imaginaire : ici, les phases de la Lune.' },
      { type: 'vraifaux', statement: 'Le Soleil est cruel avec la Lune.', answer: false, justifications: ['Il lui permet de grossir à nouveau.', 'Il la fait disparaître pour toujours.', 'Il ne lui parle jamais.'], justificationAnswer: 0, hint: 'Relis le début du dernier paragraphe.', explanation: 'Le texte dit : « le Soleil n’était pas cruel. Il permit à la Lune de grossir à nouveau ».' },
      { type: 'qcm', question: 'Que signifie « méprises » dans « tu méprises les plus petits que toi » ?', choices: ['Tu les considères comme sans valeur', 'Tu les protèges', 'Tu les admires', 'Tu les oublies'], answer: 0, hint: 'La Lune se moque des étoiles…', explanation: 'Mépriser, c’est considérer quelqu’un comme inférieur, sans valeur.' },
      { type: 'qcm', question: 'Quelle leçon peut-on tirer de ce récit ?', choices: ['Il ne faut pas se moquer des plus petits que soi', 'Il faut toujours briller la nuit', 'Le Soleil est plus fort que tout', 'Les étoiles sont jalouses'], answer: 0, hint: 'Pourquoi la Lune a-t-elle été punie ?', explanation: 'La Lune est punie parce qu’elle se moquait des étoiles : il ne faut pas mépriser les plus petits.' },
      { type: 'trous', question: 'Complète avec le bon mot du texte.', text: 'Quand la Lune disparaissait, seules les ___ éclairaient la nuit.', answers: [['étoiles']], hint: 'Ce sont les astres dont la Lune se moquait.', explanation: 'Ce sont les étoiles, celles que la Lune avait moquées, qui éclairaient la nuit.' },
    ],
    events: ['La Lune se moque des étoiles.', 'Le Soleil se fâche.', 'La Lune maigrit jusqu’à disparaître.', 'Le Soleil lui permet de grossir à nouveau.'],
  },
];

function withPassage(t, ex) {
  return { notion: 'Compréhension', ...ex, passage: t.text, passageTitle: t.title };
}

function eventsExercise(t) {
  return withPassage(t, {
    type: 'ordre',
    notion: 'Chronologie du récit',
    question: 'Remets les événements du texte dans l’ordre chronologique.',
    items: t.events,
    separator: ' → ',
    hint: 'Relis le texte paragraphe par paragraphe : chaque paragraphe fait avancer l’histoire.',
    explanation: `Ordre du récit : ${t.events.join(' → ')}`,
  });
}

/** Mélange les choix d'un QCM figé (la bonne réponse est stockée en position 0). */
function shuffleQcm(rng, q) {
  if (q.type !== 'qcm') return q;
  const correct = q.choices[q.answer];
  const choices = shuffle(rng, q.choices);
  return { ...q, choices, answer: choices.indexOf(correct) };
}
function shuffleVF(rng, q) {
  if (q.type !== 'vraifaux') return q;
  const good = q.justifications[q.justificationAnswer];
  const justifications = shuffle(rng, q.justifications);
  return { ...q, justifications, justificationAnswer: justifications.indexOf(good) };
}

function genQuestion(rng) {
  const t = pick(rng, TEXTS);
  if (rng() < 0.2) return eventsExercise(t);
  return withPassage(t, shuffleVF(rng, shuffleQcm(rng, pick(rng, t.questions))));
}

/** Une série de lecture porte sur UN seul texte. */
function series(rng, level, count) {
  const t = pick(rng, TEXTS);
  const qs = sample(rng, t.questions, Math.min(count - 1, t.questions.length))
    .map((q) => withPassage(t, shuffleVF(rng, shuffleQcm(rng, q))));
  return [...qs, eventsExercise(t)];
}

export default {
  id: 'lecture',
  subject: 'francais',
  domain: 'Lecture',
  title: 'Comprendre un texte',
  emoji: '📖',
  color: '#55a630',
  summary: 'Compréhension de récits (conte, récit des origines, récit d’aventure) : informations explicites et implicites, vocabulaire en contexte, chronologie, genre du texte.',
  lesson: {
    intro: 'Bien lire, c’est comprendre ce que le texte **dit** (l’explicite) et ce qu’il **laisse deviner** (l’implicite).',
    rules: [
      { title: 'Les informations explicites', text: 'Elles sont **écrites noir sur blanc** dans le texte : il suffit de les retrouver.', examples: ['« Élias vivait sur une île » → Où vit Élias ? Sur une île.'] },
      { title: 'Les informations implicites', text: 'Il faut les **déduire** à partir d’indices.', examples: ['« Ses mains tremblaient » → il a peur.'] },
      { title: 'Le sens d’un mot inconnu', text: 'Utilise le **contexte** : la phrase autour du mot t’aide à deviner son sens.', examples: ['« Le bateau évita les récifs » → des obstacles dans la mer.'] },
      { title: 'Le genre du texte', text: '**Conte** (merveilleux, magie), **récit des origines / mythe** (explique le monde), **fable** (morale), **récit d’aventure**.', examples: ['Un arbre qui parle → conte merveilleux'] },
    ],
    pitfalls: [
      'Réponds avec les informations du texte, pas avec ce que tu imagines.',
      'Pour une question « Pourquoi ? », cherche une cause ; pour « Que ressent… ? », cherche des indices d’émotion.',
    ],
    tip: 'Lis la question AVANT de relire le texte : tu sauras exactement quoi chercher !',
  },
  generators: [genQuestion],
  series,
};
