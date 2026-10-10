// ===== 60-ui: HUD, cards, action bubbles, sheets, modals =====
let state = 'title';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let OPTS = { autoEat: true, sound: true };
try { Object.assign(OPTS, JSON.parse(localStorage.getItem(OPT_KEY) || '{}')); } catch (e) {}
function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPTS)); } catch (e) {} }

// ----- icons & portraits -----
const ICON_URL = {};
function iconURL(name) {
  if (ICON_URL[name]) return ICON_URL[name];
  if (!K.has(name)) return '';
  const d = K.get(name);
  let url = '';
  try {
    if (d.tags.includes('icon') || d.tags.includes('fx')) url = K.toCanvas(name, { t: .35 }, 2, 0).toDataURL();
    else url = artThumb(name, {}, 128, 128).toDataURL();
  } catch (e) { url = ''; }
  return (ICON_URL[name] = url);
}
function artThumb(name, opts, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const d = K.get(name); if (!d) return c;
  const x = c.getContext('2d');
  const sc = Math.min(W * .86 / d.w, H * .86 / d.h);
  K.draw(x, name, W / 2 + (d.ax - d.w / 2) * sc, H / 2 + (d.ay - d.h / 2) * sc, Object.assign({ t: .3, scale: sc }, opts));
  return c;
}
const PORTRAIT = {};
function portrait(art, mood) {
  const key = art + mood; if (PORTRAIT[key]) return PORTRAIT[key];
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d');
  K.draw(x, art, 48, 128, { scale: 1.55, pose: 'idle', mood, t: .2 });
  return (PORTRAIT[key] = c.toDataURL());
}
function applyIcons(root) { (root || document).querySelectorAll('img[data-ic]').forEach(img => { img.src = iconURL(img.dataset.ic); }); }
function icImg(name, cls) { return `<img${cls ? ` class="${cls}"` : ''} src="${iconURL(name)}" alt="">`; }

// ----- toasts -----
function toast(msg, icon) {
  const wrap = $('toasts');
  for (const c of wrap.children) if (c.dataset.msg === msg) return;
  const d = document.createElement('div'); d.className = 'toast'; d.dataset.msg = msg;
  d.innerHTML = (icon ? icImg(icon) : '') + `<span>${esc(msg)}</span>`;
  wrap.appendChild(d);
  while (wrap.children.length > 3) wrap.firstChild.remove();
  setTimeout(() => d.remove(), 2700);
}

// ----- top bar & cards -----
let hudFlags = { all: true, bump: new Set() };
function hudDirty(k) { hudFlags.all = true; if (k) hudFlags.bump.add(k); }
function buildRes() {
  $('res').innerHTML = ITEM_KEYS.map(k => `<div class="chip" id="r-${k}" title="${ITEMS[k].name}">${icImg(ITEMS[k].icon)}<span>0</span></div>`).join('');
}
function updateHUD() {
  if (!G) return;
  if (hudFlags.all) {
    for (const k of ITEM_KEYS) {
      const el = $('r-' + k); if (!el) continue;
      const v = G.inv[k] || 0;
      el.lastChild.textContent = v; el.classList.toggle('zero', v === 0);
      if (hudFlags.bump.has(k)) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    }
    hudFlags.bump.clear(); hudFlags.all = false;
    $('craftDot').hidden = !RECIPES.some(r => recipeState(r).ok);
  }
  const h = Math.floor(G.clock), m = Math.floor((G.clock - h) * 60 / 10) * 10;
  const tl = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  if ($('timeLbl').textContent !== tl) $('timeLbl').textContent = tl;
  const dl = `Gün ${G.day}`; if ($('dayLbl').textContent !== dl) $('dayLbl').textContent = dl;
  const ci = G.clock >= 18 || G.clock < 6.5 ? 'icon.moon' : 'icon.sun';
  if ($('clockIc').dataset.ic !== ci) { $('clockIc').dataset.ic = ci; $('clockIc').src = iconURL(ci); }
  $('nightBtn').hidden = !(G.phase === 'day' && G.clock >= 14);
  updateCards();
  const hint = hintText(); if ($('hint').textContent !== hint) $('hint').textContent = hint;
}
function rebuildCards() {
  if (!G) return;
  $('cards').innerHTML = G.chars.map(c => `<button class="card panel" data-id="${c.id}"><img class="pf" alt=""><div><b>${esc(c.name)}</b><span class="st"></span><div class="bars"><i style="--c:var(--food)"></i><i style="--c:var(--energy)"></i><i style="--c:var(--mood)"></i><i style="--c:var(--hp)"></i></div></div><img class="alert" alt="" hidden></button>`).join('');
  for (const el of $('cards').children) el.addEventListener('click', () => onCard(el.dataset.id, el));
  cardSig = {};
  updateCards();
}
let cardSig = {};
function updateCards() {
  for (const el of $('cards').children) {
    const ch = G.chars.find(c => c.id === el.dataset.id); if (!ch) continue;
    const mood = ch.st.mood < 22 || ch.sick ? 'sad' : 'happy';
    const status = ch.away ? 'Keşifte' : ch.task && ch.task.type !== 'wander' ? (TASK_NAME[ch.task.type] || '') + (ch.queue.length ? ` +${ch.queue.length}` : '') : 'Boşta';
    const alert = ch.sick ? 'icon.sick' : ch.st.hunger < 25 ? 'icon.hunger' : ch.st.energy < 15 ? 'icon.energy' : ch.st.mood < 20 ? 'icon.mood' : '';
    const sig = [mood, status, alert, G.sel === ch.id, ch.away, Math.round(ch.st.hunger / 4), Math.round(ch.st.energy / 4), Math.round(ch.st.mood / 4), Math.round(ch.st.health / 4)].join('|');
    if (cardSig[ch.id] === sig) continue;
    cardSig[ch.id] = sig;
    const img = el.querySelector('img.pf'); const pu = portrait(ch.art, mood); if (img.src !== pu) img.src = pu;
    el.querySelector('.st').textContent = status + (ch.sick ? ' · hasta' : '');
    const bars = el.querySelectorAll('.bars i');
    [ch.st.hunger, ch.st.energy, ch.st.mood, ch.st.health].forEach((v, i) => bars[i].style.setProperty('--v', (v / 100).toFixed(2)));
    const al = el.querySelector('.alert'); al.hidden = !alert; if (alert) al.src = iconURL(alert);
    el.classList.toggle('sel', G.sel === ch.id); el.classList.toggle('away', ch.away);
  }
}
function onCard(id, el) {
  if (state !== 'play' || G.phase !== 'day') return;
  const ch = G.chars.find(c => c.id === id); if (!ch) return;
  sfx('tap');
  if (G.sel === id) { const r = el.getBoundingClientRect(); openBubble({ k: 'char', ch }, r.right + 140, r.top + 10, true); return; }
  G.sel = id; G.tut = Math.max(G.tut, 1); closeBubble(); cardSig = {}; updateCards();
}
function hintText() {
  if (!G || state !== 'play' || G.phase !== 'day') return '';
  if (G.day === 1) {
    if (G.stats.cleared === 0 && G.tut < 1) return 'Bir işe dokun (molozlar, atölye, dolaplar): en yakın boştaki arkadaş gider. Önce birini seçersen o yapar.';
    if (G.stats.cleared === 0) return 'Molozlara dokun ve Temizle: odun ve parça çıkar, yeni odalar açılır.';
    if (!hasStation('stove')) return 'Atölyeye dokun ya da Üret: bir Ocak yap, akşama sıcak yemek olsun.';
    if (G.clock >= 15) return 'Akşam olunca gece planı açılır: biri keşfe çıkabilir.';
  }
  if (G.day >= 2 && !hasStation('water') && G.inv.water < 4) return 'Her gece herkes 1 su içer. Su Toplayıcı yap.';
  if (G.day >= 3 && !hasStation('heater')) return 'Geceler soğuyor: Soba yapmayı unutma.';
  if (G.chars.some(c => c.sick) && G.inv.meds === 0) return 'Hasta biri var: ilaç için Eczane\'ye keşfe çık.';
  return '';
}

// ----- action bubble -----
let bubbleTarget = null;
function closeBubble() { $('bubble').hidden = true; bubbleTarget = null; }
function costChips(cost) { return Object.entries(cost || {}).map(([k, v]) => `<span style="display:inline-flex;align-items:center${(G.inv[k] || 0) < v ? ';color:#c0263e' : ''}">${icImg(ITEMS[k].icon)}${v}</span>`).join(''); }
function doAssign(task, near) {
  const ch = pickWorker(near);
  if (!ch) { toast('Evde kimse yok', 'icon.cross'); return; }
  assign(ch, task); hudDirty();
}
function actionsFor(tg) {
  const inv = G.inv;
  if (tg.k === 'room') {
    const room = tg.room;
    return { title: 'Moloz yığını', icon: 'icon.shovel', sub: `${room.rubble} kürek kaldı · odun, parça çıkar`, acts: [
      { label: 'Temizle', icon: 'icon.shovel', note: G.tools.shovel ? 'Kürekle hızlı' : '', run: () => doAssign({ type: 'clear', r: room.r, c: room.c }, { row: room.r, x: room.c * ROOM_W }) }] };
  }
  if (tg.k === 'pet') { const p = G.pets[tg.i]; return { title: p.name, icon: 'icon.paw', sub: p.kind === 'cat' ? 'Mırıl mırıl bir kedi' : 'Kuyruğu hiç durmayan bir yavru', acts: [{ label: 'Sev (+moral)', icon: 'icon.heartplus', run: () => doAssign({ type: 'pet', pet: tg.i }, p) }] }; }
  if (tg.k === 'door') return { title: ['Ahşap kapı', 'Güçlendirilmiş kapı', 'Çelik kapı'][G.door], icon: 'icon.door', sub: 'Gece rakunlar buradan girmeye çalışır.', acts: [{ label: 'Atölyede güçlendir', icon: 'icon.hammer', run: openCraft }] };
  if (tg.k === 'char') {
    const ch = tg.ch, food = inv.meal > 0 ? 'meal' : inv.food > 0 ? 'food' : null;
    const bed = G.home.objs.find(o => (o.kind === 'bed' || o.kind === 'floorbed') && !isUsing(o, 'nap'));
    return { title: `${ch.name} · ${SURVIVORS[ch.id].traitName}`, icon: 'icon.star', sub: `${SURVIVORS[ch.id].traitDesc} Tokluk %${Math.round(ch.st.hunger)}, enerji %${Math.round(ch.st.energy)}, moral %${Math.round(ch.st.mood)}, sağlık %${Math.round(ch.st.health)}.`, acts: [
      { label: food === 'meal' ? 'Yemek ye' : 'Erzak ye', icon: food === 'meal' ? 'icon.meal' : 'icon.food', disabled: !food, note: food ? '' : 'yiyecek yok', run: () => assign(ch, { type: 'eat' }) },
      ...(ch.sick ? [{ label: 'İlaç iç', icon: 'icon.meds', disabled: inv.meds < 1, note: inv.meds < 1 ? 'ilaç yok' : '', run: () => assign(ch, { type: 'meds' }) }] : []),
      { label: 'Kestir', icon: 'icon.sleep', disabled: !bed, note: bed ? '' : 'boş yatak yok', run: () => assign(ch, { type: 'nap', obj: bed.id }) },
      { label: 'İşleri bırak', icon: 'icon.cross', disabled: !ch.task && !ch.queue.length, run: () => { cancelTasks(ch); hudDirty(); } },
    ] };
  }
  const o = tg.o, near = { row: o.row, x: o.x };
  if (o.t !== 'station') {
    const nm = CONT_NAME[o.t] || 'Sandık';
    if (o.searched) return { title: nm, icon: 'icon.search', sub: 'Boş. Burada başka bir şey yok.', acts: [] };
    if (o.locked && !G.tools.crowbar) return { title: nm + ' (kilitli)', icon: 'icon.lock', sub: 'Açmak için atölyede Levye yap.', acts: [{ label: 'Atölyeye git', icon: 'icon.hammer', run: openCraft }] };
    return { title: nm, icon: 'icon.search', sub: o.locked ? 'Levyeyle açılabilir.' : 'İçinde işe yarar bir şeyler olabilir.', acts: [{ label: o.locked ? 'Levyeyle aç' : 'Ara', icon: o.locked ? 'icon.crowbar' : 'icon.search', run: () => doAssign({ type: 'search', obj: o.id }, near) }] };
  }
  const name = ST_NAME[o.kind];
  switch (o.kind) {
    case 'workbench': return { title: G.wb >= 2 ? 'Atölye 2' : 'Atölye', icon: 'icon.workbench', sub: 'Eşya ve alet üret.', acts: [{ label: 'Üret', icon: 'icon.hammer', run: openCraft }] };
    case 'stove': return { title: name, icon: 'icon.stove', sub: 'Sıcak yemek doyurur ve moral verir.', acts: [
      { label: 'Yemek pişir', icon: 'icon.meal', cost: { food: 1, water: 1 }, run: () => doAssign({ type: 'cook', obj: o.id, cost: { food: 1, water: 1 } }, near) },
      { label: 'Kar erit (+2 su)', icon: 'icon.water', cost: { wood: 1 }, run: () => doAssign({ type: 'melt', obj: o.id, cost: { wood: 1 } }, near) },
      { label: 'Kakao (herkese)', icon: 'icon.cocoa', cost: { cocoa: 1, water: 1 }, run: () => doAssign({ type: 'cocoa', obj: o.id, cost: { cocoa: 1, water: 1 } }, near) }] };
    case 'water': return { title: name, icon: 'icon.watercollector', sub: `İçinde ${Math.floor(o.fill)} su var (en çok 4).`, acts: [{ label: 'Su al', icon: 'icon.water', disabled: o.fill < 1, note: o.fill < 1 ? 'henüz dolmadı' : `+${Math.floor(o.fill)}`, run: () => doAssign({ type: 'collect', obj: o.id }, near) }] };
    case 'garden':
      if (!o.planted) return { title: name, icon: 'icon.garden', sub: 'Tohum ek, iki günde sebze ver.', acts: [{ label: 'Tohum ek', icon: 'icon.seeds', cost: { seeds: 1 }, run: () => doAssign({ type: 'plant', obj: o.id, cost: { seeds: 1 } }, near) }] };
      if (o.growth >= 1) return { title: name, icon: 'icon.garden', sub: 'Sebzeler hazır!', acts: [{ label: 'Hasat et (+4 erzak)', icon: 'icon.food', run: () => doAssign({ type: 'harvest', obj: o.id }, near) }] };
      return { title: name, icon: 'icon.garden', sub: `Büyüyor: %${Math.round(o.growth * 100)}`, acts: [{ label: 'Sula (+%25)', icon: 'icon.water', cost: { water: 1 }, run: () => doAssign({ type: 'water_garden', obj: o.id, cost: { water: 1 } }, near) }] };
    case 'bed': case 'floorbed': return { title: name, icon: 'icon.bed', sub: 'Gündüz kestirmek enerji verir.', acts: [{ label: 'Kestir', icon: 'icon.sleep', disabled: isUsing(o, 'nap'), run: () => doAssign({ type: 'nap', obj: o.id }, near) }] };
    case 'heater': return { title: name, icon: 'icon.heater', sub: `Gece ${G.flags.storm ? 2 : 1} odun yakar. Odun: ${G.inv.wood}.`, acts: [{ label: 'Isın', icon: 'icon.warm', run: () => doAssign({ type: 'warm', obj: o.id }, near) }] };
    case 'guitar': return { title: name, icon: 'icon.guitar', sub: 'Herkesin morali yükselir.', acts: [{ label: 'Çal', icon: 'icon.music', run: () => doAssign({ type: 'relax', obj: o.id }, near) }] };
    case 'radio': return { title: name, icon: 'icon.radio', sub: 'Haberler, müzik ve ipuçları.', acts: [{ label: 'Dinle', icon: 'icon.music', run: () => doAssign({ type: 'relax', obj: o.id }, near) }] };
    default: return { title: name, icon: 'icon.mood', sub: 'Biraz dinlenmek iyi gelir.', acts: [{ label: o.kind === 'bookshelf' ? 'Kitap oku' : 'Otur, dinlen', icon: o.kind === 'bookshelf' ? 'icon.book' : 'icon.armchair', run: () => doAssign({ type: 'relax', obj: o.id }, near) }] };
  }
}
function openBubble(tg, sx, sy, fromCard) {
  const spec = actionsFor(tg); if (!spec) return;
  bubbleTarget = tg;
  const sel = G.chars.find(c => c.id === G.sel && !c.away);
  const who = tg.k === 'char' ? '' : sel ? `${sel.name} yapacak` : 'en yakın boştaki';
  const b = $('bubble');
  b.innerHTML = `<h4>${icImg(spec.icon, 'ic')}${esc(spec.title)}${who ? `<small>${esc(who)}</small>` : ''}</h4>${spec.sub ? `<p>${esc(spec.sub)}</p>` : ''}` +
    spec.acts.map((a, i) => {
      const lack = a.cost && !canPay(a.cost);
      return `<button class="act${!a.disabled && !lack ? ' go' : ''}" data-i="${i}"${a.disabled || lack ? ' disabled' : ''}>${icImg(a.icon)}<span>${esc(a.label)}</span><small>${a.cost ? costChips(a.cost) : esc(a.note || '')}</small></button>`;
    }).join('');
  b.hidden = false;
  b.querySelectorAll('.act').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); const a = spec.acts[+btn.dataset.i]; closeBubble(); a.run(); }));
  const bw = b.offsetWidth, bh = b.offsetHeight;
  const x = clamp(sx, bw / 2 + 8, VW - bw / 2 - 8), y = clamp(sy, bh + 8, VH - 8);
  b.style.left = x + 'px'; b.style.top = y + 'px';
}

// ----- craft sheet -----
let craftOpen = false;
function openCraft() {
  if (!G || state !== 'play' || G.phase !== 'day') return;
  closeBubble(); craftOpen = true; renderCraft();
  $('craft').hidden = false; $('scrim').hidden = false; sfx('tap');
}
function closeCraft() { craftOpen = false; $('craft').hidden = true; if ($('modal').hidden) $('scrim').hidden = true; }
function renderCraft() {
  const sel = G.chars.find(c => c.id === G.sel && !c.away);
  $('craftSub').textContent = (sel ? `${sel.name} üretecek.` : 'En uygun arkadaş üretecek.') + ' Oyun bu sırada durur.';
  const items = RECIPES.map(r => ({ r, st: recipeState(r) }));
  items.sort((a, b) => (b.st.ok - a.st.ok) || ((a.st.own ? 1 : 0) - (b.st.own ? 1 : 0)) || ((a.st.lock ? 1 : 0) - (b.st.lock ? 1 : 0)));
  $('craftList').innerHTML = items.map(({ r, st }) => {
    const cost = Object.entries(r.cost).map(([k, v]) => `<span class="cost${(G.inv[k] || 0) < v ? ' miss' : ''}">${icImg(ITEMS[k].icon)}${v}</span>`).join('') + `<span class="cost t">${icImg('icon.clock')}${r.time} sn</span>`;
    return `<div class="rc${st.lock ? ' lock' : ''}"><img class="ri" src="${iconURL(r.icon)}" alt=""><div><b>${esc(r.name)}</b><p>${esc(r.desc)}</p><div class="costs">${cost}</div></div><button class="mk${st.own ? ' own' : ''}" data-r="${r.id}"${st.ok ? '' : ' disabled'}>${st.ok ? 'Yap' : esc(st.why)}</button></div>`;
  }).join('');
}
$('craftList').addEventListener('click', e => { const b = e.target.closest('.mk'); if (!b || b.disabled) return; if (craftRecipe(b.dataset.r)) renderCraft(); });
$('craft').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeCraft(); });
$('scrim').addEventListener('click', () => { if (craftOpen) closeCraft(); });

// ----- modal helpers -----
function openModal(html, clear) {
  const m = $('modal'); m.innerHTML = html; m.hidden = false; m.classList.toggle('clear', !!clear);
  applyIcons(m); closeBubble();
  return m;
}
function closeModal() { const m = $('modal'); m.hidden = true; m.innerHTML = ''; }
function fxChips(fx, need) {
  const out = [];
  for (const f of fx || []) {
    const nm = ITEMS[f.k] ? ITEMS[f.k].icon : f.k === 'mood' ? 'icon.mood' : f.k === 'energy' ? 'icon.energy' : 'icon.health';
    out.push(`<span class="${f.v < 0 ? 'neg' : ''}">${icImg(nm)}${f.v > 0 ? '+' : ''}${f.v}</span>`);
  }
  return out.join('');
}

// ----- night plan -----
function openNightPlan() {
  state = 'play';
  const p = G.plan;
  const rows = G.chars.map(c => {
    const r = p.roles[c.id];
    return `<div class="prow"><img class="pf" src="${portrait(c.art, c.st.mood < 22 ? 'sad' : 'happy')}" alt=""><div><b>${esc(c.name)}</b><small>Enerji %${Math.round(c.st.energy)}${c.sick ? ' · hasta' : ''}</small></div><div class="seg">
      <button data-c="${c.id}" data-r="sleep" class="${r === 'sleep' ? 'on' : ''}">${icImg('icon.sleep')}Uyu</button>
      <button data-c="${c.id}" data-r="guard" class="${r === 'guard' ? 'on guard' : ''}">${icImg('icon.guard')}Nöbet</button>
      <button data-c="${c.id}" data-r="scav" class="${r === 'scav' ? 'on scav' : ''}"${c.st.energy < 10 ? ' disabled' : ''}>${icImg('icon.map')}Keşif</button></div></div>`;
  }).join('');
  const scav = Object.values(p.roles).includes('scav');
  const locs = scav ? `<b style="font-size:15px">Nereye gitsin?</b><div class="locs">${LOCS.map(l => {
    const pool = G.locPools[l.id], top = Object.entries(pool).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const low = poolTotal(l.id) < 5;
    return `<button class="loc${p.loc === l.id ? ' on' : ''}" data-l="${l.id}"><canvas width="192" height="128" data-art="${l.art}"></canvas>${esc(l.name)}<small>${top.map(([k]) => icImg(ITEMS[k].icon)).join('')}${low ? ' az kaldı' : ''}</small><small class="dg">${l.danger ? icImg('icon.raccoon').repeat(raccoonCount(l)) || 'sakin' : 'güvenli'}</small></button>`;
  }).join('')}</div>
  <div class="row"><div class="seg"><button data-m="play" class="${p.mode === 'play' ? 'on' : ''}">${icImg('icon.hand')}Kendim oynayayım</button><button data-m="quick" class="${p.mode === 'quick' ? 'on' : ''}">${icImg('icon.fast')}Hızlı keşif</button></div></div>` : '<p style="font-size:13.5px;color:var(--muted)">İpucu: birini <b>Keşif</b>e yollarsan malzeme getirir. <b>Nöbet</b> rakun baskınını çoğu zaman durdurur.</p>';
  const ready = !scav || p.loc;
  const m = openModal(`<div class="mbox panel wide"><h2 style="display:flex;align-items:center;gap:6px">${icImg('icon.moon', 'ic')}<span>Gece planı<small>${G.day}. gün akşamı. Kim ne yapsın?</small></span></h2><div class="cols"><div class="plan">${rows}</div><div>${locs}
    <div class="row" style="justify-content:flex-end"><button class="btn nt" id="goNight"${ready ? '' : ' disabled'}>${icImg('icon.moon')}${scav ? (p.mode === 'play' ? (p.loc ? 'Keşfe çık' : 'Bir yer seç') : 'Hızlı keşif ve uyu') : 'Herkes yatsın'}</button></div></div></div></div>`);
  m.querySelectorAll('canvas[data-art]').forEach(c => { const x = c.getContext('2d'); const d = K.get(c.dataset.art); if (!d) return; const sc = Math.min(180 / d.w, 118 / d.h); K.draw(x, c.dataset.art, 96 + (d.ax - d.w / 2) * sc, 122 - (d.h - d.ay) * sc, { scale: sc, t: .4 }); });
  m.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.c, r = b.dataset.r;
    if (r === 'scav') for (const k in p.roles) if (p.roles[k] === 'scav') p.roles[k] = 'sleep';
    p.roles[id] = r; if (r === 'scav' && !p.loc) p.loc = null;
    sfx('tap'); openNightPlan();
  }));
  m.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { p.loc = b.dataset.l; sfx('tap'); openNightPlan(); }));
  m.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { p.mode = b.dataset.m; sfx('tap'); openNightPlan(); }));
  $('goNight').addEventListener('click', () => { sfx('door'); beginNight(); });
}

// ----- morning report & events -----
function showMorning(lines, ev, won) {
  G.phase = 'morning';
  const list = lines.map(l => `<div class="${l.bad ? 'bad' : l.good ? 'good' : ''}">${icImg(l.ic)}<span>${esc(l.txt)}</span></div>`).join('');
  const btn = won ? `<button class="btn ok" id="mornOk">${icImg('icon.sun')}Bahar geldi!</button>` : `<button class="btn pri" id="mornOk">${icImg('icon.sun')}${ev ? 'Devam' : 'Güne başla'}</button>`;
  openModal(`<div class="mbox panel"><h2>${icImg('icon.sun', 'ic')} ${G.day}. gün sabahı<small>${won ? 'Kar eriyor, sokaktan sesler geliyor...' : 'Gece neler oldu?'}</small></h2><div class="rep">${list || '<div>Sakin bir geceydi.</div>'}</div><div class="row" style="justify-content:flex-end">${btn}</div></div>`);
  sfx('morning');
  $('mornOk').addEventListener('click', () => {
    if (won) { endGame(true); return; }
    if (ev) showEvent(ev); else { closeModal(); G.phase = 'day'; }
  });
}
function showEvent(e) {
  G.phase = 'morning';
  const ch = e.choices.map((c, i) => {
    const ok = !c.need || canPay(c.need);
    return `<button class="choice" data-i="${i}"${ok ? '' : ' disabled'}><span>${esc(c.label)}${c.note ? `<small style="display:block;font-size:12px;font-weight:600;color:var(--muted)">${esc(c.note)}</small>` : ''}${!ok ? `<small style="display:block;font-size:12px;font-weight:600;color:#c0263e">Gerekli: ${esc(costText(c.need))}</small>` : ''}</span><span class="fx">${fxChips(c.fx)}</span></button>`;
  }).join('');
  const m = openModal(`<div class="mbox panel"><div class="split"><canvas width="300" height="300" id="evArt"></canvas><div style="display:grid;gap:8px"><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p><div class="choices">${ch}</div></div></div></div>`);
  const c = $('evArt'), x = c.getContext('2d');
  x.fillStyle = '#ffe8c7'; x.fillRect(0, 0, 300, 300);
  const d = K.get(e.art);
  if (d) { const sc = Math.min(220 / d.w, 230 / d.h, d.tags.includes('icon') ? 3.2 : 3.4); K.draw(x, e.art, 150 + (d.ax - d.w / 2) * sc, d.tags.includes('icon') ? 150 : 270, { scale: sc, t: .3, pose: e.art.startsWith('npc') ? 'wave' : 'idle', mood: 'happy' }); }
  m.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => {
    const choice = e.choices[+b.dataset.i];
    if (choice.trade) { G.done[e.days ? e.id + G.day : e.id] = true; showTrade(); return; }
    applyChoice(e, choice); sfx('happy'); closeModal(); G.phase = 'day';
    if (choice.recruit) toast('Deniz aramıza katıldı!', 'icon.heartplus');
  }));
}
function showTrade() {
  const r = K.rng(G.seed + G.day * 3);
  const offers = TRADES.slice().sort(() => r() - .5).slice(0, 3);
  const used = new Set();
  const draw = () => {
    const html = offers.map((o, i) => {
      const ok = !used.has(i) && canPay(o.give);
      return `<button class="choice" data-i="${i}"${ok ? '' : ' disabled'}><span class="fx" style="justify-content:flex-start">${fxChips(Object.entries(o.give).map(([k, v]) => ({ k, v: -v })))} ${icImg('icon.trade')} ${fxChips(Object.entries(o.get).map(([k, v]) => ({ k, v })))}</span><span>${used.has(i) ? 'Yapıldı' : 'Takas'}</span></button>`;
    }).join('');
    const m = openModal(`<div class="mbox panel"><div class="split"><canvas width="300" height="300" id="evArt"></canvas><div style="display:grid;gap:8px"><h2>Bay Bıyık'ın kızağı</h2><p>"Her takas bir kez, miyav!"</p><div class="choices">${html}</div><button class="btn pri" id="trDone">Hoşça kal Bay Bıyık</button></div></div></div>`);
    const c = $('evArt'), x = c.getContext('2d'); x.fillStyle = '#ffe8c7'; x.fillRect(0, 0, 300, 300);
    const d = K.get('npc.trader'); if (d) K.draw(x, 'npc.trader', 150, 275, { scale: Math.min(3.2, 230 / d.h), pose: 'wave', t: .3 });
    m.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => {
      const o = offers[+b.dataset.i]; if (!canPay(o.give)) return;
      pay(o.give); for (const k in o.get) G.inv[k] += o.get[k]; used.add(+b.dataset.i); hudDirty(); sfx('loot'); draw();
    }));
    $('trDone').addEventListener('click', () => { closeModal(); G.phase = 'day'; save(); });
  };
  draw();
}

// ----- scavenging HUD -----
function showScavHud(on) {
  $('scav').hidden = !on; $('top').hidden = on; $('cards').hidden = on; $('acts').hidden = on; $('hint').textContent = '';
  if (on) updateBag();
}
function updateBag() {
  const S = G.scav; if (!S) return;
  let html = '';
  for (let i = 0; i < S.cap; i++) { const k = S.bag[i]; html += `<div class="slot${k ? ' f' : ''}">${k ? icImg(ITEMS[k].icon) : ''}</div>`; }
  $('bag').innerHTML = html;
}
$('homeBtn').addEventListener('click', () => { if (G && G.scav) { sfx('door'); endScav(false); } });

// ----- menu / help / end -----
function openMenu() {
  if (!G) return;
  const prev = G.speed; G.speed = 0; setSpeedUI();
  const m = openModal(`<div class="mbox panel" style="width:min(420px,100%)"><h2>Mola</h2>
    <button class="btn ok" id="mResume">Devam</button>
    <button class="btn" id="mSound">${icImg(OPTS.sound ? 'icon.sound' : 'icon.mute')}Ses: ${OPTS.sound ? 'Açık' : 'Kapalı'}</button>
    <button class="btn" id="mEat">${icImg('icon.meal')}Otomatik yemek: ${OPTS.autoEat ? 'Açık' : 'Kapalı'}</button>
    <button class="btn" id="mHelp">${icImg('icon.book')}Nasıl oynanır</button>
    <button class="btn" id="mHome">${icImg('icon.home')}Ana menü (kaydedilir)</button></div>`);
  $('mResume').addEventListener('click', () => { closeModal(); G.speed = prev || 1; setSpeedUI(); });
  $('mSound').addEventListener('click', () => { OPTS.sound = !OPTS.sound; saveOpts(); initAudio(); openMenu(); G.speed = prev; });
  $('mEat').addEventListener('click', () => { OPTS.autoEat = !OPTS.autoEat; saveOpts(); openMenu(); G.speed = prev; });
  $('mHelp').addEventListener('click', () => showHelp(() => { closeModal(); G.speed = prev || 1; setSpeedUI(); }));
  $('mHome').addEventListener('click', () => { save(); closeModal(); showTitle(); });
}
function showHelp(done) {
  const rows = [
    ['icon.hand', 'Bir işe dokun: en yakın boştaki arkadaş yapar. Önce soldan birini seçersen o yapar. Aynı kişiye birden çok iş sıralayabilirsin.'],
    ['icon.shovel', 'Molozları temizle: odun ve parça çıkar, yeni odalar ve eşyalar açılır.'],
    ['icon.hammer', 'Atölyede üret: ocak, yatak, su toplayıcı, soba, aletler. Atölye 2 yeni tarifler açar.'],
    ['icon.moon', 'Saat 20:00\'de gece planı: uyu, nöbet tut ya da keşfe çık. Keşfi kendin oynayabilir ya da hızlı geçebilirsin.'],
    ['icon.raccoon', 'Rakunlar eşya çalar. Keşifte yaklaşınca üstlerine dokun: Kışşt! Evde nöbetçi ve sağlam kapı korur.'],
    ['icon.heart', 'Her gece herkes 1 su içer. Tok, dinlenmiş, sıcak ve mutlu kal. 12. güne kadar dayan: bahar gelir.'],
  ];
  openModal(`<div class="mbox panel"><h2>Nasıl oynanır</h2><div class="rep">${rows.map(([i, t]) => `<div>${icImg(i)}<span>${esc(t)}</span></div>`).join('')}</div><div class="row" style="justify-content:flex-end"><button class="btn pri" id="hOk">Anladım</button></div></div>`);
  $('hOk').addEventListener('click', () => { if (done) done(); else closeModal(); });
}
function endGame(won) {
  if (!G) return;
  const best = readBest();
  if (won || G.day > best) try { localStorage.setItem(BEST_KEY, String(Math.max(best, G.day))); } catch (e) {}
  clearSave();
  const names = G.chars.map(c => c.name).join(', ');
  openModal(`<div class="mbox panel" style="width:min(520px,100%)"><h2>${won ? 'Bahar geldi!' : 'Sığınak dağıldı'}<small>${won ? `${names} kurtarma ekibine el salladı. Kar eridi, sokaklar çiçek açıyor.` : 'Herkes kurtarma çadırına taşındı. Bir dahaki sefere daha sıcak bir yuva!'}</small></h2>
    <div class="rep"><div>${icImg('icon.sun')}<span>${G.day} gün dayandınız</span></div><div>${icImg('icon.hammer')}<span>${G.stats.crafted} şey üretildi, ${G.stats.cleared} oda açıldı</span></div><div>${icImg('icon.map')}<span>${G.stats.scavs} keşif, ${G.stats.raids} rakun baskını</span></div>${G.lost.length ? `<div class="bad">${icImg('icon.health')}<span>Hastaneye gidenler: ${esc(G.lost.join(', '))}</span></div>` : ''}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn" id="eHome">Ana menü</button><button class="btn pri" id="eNew">Yeni oyun</button></div></div>`);
  sfx(won ? 'fanfare' : 'night');
  state = 'end';
  $('eHome').addEventListener('click', () => { closeModal(); showTitle(); });
  $('eNew').addEventListener('click', () => { closeModal(); startNew(); });
}
function setSpeedUI() { if (!G) return; $('speed').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.s === G.speed)); }
$('speed').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !G) return; G.speed = +b.dataset.s; setSpeedUI(); sfx('tap'); });
$('menuBtn').addEventListener('click', openMenu);
$('craftBtn').addEventListener('click', openCraft);
$('nightBtn').addEventListener('click', () => {
  if (!G || G.phase !== 'day') return;
  const dh = NIGHT_AT - G.clock; applyStats(dh); updateStations(dh); G.clock = NIGHT_AT; startNight();
});
