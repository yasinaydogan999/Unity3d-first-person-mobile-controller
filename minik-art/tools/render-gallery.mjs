// Render the MinikArt gallery to a PNG so assets can be reviewed without a browser.
// Usage: node tools/render-gallery.mjs <prefix|""> <out.png> [--bg=night] [--width=1400] [--scale=1.5] [--t=0.3] [--states=default] [--sketch]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node-tools/node_modules/playwright'); }

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const pos = args.filter(a => !a.startsWith('--'));
const prefix = pos[0] || '';
const out = pos[1] || 'gallery.png';
const width = +(flags.width || 1400);

const qs = new URLSearchParams({ prefix, bg: flags.bg || 'cream', scale: flags.scale || '1.5', t: flags.t || '0.3' });
if (flags.states) qs.set('states', flags.states);
if (flags.sketch) qs.set('sketch', '1');
const url = 'file://' + path.join(here, '..', 'gallery.html') + '?' + qs.toString();

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.goto(url);
await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
await page.screenshot({ path: out, fullPage: true });
const count = await page.evaluate(() => document.querySelectorAll('.card').length);
console.log(`rendered ${count} asset cards -> ${out}`);
console.log(logs.length ? logs.join('\n') : 'no console errors');
await browser.close();
