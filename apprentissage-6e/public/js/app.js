// Application : routeur (#/...), en-tête, et toutes les vues.
import { h, md, clear, add, mount, toast, confetti } from './ui/dom.js';
import { runSeries } from './ui/player.js';
import {
  getState, onChange, setProfile, setSetting, notion, currentStreak, reviewItems, addCustomChapter,
  removeCustomChapter, checkBadges, exportData, importData, resetAll, poolCount, poolGet,
} from './core/state.js';
import { levelInfo, masteryLabel, BADGES, DAILY_GOAL, levelFromMastery } from './core/gamification.js';
import {
  allChapters, getChapter, buildSeries, buildReviewSeries, suggestChapter, aiStatus, aiSeries, aiModule, weaknesses,
  getDeviceAi, setDeviceAi, testDeviceKey, DEVICE_MODELS, DEFAULT_DEVICE_MODEL,
} from './core/generator.js';
import { DOMAIN_ORDER, AI_SUBJECTS } from './content/index.js';
import { todayKey } from './core/utils.js';

const app = document.getElementById('app');
const header = document.getElementById('topbar');
const AVATARS = ['🦊', '🐼', '🦉', '🐯', '🐬', '🦄', '🐢', '🐙', '🦁', '🐧', '🚀', '⚽'];
const LEVEL_NAMES = { 1: 'Facile', 2: 'Moyen', 3: 'Difficile' };

// --- En-tête -----------------------------------------------------------------------
function renderHeader() {
  const s = getState();
  const lv = levelInfo(s.xp);
  const streak = currentStreak();
  const dailyPct = Math.min(100, Math.round((s.daily.date === todayKey() ? s.daily.xp : 0) / DAILY_GOAL * 100));
  mount(header, 
    h('a.brand', { href: '#/' }, h('span.logo', '📚'), h('span', 'Mission 6e')),
    h('nav.nav',
      navLink('#/', '🏠', 'Accueil'),
      navLink('#/revoir', '🔁', 'À revoir', s.review.length || null),
      navLink('#/succes', '🏆', 'Succès'),
      navLink('#/atelier', '✨', 'Atelier IA'),
      navLink('#/parent', '👪', 'Parents')),
    h('div.stats',
      h('span.stat', { title: `Série : ${streak} jour(s) d’affilée` }, streak ? '🔥' : '🌑', h('b', String(streak))),
      h('span.stat.goal', { title: `Objectif du jour : ${DAILY_GOAL} XP`, style: { '--pct': dailyPct + '%' } }, '🎯', h('b', dailyPct + '%')),
      h('a.stat.level', { href: '#/succes', title: `${lv.title} – encore ${lv.toNext} XP pour le niveau suivant` },
        h('span.avatar', s.profile.avatar), h('span.lvl', `Niv. ${lv.level}`),
        h('span.xpbar', h('i', { style: { width: Math.round(lv.progress * 100) + '%' } })))),
  );
}
function navLink(href, icon, label, badge) {
  const active = (location.hash || '#/') === href || (href !== '#/' && location.hash.startsWith(href));
  return h('a', { href, class: active ? 'active' : '' }, h('span.ico', icon), h('span.lbl', label), badge ? h('span.pill', String(badge)) : null);
}

// --- Composants ----------------------------------------------------------------------
function masteryBar(chapterId) {
  const n = notion(chapterId);
  return h('div.mastery', { title: `Maîtrise : ${n.mastery} %` },
    h('div.mbar', h('i', { style: { width: n.mastery + '%' } })),
    h('span', masteryLabel(n.mastery, n.attempts)));
}

function chapterCard(ch) {
  const n = notion(ch.id);
  return h('a.chapter', { href: `#/chapitre/${ch.id}`, style: { '--c': ch.color || '#7c5cff' } },
    h('span.emoji', ch.emoji || '📘'),
    h('div',
      h('h3', ch.title),
      h('p.muted', n.attempts ? `${n.correct} / ${n.attempts} réussis` : 'Pas encore commencé'),
      masteryBar(ch.id)));
}

function loading(message) {
  const tips = ['L’IA invente des exercices rien que pour toi…', 'Elle vérifie l’orthographe deux fois…', 'Elle prépare des indices malins…', 'Encore quelques secondes…'];
  let i = 0;
  const p = h('p.muted', tips[0]);
  const timer = setInterval(() => { i = (i + 1) % tips.length; p.textContent = tips[i]; }, 3500);
  const el = h('div.card.loading', h('div.spinner'), h('h2', message), p);
  el.stop = () => clearInterval(timer);
  return el;
}

// --- Vues ------------------------------------------------------------------------------
function viewOnboarding() {
  let avatar = AVATARS[0];
  const input = h('input.text', { type: 'text', maxlength: 20, placeholder: 'Ton prénom', 'aria-label': 'Ton prénom' });
  const grid = h('div.avatars', AVATARS.map((a) => h('button.avatar-pick', {
    type: 'button', class: a === avatar ? 'selected' : '',
    onclick: (e) => { avatar = a; grid.querySelectorAll('button').forEach((b) => b.classList.remove('selected')); e.currentTarget.classList.add('selected'); },
  }, a)));
  const go = () => {
    const name = input.value.trim();
    if (!name) { input.focus(); toast('Écris ton prénom pour commencer 🙂'); return; }
    setProfile({ name, avatar });
    toast(`Bienvenue ${name} ! C’est parti 🚀`, 'ok');
    route();
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && go());
  mount(app, h('section.card.onboarding',
    h('div.hero-emoji', '🚀'),
    h('h1', 'Bienvenue dans Mission 6e !'),
    h('p', 'Ici, tu apprends le français de 6e en jouant : des leçons courtes, des exercices variés, des points d’expérience, des badges… et le droit de se tromper ! Chaque erreur t’aide à progresser.'),
    h('label', 'Comment t’appelles-tu ?'), input,
    h('label', 'Choisis ton avatar :'), grid,
    h('button.btn.primary.big', { type: 'button', onclick: go }, 'Commencer l’aventure')));
  input.focus();
}

function viewHome() {
  const s = getState();
  const lv = levelInfo(s.xp);
  const sug = suggestChapter();
  const chapters = allChapters();
  const domains = DOMAIN_ORDER.map((d) => [d, chapters.filter((c) => c.domain === d)]).filter(([, l]) => l.length);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const streak = currentStreak();

  mount(app, 
    h('section.hero',
      h('div',
        h('h1', `${hello} ${s.profile.name} ${s.profile.avatar}`),
        h('p', `${lv.title} · niveau ${lv.level} · ${s.xp} XP`),
        h('p.muted', streak ? `🔥 ${streak} jour${streak > 1 ? 's' : ''} d’affilée, continue ta série !` : 'Commence une série aujourd’hui pour allumer ta flamme 🔥')),
      sug.chapter ? h('a.card.suggest', { href: `#/chapitre/${sug.chapter.id}`, style: { '--c': sug.chapter.color } },
        h('small', `✨ Suggestion du jour · ${sug.reason}`),
        h('strong', `${sug.chapter.emoji} ${sug.chapter.title}`),
        h('span.btn.primary', 'C’est parti →')) : null),
    installCard(),
    s.review.length ? h('a.card.review-cta', { href: '#/revoir' },
      h('span.emoji', '🔁'),
      h('div', h('strong', `${s.review.length} exercice${s.review.length > 1 ? 's' : ''} à revoir`), h('p.muted', 'Corrige tes erreurs pour gagner le badge « Rattrapage réussi ».')),
      h('span.btn.secondary', 'Revoir')) : null,
    ...domains.map(([d, list]) => h('section.domain',
      h('h2', d),
      h('div.grid', list.map(chapterCard)))),
    h('a.card.atelier-cta', { href: '#/atelier' },
      h('span.emoji', '✨'),
      h('div', h('strong', 'Crée ton propre module avec l’IA'), h('p.muted', 'Une notion qui te pose problème ? Une autre matière ? Demande une leçon et des exercices sur mesure.'))),
  );
}

/** Guide « Ajouter à l'écran d'accueil » (iPhone/iPad, dans Safari, si l'app n'est pas encore installée). */
function installCard() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches;
  let dismissed = false;
  try { dismissed = localStorage.getItem('app6e.install-dismissed') === '1'; } catch { /* ignore */ }
  if (!ios || standalone || dismissed) return null;
  const card = h('section.card.install-card',
    h('span.emoji', '📲'),
    h('div',
      h('strong', 'Installe Mission 6e sur ton écran d’accueil'),
      h('p.small', 'Dans Safari, touche ', h('span.share', '⬆︎ Partager'), ' puis « Sur l’écran d’accueil ». L’appli s’ouvrira en plein écran et marchera même sans internet.')),
    h('button.btn.ghost.icon', { type: 'button', 'aria-label': 'Masquer', onclick: () => {
      try { localStorage.setItem('app6e.install-dismissed', '1'); } catch { /* ignore */ }
      card.remove();
    } }, '✕'));
  return card;
}

function viewChapter(id) {
  const ch = getChapter(id);
  if (!ch) return notFound();
  const n = notion(ch.id);
  const level = levelFromMastery(n.mastery);
  const l = ch.lesson || {};
  const rev = reviewItems(ch.id).length;
  const w = weaknesses(ch.id);
  const aiZone = h('div.ai-zone');

  aiStatus().then((st) => {
    if (!st.ai) {
      add(aiZone, h('p.muted.small', '✨ Les exercices IA s’activent quand un parent ajoute une clé API (espace parents). Le mode hors ligne reste illimité !'));
      return;
    }
    add(aiZone, 
      h('button.btn.ai', { type: 'button', onclick: () => go(`#/jouer/${ch.id}?src=ai`) },
        ch.id === 'lecture' ? '✨ Nouveau texte inédit (IA)' : ch.id === 'dictees' ? '✨ Nouvelles dictées (IA)' : '✨ Exercices inédits (IA)'),
      (w.top.length || rev) && ch.id !== 'lecture' ? h('button.btn.ai.ghost', { type: 'button', onclick: () => go(`#/jouer/${ch.id}?src=targeted`) }, '🎯 Série ciblée sur mes erreurs (IA)') : null,
    );
  });

  mount(app, 
    h('a.back', { href: '#/' }, '← Tous les chapitres'),
    h('section.card.lesson', { style: { '--c': ch.color || '#7c5cff' } },
      h('header.lesson-head',
        h('span.emoji.big', ch.emoji || '📘'),
        h('div', h('small', ch.domain + (ch.subjectName && ch.subjectName !== 'Français' ? ` · ${ch.subjectName}` : '')), h('h1', ch.title), masteryBar(ch.id))),
      l.intro ? h('p.intro', md(l.intro)) : null,
      h('div.rules', (l.rules || []).map((r, i) => h('div.rule',
        h('h3', h('span.num', String(i + 1)), r.title),
        h('p', md(r.text)),
        (r.examples || []).length ? h('ul.examples', r.examples.map((e) => h('li', md(e)))) : null))),
      (l.pitfalls || []).length ? h('div.pitfalls', h('h3', '⚠️ Pièges fréquents'), h('ul', l.pitfalls.map((p) => h('li', md(p))))) : null,
      l.tip ? h('div.tip', h('strong', '💡 Astuce : '), md(l.tip)) : null),
    h('section.card.train',
      h('h2', 'S’entraîner'),
      h('p.muted', `Difficulté adaptée à ta maîtrise : ${LEVEL_NAMES[level]}. ${ch.custom ? `Module personnalisé (${ch.exercises.length + poolGet(ch.id).length} exercices en réserve).` : 'Exercices générés à l’infini, jamais deux séries identiques !'}`),
      h('div.actions',
        h('button.btn.primary.big', { type: 'button', onclick: () => go(`#/jouer/${ch.id}`) }, '▶️ Lancer une série'),
        rev ? h('button.btn.secondary', { type: 'button', onclick: () => go(`#/jouer/${ch.id}?src=review`) }, `🔁 Revoir mes erreurs (${rev})`) : null,
        h('span.levels', [1, 2, 3].map((lv) => h('button.btn.ghost.small', { type: 'button', title: `Forcer le niveau ${LEVEL_NAMES[lv]}`, onclick: () => go(`#/jouer/${ch.id}?niveau=${lv}`) }, '★'.repeat(lv))))),
      aiZone,
      ch.custom ? h('button.btn.ghost.small.danger', { type: 'button', onclick: () => { if (confirm('Supprimer ce module ?')) { removeCustomChapter(ch.id); go('#/'); } } }, '🗑️ Supprimer ce module') : null),
  );
}

async function viewPlay(id, params) {
  const isAllReview = id === '__revoir';
  const ch = isAllReview ? { id: '__revoir', title: 'À revoir', emoji: '🔁' } : getChapter(id);
  if (!ch) return notFound();
  const src = params.get('src') || 'local';
  const level = Number(params.get('niveau')) || undefined;
  let exercises;

  if (src === 'review' || isAllReview) {
    exercises = buildReviewSeries(isAllReview ? null : ch.id, 10);
    if (!exercises.length) { toast('Rien à revoir : bravo ! 🎉', 'ok'); return go(isAllReview ? '#/' : `#/chapitre/${ch.id}`); }
  } else if (src === 'ai' || src === 'targeted') {
    const box = loading(src === 'targeted' ? 'Je prépare une série ciblée sur tes erreurs…' : 'Je crée de nouveaux exercices…');
    mount(app, box);
    try {
      exercises = await aiSeries(ch, { count: 6, level, kind: src === 'targeted' ? 'targeted' : 'exercises' });
    } catch (e) {
      box.stop();
      toast(e.message + ' On continue avec le moteur hors ligne.', 'warn', 5000);
      exercises = buildSeries(ch, { level });
    }
    box.stop();
  } else {
    exercises = buildSeries(ch, { level });
  }
  if (!exercises.length) { toast('Aucun exercice disponible pour ce module.', 'warn'); return go(`#/chapitre/${ch.id}`); }

  runSeries(app, {
    chapter: ch,
    exercises,
    onExit: () => go(isAllReview ? '#/' : `#/chapitre/${ch.id}`),
    onLesson: () => go(isAllReview ? '#/' : `#/chapitre/${ch.id}`),
    onReplay: () => (isAllReview ? go('#/revoir', true) : go(`#/jouer/${ch.id}${src === 'review' ? '?src=review' : src === 'local' ? '' : '?src=' + src}`, true)),
  });
}

function viewReview() {
  const items = reviewItems();
  if (!items.length) {
    mount(app, h('section.card.empty', h('div.hero-emoji', '🌈'), h('h1', 'Rien à revoir !'),
      h('p', 'Toutes tes erreurs ont été corrigées. Lance une nouvelle série pour continuer à progresser.'),
      h('a.btn.primary', { href: '#/' }, 'Retour à l’accueil')));
    return;
  }
  const by = {};
  items.forEach((r) => { by[r.chapterId] = (by[r.chapterId] || 0) + 1; });
  mount(app, h('section.card',
    h('h1', '🔁 À revoir'),
    h('p', 'Les exercices ratés reviennent ici. Réussis-les pour les faire disparaître : c’est la meilleure façon de ne plus refaire l’erreur !'),
    h('ul.list', Object.entries(by).map(([cid, n]) => {
      const c = getChapter(cid);
      return h('li', h('span', `${c?.emoji || '📘'} ${c?.title || cid}`), h('span.pill', String(n)),
        h('a.btn.ghost.small', { href: `#/jouer/${cid}?src=review` }, 'Revoir'));
    })),
    h('button.btn.primary.big', { type: 'button', onclick: () => go('#/jouer/__revoir') }, `Tout revoir (${Math.min(10, items.length)} exercices)`)));
}

function viewBadges() {
  const s = getState();
  const lv = levelInfo(s.xp);
  mount(app, 
    h('section.card.level-card',
      h('span.avatar.big', s.profile.avatar),
      h('div', h('h1', `${s.profile.name} · ${lv.title}`),
        h('p', `Niveau ${lv.level} · ${s.xp} XP · encore ${lv.toNext} XP pour le niveau ${lv.level + 1}`),
        h('div.xpbar.big', h('i', { style: { width: Math.round(lv.progress * 100) + '%' } })),
        h('p.muted', `🔥 Record de série : ${s.streak.best} jour(s) · ${s.stats.answered} exercices · ${s.stats.perfectSeries} série(s) parfaite(s)`))),
    h('section.card',
      h('h2', `🏆 Badges (${s.badges.length} / ${BADGES.length})`),
      h('div.badges', BADGES.map((b) => {
        const got = s.badges.includes(b.id);
        return h('div.badge', { class: got ? 'unlocked' : 'locked' }, h('span.emoji', got ? b.emoji : '🔒'), h('strong', b.name), h('small', b.desc));
      }))),
  );
}

function viewAtelier() {
  const s = getState();
  const subject = h('select.text', AI_SUBJECTS.map((x) => h('option', { value: x }, x)));
  const request = h('textarea.text', { rows: 3, maxlength: 300, placeholder: 'Exemples : « les homophones c’est / s’est / ses / ces », « le complément du nom », « les fractions », « le passé composé »…' });
  const level = h('select.text', [1, 2, 3].map((l) => h('option', { value: l, selected: l === 2 }, LEVEL_NAMES[l])));
  const status = h('div');
  const btn = h('button.btn.ai.big', { type: 'button', onclick: create }, '✨ Créer mon module');
  const suggestions = ['les homophones c’est / s’est / sait', 'le complément du nom', 'les types de phrases', 'le passé composé', 'les mots invariables', 'la fable et sa morale'];

  async function create() {
    if (request.value.trim().length < 3) { request.focus(); toast('Décris ce que tu veux apprendre 🙂'); return; }
    btn.disabled = true;
    const box = loading('Je crée ta leçon et tes exercices…');
    mount(status, box);
    try {
      const ch = await aiModule({ subject: subject.value, request: request.value.trim(), level: Number(level.value) });
      addCustomChapter(ch);
      const badges = checkBadges();
      if (badges.length) { confetti(); toast(`Nouveau badge : ${badges[0].emoji} ${badges[0].name}`, 'ok'); }
      toast('Module créé ! 🎉', 'ok');
      go(`#/chapitre/${ch.id}`);
    } catch (e) {
      mount(status, h('p.error', '😕 ', e.message));
    } finally {
      box.stop();
      btn.disabled = false;
    }
  }

  mount(app, h('section.card.atelier',
    h('h1', '✨ Atelier IA'),
    h('p', 'Demande un module sur mesure : l’IA écrit une fiche de leçon et des exercices adaptés à la 6e. Le module est enregistré et tu peux en redemander à l’infini.'),
    h('div.ai-status'),
    h('label', 'Matière'), subject,
    h('label', 'Qu’aimerais-tu apprendre ou revoir ?'), request,
    h('div.suggestions', suggestions.map((t) => h('button.chip', { type: 'button', onclick: () => { request.value = t; subject.value = /fraction/.test(t) ? 'Mathématiques' : 'Français'; } }, t))),
    h('label', 'Difficulté'), level,
    h('div.actions', btn),
    status),
  s.customChapters.length ? h('section.card', h('h2', 'Mes modules'), h('div.grid', s.customChapters.map(chapterCard))) : null);

  aiStatus().then((st) => {
    const zone = app.querySelector('.ai-status');
    if (!zone) return;
    if (!st.ai) {
      btn.disabled = true;
      add(zone, h('p.warn', '⚠️ La génération IA n’est pas encore configurée. Demande à un parent d’ajouter la clé API dans l’espace parents.'));
    }
  });
}

function viewParent() {
  const s = getState();
  const chapters = allChapters();
  const name = h('input.text', { type: 'text', value: s.profile.name, maxlength: 20 });
  const fileInput = h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { importData(await f.text()); toast('Progression importée ✅', 'ok'); route(); } catch (err) { toast('Import impossible : ' + err.message, 'warn'); }
  } });
  const aiBox = h('div.ai-info', h('p.muted', 'Vérification…'));
  renderAiBox(aiBox);

  const recent = s.history.slice(0, 8);
  mount(app, 
    h('section.card',
      h('h1', '👪 Espace parents'),
      h('p.muted', 'Suivi de la progression, réglages et sauvegarde. Les données restent sur cet appareil (stockage local du navigateur).'),
      h('div.kpis',
        kpi('Exercices', s.stats.answered), kpi('Réussite', s.stats.answered ? Math.round(s.stats.correct / s.stats.answered * 100) + ' %' : '—'),
        kpi('XP', s.xp), kpi('Série record', s.streak.best + ' j'), kpi('À revoir', s.review.length))),
    h('section.card',
      h('h2', 'Maîtrise par notion'),
      h('table.table',
        h('thead', h('tr', h('th', 'Chapitre'), h('th', 'Exercices'), h('th', 'Maîtrise'), h('th', 'Points faibles'))),
        h('tbody', chapters.map((c) => {
          const n = notion(c.id);
          const w = weaknesses(c.id).top.join(', ');
          return h('tr', h('td', `${c.emoji} ${c.title}`), h('td', `${n.correct}/${n.attempts}`), h('td', masteryBar(c.id)), h('td.small', w || '—'));
        })))),
    recent.length ? h('section.card', h('h2', 'Dernières séries'), h('ul.list', recent.map((r) => {
      const c = getChapter(r.chapterId);
      return h('li', h('span', `${r.date} · ${c ? c.emoji + ' ' + c.title : 'À revoir'}`), h('span.pill', `${r.score}/${r.total} du 1er coup`));
    }))) : null,
    h('section.card',
      h('h2', 'Génération illimitée (IA)'), aiBox),
    h('section.card',
      h('h2', 'Réglages'),
      h('label', 'Prénom de l’élève'), h('div.row', name, h('button.btn.secondary', { type: 'button', onclick: () => { if (name.value.trim()) { setProfile({ name: name.value.trim() }); toast('Enregistré ✅', 'ok'); renderHeader(); } } }, 'Enregistrer')),
      h('label.check', h('input', { type: 'checkbox', checked: s.settings.tts !== false, onchange: (e) => setSetting('tts', e.target.checked) }), ' Lecture à voix haute des dictées (synthèse vocale)'),
      h('div.actions',
        h('button.btn.secondary', { type: 'button', onclick: download }, '💾 Exporter la progression'),
        h('button.btn.secondary', { type: 'button', onclick: () => fileInput.click() }, '📂 Importer'), fileInput,
        h('button.btn.ghost.danger', { type: 'button', onclick: () => { if (confirm('Effacer toute la progression ? Cette action est définitive.')) { resetAll(); go('#/', true); } } }, '🗑️ Tout réinitialiser'))),
  );
}
/** Bloc « Génération IA » de l'espace parents : état + clé enregistrée sur l'appareil. */
async function renderAiBox(box) {
  const st = await aiStatus(true);
  const dev = getDeviceAi();
  const keyInput = h('input.text', { type: 'password', placeholder: 'sk-ant-…', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Clé API' });
  const model = h('select.text', DEVICE_MODELS.map(([id, label]) => h('option', { value: id, selected: (dev.model || DEFAULT_DEVICE_MODEL) === id }, label)));
  const result = h('div');
  const save = async () => {
    const key = keyInput.value.trim() || dev.key;
    if (!key || !/^sk-ant-/.test(key)) { toast('Colle une clé qui commence par « sk-ant- ».', 'warn'); return; }
    setDeviceAi({ key, model: model.value });
    mount(result, h('p.muted', '⏳ Test de la clé en cours (quelques secondes)…'));
    try {
      const n = await testDeviceKey();
      mount(result, h('p.ok-text', `✅ Clé valide : ${n} exercices de test générés. L’IA est active sur cet appareil.`));
      toast('IA activée ✨', 'ok');
    } catch (e) {
      mount(result, h('p.error', '😕 ', e.message));
    }
  };
  const deviceForm = h('div.device-ai',
    h('h3', '📱 Clé API sur cet appareil'),
    h('p.small.muted', 'Pour utiliser l’IA sur iPhone ou iPad sans serveur. La clé reste uniquement dans ce téléphone (jamais incluse dans l’export de progression). Conseil : créez une clé dédiée avec une limite de dépenses mensuelle sur platform.claude.com.'),
    dev.key ? h('p.small', `Clé enregistrée : ${dev.key.slice(0, 10)}…${dev.key.slice(-4)}`) : null,
    h('label', dev.key ? 'Remplacer la clé (facultatif)' : 'Clé API Claude'), keyInput,
    h('label', 'Modèle'), model,
    h('div.actions',
      h('button.btn.primary', { type: 'button', onclick: save }, dev.key ? 'Enregistrer et tester' : 'Activer l’IA'),
      dev.key ? h('button.btn.ghost.danger', { type: 'button', onclick: () => { setDeviceAi(null); toast('Clé supprimée de cet appareil.'); renderAiBox(box); } }, 'Supprimer la clé') : null),
    result);
  mount(box,
    st.ai
      ? h('p.ok-text', `✅ Génération IA active (${st.mode === 'server' ? 'via le serveur' : 'clé sur cet appareil'}, modèle ${st.model}). ${poolCount()} exercices IA en réserve locale.`)
      : h('p.warn', '⚠️ Génération IA désactivée : aucune clé API configurée. Les exercices hors ligne restent illimités.'),
    st.mode === 'server' ? null : deviceForm,
    st.mode === 'server' ? null : h('details.small',
      h('summary', 'Sur ordinateur : utiliser plutôt le serveur Node'),
      h('ol',
        h('li', 'Copiez le fichier « .env.example » en « .env » à la racine du projet.'),
        h('li', 'Collez la clé : ANTHROPIC_API_KEY=sk-ant-…'),
        h('li', 'Lancez : npm start'))));
}

function kpi(label, value) { return h('div.kpi', h('b', String(value)), h('span', label)); }
function download() {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `progression-6e-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
}

function notFound() {
  mount(app, h('section.card.empty', h('h1', 'Oups, page introuvable'), h('a.btn.primary', { href: '#/' }, 'Retour à l’accueil')));
}

// --- Routeur -------------------------------------------------------------------------
function go(hash, force = false) {
  if (location.hash === hash && force) route();
  else location.hash = hash;
}

function route() {
  renderHeader();
  window.scrollTo(0, 0);
  window.speechSynthesis?.cancel();
  app.onkeydown = null;
  if (!getState().profile.name) return viewOnboarding();
  const [path, query] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(query || '');
  const parts = path.split('/').filter(Boolean);
  switch (parts[0]) {
    case undefined: return viewHome();
    case 'chapitre': return viewChapter(parts[1]);
    case 'jouer': return viewPlay(parts[1], params);
    case 'revoir': return viewReview();
    case 'succes': return viewBadges();
    case 'atelier': return viewAtelier();
    case 'parent': return viewParent();
    default: return notFound();
  }
}

window.addEventListener('hashchange', route);
// Mode hors ligne / installation : enregistrement du service worker (ignoré si non supporté).
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* l'app fonctionne aussi sans */ });
}
onChange((_, ev) => { if (ev.type !== 'profile') renderHeader(); });
route();
