// Tests automatiques : chaque générateur produit des exercices valides, sans ambiguïté,
// et la correction reconnaît la bonne réponse. Lancer : npm test
import { BUILTIN_CHAPTERS } from '../public/js/content/index.js';
import { validateExercise, checkAnswer, describeAnswer } from '../public/js/core/exercise.js';
import { makeRng, signature } from '../public/js/core/utils.js';
import { conjugate } from '../public/js/content/francais/conjugaison-engine.js';

let failures = 0;
const fail = (msg, ex) => { failures++; if (failures < 25) console.error('✗', msg, ex ? JSON.stringify(ex).slice(0, 400) : ''); };

function correctResponse(ex) {
  switch (ex.type) {
    case 'qcm': return ex.answer;
    case 'trous': return ex.answers.map((a) => a[0]);
    case 'ordre': return ex.items.slice();
    case 'identification': return ex.targets.slice();
    case 'vraifaux': return { value: ex.answer, justification: ex.justificationAnswer };
    case 'dictee': return ex.text;
  }
}

// 1) Moteur de conjugaison : quelques formes de référence.
const ref = [
  ['manger', 'present', 3, 'mangeons'], ['commencer', 'present', 3, 'commençons'], ['finir', 'present', 5, 'finissent'],
  ['manger', 'imparfait', 3, 'mangions'], ['manger', 'imparfait', 0, 'mangeais'], ['commencer', 'imparfait', 5, 'commençaient'],
  ['chanter', 'passe_simple', 5, 'chantèrent'], ['manger', 'passe_simple', 3, 'mangeâmes'], ['lancer', 'passe_simple', 2, 'lança'],
  ['finir', 'passe_simple', 4, 'finîtes'], ['venir', 'passe_simple', 5, 'vinrent'], ['voir', 'imparfait', 3, 'voyions'],
  ['crier', 'imparfait', 3, 'criions'], ['aller', 'futur', 0, 'irai'], ['être', 'imparfait', 2, 'était'], ['faire', 'present', 4, 'faites'],
  ['avoir', 'futur', 5, 'auront'], ['jouer', 'futur', 3, 'jouerons'], ['obéir', 'imparfait', 4, 'obéissiez'],
];
for (const [v, t, p, exp] of ref) {
  const got = conjugate(v, t, p);
  if (got !== exp) fail(`conjugate(${v}, ${t}, ${p}) = ${got}, attendu ${exp}`);
}

// 2) Générateurs.
const rng = makeRng(42);
let total = 0;
for (const ch of BUILTIN_CHAPTERS) {
  const sigs = new Set();
  for (const level of [1, 2, 3]) {
    for (let i = 0; i < 300; i++) {
      const gen = ch.generators[i % ch.generators.length];
      let raw;
      try { raw = gen(rng, level); } catch (e) { fail(`${ch.id} niv.${level} ${gen.name} : exception ${e.message}`); continue; }
      const ex = validateExercise(raw);
      total++;
      if (!ex) { fail(`${ch.id} niv.${level} ${gen.name} : exercice invalide`, raw); continue; }
      const res = checkAnswer(ex, correctResponse(ex));
      if (!res.correct) fail(`${ch.id} ${gen.name} : la bonne réponse n'est pas acceptée`, ex);
      if (!describeAnswer(ex)) fail(`${ch.id} : describeAnswer vide`, ex);
      if (/undefined|NaN|\[object/.test(JSON.stringify(ex))) fail(`${ch.id} ${gen.name} : texte suspect`, ex);
      if (ex.type === 'ordre' && new Set(ex.items).size < 2) fail(`${ch.id} : ordre trivial`, ex);
      if (ex.type === 'qcm' && ex.choices.length < 2) fail(`${ch.id} : qcm trop court`, ex);
      if (ex.type === 'vraifaux' && ex.justifications && new Set(ex.justifications).size !== ex.justifications.length) fail(`${ch.id} : justifications en double`, ex);
      sigs.add(signature(ex));
    }
  }
  if (ch.series) {
    const s = ch.series(rng, 2, 6).map(validateExercise);
    if (s.some((x) => !x)) fail(`${ch.id} : série invalide`);
  }
  console.log(`✓ ${ch.id.padEnd(22)} ${String(sigs.size).padStart(4)} exercices distincts sur 900 générés`);
}

// 3) Correction : cas particuliers.
const tr = validateExercise({ type: 'trous', text: 'Nous ___.', answers: [['commençâmes']] });
if (!checkAnswer(tr, ['commencames']).accentOnly) fail('détection « seulement les accents » KO');
if (checkAnswer(tr, ['COMMENÇÂMES ']).correct !== true) fail('normalisation casse/espaces KO');
const dic = validateExercise({ type: 'dictee', text: 'Les fleurs sont belles.' });
const d = checkAnswer(dic, 'les fleur sont belles');
if (d.correct || d.score !== 0.75) fail(`score dictée inattendu ${d.score}`);
if (validateExercise({ type: 'qcm', question: 'x', choices: ['a', 'a'], answer: 0 })) fail('QCM avec doublons accepté');
if (validateExercise({ type: 'trous', text: 'a ___ b ___', answers: [['x']] })) fail('trous incohérent accepté');

console.log(`\n${total} exercices testés — ${failures ? failures + ' ÉCHEC(S)' : 'tout est OK ✅'}`);
process.exit(failures ? 1 : 0);
