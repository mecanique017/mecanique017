// Moteur de conjugaison : présent, imparfait, passé simple, futur simple de l'indicatif.
// 1er groupe (avec -ger / -cer), 2e groupe, et verbes irréguliers fréquents en 6e.

export const TENSES = {
  present: 'présent',
  imparfait: 'imparfait',
  passe_simple: 'passé simple',
  futur: 'futur simple',
};

/** « au présent », « à l’imparfait »… */
export const auTemps = (t) => (t === 'imparfait' ? 'à l’imparfait' : `au ${TENSES[t]}`);

export const PERSONS = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];
export const PERSON_LABELS = ['1re pers. du singulier', '2e pers. du singulier', '3e pers. du singulier',
  '1re pers. du pluriel', '2e pers. du pluriel', '3e pers. du pluriel'];
// Variantes de pronoms pour varier les exercices (même personne grammaticale).
export const PRONOUN_VARIANTS = [['je'], ['tu'], ['il', 'elle', 'on'], ['nous'], ['vous'], ['ils', 'elles']];

export const VERBS_G1 = ['chanter', 'parler', 'regarder', 'marcher', 'jouer', 'danser', 'écouter', 'aimer',
  'arriver', 'crier', 'manger', 'nager', 'voyager', 'commencer', 'avancer', 'lancer', 'tomber', 'chercher',
  'trouver', 'gagner', 'raconter', 'porter', 'sauter', 'entrer'];
export const VERBS_G2 = ['finir', 'choisir', 'grandir', 'réussir', 'obéir', 'remplir', 'réfléchir', 'bâtir'];

const IRREGULAR = {
  être: {
    present: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
    imparfait: ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient'],
    passe_simple: ['fus', 'fus', 'fut', 'fûmes', 'fûtes', 'furent'],
    futur: ['serai', 'seras', 'sera', 'serons', 'serez', 'seront'],
  },
  avoir: {
    present: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
    imparfaitStem: 'av',
    passe_simple: ['eus', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent'],
    futurStem: 'aur',
  },
  aller: {
    present: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
    imparfaitStem: 'all',
    passe_simple: ['allai', 'allas', 'alla', 'allâmes', 'allâtes', 'allèrent'],
    futurStem: 'ir',
  },
  faire: {
    present: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'],
    imparfaitStem: 'fais',
    passe_simple: ['fis', 'fis', 'fit', 'fîmes', 'fîtes', 'firent'],
    futurStem: 'fer',
  },
  prendre: {
    present: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'],
    imparfaitStem: 'pren',
    passe_simple: ['pris', 'pris', 'prit', 'prîmes', 'prîtes', 'prirent'],
    futurStem: 'prendr',
  },
  venir: {
    present: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'],
    imparfaitStem: 'ven',
    passe_simple: ['vins', 'vins', 'vint', 'vînmes', 'vîntes', 'vinrent'],
    futurStem: 'viendr',
  },
  voir: {
    present: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'],
    imparfaitStem: 'voy',
    passe_simple: ['vis', 'vis', 'vit', 'vîmes', 'vîtes', 'virent'],
    futurStem: 'verr',
  },
  dire: {
    present: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'],
    imparfaitStem: 'dis',
    passe_simple: ['dis', 'dis', 'dit', 'dîmes', 'dîtes', 'dirent'],
    futurStem: 'dir',
  },
  pouvoir: {
    present: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'],
    imparfaitStem: 'pouv',
    passe_simple: ['pus', 'pus', 'put', 'pûmes', 'pûtes', 'purent'],
    futurStem: 'pourr',
  },
  vouloir: {
    present: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'],
    imparfaitStem: 'voul',
    passe_simple: ['voulus', 'voulus', 'voulut', 'voulûmes', 'voulûtes', 'voulurent'],
    futurStem: 'voudr',
  },
};
export const VERBS_IRREG = Object.keys(IRREGULAR);
export const ALL_VERBS = [...VERBS_G1, ...VERBS_G2, ...VERBS_IRREG];

const END_IMP = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'];
const END_FUT = ['ai', 'as', 'a', 'ons', 'ez', 'ont'];

export function verbGroup(inf) {
  if (IRREGULAR[inf]) return 3;
  if (VERBS_G2.includes(inf)) return 2;
  if (inf.endsWith('er')) return 1;
  return 3;
}

/** Ajoute e (-ger) ou ç (-cer) devant a / o pour garder le son. */
function softStem(stem, inf, ending) {
  if (!/^[aoâ]/.test(ending)) return stem;
  if (inf.endsWith('ger')) return stem + 'e';
  if (inf.endsWith('cer')) return stem.slice(0, -1) + 'ç';
  return stem;
}

/** Forme conjuguée seule (sans pronom). person : 0..5 */
export function conjugate(inf, tense, person) {
  const irr = IRREGULAR[inf];
  if (irr) {
    if (irr[tense]) return irr[tense][person];
    if (tense === 'imparfait') return irr.imparfaitStem + END_IMP[person];
    if (tense === 'futur') return irr.futurStem + END_FUT[person];
  }
  const g = verbGroup(inf);
  if (g === 2) {
    const r = inf.slice(0, -2); // fin-
    switch (tense) {
      case 'present': return r + ['is', 'is', 'it', 'issons', 'issez', 'issent'][person];
      case 'imparfait': return r + 'iss' + END_IMP[person];
      case 'passe_simple': return r + ['is', 'is', 'it', 'îmes', 'îtes', 'irent'][person];
      case 'futur': return inf + END_FUT[person];
    }
  }
  // 1er groupe
  const r = inf.slice(0, -2); // chant-
  let endings;
  switch (tense) {
    case 'present': endings = ['e', 'es', 'e', 'ons', 'ez', 'ent']; break;
    case 'imparfait': endings = END_IMP; break;
    case 'passe_simple': endings = ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent']; break;
    case 'futur': return inf + END_FUT[person];
  }
  const e = endings[person];
  return softStem(r, inf, e) + e;
}

const startsWithVowel = (s) => /^[aeiouyéèêâîôûh]/i.test(s);

/** Forme avec pronom : « j'aime », « nous chantons ». */
export function withPronoun(pronoun, form) {
  if (pronoun === 'je' && startsWithVowel(form)) return `j'${form}`;
  return `${pronoun} ${form}`;
}

/** Terminaisons à retenir, pour les leçons et explications. */
export function endingsHint(inf, tense) {
  const g = verbGroup(inf);
  if (g === 3) return `« ${inf} » est un verbe irrégulier (3e groupe) : sa conjugaison s'apprend par cœur.`;
  const table = {
    present: g === 1 ? '-e, -es, -e, -ons, -ez, -ent' : '-is, -is, -it, -issons, -issez, -issent',
    imparfait: '-ais, -ais, -ait, -ions, -iez, -aient' + (g === 2 ? ' (avec -iss- : je finissais)' : ''),
    passe_simple: g === 1 ? '-ai, -as, -a, -âmes, -âtes, -èrent' : '-is, -is, -it, -îmes, -îtes, -irent',
    futur: 'infinitif + -ai, -as, -a, -ons, -ez, -ont',
  };
  let s = `Verbe du ${g === 1 ? '1er' : '2e'} groupe ${auTemps(tense)} : ${table[tense]}.`;
  if (g === 1 && inf.endsWith('ger') && tense !== 'futur') s += ' Attention : « -ger » garde un « e » devant a et o (nous mangeons).';
  if (g === 1 && inf.endsWith('cer') && tense !== 'futur') s += ' Attention : « -cer » prend une cédille devant a et o (nous commençons).';
  return s;
}
