// Dessin des figures d'exercices (angles, fractions, rectangles, triangles, droites, cercles) en SVG.
// La figure est décrite par des données validées (core/exercise.js) : aucun SVG brut n'est injecté.
import { fmt } from '../core/utils.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
}
const svg = (w, h, label) => s('svg', { viewBox: `0 0 ${w} ${h}`, class: 'figure', role: 'img', 'aria-label': label });
const rad = (d) => (d * Math.PI) / 180;

function angle(f) {
  const root = svg(240, 170, `Un angle`);
  const cx = 120, cy = 130, L = 100;
  const r0 = rad(f.rotation || 0), r1 = rad((f.rotation || 0) + f.degrees);
  const p = (r, len = L) => [cx + len * Math.cos(r), cy - len * Math.sin(r)];
  const [x0, y0] = p(r0), [x1, y1] = p(r1);
  // Arc de l'angle (ou petit carré pour un angle droit).
  if (f.degrees === 90) {
    const a = p(r0, 18), b = p(r1, 18), c = [a[0] + b[0] - cx, a[1] + b[1] - cy];
    root.append(s('path', { d: `M${a} L${c} L${b}`, class: 'fig-mark', fill: 'none' }));
  } else {
    const [ax, ay] = p(r0, 30), [bx, by] = p(r1, 30);
    root.append(s('path', { d: `M${ax} ${ay} A30 30 0 ${f.degrees > 180 ? 1 : 0} 0 ${bx} ${by}`, class: 'fig-mark', fill: 'none' }));
  }
  root.append(s('line', { x1: cx, y1: cy, x2: x0, y2: y0, class: 'fig-line' }), s('line', { x1: cx, y1: cy, x2: x1, y2: y1, class: 'fig-line' }),
    s('circle', { cx, cy, r: 4, class: 'fig-dot' }));
  return root;
}

function fraction(f) {
  if (f.shape === 'disc') {
    const root = svg(200, 200, `Un disque partagé en ${f.parts} parts, ${f.shaded} coloriées`);
    const cx = 100, cy = 100, r = 85;
    for (let i = 0; i < f.parts; i++) {
      const a0 = rad(90 - (360 / f.parts) * i), a1 = rad(90 - (360 / f.parts) * (i + 1));
      const d = f.parts === 1
        ? `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`
        : `M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy - r * Math.sin(a0)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy - r * Math.sin(a1)} Z`;
      root.append(s('path', { d, class: i < f.shaded ? 'fig-fill' : 'fig-empty' }));
    }
    return root;
  }
  const root = svg(320, 70, `Une bande partagée en ${f.parts} parts, ${f.shaded} coloriées`);
  const w = 300 / f.parts;
  for (let i = 0; i < f.parts; i++) root.append(s('rect', { x: 10 + i * w, y: 10, width: w, height: 50, class: i < f.shaded ? 'fig-fill' : 'fig-empty' }));
  return root;
}

function rect(f) {
  const unit = f.unit || 'cm';
  const k = 200 / Math.max(f.w, f.h);
  const W = Math.max(30, f.w * k), H = Math.max(30, f.h * k);
  const root = svg(W + 90, H + 60, `Un rectangle de ${fmt(f.w)} ${unit} sur ${fmt(f.h)} ${unit}`);
  root.append(s('rect', { x: 45, y: 15, width: W, height: H, class: 'fig-shape' }));
  if (f.labels !== false) {
    root.append(s('text', { x: 45 + W / 2, y: H + 42, 'text-anchor': 'middle', class: 'fig-text' }, `${fmt(f.w)} ${unit}`),
      s('text', { x: 38, y: 15 + H / 2, 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'fig-text' }, `${fmt(f.h)} ${unit}`));
  }
  return root;
}

function righttriangle(f) {
  const unit = f.unit || 'cm';
  const k = 180 / Math.max(f.a, f.b);
  const A = Math.max(40, f.a * k), B = Math.max(40, f.b * k);
  const root = svg(A + 100, B + 60, `Un triangle rectangle de côtés ${fmt(f.a)} ${unit} et ${fmt(f.b)} ${unit}`);
  const x0 = 60, y0 = B + 15;
  root.append(s('path', { d: `M${x0} ${y0} L${x0 + A} ${y0} L${x0} ${y0 - B} Z`, class: 'fig-shape' }),
    s('path', { d: `M${x0 + 14} ${y0} L${x0 + 14} ${y0 - 14} L${x0} ${y0 - 14}`, class: 'fig-mark', fill: 'none' }),
    s('text', { x: x0 + A / 2, y: y0 + 28, 'text-anchor': 'middle', class: 'fig-text' }, `${fmt(f.a)} ${unit}`),
    s('text', { x: x0 - 8, y: y0 - B / 2, 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'fig-text' }, `${fmt(f.b)} ${unit}`));
  return root;
}

function lines(f) {
  const root = svg(240, 160, 'Deux droites');
  if (f.kind2 === 'parallel') {
    root.append(s('line', { x1: 20, y1: 50, x2: 220, y2: 30, class: 'fig-line' }), s('line', { x1: 20, y1: 130, x2: 220, y2: 110, class: 'fig-line' }));
  } else if (f.kind2 === 'perpendicular') {
    root.append(s('line', { x1: 30, y1: 120, x2: 210, y2: 60, class: 'fig-line' }), s('line', { x1: 100, y1: 15, x2: 140, y2: 135, class: 'fig-line' }));
  } else {
    root.append(s('line', { x1: 20, y1: 40, x2: 220, y2: 120, class: 'fig-line' }), s('line', { x1: 20, y1: 130, x2: 220, y2: 30, class: 'fig-line' }));
  }
  return root;
}

function circle(f) {
  const unit = f.unit || 'cm';
  const root = svg(220, 200, `Un cercle de ${f.show === 'radius' ? 'rayon' : 'diamètre'} ${fmt(f.value)} ${unit}`);
  const cx = 110, cy = 95, r = 80;
  root.append(s('circle', { cx, cy, r, class: 'fig-shape' }), s('circle', { cx, cy, r: 3.5, class: 'fig-dot' }));
  if (f.show === 'radius') root.append(s('line', { x1: cx, y1: cy, x2: cx + r, y2: cy, class: 'fig-line accent' }));
  else root.append(s('line', { x1: cx - r, y1: cy, x2: cx + r, y2: cy, class: 'fig-line accent' }));
  root.append(s('text', { x: f.show === 'radius' ? cx + r / 2 : cx, y: cy - 10, 'text-anchor': 'middle', class: 'fig-text' }, `${fmt(f.value)} ${unit}`));
  return root;
}

const RENDER = { angle, fraction, rect, righttriangle, lines, circle };

export function renderFigure(fig) {
  const fn = RENDER[fig?.kind];
  if (!fn) return null;
  const wrap = document.createElement('div');
  wrap.className = 'figure-wrap';
  wrap.append(fn(fig));
  return wrap;
}
