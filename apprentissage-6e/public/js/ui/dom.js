// Mini-outils DOM sûrs (aucune injection HTML : tout texte passe par textContent).

/** h('div.card', {onclick}, enfants...) */
export function h(tag, attrs = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    children.unshift(attrs);
    attrs = {};
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') {
      // setProperty gère aussi les variables CSS (--c…), contrairement à Object.assign.
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k === 'class') el.className += ' ' + v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Texte avec **gras** → fragment DOM sûr. */
export function md(text) {
  const frag = document.createDocumentFragment();
  String(text ?? '').split(/(\*\*[^*]+\*\*)/g).forEach((part) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) frag.append(h('strong', {}, part.slice(2, -2)));
    else if (part) frag.append(document.createTextNode(part));
  });
  return frag;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/** Ajoute des enfants en ignorant null / false (contrairement à Element.append natif). */
export function add(el, ...children) { append(el, children); return el; }

/** Vide l'élément puis y place les enfants. */
export function mount(el, ...children) { return add(clear(el), ...children); }

/** Petite notification éphémère. */
export function toast(message, kind = 'info', ms = 3200) {
  let zone = document.getElementById('toasts');
  if (!zone) { zone = h('div'); zone.id = 'toasts'; document.body.append(zone); }
  const t = h('div.toast', { class: kind, role: 'status' }, message);
  zone.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

/** Pluie de confettis (CSS) pour les grandes réussites. */
export function confetti(n = 60) {
  const colors = ['#7c5cff', '#ff7a59', '#00b894', '#fdcb6e', '#0984e3', '#e84393'];
  const box = h('div.confetti', { 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) {
    box.append(h('i', { style: {
      left: Math.random() * 100 + '%', background: colors[i % colors.length],
      animationDelay: Math.random() * 0.6 + 's', animationDuration: 1.8 + Math.random() * 1.4 + 's',
      transform: `rotate(${Math.random() * 360}deg)`,
    } }));
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3800);
}

/** Lecture à voix haute (synthèse vocale du navigateur, voix française si disponible). */
export function speak(text, rate = 0.85) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = rate;
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('fr'));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
  return true;
}
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
