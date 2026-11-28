// Fabrique des générateurs d'exercices à partir de banques de questions (sciences, géométrie…).
// Formats :
//   qcm   : { q, a, d: [distracteurs], e: explication, l?: niveau minimum, h?: indice }
//   vf    : { s: affirmation, v: true/false, e: explication (dit la vérité), l? }
//   ordre : { q, items: [ordre correct], e, l?, sep? }
//   cat   : { label: 'tous les mammifères', members: [...], others: [...], e, h? }
import { pick, shuffle, sample } from '../core/utils.js';

const byLevel = (list, level) => {
  const ok = list.filter((x) => (x.l || 1) <= level);
  return ok.length ? ok : list;
};

export function bankGenerators({ notion, qcm = [], vf = [], ordre = [], cat = [], hint = 'Relis la leçon : la réponse s’y trouve !' }) {
  const gens = [];
  if (qcm.length) {
    gens.push(function genBankQcm(rng, level) {
      const it = pick(rng, byLevel(qcm, level));
      const choices = shuffle(rng, [it.a, ...sample(rng, it.d, 3)]);
      return { type: 'qcm', notion: it.n || notion, question: it.q, choices, answer: choices.indexOf(it.a), hint: it.h || hint, explanation: it.e, figure: it.fig };
    });
  }
  if (vf.length >= 3) {
    gens.push(function genBankVF(rng, level) {
      const it = pick(rng, byLevel(vf, level));
      const others = sample(rng, vf.filter((x) => x !== it && x.e !== it.e), 2).map((x) => x.e);
      const justifications = shuffle(rng, [it.e, ...others]);
      return {
        type: 'vraifaux', notion: it.n || notion, statement: it.s, answer: it.v,
        question: 'Vrai ou faux ? Choisis ensuite l’explication qui correspond à CETTE affirmation.',
        justifications, justificationAnswer: justifications.indexOf(it.e),
        hint: it.h || hint, explanation: it.e,
      };
    });
  }
  if (ordre.length) {
    gens.push(function genBankOrdre(rng, level) {
      const it = pick(rng, byLevel(ordre, level));
      return { type: 'ordre', notion: it.n || notion, question: it.q, items: it.items.slice(), separator: it.sep || ' → ', hint: it.h || hint, explanation: it.e };
    });
  }
  if (cat.length) {
    gens.push(function genBankCat(rng, level) {
      const it = pick(rng, cat);
      const good = sample(rng, it.members, level === 1 ? 2 : 3);
      const bad = sample(rng, it.others, level === 3 ? 4 : 3);
      const tokens = shuffle(rng, [...good, ...bad]);
      return {
        type: 'identification', notion: it.n || notion, question: `Clique sur ${it.label}.`, tokens,
        targets: tokens.map((t, i) => (good.includes(t) ? i : -1)).filter((i) => i >= 0),
        hint: it.h || hint, explanation: `${it.e} Ici : ${good.join(', ')}.`,
      };
    });
  }
  return gens;
}
