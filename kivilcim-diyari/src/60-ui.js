// ===== 60-ui: HUD, hotbar, sheet (craft/build/bag), modals, minimap =====
let state = 'title';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let OPTS = { sound: true };
try { Object.assign(OPTS, JSON.parse(localStorage.getItem(OPT_KEY) || '{}')); } catch (e) {}
function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPTS)); } catch (e) {} }

// ----- icons (icons are drawn by MinikArt; placeables use their own art) -----
const URL_CACHE = {};
function artURL(name, opts) {
  const key = name + JSON.stringify(opts || {});
  if (URL_CACHE[key]) return URL_CACHE[key];
  const d = K.get(name); if (!d) return '';
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d');
  if (d.tags.includes('icon') || d.tags.includes('fx')) K.draw(x, name, 48, 48, Object.assign({ scale: 1.45, t: .3 }, opts));
  else { const sc = Math.min(84 / d.w, 84 / d.h); K.draw(x, name, 48 + (d.ax - d.w / 2) * sc, 48 + (d.ay - d.h / 2) * sc, Object.assign({ scale: sc, t: .3 }, opts)); }
  return (URL_CACHE[key] = c.toDataURL());
}
function itemURL(k) {
  const it = ITEMS[k]; if (!it) return '';
  if (it.ic) return artURL(it.ic);
  if (it.place === 'block' || it.place === 'fence') return artURL(it.art, Object.assign({ e: {} }, it.ao || {}));
  return artURL(it.art, it.ao || {});
}
const ic = (name, cls) => `<img${cls ? ` class="${cls}"` : ''} src="${artURL(name)}" alt="">`;
const icItem = (k, cls) => `<img${cls ? ` class="${cls}"` : ''} src="${itemURL(k)}" alt="">`;
function applyIcons(root) { (root || document).querySelectorAll('img[data-ic]').forEach(img => { img.src = artURL(img.dataset.ic); }); }

// ----- toasts & banners -----
let QUIET = false;
function toast(msg, icon) {
  if (QUIET || state === 'title') return;
  const w = $('toasts');
  for (const c of w.children) if (c.dataset.m === msg) return;
  const d = document.createElement('div'); d.className = 'toast'; d.dataset.m = msg;
  d.innerHTML = (icon ? ic(icon) : '') + `<span>${esc(msg)}</span>`;
  w.appendChild(d); while (w.children.length > (VH < 420 ? 2 : 3)) w.firstChild.remove();
  setTimeout(() => d.remove(), 2800);
}
let banT = 0;
function banner(a, b) { $('banT').textContent = a; $('banS').textContent = b || ''; $('banner').classList.add('show'); clearTimeout(banT); banT = setTimeout(() => $('banner').classList.remove('show'), 3000); }

// ----- HUD -----
let hudAll = true;
function hudDirty() { hudAll = true; }
const sig = {};
function once(k, v, fn) { if (sig[k] !== v) { sig[k] = v; fn(v); } }
function updateHUD() {
  const p = G.p;
  once('hp', Math.round(p.hp), v => { $('bHp').style.transform = `scaleX(${v / 100})`; $('sHp').classList.toggle('low', v < 25); });
  once('food', Math.round(p.food), v => { $('bFood').style.transform = `scaleX(${v / 100})`; $('sFood').classList.toggle('low', v < 20); });
  once('warm', Math.round(p.warm), v => { $('bWarm').style.transform = `scaleX(${v / 100})`; $('sWarm').classList.toggle('low', v < 20); });
  once('day', G.day + (G.weather === 'rain' ? ' 🌧' : ''), () => { $('dayL').textContent = `Gün ${G.day}${G.weather === 'rain' ? ' · yağmur' : ''}`; });
  once('time', clockText() + (G.inside ? 'h' : ''), () => { $('timeL').innerHTML = clockText() + (G.inside ? ' · <span class="home">evde</span>' : ''); });
  once('clk', isNight() || G.t > .55 ? 'icon.moon' : 'icon.sun', v => { $('clockIc').src = artURL(v); });
  const qd = QUESTS[G.q];
  const qs = qd ? (() => { const [a, b] = qd.c(G); return `${qd.t}|${Math.min(a, b)}/${b}`; })() : 'done';
  once('quest', qs, () => {
    if (!qd) { $('qT').textContent = 'Tüm görevler tamam!'; $('qP').textContent = 'Diyar senin. Keşfet, kur, ek.'; return; }
    const [a, b] = qd.c(G); $('qT').textContent = qd.t; $('qP').textContent = b > 1 ? `${Math.min(a, b)}/${b}` : 'Görev ' + (G.q + 1) + '/' + QUESTS.length;
  });
  const tg = target;
  const lbl = tg ? tg.label : 'Vur', icn = tg ? tg.ic : 'icon.hand';
  once('act', lbl + icn + (tg && tg.kind === 'tile' ? 1 : 0), () => { $('actL').textContent = lbl; $('actIc').src = artURL(icn); $('actBtn').classList.toggle('place', !!(tg && tg.kind === 'tile')); });
  if (hudAll) {
    hudAll = false;
    renderHotbar();
    $('bagDot').hidden = !RECIPES.some(r => recipeState(r).ok && !ITEMS[r.id].tool) && !RECIPES.some(r => ITEMS[r.id].tool && recipeState(r).ok);
    if (sheetTab) renderSheet();
  }
}
function renderHotbar() {
  const h = $('hotbar');
  h.innerHTML = G.hot.map((k, i) => {
    const n = k ? have(k) : 0;
    if (k && !n && !ITEMS[k].tool) { G.hot[i] = null; if (G.sel === i) G.sel = -1; return `<button class="slot empty" data-i="${i}"></button>`; }
    return `<button class="slot${G.sel === i ? ' on' : ''}${k ? '' : ' empty'}" data-i="${i}" aria-label="${k ? esc(ITEMS[k].n) : 'Boş'}">${k ? icItem(k) + (ITEMS[k].tool ? '' : `<b>${n}</b>`) : ''}</button>`;
  }).join('');
}
$('hotbar').addEventListener('click', e => { const b = e.target.closest('.slot'); if (!b || !G) return; const i = +b.dataset.i; if (!G.hot[i]) { openSheet('bag'); return; } selectHot(i); renderHotbar(); });

// ----- sheet -----
let sheetTab = null;
function openSheet(tab) { if (!G || state !== 'play') return; sheetTab = tab || 'tool'; $('sheet').hidden = false; $('scrim').hidden = false; document.body.classList.add('sheet-open'); renderSheet(); sfx('tap'); }
function closeSheet() { sheetTab = null; $('sheet').hidden = true; $('scrim').hidden = true; document.body.classList.remove('sheet-open'); }
function renderSheet() {
  $('tabs').innerHTML = CATS.map(([id, n, i]) => `<button data-t="${id}" class="${sheetTab === id ? 'on' : ''}">${ic(i)}${n}</button>`).join('') + `<button class="x" data-close aria-label="Kapat">×</button>`;
  const L = $('list');
  if (sheetTab === 'bag') {
    L.className = 'inv';
    const keys = Object.keys(ITEMS).filter(k => have(k) > 0);
    L.innerHTML = keys.length ? keys.map(k => `<button class="it" data-k="${k}">${icItem(k)}<b>${ITEMS[k].tool ? '' : have(k)}</b>${esc(ITEMS[k].n)}</button>`).join('') : '<p style="grid-column:1/-1;margin:6px">Çantan boş. Ağaç kes, taş kır, çimen yol!</p>';
    return;
  }
  L.className = 'list';
  const rs = RECIPES.filter(r => r.cat === sheetTab).map(r => ({ r, s: recipeState(r) }));
  rs.sort((a, b) => (b.s.ok - a.s.ok) || ((a.s.own ? 1 : 0) - (b.s.own ? 1 : 0)));
  L.innerHTML = rs.map(({ r, s }) => {
    const it = ITEMS[r.id];
    const cost = Object.entries(r.cost).map(([k, v]) => `<span class="cost${have(k) < v ? ' miss' : ''}">${icItem(k)}${v}</span>`).join('') + (r.need ? `<span class="cost need${s.need ? ' miss' : ''}">${esc(NEED_NAME[r.need])}</span>` : '');
    return `<div class="rc${s.ok ? '' : ' dim'}">${icItem(r.id, 'ri')}<div><b>${esc(it.n)}${r.n > 1 ? ' ×' + r.n : ''}${have(r.id) && !it.tool ? ` <span style="color:var(--muted);font-size:12px">(${have(r.id)})</span>` : ''}</b><p>${esc(r.d)}</p><div class="costs">${cost}</div></div><button class="mk${s.own ? ' own' : ''}" data-r="${r.id}"${s.ok ? '' : ' disabled'}>${s.ok ? 'Yap' : esc(s.why)}</button></div>`;
  }).join('');
}
$('sheet').addEventListener('click', e => {
  const t = e.target.closest('[data-t]'); if (t) { sheetTab = t.dataset.t; renderSheet(); sfx('tap'); return; }
  if (e.target.closest('[data-close]')) { closeSheet(); return; }
  const m = e.target.closest('.mk'); if (m && !m.disabled) { const id = m.dataset.r; if (craft(id)) { const it = ITEMS[id]; if (it.place) closeSheet(); else renderSheet(); } return; }
  const it = e.target.closest('.it');
  if (it) { const k = it.dataset.k, d = ITEMS[k]; if (d.food && !d.tool) { eat(k); renderSheet(); } else if (d.heal) { useMeds(); renderSheet(); } else if (d.tool || d.seed || d.place || d.use) { selectItem(k); closeSheet(); toast(`${d.n} elinde`, d.ic || 'icon.hand'); } else toast(`${d.n}: tariflerde kullanılır`, d.ic || 'icon.hand'); }
});
$('scrim').addEventListener('click', closeSheet);

// ----- modal helpers -----
function openModal(html) { const m = $('modal'); m.innerHTML = html; m.hidden = false; applyIcons(m); return m; }
function closeModal() { $('modal').hidden = true; $('modal').innerHTML = ''; }
function showStory(title, text, kind) {
  openModal(`<div class="mbox panel sketch"><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row" style="justify-content:flex-end"><button class="btn pri" id="stOk">Devam</button></div></div>`);
  $('stOk').addEventListener('click', closeModal);
  if (kind === 'radio') sfx('fanfare');
}
function openQuests() {
  const rows = QUESTS.map((q, i) => { const [a, b] = q.c(G); const done = i < G.q; return `<div class="${done ? 'done' : ''}">${ic(done ? 'icon.check' : i === G.q ? 'icon.star' : 'icon.lock')}<span>${esc(q.t)}${i === G.q && b > 1 ? ` (${Math.min(a, b)}/${b})` : ''}</span></div>`; }).join('');
  openModal(`<div class="mbox panel sketch"><h2>Görevler<small>Her görev küçük bir ödül verir. Sonsuz diyarda kendi hikâyeni yaz.</small></h2><div class="qlist">${rows}</div><div class="row" style="justify-content:flex-end"><button class="btn pri" id="qOk">Tamam</button></div></div>`);
  $('qOk').addEventListener('click', closeModal);
}
$('quest').addEventListener('click', () => { if (G && state === 'play') openQuests(); });
function openTrade() {
  const tr = G.trader; if (!tr) return;
  const r = K.rng(G.seed + tr.day * 13);
  const offers = TRADES.map((o, i) => [o, i]).sort(() => r() - .5).slice(0, 4);
  const chip = (obj, neg) => Object.entries(obj).map(([k, v]) => `<span class="${neg ? 'neg' : ''}">${icItem(k)}${neg ? '−' : '+'}${v}</span>`).join('');
  const html = offers.map(([o, i]) => { const used = tr.used.includes(i), ok = !used && canPay(o.give); return `<div class="trade"><div class="fx">${chip(o.give, true)} ${ic('icon.trade')} ${chip(o.get)}</div><button class="mk" data-i="${i}"${ok ? '' : ' disabled'}>${used ? 'Yapıldı' : 'Takas'}</button></div>`; }).join('');
  const m = openModal(`<div class="mbox panel sketch"><h2>Bay Bıyık'ın arabası<small>"Miyav! Her takas bir kez. Akşama kadar buradayım."</small></h2><div class="trades">${html}</div><div class="row" style="justify-content:flex-end"><button class="btn pri" id="trOk">Hoşça kal</button></div></div>`);
  m.querySelectorAll('.mk').forEach(b => b.addEventListener('click', () => {
    const o = TRADES[+b.dataset.i]; if (!canPay(o.give)) return;
    pay(o.give); for (const k in o.get) give(k, o.get[k], null, null, true); tr.used.push(+b.dataset.i); sfx('loot'); openTrade();
  }));
  $('trOk').addEventListener('click', closeModal);
}
function openMenu() {
  if (!G) return;
  paused = true;
  openModal(`<div class="mbox panel sketch" style="width:min(420px,100%)"><h2>Mola</h2>
    <button class="btn ok" id="mRes">Devam</button>
    <button class="btn" id="mQ">${ic('icon.quest')}Görevler</button>
    <button class="btn" id="mHelp">${ic('icon.book')}Nasıl oynanır</button>
    <button class="btn" id="mSnd">${ic(OPTS.sound ? 'icon.sound' : 'icon.mute')}Ses: ${OPTS.sound ? 'Açık' : 'Kapalı'}</button>
    <button class="btn" id="mGfx">${ic('icon.settings')}Grafik: ${OPTS.lite ? 'Hızlı' : 'Keskin'}</button>
    <button class="btn" id="mHome">${ic('icon.home')}Ana menü (kaydedilir)</button></div>`);
  $('mRes').addEventListener('click', () => { closeModal(); paused = false; });
  $('mQ').addEventListener('click', () => { openQuests(); paused = true; });
  $('mHelp').addEventListener('click', showHelp);
  $('mSnd').addEventListener('click', () => { OPTS.sound = !OPTS.sound; saveOpts(); initAudio(); openMenu(); });
  $('mGfx').addEventListener('click', () => { OPTS.lite = !OPTS.lite; saveOpts(); K.clearSprites(); resize(); openMenu(); });
  $('mHome').addEventListener('click', () => { save(); closeModal(); paused = false; showTitle(); });
}
function showHelp() {
  const rows = [
    ['icon.hand', 'Sol tarafta parmağını sürükle: yürü. Turuncu tuş önündeki şeye göre değişir: kes, kır, topla, aç, kovala.'],
    ['icon.bag', 'Çanta: Aletler, Yapı, Ev, Tarım ve Yemek tariflerini üret. Yapınca eşya alttaki çubuğa gelir ve eline alınır.'],
    ['icon.build', 'Eline duvar, kapı, zemin ya da eşya alınca tuş yeşil olur: önündeki kareye yerleştirir. Daha hızlısı: ekranda yakındaki bir kareye dokun, parmağını sürükledikçe sıra sıra dizilir (çapa, tohum ve sulama kabı da böyle). Hazır Kulübe tek dokunuşla 7×5 ev kurar.'],
    ['icon.hoe', 'Çapa ile tarla aç, tohum ek, sulama kabıyla sula (göl ya da Su Fıçısı doldurur). Yağmur da sular. Olgunlaşınca hasat et.'],
    ['icon.moon', 'Gece gölgecikler çıkar. Işıktan korkarlar, duvarlardan ve kapılardan geçemezler. Ev içinde sıcak ve güvendesin. Yatakta uyuyunca sabah olur.'],
    ['icon.hammer', 'Çekiç elindeyken yapıları söküp geri alırsın. Dünya sonsuz: uzaklarda harabeler ve telsiz parçaları var.'],
  ];
  openModal(`<div class="mbox panel sketch"><h2>Nasıl oynanır</h2><div class="qlist">${rows.map(([i, t]) => `<div>${ic(i)}<span>${esc(t)}</span></div>`).join('')}</div><div class="row" style="justify-content:flex-end"><button class="btn pri" id="hOk">Anladım</button></div></div>`);
  $('hOk').addEventListener('click', () => { closeModal(); paused = false; });
}
function chooseCharacter(done) {
  let pick = 'ece';
  const draw = () => {
    const m = openModal(`<div class="mbox panel sketch" style="width:min(720px,100%)"><h2>Kimle başlıyorsun?<small>Her karakterin tatlı bir yeteneği var.</small></h2><div class="chars">${Object.entries(SURV).map(([id, s]) => `<button class="ch${pick === id ? ' on' : ''}" data-c="${id}"><canvas width="168" height="192" data-art="${s.art}"></canvas>${s.n}<small>${esc(s.perk)}</small></button>`).join('')}</div><div class="row" style="justify-content:flex-end"><button class="btn ok" id="cGo">Dünyaya gir</button></div></div>`);
    m.querySelectorAll('canvas[data-art]').forEach(c => { const x = c.getContext('2d'); K.drawSprite(x, c.dataset.art, 84, 176, { pose: 'wave', t: .3, mood: 'happy' }, 2); });
    m.querySelectorAll('.ch').forEach(b => b.addEventListener('click', () => { pick = b.dataset.c; sfx('tap'); draw(); }));
    $('cGo').addEventListener('click', () => { closeModal(); done(pick); });
  };
  draw();
}

// ----- minimap -----
let miniT = 0;
const MINI_COL = { [TL.GRASS]: '#bcd99a', [TL.FOREST]: '#8fbc7c', [TL.MEADOW]: '#d3e6a6', [TL.SAND]: '#efdcb0', [TL.WATER]: '#9fd2e4', [TL.DEEP]: '#7fbad4', [TL.STONE]: '#cbc4d4', [TL.SOIL]: '#b98a63', [TL.WSOIL]: '#8f6448', [TL.FLOOR]: '#e3b887' };
function updateMini(dt) {
  miniT -= dt; if (miniT > 0) return; miniT = .6;
  const c = $('mini'), x = c.getContext('2d'), N = 46, s = c.width / N;
  const ptx = Math.floor(G.p.x / T), pty = Math.floor(G.p.y / T);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const tx = ptx - N / 2 + i, ty = pty - N / 2 + j;
    const ch = chunks.get(ckey(Math.floor(tx / CH), Math.floor(ty / CH)));
    const t = ch ? ch.tiles[(ty - ch.cy * CH) * CH + (tx - ch.cx * CH)] : genTile(tx, ty);
    x.fillStyle = MINI_COL[t]; x.fillRect(i * s, j * s, s + .5, s + .5);
  }
  for (const ch of chunks.values()) for (const o of ch.objs) {
    if (!(o.k === 'wall' || o.k === 'window' || o.k === 'door' || o.k === 'crate' && !o.open || o.k === 'radio')) continue;
    const i = o.tx - ptx + N / 2, j = o.ty - pty + N / 2; if (i < 0 || j < 0 || i >= N || j >= N) continue;
    x.fillStyle = o.k === 'crate' ? '#ffcf4a' : o.k === 'radio' ? '#ff5b6b' : o.mat === 'ruin' ? '#d98f6a' : '#7a4e34'; x.fillRect(i * s, j * s, s + .5, s + .5);
  }
  const hx = (G.home.x / T - ptx + N / 2) * s, hy = (G.home.y / T - pty + N / 2) * s;
  if (hx > 0 && hy > 0 && hx < c.width && hy < c.height) x.drawImage(ICON_CV('icon.home'), hx - 11, hy - 11, 22, 22);
  x.fillStyle = '#ff7f5c'; x.strokeStyle = '#3d2b45'; x.lineWidth = 3;
  x.beginPath(); x.arc(c.width / 2, c.height / 2, 7, 0, TAU); x.fill(); x.stroke();
  x.strokeStyle = 'rgba(61,43,69,.25)'; x.lineWidth = 1; x.beginPath(); for (let k = 0; k < 200; k += 6) { x.moveTo(k, 0); x.lineTo(0, k); } x.stroke();
}
const ICV = {};
function ICON_CV(name) { if (!ICV[name]) ICV[name] = K.toCanvas(name, {}, .7, 0); return ICV[name]; }
