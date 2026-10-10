// Build Kıvılcım Diyarı into single-file pages.
//   node build.mjs            -> dist/index.html (standalone/APK) + dist/artifact.html (Claude Artifact fragment)
//   node build.mjs --android  -> also copies dist/index.html into android/app/src/main/assets/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const ART = ['../minik-art/core.js', '../minik-art/characters.js', '../minik-art/furniture.js', '../minik-art/nature.js', '../minik-art/outdoor.js', '../minik-art/icons.js', '../minik-art/sketch.js'];
const SRC = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => 'src/' + f);

const missing = ART.filter(p => !fs.existsSync(path.join(root, p)));
if (missing.length) console.warn('warning: missing art modules:', missing.join(', '));

const art = ART.filter(p => !missing.includes(p)).map(p => `/* ---- ${p} ---- */\n${read(p)}`).join('\n');
const game = `(function () {\n'use strict';\n${SRC.map(p => `/* ---- ${p} ---- */\n${read(p)}`).join('\n')}\n})();`;

const shell = read('src/shell.html');
const [head, body] = shell.split('<!--BODY-->');
if (!body) throw new Error('shell.html needs a <!--BODY--> marker');

// The artifact host forbids "</script" inside inline code; guard against it.
const script = `<script>\n${art}\n${game}\n</script>`;
if (/<\/script/i.test(art + game)) throw new Error('source contains a closing script tag');

const fragment = `${head.trim()}\n${body.trim()}\n${script}\n`;

let fontCss = '';
const fontFile = path.join(root, 'assets', 'fonts', 'baloo2.css');
if (fs.existsSync(fontFile)) fontCss = `<style>${fs.readFileSync(fontFile, 'utf8')}</style>\n`;
const standaloneHead = head.replace(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>\s*/g, fontCss ? '' : '$&');

const standalone = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#2a2257">
<meta name="mobile-web-app-capable" content="yes">
<meta name="screen-orientation" content="landscape">
${fontCss}${standaloneHead.trim()}
</head>
<body>
${body.trim()}
${script}
</body>
</html>
`;

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), standalone);
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), fragment);
console.log(`dist/index.html ${(standalone.length / 1024).toFixed(0)} KB, dist/artifact.html ${(fragment.length / 1024).toFixed(0)} KB`);

if (process.argv.includes('--android')) {
  const dest = path.join(root, 'android', 'app', 'src', 'main', 'assets');
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(root, 'dist', 'index.html'), path.join(dest, 'index.html'));
  console.log('copied to android/app/src/main/assets/index.html');
}
