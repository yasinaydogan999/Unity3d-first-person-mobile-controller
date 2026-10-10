// Render the Android launcher icons (mipmap PNGs) from the MinikArt kit.
// Usage: node tools/make-android-icons.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const art = ['core.js', 'characters.js', 'furniture.js', 'props.js', 'environment.js', 'icons.js']
  .map(f => path.join(root, 'art', f)).filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');

const SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const html = `<!doctype html><html><body style="margin:0;background:transparent"><script>${art}</script><script>
window.renderIcon = function (size, round) {
  const K = window.MinikArt, c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), s = size / 108;
  x.scale(s, s);
  // background: night sky tile with a snowy hill
  x.save();
  if (round) { x.beginPath(); x.arc(54, 54, 54, 0, Math.PI * 2); x.clip(); } else { K.rr(x, 2, 2, 104, 104, 24); x.clip(); }
  const g = x.createLinearGradient(0, 0, 0, 108); g.addColorStop(0, '#3b3478'); g.addColorStop(1, '#8e6fd6');
  x.fillStyle = g; x.fillRect(0, 0, 108, 108);
  for (const [sx, sy, r] of [[20, 18, 1.6], [84, 14, 1.4], [70, 30, 1.1], [32, 36, 1.2], [92, 44, 1.3]]) K.star(x, sx, sy, r * 2.2, '#fff6c8');
  K.circ(x, 82, 24, 9, '#fff1c2', 0);
  x.fillStyle = '#f4f8ff'; x.beginPath(); x.ellipse(54, 112, 80, 30, 0, 0, Math.PI * 2); x.fill();
  if (K.has('map.home')) K.draw(x, 'map.home', 54, 92, { scale: Math.min(76 / K.get('map.home').w, 70 / K.get('map.home').h), t: .3 });
  else {
    K.poly(x, [[26, 56], [54, 30], [82, 56]], '#ff7f5c');
    K.orr(x, 32, 54, 44, 38, 4, '#ffe8c7');
    K.orr(x, 46, 64, 16, 14, 3, '#ffc94a');
  }
  if (K.has('critter.cat')) K.draw(x, 'critter.cat', 30, 96, { scale: .8, pose: 'sit', t: .2 });
  x.restore();
  return c.toDataURL('image/png');
};
document.body.dataset.ready = 1;
</script></body></html>`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
await page.waitForSelector('body[data-ready="1"]', { state: 'attached' });
for (const [dpi, size] of Object.entries(SIZES)) {
  const dir = path.join(root, 'android', 'app', 'src', 'main', 'res', 'mipmap-' + dpi);
  fs.mkdirSync(dir, { recursive: true });
  for (const round of [false, true]) {
    const url = await page.evaluate(([s, r]) => window.renderIcon(s, r), [size, round]);
    fs.writeFileSync(path.join(dir, round ? 'ic_launcher_round.png' : 'ic_launcher.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
}
// a big preview for the README / store
const big = await page.evaluate(() => window.renderIcon(512, false));
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
fs.writeFileSync(path.join(root, 'assets', 'app-icon-512.png'), Buffer.from(big.split(',')[1], 'base64'));
console.log('launcher icons written for', Object.keys(SIZES).join(', '));
await browser.close();
