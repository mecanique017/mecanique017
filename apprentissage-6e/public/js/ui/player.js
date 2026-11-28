// Lecteur de séries d'exercices : affichage, 2 essais avec indice, retour bienveillant, XP, écran de fin.
import { h, md, clear, add, mount, confetti, speak, canSpeak } from './dom.js';
import { checkAnswer, describeAnswer, TYPE_LABELS } from '../core/exercise.js';
import { recordAnswer, finishSeries, getState } from '../core/state.js';
import { phrase, endMessage } from '../core/gamification.js';
import { shuffle, makeRng, isNumericAnswer } from '../core/utils.js';
import { renderFigure } from './figure.js';

const rng = makeRng(Date.now() ^ 0x5eed);

// --- Widgets par type d'exercice ---------------------------------------------
// Chaque widget renvoie { el, response(), ready(), lock(on), reveal(result) }.

function qcmWidget(ex, onChange) {
  let sel = null;
  const buttons = ex.choices.map((c, i) => h('button.choice', {
    type: 'button',
    onclick: () => { sel = i; buttons.forEach((b, k) => b.classList.toggle('selected', k === i)); onChange(); },
  }, h('span.letter', String.fromCharCode(65 + i)), h('span', c)));
  return {
    el: h('div.choices', buttons),
    response: () => sel,
    ready: () => sel !== null,
    lock: (on) => buttons.forEach((b) => (b.disabled = on)),
    reveal: () => buttons.forEach((b, k) => {
      b.classList.toggle('correct', k === ex.answer);
      b.classList.toggle('wrong', k === sel && k !== ex.answer);
    }),
    mark: () => buttons[sel]?.classList.add('wrong-soft'),
    unmark: () => buttons.forEach((b) => b.classList.remove('wrong-soft')),
  };
}

function trousWidget(ex, onChange) {
  const parts = ex.text.split('___');
  const fields = [];
  const line = h('p.trous-text');
  parts.forEach((p, i) => {
    line.append(p);
    if (i < parts.length - 1) {
      let f;
      if (ex.choices) {
        f = h('select.blank', { onchange: onChange, 'aria-label': `Trou ${i + 1}` },
          h('option', { value: '' }, '…'), ...ex.choices.map((c) => h('option', { value: c }, c)));
      } else {
        const len = Math.max(...ex.answers[i].map((a) => a.length));
        f = h('input.blank', {
          type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
          // Réponse numérique → pavé numérique (avec virgule) sur iPhone / tablette.
          inputmode: ex.answers[i].every(isNumericAnswer) ? 'decimal' : 'text',
          'aria-label': `Trou ${i + 1}`, style: { width: `${Math.max(5, len + 3)}ch` }, oninput: onChange,
        });
      }
      fields.push(f);
      line.append(f);
    }
  });
  // Clavier d'accents pour tablette.
  const numeric = ex.answers.every((a) => a.every(isNumericAnswer));
  const accents = ex.choices || numeric ? null : h('div.accents', ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ô', 'û', 'ù', '’'].map((c) => h('button.key', {
    type: 'button',
    onmousedown: (e) => e.preventDefault(),
    onclick: () => {
      const f = document.activeElement?.classList.contains('blank') ? document.activeElement : fields.find((x) => !x.value) || fields[0];
      const s = f.selectionStart ?? f.value.length;
      f.value = f.value.slice(0, s) + c + f.value.slice(f.selectionEnd ?? s);
      f.focus();
      f.setSelectionRange?.(s + 1, s + 1);
      onChange();
    },
  }, c)));
  return {
    el: h('div', line, accents),
    response: () => fields.map((f) => f.value),
    ready: () => fields.every((f) => f.value.trim()),
    lock: (on) => fields.forEach((f) => (f.disabled = on)),
    focus: () => fields.find((f) => !f.value)?.focus() || fields[0]?.focus(),
    reveal: (res) => fields.forEach((f, i) => {
      const ok = res.partial?.[i];
      f.classList.toggle('correct', !!ok);
      f.classList.toggle('wrong', !ok);
      if (!ok && f.tagName === 'INPUT') f.title = `Réponse : ${ex.answers[i][0]}`;
    }),
    mark: (res) => fields.forEach((f, i) => f.classList.toggle('wrong-soft', !res.partial?.[i])),
    unmark: () => fields.forEach((f) => f.classList.remove('wrong-soft')),
  };
}

function ordreWidget(ex, onChange) {
  // Mélange garanti différent de l'ordre correct.
  let order = ex.items.map((t, i) => ({ t, i }));
  for (let k = 0; k < 10; k++) {
    order = shuffle(rng, order);
    if (order.some((o, idx) => o.t !== ex.items[idx])) break;
  }
  const placed = [];
  const bank = h('div.tiles.bank');
  const answer = h('div.tiles.answer', { 'aria-label': 'Ta réponse' });
  let locked = false;
  function render() {
    clear(bank); clear(answer);
    order.forEach((o) => {
      if (placed.includes(o)) return;
      add(bank, h('button.tile', { type: 'button', disabled: locked, onclick: () => { placed.push(o); render(); onChange(); } }, o.t));
    });
    if (!placed.length) add(answer, h('span.placeholder', 'Touche les étiquettes dans le bon ordre…'));
    placed.forEach((o, k) => {
      add(answer, h('button.tile.placed', { type: 'button', disabled: locked, title: 'Retirer', onclick: () => { placed.splice(k, 1); render(); onChange(); } },
        h('span.num', String(k + 1)), o.t));
    });
  }
  render();
  return {
    el: h('div.ordre', answer, bank),
    response: () => placed.map((o) => o.t),
    ready: () => placed.length === ex.items.length,
    lock: (on) => { locked = on; render(); },
    reveal: () => answer.classList.add('revealed'),
    mark: () => answer.classList.add('wrong-soft'),
    unmark: () => answer.classList.remove('wrong-soft'),
    reset: () => { placed.length = 0; render(); onChange(); },
  };
}

function identificationWidget(ex, onChange) {
  const sel = new Set();
  const chips = ex.tokens.map((t, i) => h('button.chip', {
    type: 'button', 'aria-pressed': 'false',
    onclick: () => {
      sel.has(i) ? sel.delete(i) : sel.add(i);
      chips[i].classList.toggle('selected', sel.has(i));
      chips[i].setAttribute('aria-pressed', String(sel.has(i)));
      onChange();
    },
  }, t));
  return {
    el: h('div.chips', chips),
    response: () => [...sel],
    ready: () => sel.size > 0,
    lock: (on) => chips.forEach((c) => (c.disabled = on)),
    reveal: () => chips.forEach((c, i) => {
      c.classList.toggle('correct', ex.targets.includes(i));
      c.classList.toggle('wrong', sel.has(i) && !ex.targets.includes(i));
    }),
    mark: () => chips.forEach((c, i) => c.classList.toggle('wrong-soft', sel.has(i) && !ex.targets.includes(i))),
    unmark: () => chips.forEach((c) => c.classList.remove('wrong-soft')),
  };
}

function vraiFauxWidget(ex, onChange) {
  let value = null, just = null;
  const tf = [true, false].map((v) => h('button.choice.tf', {
    type: 'button',
    onclick: () => { value = v; tf.forEach((b, k) => b.classList.toggle('selected', (k === 0) === v)); justBox.hidden = !ex.justifications; onChange(); },
  }, v ? '✔️ Vrai' : '✖️ Faux'));
  const justButtons = (ex.justifications || []).map((j, i) => h('button.choice.small', {
    type: 'button',
    onclick: () => { just = i; justButtons.forEach((b, k) => b.classList.toggle('selected', k === i)); onChange(); },
  }, j));
  const justBox = h('div.justif', { hidden: true }, h('p.muted', 'Pourquoi ? Choisis la bonne justification :'), h('div.choices', justButtons));
  return {
    el: h('div', h('p.statement', '« ', ex.statement, ' »'), h('div.tf-row', tf), justBox),
    response: () => ({ value, justification: just }),
    ready: () => value !== null && (!ex.justifications || just !== null),
    lock: (on) => [...tf, ...justButtons].forEach((b) => (b.disabled = on)),
    reveal: () => {
      tf.forEach((b, k) => b.classList.toggle('correct', (k === 0) === ex.answer));
      justButtons.forEach((b, k) => b.classList.toggle('correct', k === ex.justificationAnswer));
    },
    mark: (res) => {
      if (!res.partial?.tf) tf.forEach((b) => b.classList.contains('selected') && b.classList.add('wrong-soft'));
      if (!res.partial?.just) justButtons[just]?.classList.add('wrong-soft');
    },
    unmark: () => [...tf, ...justButtons].forEach((b) => b.classList.remove('wrong-soft')),
  };
}

function dicteeWidget(ex, onChange) {
  const area = h('textarea.dictee', { rows: 3, placeholder: 'Écris la phrase ici…', spellcheck: 'false', autocapitalize: 'sentences', oninput: onChange });
  const tts = canSpeak() && getState().settings.tts !== false;
  let peekUsed = 0;
  const controls = tts
    ? h('div.row', h('button.btn.secondary', { type: 'button', onclick: () => speak(ex.text, 0.9) }, '🔊 Écouter'),
      h('button.btn.ghost', { type: 'button', onclick: () => speak(ex.text, 0.6) }, '🐢 Plus lentement'))
    : h('div.row', h('button.btn.secondary', {
      type: 'button',
      onclick: (e) => {
        // Sans synthèse vocale : la phrase s'affiche 4 secondes (dictée « flash »).
        if (peekUsed++ >= 2) return;
        const p = h('p.peek', ex.text);
        e.target.after(p);
        setTimeout(() => p.remove(), 4000);
      },
    }, '👀 Voir la phrase 4 s (2 fois max)'));
  const diffBox = h('div.diff');
  if (tts) setTimeout(() => speak(ex.text, 0.9), 400);
  return {
    el: h('div', controls, area, diffBox),
    response: () => area.value,
    ready: () => area.value.trim().length > 0,
    lock: (on) => (area.disabled = on),
    focus: () => area.focus(),
    reveal: (res) => {
      clear(diffBox);
      add(diffBox, h('p.muted', 'Correction mot à mot :'), h('p', res.partial.words.map((w) => [
        h('span', { class: w.ok ? 'w-ok' : 'w-ko', title: w.ok ? '' : `Tu as écrit : ${w.given || '(rien)'}` }, w.word), ' ',
      ])));
    },
    mark: (res) => {
      clear(diffBox);
      const bad = res.partial.words.filter((w) => !w.ok).length;
      add(diffBox, h('p.muted', `${bad} mot${bad > 1 ? 's' : ''} à corriger. Les mots justes sont soulignés en vert :`),
        h('p', res.partial.words.map((w) => [h('span', { class: w.ok ? 'w-ok' : 'w-hidden' }, w.ok ? w.word : '•••'), ' '])));
    },
    unmark: () => {},
  };
}

const WIDGETS = { qcm: qcmWidget, trous: trousWidget, ordre: ordreWidget, identification: identificationWidget, vraifaux: vraiFauxWidget, dictee: dicteeWidget };

// --- Série ------------------------------------------------------------------------

/**
 * @param {HTMLElement} root
 * @param {{chapter, exercises, title, onExit, onReplay, sourceLabel}} opts
 */
export function runSeries(root, opts) {
  const { chapter, exercises } = opts;
  let index = 0, combo = 0, xpTotal = 0;
  const results = [];
  const allEvents = [];

  const progress = h('div.progress', h('div.bar'));
  const xpChip = h('span.chip-xp', '+0 XP');
  const comboChip = h('span.combo', { hidden: true });
  const stage = h('div.stage');
  mount(root, 
    h('div.player-head',
      h('button.btn.ghost.icon', { type: 'button', title: 'Quitter', 'aria-label': 'Quitter la série', onclick: () => { if (confirm('Quitter la série ? Tes réponses déjà données sont enregistrées.')) opts.onExit(); } }, '✕'),
      progress, comboChip, xpChip),
    stage,
  );

  function updateHead() {
    progress.firstChild.style.width = `${(index / exercises.length) * 100}%`;
    xpChip.textContent = `+${xpTotal} XP`;
    comboChip.hidden = combo < 2;
    comboChip.textContent = `🔥 ${combo} d’affilée`;
  }

  function showExercise() {
    updateHead();
    const ex = exercises[index];
    const chapterId = ex._chapterId || chapter.id;
    let attempt = 1, usedHint = false;
    const feedback = h('div.feedback', { 'aria-live': 'polite' });
    const validate = h('button.btn.primary.big', { type: 'button', disabled: true, onclick: submit }, 'Valider');
    const hintBtn = h('button.btn.ghost', { type: 'button', onclick: () => { usedHint = true; hintBox.hidden = false; hintBtn.hidden = true; } }, '💡 Un indice ?');
    const hintBox = h('div.hint', { hidden: true }, h('strong', '💡 Indice : '), md(ex.hint));
    const widget = WIDGETS[ex.type](ex, () => { validate.disabled = !widget.ready(); widget.unmark?.(); });
    const actions = h('div.actions', hintBtn, widget.reset ? h('button.btn.ghost', { type: 'button', onclick: () => widget.reset() }, '↺ Recommencer') : null, validate);

    const passage = ex.passage ? h('details.passage', { open: true },
      h('summary', '📖 ', ex.passageTitle || 'Le texte'),
      ...ex.passage.split(/\n+/).map((p) => h('p', p))) : null;

    mount(stage, h('article.card.exercise', { 'data-type': ex.type },
      h('div.ex-meta', h('span.tag', TYPE_LABELS[ex.type]), ex.notion && ex.notion !== TYPE_LABELS[ex.type] ? h('span.tag.soft', ex.notion) : null, ex._review ? h('span.tag.review', '🔁 À revoir') : null,
        h('span.count', `${index + 1} / ${exercises.length}`)),
      passage,
      h('h2.question', md(ex.question || '')),
      ex.figure ? renderFigure(ex.figure) : null,
      widget.el,
      hintBox,
      actions,
      feedback,
    ));
    widget.focus?.();

    function submit() {
      if (validate.disabled) return;
      const res = checkAnswer(ex, widget.response());
      widget.lock(true);
      validate.hidden = true;
      hintBtn.hidden = true;
      if (res.correct) return conclude(true, res);
      if (attempt === 1) {
        attempt = 2;
        widget.mark?.(res);
        const accent = res.accentOnly ? h('p', '✏️ Tu as presque tout bon : vérifie juste les ', h('strong', 'accents'), ' !') : null;
        clear(feedback).className = 'feedback retry';
        add(feedback, 
          h('h3', '🤔 ', phrase.retry()),
          accent,
          h('p', h('strong', '💡 Indice : '), md(ex.hint)),
          h('div.actions', h('button.btn.primary', { type: 'button', onclick: retry }, 'Je réessaie')),
        );
        feedback.querySelector('button').focus();
      } else {
        conclude(false, res);
      }
    }

    function retry() {
      clear(feedback).className = 'feedback';
      widget.lock(false);
      validate.hidden = false;
      validate.disabled = !widget.ready();
      widget.focus?.();
    }

    function conclude(correct, res) {
      const { xp, events } = recordAnswer({ chapterId, exercise: ex, attempt, correct, score: res.score, combo: correct ? combo + 1 : 0, fromReview: !!ex._review });
      combo = correct ? combo + 1 : 0;
      xpTotal += xp;
      allEvents.push(...events);
      results.push({ correct, attempt, usedHint });
      widget.reveal?.(res);
      clear(feedback).className = `feedback ${correct ? 'ok' : 'learn'}`;
      const last = index === exercises.length - 1;
      const next = h('button.btn.primary.big', { type: 'button', onclick: () => { index++; last ? showEnd() : showExercise(); } },
        last ? 'Voir mon résultat 🎉' : correct ? 'Continuer →' : 'J’ai compris, on continue →');
      if (correct) {
        add(feedback, 
          h('h3', '🎉 ', phrase.praise(), h('span.xp-gain', ` +${xp} XP`)),
          attempt === 2 ? h('p', 'Bien rattrapé ! Tu as su utiliser l’indice.') : null,
          ex.explanation ? h('p', md(ex.explanation)) : null,
        );
      } else {
        add(feedback, 
          h('h3', '🌱 ', phrase.learn()),
          ex.type !== 'dictee' ? h('p.answer', 'La bonne réponse : ', h('strong', describeAnswer(ex))) : null,
          ex.explanation ? h('p', h('strong', 'Pourquoi ? '), md(ex.explanation)) : null,
          h('p.muted', '📌 Cet exercice est ajouté à « À revoir » pour t’entraîner encore.'),
        );
      }
      add(feedback, h('div.actions', next));
      updateHead();
      next.focus();
    }
  }

  function showEnd() {
    updateHead();
    progress.firstChild.style.width = '100%';
    const good = results.filter((r) => r.correct).length;
    const firstTry = results.filter((r) => r.correct && r.attempt === 1).length;
    const { bonus, events, badges } = finishSeries({ chapterId: chapter.id, score: firstTry, total: results.length });
    xpTotal += bonus;
    allEvents.push(...events);
    updateHead();
    const ratio = results.length ? good / results.length : 0;
    const stars = ratio === 1 && firstTry === results.length ? 3 : ratio >= 0.7 ? 2 : 1;
    if (stars === 3 || allEvents.some((e) => e.type === 'level-up')) confetti();

    mount(stage, h('article.card.end',
      h('div.stars', [1, 2, 3].map((s) => h('span', { class: s <= stars ? 'on' : '' }, '★'))),
      h('h2', endMessage(firstTry === results.length ? 1 : ratio)),
      h('p.big-score', `${good} / ${results.length} réussis`, h('small', ` (dont ${firstTry} du premier coup)`)),
      h('p.xp-total', `+${xpTotal} XP gagnés`, bonus ? h('small', ` (dont ${bonus} XP de bonus série parfaite)`) : null),
      ...allEvents.map((e) => e.type === 'level-up'
        ? h('div.banner.level', `⬆️ Niveau ${e.level} atteint ! Bravo !`)
        : e.type === 'daily-goal' ? h('div.banner.goal', '🎯 Objectif du jour atteint !') : null),
      badges.length ? h('div.new-badges', h('h3', 'Nouveaux badges'), badges.map((b) => h('div.badge.unlocked', h('span.emoji', b.emoji), h('strong', b.name), h('small', b.desc)))) : null,
      h('div.actions.center',
        h('button.btn.secondary', { type: 'button', onclick: opts.onLesson }, '📘 Revoir la leçon'),
        h('button.btn.primary.big', { type: 'button', onclick: opts.onReplay }, '🔄 Nouvelle série'),
        h('button.btn.ghost', { type: 'button', onclick: opts.onExit }, '🏠 Accueil')),
    ));
  }

  // Raccourci clavier : Entrée = bouton principal visible.
  root.onkeydown = (e) => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    const btn = [...stage.querySelectorAll('.btn.primary')].reverse().find((b) => !b.hidden && !b.disabled && b.offsetParent);
    if (btn) { e.preventDefault(); btn.click(); }
  };

  showExercise();
}
