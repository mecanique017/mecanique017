// Maths – Grandeurs et mesures : conversions, périmètres, aires, durées, cercle.
import { pick, randInt, buildChoices, fmt, round } from '../../core/utils.js';

const FAMILLES = {
  longueur: ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm'],
  masse: ['kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg'],
  contenance: ['hL', 'daL', 'L', 'dL', 'cL', 'mL'],
};
const SIMPLES = [['m', 'cm'], ['km', 'm'], ['m', 'mm'], ['cm', 'mm'], ['kg', 'g'], ['L', 'cL'], ['L', 'mL'], ['g', 'mg']];

function genConversion(rng, level) {
  let fam, from, to;
  if (level === 1) {
    [from, to] = pick(rng, SIMPLES);
    if (rng() < 0.4) [from, to] = [to, from];
    fam = Object.keys(FAMILLES).find((f) => FAMILLES[f].includes(from));
  } else {
    fam = pick(rng, Object.keys(FAMILLES));
    const u = FAMILLES[fam];
    const i = randInt(rng, 0, u.length - 1);
    let j = randInt(rng, Math.max(0, i - 3), Math.min(u.length - 1, i + 3));
    if (j === i) j = i === 0 ? 1 : i - 1;
    from = u[i]; to = u[j];
  }
  const u = FAMILLES[fam];
  const shift = u.indexOf(to) - u.indexOf(from); // > 0 : vers une unité plus petite → ×10^shift
  const v = level === 1 ? randInt(rng, 2, 90) : round(randInt(rng, 11, 9999) / pick(rng, [1, 10, 100]), 2);
  const r = round(v * 10 ** shift, 6);
  const factor = fmt(10 ** Math.abs(shift));
  return {
    type: 'trous', notion: `Conversions (${fam})`,
    question: 'Convertis.', text: `${fmt(v)} ${from} = ___ ${to}`, answers: [[fmt(r, 6)]],
    hint: `Utilise le tableau de conversion : ${u.join(' | ')}. Chaque colonne vaut 10 fois la suivante.`,
    explanation: `De ${from} à ${to}, on ${shift > 0 ? 'multiplie' : 'divise'} par ${factor} : ${fmt(v)} ${from} = ${fmt(r, 6)} ${to}.`,
  };
}

function dims(rng, level) {
  if (level === 3) return [round(randInt(rng, 15, 120) / 10, 1), round(randInt(rng, 10, 90) / 10, 1)];
  return [randInt(rng, 3, level === 1 ? 12 : 30), randInt(rng, 2, level === 1 ? 9 : 20)];
}

function genPerimetre(rng, level) {
  const carre = rng() < 0.3;
  let [w, h] = dims(rng, level);
  if (carre) h = w;
  const p = round(2 * (w + h), 2);
  return {
    type: 'trous', notion: 'Périmètre',
    question: `Calcule le périmètre de ce ${carre ? 'carré' : 'rectangle'}.`,
    figure: { kind: 'rect', w, h, unit: 'cm' },
    text: 'Périmètre = ___ cm', answers: [[fmt(p)]],
    hint: 'Le périmètre, c’est la longueur du tour de la figure : on additionne tous les côtés.',
    explanation: carre ? `Périmètre du carré = 4 × ${fmt(w)} = ${fmt(p)} cm.` : `Périmètre = 2 × (${fmt(w)} + ${fmt(h)}) = ${fmt(p)} cm.`,
  };
}

function genAire(rng, level) {
  const tri = level >= 2 && rng() < 0.4;
  if (tri) {
    const a = randInt(rng, 2, 12) * 2, b = randInt(rng, 2, 12);
    return {
      type: 'trous', notion: 'Aire',
      question: 'Calcule l’aire de ce triangle rectangle.',
      figure: { kind: 'righttriangle', a, b, unit: 'cm' },
      text: 'Aire = ___ cm²', answers: [[String((a * b) / 2)]],
      hint: 'Un triangle rectangle, c’est la moitié d’un rectangle.',
      explanation: `Aire = (${a} × ${b}) ÷ 2 = ${(a * b) / 2} cm² : la moitié du rectangle de ${a} cm sur ${b} cm.`,
    };
  }
  const [w, h] = dims(rng, level);
  const r = round(w * h, 2);
  return {
    type: 'trous', notion: 'Aire',
    question: 'Calcule l’aire de ce rectangle.',
    figure: { kind: 'rect', w, h, unit: 'cm' },
    text: 'Aire = ___ cm²', answers: [[fmt(r)]],
    hint: 'Aire du rectangle = longueur × largeur. L’unité est le cm² (centimètre carré).',
    explanation: `Aire = ${fmt(w)} × ${fmt(h)} = ${fmt(r)} cm².`,
  };
}

function genUnite(rng) {
  const items = [
    ['Dans quelle unité peut-on exprimer un périmètre ?', 'en cm', ['en cm²', 'en kg', 'en L'], 'Un périmètre est une longueur : il s’exprime en m, cm, mm…'],
    ['Dans quelle unité peut-on exprimer une aire ?', 'en cm²', ['en cm', 'en g', 'en min'], 'Une aire s’exprime en unités « carrées » : m², cm², km²…'],
    ['Combien y a-t-il de minutes dans une heure ?', '60', ['100', '24', '30'], '1 h = 60 min et 1 min = 60 s.'],
    ['Combien y a-t-il de cm² dans 1 dm² ?', '100', ['10', '1 000', '1'], 'Un carré de 1 dm de côté contient 10 × 10 = 100 carrés de 1 cm de côté.'],
    ['Quelle est la masse la plus proche de celle d’une pomme ?', '150 g', ['15 kg', '1,5 g', '15 mg'], 'Une pomme pèse environ 150 g.'],
    ['Quelle est la contenance la plus proche de celle d’une bouteille d’eau ?', '1,5 L', ['15 mL', '150 L', '1,5 cL'], 'Une grande bouteille d’eau contient 1,5 L.'],
  ];
  const [q, a, d, e] = pick(rng, items);
  const { choices, answer } = buildChoices(rng, a, d, 4);
  return { type: 'qcm', notion: 'Unités et ordres de grandeur', question: q, choices, answer, hint: 'Pense à une situation concrète de la vie quotidienne.', explanation: e };
}

function genDuree(rng, level) {
  const kind = pick(rng, level === 1 ? ['h→min', 'min→h'] : ['h→min', 'min→h', 'fin']);
  if (kind === 'h→min') {
    const h = randInt(rng, 1, 4), m = randInt(rng, 5, 55);
    return { type: 'trous', notion: 'Durées', question: 'Convertis en minutes.', text: `${h} h ${m} min = ___ min`, answers: [[String(h * 60 + m)]],
      hint: '1 h = 60 min.', explanation: `${h} h = ${h * 60} min, donc ${h} h ${m} min = ${h * 60} + ${m} = ${h * 60 + m} min.` };
  }
  if (kind === 'min→h') {
    const t = randInt(rng, 65, 280);
    return { type: 'trous', notion: 'Durées', question: 'Convertis en heures et minutes.', text: `${t} min = ___ h ___ min`, answers: [[String(Math.floor(t / 60))], [String(t % 60)]],
      hint: 'Combien de fois 60 min dans cette durée ? Le reste donne les minutes.', explanation: `${t} = 60 × ${Math.floor(t / 60)} + ${t % 60}, donc ${t} min = ${Math.floor(t / 60)} h ${t % 60} min.` };
  }
  const h0 = randInt(rng, 8, 19), m0 = randInt(rng, 0, 11) * 5, dh = randInt(rng, 0, 2), dm = randInt(rng, 1, 11) * 5;
  const total = h0 * 60 + m0 + dh * 60 + dm;
  const hf = Math.floor(total / 60) % 24, mf = total % 60;
  return { type: 'trous', notion: 'Durées', question: 'Calcule l’heure de fin.',
    text: `Un film commence à ${h0} h ${String(m0).padStart(2, '0')} et dure ${dh ? `${dh} h ` : ''}${dm} min. Il se termine à ___ h ___ min.`,
    answers: [[String(hf)], [String(mf), String(mf).padStart(2, '0')]],
    hint: 'Ajoute d’abord les heures, puis les minutes. Si tu dépasses 60 min, cela fait une heure de plus.',
    explanation: `${h0} h ${String(m0).padStart(2, '0')} + ${dh} h ${dm} min = ${hf} h ${String(mf).padStart(2, '0')}.` };
}

function genCercle(rng) {
  const r = randInt(rng, 2, 15);
  const fromR = rng() < 0.5;
  return {
    type: 'trous', notion: 'Le cercle',
    question: fromR ? 'Ce cercle a pour rayon la longueur indiquée. Quel est son diamètre ?' : 'Ce cercle a pour diamètre la longueur indiquée. Quel est son rayon ?',
    figure: { kind: 'circle', show: fromR ? 'radius' : 'diameter', value: fromR ? r : 2 * r, unit: 'cm' },
    text: `${fromR ? 'Diamètre' : 'Rayon'} = ___ cm`, answers: [[String(fromR ? 2 * r : r)]],
    hint: 'Le diamètre mesure deux fois le rayon.',
    explanation: `Diamètre = 2 × rayon : ${fromR ? `2 × ${r} = ${2 * r}` : `${2 * r} ÷ 2 = ${r}`} cm.`,
  };
}

export default {
  id: 'math-grandeurs',
  subject: 'maths',
  subjectName: 'Mathématiques',
  domain: 'Grandeurs et mesures',
  title: 'Grandeurs et mesures',
  emoji: '📏',
  color: '#fdcb6e',
  summary: 'Conversions de longueurs, masses, contenances ; périmètre et aire du rectangle, du carré et du triangle rectangle ; durées ; rayon et diamètre du cercle ; ordres de grandeur.',
  lesson: {
    intro: 'Mesurer, c’est comparer à une **unité**. Une longueur, une masse, une contenance, une aire ou une durée ne se mesurent pas avec les mêmes unités !',
    rules: [
      { title: 'Le tableau de conversion', text: 'km | hm | dam | **m** | dm | cm | mm — même principe pour les **g** et les **L**. Chaque unité vaut **10 fois** la suivante.', examples: ['3,5 m = 350 cm', '2 500 g = 2,5 kg', '1 L = 100 cL'] },
      { title: 'Périmètre', text: 'C’est la **longueur du tour**. Rectangle : **2 × (L + l)**. Carré : **4 × c**.', examples: ['Rectangle 8 cm × 3 cm : 2 × 11 = 22 cm'] },
      { title: 'Aire', text: 'C’est la **surface**, en **cm², m²**… Rectangle : **L × l**. Carré : **c × c**. Triangle rectangle : **(a × b) ÷ 2**.', examples: ['Rectangle 8 cm × 3 cm : 24 cm²'] },
      { title: 'Durées et cercle', text: '**1 h = 60 min**, 1 min = 60 s. Dans un cercle, **diamètre = 2 × rayon**.', examples: ['1 h 45 min = 105 min', 'rayon 4 cm → diamètre 8 cm'] },
    ],
    pitfalls: [
      'Ne confonds pas périmètre (cm) et aire (cm²).',
      'Les durées ne se calculent pas comme des décimaux : 1 h 30 = 1,5 h, pas 1,30 h.',
      'Avant de calculer, mets toutes les longueurs dans la même unité.',
    ],
    tip: 'Le périmètre, c’est la clôture du jardin ; l’aire, c’est le gazon à l’intérieur !',
  },
  generators: [genConversion, genConversion, genPerimetre, genAire, genUnite, genDuree, genCercle],
};
