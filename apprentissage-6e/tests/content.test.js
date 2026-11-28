// Tests automatiques : chaque générateur produit des exercices valides, sans ambiguïté,
// et la correction reconnaît la bonne réponse. Lancer : npm test
import { BUILTIN_CHAPTERS } from '../public/js/content/index.js';
import { validateExercise, checkAnswer, describeAnswer } from '../public/js/core/exercise.js';
import { makeRng, signature } from '../public/js/core/utils.js';
import { conjugate } from '../public/js/content/francais/conjugaison-engine.js';
import fs from 'node:fs';
import path from 'node:path';
import { buildPrompt, SCHEMAS, sanitizeBody, postProcess } from '../public/js/core/ai-prompts.js';

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

// 4) Mode hors ligne : chaque fichier de l'app doit être mis en cache par le service worker.
const pub = new URL('../public/', import.meta.url).pathname;
const swSrc = fs.readFileSync(pub + 'sw.js', 'utf8');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(pub)) {
  const rel = './' + path.relative(pub, f);
  if (rel === './sw.js') continue;
  if (!swSrc.includes(`'${rel}'`)) fail(`sw.js : fichier absent du cache hors ligne : ${rel}`);
}
for (const m of swSrc.matchAll(/'\.\/([^']+)'/g)) if (!fs.existsSync(pub + m[1])) fail(`sw.js : fichier inexistant ${m[1]}`);

// 5) Consignes IA : chaque mode produit une consigne et possède un schéma ; le post-traitement filtre.
for (const mode of ['exercises', 'reading', 'dictee', 'module']) {
  const b = sanitizeBody({ mode, request: 'les fractions', chapter: { title: 'T', summary: 'S', lesson: 'L' } });
  if (!buildPrompt({ ...b, mode }) || !SCHEMAS[mode]) fail(`IA : mode ${mode} incomplet`);
}
const pp = postProcess('reading', { passage: 'Texte', passageTitle: 'Titre', exercises: [{ type: 'qcm', question: 'Q', choices: ['a', 'b'], answer: 1 }, { type: 'qcm', question: 'Q', choices: ['a'], answer: 3 }] });
if (pp.exercises.length !== 1 || pp.exercises[0].passage !== 'Texte') fail('IA : post-traitement incorrect');

console.log(`\n${total} exercices testés — ${failures ? failures + ' ÉCHEC(S)' : 'tout est OK ✅'}`);
process.exit(failures ? 1 : 0);
