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
const art = ['core.js', 'characters.js', 'nature.js', 'outdoor.js']
  .map(f => fs.readFileSync(path.join(root, '..', 'minik-art', f), 'utf8')).join('\n');

const SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const html = `<!doctype html><html><body style="margin:0;background:transparent"><script>${art}</script><script>
window.renderIcon = function (size, round) {
  const K = window.MinikArt, c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), s = size / 108;
  x.scale(s, s);
  x.save();
  if (round) { x.beginPath(); x.arc(54, 54, 54, 0, Math.PI * 2); x.clip(); } else { K.orr(x, 2, 2, 104, 104, 24, null, 0); x.clip(); }
  // dusk meadow seen from above, a warm campfire glow in the middle
  const g = x.createLinearGradient(0, 0, 0, 108); g.addColorStop(0, '#7cc27a'); g.addColorStop(1, '#4f9a6a');
  x.fillStyle = g; x.fillRect(0, 0, 108, 108);
  const r = x.createRadialGradient(56, 70, 4, 56, 70, 52); r.addColorStop(0, 'rgba(255,214,120,.75)'); r.addColorStop(1, 'rgba(255,214,120,0)');
  x.fillStyle = r; x.fillRect(0, 0, 108, 108);
  K.draw(x, 'nt.tree', 24, 52, { kind: 1, s: .62 });
  K.draw(x, 'nt.tree', 88, 46, { kind: 0, s: .55 });
  K.draw(x, 'od.fire', 58, 84, { lit: true, t: .35, scale: .95 });
  K.draw(x, 'critter.cat', 30, 92, { scale: .62, pose: 'sit', t: .2 });
  for (const [sx, sy, sr] of [[64, 34, 2.4], [48, 28, 1.8], [72, 22, 1.5]]) K.star(x, sx, sy, sr * 2, '#ffe873');
  x.restore();
  return c.toDataURL('image/png');
};
document.body.dataset.ready = 1;
</script></body></html>`;

const browser = await playwright.chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => console.error('page error:', e.message));
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
