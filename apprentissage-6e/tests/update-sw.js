// Met à jour la liste des fichiers mis en cache hors ligne (public/sw.js) et incrémente sa version.
// Lancer après chaque ajout/suppression de fichier : npm run sw
import fs from 'node:fs';
import path from 'node:path';

const pub = new URL('../public/', import.meta.url).pathname;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(pub).map((f) => './' + path.relative(pub, f)).filter((f) => f !== './sw.js').sort();
let sw = fs.readFileSync(pub + 'sw.js', 'utf8');
sw = sw.replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = [\n  './',\n${files.map((f) => `  '${f}',`).join('\n')}\n];`);
sw = sw.replace(/const VERSION = 'mission6e-v(\d+)';/, (_, n) => `const VERSION = 'mission6e-v${Number(n) + 1}';`);
fs.writeFileSync(pub + 'sw.js', sw);
console.log(`sw.js : ${files.length} fichiers, ${sw.match(/mission6e-v\d+/)[0]}`);
