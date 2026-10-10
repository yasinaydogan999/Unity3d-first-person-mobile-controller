// ===== 20-sim: game state, survivors, tasks, day/night, events =====
let G = null;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = () => Math.random();
const pick = a => a[Math.floor(Math.random() * a.length)];

function mkChar(id, row, x) {
  const d = SURVIVORS[id];
  return { id, name: d.name, art: d.art, trait: d.trait, row, x, face: 1, pose: 'idle', task: null, queue: [], path: null,
    st: { hunger: 78, energy: 88, mood: 72, health: 100 }, sick: false, away: false, idleT: 2 + rand() * 4, anim: rand() * 10, climbP: 0, bubbleT: 0 };
}
function newGame() {
  const home = buildHome();
  G = {
    v: 1, seed: (rand() * 1e9) | 0, day: 1, clock: DAY_START + 1, speed: 1, phase: 'day',
    inv: Object.assign({}, START_INV), tools: { shovel: false, crowbar: false, backpack: false }, wb: 1, door: 0,
    home,
    chars: [mkChar('ece', 2, 168), mkChar('mert', 2, ROOM_W + 30), mkChar('lale', 1, 80)],
    pets: [{ kind: 'cat', name: 'Pamuk', row: 2, x: ROOM_W + 178, face: -1, pose: 'sleep', t: 6, goal: null }],
    flags: {}, done: {}, locVisits: {}, locPools: Object.fromEntries(LOCS.map(l => [l.id, Object.assign({}, l.pool)])),
    stats: { raids: 0, scavs: 0, crafted: 0, cleared: 0, events: 0 }, lost: [], sel: null, scav: null, saveT: 0, tut: 0,
  };
  G.chars[0].face = -1;
  return G;
}

// ----- helpers -----
function homeChars() { return G.chars.filter(c => !c.away); }
function hasStation(kind) { return G.home.objs.some(o => o.t === 'station' && o.kind === kind); }
function stations(kind) { return G.home.objs.filter(o => o.t === 'station' && o.kind === kind); }
function canPay(cost) { for (const k in cost) if ((G.inv[k] || 0) < cost[k]) return false; return true; }
function pay(cost) { for (const k in cost) G.inv[k] -= cost[k]; hudDirty(); }
function refund(cost) { if (!cost) return; for (const k in cost) G.inv[k] += cost[k]; hudDirty(); }
function gain(k, n, wx, wy) {
  if (!n) return; G.inv[k] = Math.max(0, (G.inv[k] || 0) + n); hudDirty(k);
  if (wx != null) floatIcon(ITEMS[k].icon, (n > 0 ? '+' : '') + n, wx, wy);
}
function costText(cost) { return Object.entries(cost).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(', '); }
function charPos(ch) { return { row: ch.row, x: ch.x }; }
function charY(ch) {
  if (ch.path && ch.path[0] && ch.path[0].t === 'climb') { const st = ch.path[0]; return floorY(ch.row) + (floorY(st.to) - floorY(ch.row)) * ch.climbP; }
  return floorY(ch.row);
}

// ----- tasks -----
const TASK_POSE = { clear: 'work', craft: 'work', cook: 'work', cocoa: 'work', melt: 'work', collect: 'search', plant: 'search', water_garden: 'search', harvest: 'search', search: 'search', relax: 'sit', nap: 'sleep', pet: 'happy', eat: 'eat', meds: 'eat', warm: 'idle', walk: 'idle', wander: 'idle' };
const TASK_NAME = { clear: 'Moloz temizliyor', craft: 'Üretiyor', cook: 'Yemek pişiriyor', cocoa: 'Kakao yapıyor', melt: 'Kar eritiyor', collect: 'Su alıyor', plant: 'Tohum ekiyor', water_garden: 'Bahçeyi suluyor', harvest: 'Hasat ediyor', search: 'Arıyor', relax: 'Dinleniyor', nap: 'Uyuyor', pet: 'Seviyor', eat: 'Yemek yiyor', meds: 'İlaç içiyor', warm: 'Isınıyor', walk: 'Yürüyor', wander: 'Geziniyor' };

function standFor(ch, task) {
  const s = G.home;
  if (task.type === 'clear') { const room = s.rooms[task.r][task.c]; return rubbleStand(s, room, charPos(ch)); }
  if (task.type === 'eat' || task.type === 'meds') return { row: ch.row, x: ch.x };
  if (task.type === 'walk' || task.type === 'wander') return { row: task.row, x: task.x };
  if (task.type === 'pet') { const p = G.pets[task.pet]; return p ? { row: p.row, x: p.x + (ch.x < p.x ? -22 : 22) } : null; }
  const o = objById(s, task.obj); if (!o) return null;
  if (task.type === 'nap') return { row: o.row, x: o.x };
  const idx = G.chars.indexOf(ch);
  return { row: o.row, x: o.x + ((idx % 3) - 1) * 9, face: ch.x < o.x ? 1 : -1 };
}
function taskDur(ch, t) {
  switch (t.type) {
    case 'clear': return 4.5;
    case 'craft': return RECIPES.find(r => r.id === t.recipe).time;
    case 'cook': return 4; case 'cocoa': return 3; case 'melt': return 3; case 'collect': return 1.5;
    case 'plant': return 2; case 'water_garden': return 1.5; case 'harvest': return 2;
    case 'search': { const o = objById(G.home, t.obj); return o && o.locked ? 3 : 2; }
    case 'relax': return 5; case 'pet': return 2; case 'eat': return 1.6; case 'meds': return 1.5; case 'warm': return 2;
    case 'nap': return 999; default: return 0;
  }
}
function workMult(ch, t) {
  let m = 1;
  if ((t.type === 'clear' || t.type === 'craft') && ch.trait === 'handy') m *= 1.5;
  if (t.type === 'clear' && G.tools.shovel) m *= 2;
  if ((t.type === 'cook' || t.type === 'cocoa' || t.type === 'melt') && ch.trait === 'cook') m *= 2;
  if (ch.st.energy < 12) m *= .6;
  if (ch.st.mood < 15) m *= .75;
  if (ch.sick) m *= .8;
  return m;
}

/** Give `ch` a task now (if idle) or queue it. Costs are paid immediately and refunded on cancel. */
function assign(ch, task) {
  if (!ch || ch.away) return false;
  if (task.cost) { if (!canPay(task.cost)) { toast('Malzeme yetmiyor: ' + costText(task.cost), 'icon.cross'); sfx('deny'); return false; } pay(task.cost); }
  if (ch.task && (ch.task.type === 'wander' || ch.task.type === 'walk')) { ch.task = null; ch.path = null; }
  if (!ch.task) { if (!startTask(ch, task)) { refund(task.cost); return false; } }
  else if (ch.queue.length < 3) { ch.queue.push(task); toast(`${ch.name}: sıraya eklendi`, 'icon.clock'); }
  else { refund(task.cost); toast(`${ch.name} çok meşgul (3 iş sırada)`, 'icon.clock'); return false; }
  sfx('tap'); return true;
}
function startTask(ch, task) {
  const stand = standFor(ch, task);
  const path = stand ? planPath(G.home, charPos(ch), stand) : null;
  if (!path) { toast(`${ch.name} oraya ulaşamıyor`, 'icon.cross'); return false; }
  task.prog = 0; task.dur = taskDur(ch, task); task.stand = stand;
  ch.task = task; ch.path = path; ch.climbP = 0;
  return true;
}
function nextTask(ch) {
  ch.task = null; ch.path = null;
  while (ch.queue.length) { const t = ch.queue.shift(); if (startTask(ch, t)) return; refund(t.cost); }
  ch.pose = 'idle'; ch.idleT = 3 + rand() * 5;
}
function cancelTasks(ch) {
  if (ch.task) refund(ch.task.cost);
  for (const t of ch.queue) refund(t.cost);
  if (ch.task && (ch.task.type === 'cook' || ch.task.type === 'cocoa' || ch.task.type === 'melt')) { const o = objById(G.home, ch.task.obj); if (o) o.lit = false; }
  ch.task = null; ch.queue = []; ch.path = null; ch.pose = 'idle'; ch.climbP = 0;
}

function stepPath(ent, dt, speed) {
  const st = ent.path[0]; if (!st) return true;
  if (st.t === 'walk') {
    if (ent.row !== st.row) ent.row = st.row;
    const dx = st.x - ent.x, step = speed * dt;
    if (Math.abs(dx) <= step) { ent.x = st.x; ent.path.shift(); }
    else { ent.x += Math.sign(dx) * step; ent.face = Math.sign(dx); }
    ent.pose = 'walk';
  } else {
    ent.x = st.x; ent.pose = 'climb';
    ent.climbP += dt * speed * .8 / (ROOM_H + SLAB);
    if (ent.climbP >= 1) { ent.row = st.to; ent.climbP = 0; ent.path.shift(); }
  }
  return ent.path.length === 0;
}

function updateChar(ch, dt) {
  ch.anim += dt;
  if (ch.away) return;
  const t = ch.task;
  if (ch.path && ch.path.length) { stepPath(ch, dt, ch.trait === 'runner' ? 82 : 72); return; }
  ch.path = null;
  if (!t) {
    ch.pose = ch.st.mood < 20 ? 'sad' : 'idle';
    if (OPTS.autoEat && ch.st.hunger < 28 && (G.inv.meal > 0 || G.inv.food > 0)) { assign(ch, { type: 'eat', auto: true }); return; }
    ch.idleT -= dt;
    if (ch.idleT <= 0) {
      ch.idleT = 4 + rand() * 6;
      const g = graph(G.home), i = segIndex(g, ch.row, ch.x);
      if (i >= 0) { const sg = g.rows[ch.row][i]; const x = clamp(ch.x + (rand() - .5) * 140, sg[0] + 14, sg[1] - 14); startTask(ch, { type: 'wander', row: ch.row, x }); }
    }
    return;
  }
  if (t.type === 'walk' || t.type === 'wander') { nextTask(ch); return; }
  if (t.stand && t.stand.face) ch.face = t.stand.face;
  // validate target still exists / still makes sense
  if (t.obj != null && !objById(G.home, t.obj)) { nextTask(ch); return; }
  if (t.type === 'clear' && G.home.rooms[t.r][t.c].rubble <= 0) { nextTask(ch); return; }
  ch.pose = TASK_POSE[t.type] || 'idle';
  if (t.type === 'cook' || t.type === 'cocoa' || t.type === 'melt') { const o = objById(G.home, t.obj); if (o) o.lit = true; }
  if (t.type === 'nap') {
    const o = objById(G.home, t.obj);
    ch.st.energy = Math.min(100, ch.st.energy + dt / HOUR_SEC * (o && o.kind === 'bed' ? 13 : 10));
    if (ch.st.energy >= 98) { floatFx('fx.sparkle', ch.x, floorY(ch.row) - 40); nextTask(ch); }
    return;
  }
  t.prog += dt * workMult(ch, t);
  if (t.prog >= t.dur) {
    const again = finishTask(ch, t);
    if (again) t.prog = 0; else nextTask(ch);
  }
}

function finishTask(ch, t) {
  const s = G.home, y0 = floorY(ch.row) - 70;
  switch (t.type) {
    case 'clear': {
      const room = s.rooms[t.r][t.c];
      room.rubble = Math.max(0, room.rubble - 1);
      const r = rand();
      gain(r < .5 ? 'wood' : r < .84 ? 'parts' : r < .94 ? 'cloth' : 'food', 1, ch.x + ch.face * 30, y0);
      sfx('dig'); dust(ch.x + ch.face * 40, floorY(ch.row) - 20);
      if (room.rubble <= 0) {
        bumpSite(s); updateReveal(s); G.stats.cleared++;
        toast('Yeni bir oda açıldı!', 'icon.star'); sfx('fanfare'); invalidateRooms();
        return false;
      }
      if (ch.st.energy < 6) { toast(`${ch.name} çok yorgun, dinlenmeli`, 'icon.energy'); return false; }
      return true;
    }
    case 'craft': completeRecipe(ch, RECIPES.find(r => r.id === t.recipe)); return false;
    case 'cook': {
      const o = objById(s, t.obj); if (o) o.lit = false;
      let n = 1; if (ch.trait === 'cook' && rand() < .35) n = 2;
      gain('meal', n, ch.x, y0); if (n === 2) toast('Ece bir porsiyon fazla çıkardı!', 'icon.meal');
      sfx('cook'); return false;
    }
    case 'melt': { const o = objById(s, t.obj); if (o) o.lit = false; gain('water', 2, ch.x, y0); sfx('water'); return false; }
    case 'cocoa': {
      const o = objById(s, t.obj); if (o) o.lit = false;
      for (const c of homeChars()) { c.st.mood = Math.min(100, c.st.mood + 18); floatFx('fx.heart', c.x, floorY(c.row) - 72); }
      toast('Sıcak kakao! Herkesin morali yükseldi', 'icon.cocoa'); sfx('happy'); return false;
    }
    case 'collect': { const o = objById(s, t.obj); const n = Math.floor(o.fill); o.fill -= n; gain('water', n, o.x, floorY(o.row) - 90); sfx('water'); return false; }
    case 'plant': { const o = objById(s, t.obj); o.planted = true; o.growth = 0; sfx('pick'); toast('Tohumlar ekildi. Sulamak hızlandırır.', 'icon.seeds'); return false; }
    case 'water_garden': { const o = objById(s, t.obj); o.growth = Math.min(1, o.growth + .25); sfx('water'); return false; }
    case 'harvest': { const o = objById(s, t.obj); o.planted = false; o.growth = 0; gain('food', 4, o.x, floorY(o.row) - 50); sfx('fanfare'); return false; }
    case 'search': {
      const o = objById(s, t.obj); o.searched = true; o.open = true;
      let i = 0; for (const k in o.loot) { gain(k, o.loot[k], o.x + (i - 1) * 18, floorY(o.row) - 60 - i * 6); i++; }
      if (!i) toast('Boş çıktı', 'icon.search');
      o.loot = {}; sfx('loot'); return false;
    }
    case 'relax': {
      const o = objById(s, t.obj);
      if (o.kind === 'guitar') { for (const c of homeChars()) { c.st.mood = Math.min(100, c.st.mood + 8); floatFx('fx.note', c.x, floorY(c.row) - 72); } ch.st.mood = Math.min(100, ch.st.mood + 6); sfx('music'); }
      else {
        const v = o.kind === 'armchair' ? 15 : o.kind === 'bookshelf' ? 12 : 10;
        ch.st.mood = Math.min(100, ch.st.mood + v); ch.st.energy = Math.min(100, ch.st.energy + 4); floatFx('fx.heart', ch.x, y0);
        if (o.kind === 'radio') { sfx('music'); radioTip(); } else sfx('happy');
      }
      return false;
    }
    case 'pet': ch.st.mood = Math.min(100, ch.st.mood + 9); floatFx('fx.heart', ch.x + 16, y0); sfx('purr'); return false;
    case 'warm': ch.st.mood = Math.min(100, ch.st.mood + 5); floatFx('fx.heart', ch.x, y0); return false;
    case 'eat': {
      if (G.inv.meal > 0) { G.inv.meal--; ch.st.hunger = Math.min(100, ch.st.hunger + 50); ch.st.mood = Math.min(100, ch.st.mood + 3); floatIcon('icon.meal', '-1', ch.x, y0); }
      else if (G.inv.food > 0) { G.inv.food--; ch.st.hunger = Math.min(100, ch.st.hunger + 26); ch.st.mood = Math.max(0, ch.st.mood - 2); floatIcon('icon.food', '-1', ch.x, y0); }
      else { toast('Yiyecek kalmadı!', 'icon.hunger'); return false; }
      hudDirty(); sfx('eat'); return false;
    }
    case 'meds': {
      if (G.inv.meds <= 0) return false;
      G.inv.meds--; ch.sick = false; ch.st.health = Math.min(100, ch.st.health + 30); floatFx('fx.sparkle', ch.x, y0); toast(`${ch.name} iyileşti`, 'icon.meds'); hudDirty(); sfx('happy'); return false;
    }
  }
  return false;
}

function completeRecipe(ch, r) {
  G.stats.crafted++;
  if (r.station) {
    const wb = G.home.objs.find(o => o.kind === 'workbench');
    const spot = findSlot(G.home, r.w, wb ? { row: wb.row, x: wb.x } : charPos(ch));
    if (!spot) { refund(r.cost); toast('Yer kalmadı! Bir odayı temizle, malzeme iade edildi.', 'icon.cross'); return; }
    const o = addStation(G.home, r.id, spot.row, spot.x);
    o.isNew = 3; dust(spot.x, floorY(spot.row) - 20); floatFx('fx.sparkle', spot.x, floorY(spot.row) - 60);
    toast(`${r.name} kuruldu!`, r.icon);
  } else if (r.tool) { G.tools[r.tool] = true; toast(`${r.name} hazır!`, r.icon); }
  else if (r.door) { G.door = r.door; toast(r.door === 2 ? 'Kapı artık çelik!' : 'Kapı güçlendirildi', 'icon.door'); }
  else if (r.upgrade) { G.wb = 2; const wb = G.home.objs.find(o => o.kind === 'workbench'); if (wb) wb.level = 2; toast('Atölye 2 hazır: yeni tarifler!', 'icon.workbench'); }
  sfx('build'); vibrate(25); save();
}

function recipeState(r) {
  if (r.lv > G.wb) return { ok: false, why: 'Atölye 2 gerekli', lock: true };
  if (r.tool && G.tools[r.tool]) return { ok: false, why: 'Zaten var', own: true };
  if (r.upgrade && G.wb >= 2) return { ok: false, why: 'Yapıldı', own: true };
  if (r.door && G.door >= r.door) return { ok: false, why: 'Yapıldı', own: true };
  if (r.door === 2 && G.door < 1) return { ok: false, why: 'Önce güçlendir', lock: true };
  if (r.max && stations(r.id).length >= r.max) return { ok: false, why: r.max === 1 ? 'Zaten var' : 'Yeterli', own: true };
  if (r.station && !findSlot(G.home, r.w, { row: 2, x: ROOM_W * 1.5 })) return { ok: false, why: 'Yer yok: oda temizle' };
  if (inQueue(r.id)) return { ok: false, why: 'Yapılıyor' };
  if (!canPay(r.cost)) return { ok: false, why: 'Malzeme eksik' };
  return { ok: true };
}
function inQueue(rid) {
  const r = RECIPES.find(x => x.id === rid);
  if (r.station) return r.max ? stations(r.id).length + G.chars.reduce((n, c) => n + (c.task && c.task.recipe === rid ? 1 : 0) + c.queue.filter(t => t.recipe === rid).length, 0) >= r.max : false;
  return G.chars.some(c => (c.task && c.task.recipe === rid) || c.queue.some(t => t.recipe === rid));
}
function craftRecipe(rid) {
  const r = RECIPES.find(x => x.id === rid), st = recipeState(r);
  if (!st.ok) { toast(st.why, 'icon.cross'); sfx('deny'); return false; }
  const wb = G.home.objs.find(o => o.kind === 'workbench');
  const ch = pickWorker({ row: wb.row, x: wb.x });
  if (!ch) { toast('Evde kimse yok', 'icon.cross'); return false; }
  return assign(ch, { type: 'craft', recipe: rid, obj: wb.id, cost: Object.assign({}, r.cost) });
}

/** Selected survivor, else the nearest idle one, else the least busy. */
function pickWorker(near) {
  const sel = G.chars.find(c => c.id === G.sel && !c.away);
  if (sel) return sel;
  const avail = homeChars(); if (!avail.length) return null;
  const score = c => (c.task && c.task.type !== 'wander' ? 1000 + c.queue.length * 1000 : 0) + (c.row !== near.row ? 300 : 0) + Math.abs(c.x - near.x);
  return avail.slice().sort((a, b) => score(a) - score(b))[0];
}

// ----- stats & time -----
function applyStats(dh) {
  const cheer = homeChars().some(c => c.trait === 'cheer');
  for (const ch of homeChars()) {
    const s = ch.st, t = ch.task;
    const napping = t && t.type === 'nap' && !ch.path;
    const working = t && !ch.path && ['clear', 'craft', 'cook', 'cocoa', 'melt', 'search', 'harvest', 'plant', 'collect'].includes(t.type);
    s.hunger -= 2.2 * dh;
    if (!napping) s.energy -= (working ? 3.2 : ch.path ? 2 : 1) * dh;
    let md = cheer ? -.6 : -1.1;
    if (s.hunger < 20) md -= 1.2; if (s.energy < 15) md -= 1; if (ch.sick) md -= .8;
    s.mood += md * dh;
    if (s.hunger <= 0) s.health -= 3 * dh; else if (ch.sick) s.health -= 1.5 * dh; else if (s.hunger > 40) s.health += .8 * dh;
    for (const k in s) s[k] = clamp(s[k], 0, 100);
    if (s.health <= 0) G.pendingLoss = true;
  }
}
function updateStations(dh) {
  for (const o of G.home.objs) {
    if (o.t !== 'station') continue;
    if (o.kind === 'water') o.fill = Math.min(4, o.fill + dh * .16);
    if (o.kind === 'garden' && o.planted) o.growth = Math.min(1, o.growth + dh / 30);
    if (o.kind === 'heater') o.lit = G.clock >= 17 && G.inv.wood > 0;
    if (o.isNew) o.isNew = Math.max(0, o.isNew - dh * 4);
  }
}
function simDay(dt) {
  const dh = dt / HOUR_SEC;
  G.clock += dh;
  applyStats(dh); updateStations(dh);
  for (const ch of G.chars) updateChar(ch, dt);
  for (const p of G.pets) updatePet(p, dt);
  if (G.pendingLoss) { G.pendingLoss = false; checkLosses(true); }
  if (G.clock >= NIGHT_AT) { G.clock = NIGHT_AT; startNight(); }
}
function updatePet(p, dt) {
  p.t -= dt;
  if (p.goal != null) {
    const dx = p.goal - p.x, sp = (p.kind === 'dog' ? 55 : 38) * dt;
    if (Math.abs(dx) <= sp) { p.x = p.goal; p.goal = null; p.pose = 'sit'; p.t = 3 + rand() * 4; }
    else { p.x += Math.sign(dx) * sp; p.face = Math.sign(dx); p.pose = 'walk'; }
    return;
  }
  if (p.t > 0) return;
  if (p.pose === 'sleep' || p.pose === 'sit' && rand() < .5) {
    const g = graph(G.home), i = segIndex(g, p.row, p.x);
    if (i >= 0) { const sg = g.rows[p.row][i]; p.goal = clamp(p.x + (rand() - .5) * 220, sg[0] + 16, sg[1] - 16); }
    p.t = 1;
  } else { p.pose = 'sleep'; p.t = 8 + rand() * 10; }
}

function checkLosses(daytime) {
  const lines = [];
  for (const ch of G.chars.slice()) {
    if (ch.st.health > 0) continue;
    cancelTasks(ch);
    G.chars.splice(G.chars.indexOf(ch), 1); G.lost.push(ch.name);
    if (G.sel === ch.id) G.sel = null;
    lines.push({ ic: 'icon.health', bad: true, txt: `${ch.name} çok hastalandı. Kurtarma kızağı onu hastaneye götürdü. Geçmiş olsun!` });
  }
  if (daytime && lines.length) { for (const l of lines) toast(l.txt, l.ic); rebuildCards(); }
  if (daytime && !G.chars.length) setTimeout(() => endGame(false), 400);
  return lines;
}

// ----- night -----
function startNight() {
  G.phase = 'plan';
  for (const ch of G.chars) { cancelTasks(ch); if (ch.away) ch.away = false; }
  G.plan = { roles: Object.fromEntries(G.chars.map(c => [c.id, 'sleep'])), loc: null, mode: 'play' };
  closeBubble(); closeCraft();
  sfx('night'); save();
  openNightPlan();
}

function beginNight() {
  const p = G.plan;
  const scavId = Object.keys(p.roles).find(id => p.roles[id] === 'scav');
  if (scavId && p.loc) {
    const ch = G.chars.find(c => c.id === scavId);
    if (p.mode === 'play') { startScav(p.loc, ch); return; }
    resolveNight(quickScav(p.loc, ch));
  } else resolveNight(null);
}

function resolveNight(scav) {
  const lines = [], inv = G.inv, plan = G.plan || { roles: {} };
  closeModal();
  if (scav) {
    const loc = LOCS.find(l => l.id === scav.loc);
    const got = Object.entries(scav.got).filter(([, v]) => v > 0);
    for (const [k, v] of got) inv[k] += v;
    lines.push({ ic: 'icon.backpack', good: got.length > 0, txt: got.length ? `${scav.name} ${loc.name} keşfinden döndü: ${got.map(([k, v]) => `+${v} ${ITEMS[k].name}`).join(', ')}` : `${scav.name} ${loc.name}'dan eli boş döndü.` });
    if (scav.stolen && scav.stolen.length) lines.push({ ic: 'icon.raccoon', bad: true, txt: `Bir rakun ${scav.name}'in çantasından ${scav.stolen.map(k => ITEMS[k].name.toLowerCase()).join(', ')} kaptı!` });
    G.stats.scavs++;
  }
  // heating
  const heater = hasStation('heater'), need = G.flags.storm ? 2 : 1;
  let warm = false;
  if (heater) {
    if (inv.wood >= need) { inv.wood -= need; warm = true; lines.push({ ic: 'icon.heater', good: true, txt: `Soba gece boyunca yandı (−${need} odun).` }); }
    else lines.push({ ic: 'icon.cold', bad: true, txt: 'Sobaya atacak odun kalmadı, gece soğuktu.' });
  }
  const coldK = warm ? 0 : (G.day >= 3 ? 1 : .45) * (G.flags.storm ? 1.6 : 1);
  if (!heater && G.day >= 3) lines.push({ ic: 'icon.cold', bad: true, txt: 'Ev çok soğuk. Bir Soba herkesi korur.' });
  // water
  let thirsty = 0;
  for (const ch of G.chars) { if (inv.water > 0) inv.water--; else { thirsty++; ch.st.mood -= 6; ch.st.health -= 4; } }
  if (thirsty) lines.push({ ic: 'icon.water', bad: true, txt: `${thirsty} kişi susuz kaldı. Su Toplayıcı kur ve suyu biriktir.` });
  else lines.push({ ic: 'icon.water', txt: `Herkes su içti (−${G.chars.length} su).` });
  // sleep
  const beds = [...stations('bed').map(() => 'bed'), ...stations('floorbed').map(() => 'floorbed')];
  const sleepers = G.chars.filter(c => plan.roles[c.id] !== 'scav' && plan.roles[c.id] !== 'guard').sort((a, b) => a.st.energy - b.st.energy);
  let noBed = 0;
  for (const ch of G.chars) {
    const role = plan.roles[ch.id] || 'sleep', s = ch.st;
    s.hunger -= role === 'scav' ? 18 : 12;
    if (role === 'sleep') {
      const b = beds[sleepers.indexOf(ch)];
      s.energy += b === 'bed' ? 75 : b === 'floorbed' ? 58 : 40; s.mood += b === 'bed' ? 3 : b ? 0 : -6; if (!b) noBed++;
    } else if (role === 'guard') { s.energy -= 10; s.mood -= 2; }
    else s.energy -= 25;
    s.mood -= 10 * coldK; s.health -= 6 * coldK;
    const pSick = .16 * coldK + (s.hunger < 20 ? .15 : 0) + (s.energy < 10 ? .1 : 0);
    if (!ch.sick && rand() < pSick) { ch.sick = true; lines.push({ ic: 'icon.sick', bad: true, txt: `${ch.name} üşüttü. İlaç onu iyileştirir.` }); }
    if (ch.sick) s.health -= 6;
  }
  if (noBed) lines.push({ ic: 'icon.bed', bad: true, txt: `${noBed} kişi yerde uyudu. Yatak yapmak uykuyu iyileştirir.` });
  // raccoon raid
  const truce = G.flags.truceUntil && G.day < G.flags.truceUntil;
  const pRaid = truce ? 0 : (G.day < 2 ? 0 : Math.min(.6, .2 + .05 * G.day)) * [1, .55, .22][G.door];
  if (rand() < pRaid) {
    const guard = G.chars.find(c => plan.roles[c.id] === 'guard');
    if (guard && rand() < .85) { guard.st.mood += 6; lines.push({ ic: 'icon.guard', good: true, txt: `Nöbetçi ${guard.name} kapıyı zorlayan rakunları kovaladı!` }); }
    else {
      const stolen = {}, keys = ['food', 'meal', 'wood', 'parts', 'cloth', 'water'];
      let n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < 20 && n > 0; i++) { const k = pick(keys); if (inv[k] > 0) { inv[k]--; stolen[k] = (stolen[k] || 0) + 1; n--; } }
      const list = Object.entries(stolen);
      if (list.length) { G.flags.raided = true; G.stats.raids++; lines.push({ ic: 'icon.raccoon', bad: true, txt: `Gece rakunlar girdi: ${list.map(([k, v]) => `−${v} ${ITEMS[k].name}`).join(', ')}. Nöbetçi koy ya da kapıyı güçlendir.` }); }
    }
  } else if (truce) lines.push({ ic: 'icon.raccoon', good: true, txt: 'Rakunlar sözlerini tuttu, gece sessizdi.' });
  // pets, stations
  if (G.flags.dog) { for (const ch of G.chars) ch.st.mood += 3; if (G.day % 2 === 0 && inv.food > 0) { inv.food--; lines.push({ ic: 'icon.paw', txt: 'Fındık bir erzak yedi ve herkese sokuldu.' }); } }
  for (const o of G.home.objs) {
    if (o.kind === 'garden' && o.planted) o.growth = Math.min(1, o.growth + .3);
    if (o.kind === 'water') o.fill = Math.min(4, o.fill + 2);
    if (o.kind === 'heater') o.lit = false;
  }
  for (const ch of G.chars) for (const k in ch.st) ch.st[k] = clamp(ch.st[k], 0, 100);
  lines.push(...checkLosses(false));
  G.flags.storm = false;
  G.day++; G.clock = DAY_START; G.phase = 'day'; G.plan = null;
  refillPools();
  for (const ch of G.chars) { ch.away = false; ch.pose = 'idle'; ch.path = null; ch.task = null; ch.queue = []; }
  placeAtHome();
  rebuildCards(); hudDirty();
  if (!G.chars.length) { endGame(false); return; }
  if (G.day >= WIN_DAY) { save(); showMorning(lines, null, true); return; }
  const ev = pickEvent();
  save();
  showMorning(lines, ev, false);
}
function placeAtHome() {
  // after a night everyone wakes up somewhere reachable on the ground/first floor
  const spots = [];
  const beds = G.home.objs.filter(o => o.kind === 'bed' || o.kind === 'floorbed');
  for (const b of beds) spots.push({ row: b.row, x: b.x + 30 });
  const g = graph(G.home);
  for (const ch of G.chars) {
    const sp = spots.shift();
    if (sp && segIndex(g, sp.row, sp.x) >= 0) { ch.row = sp.row; ch.x = sp.x; }
    else if (segIndex(g, ch.row, ch.x) < 0) { ch.row = 2; ch.x = 60 + rand() * 300; }
    ch.x += (rand() - .5) * 30;
    const i = segIndex(g, ch.row, ch.x); if (i < 0) { ch.row = 2; ch.x = 150; }
  }
}

// ----- events -----
function eventEligible(e) {
  const key = e.days ? e.id + G.day : e.id;
  if (G.done[key]) return false;
  if (e.day && e.day !== G.day) return false;
  if (e.days && !e.days.includes(G.day)) return false;
  if (e.minDay && G.day < e.minDay) return false;
  if (e.maxDay && G.day > e.maxDay) return false;
  if (e.after && !(G.flags[e.after] && G.day >= (G.flags[e.after + 'Day'] || 0) + (e.delay || 0))) return false;
  if (e.needFlag && !G.flags[e.needFlag]) return false;
  if (e.needStation && !hasStation(e.needStation)) return false;
  if (e.who && !G.chars.some(c => c.id === e.who)) return false;
  if (e.id === 'deniz' && G.chars.some(c => c.id === 'deniz')) return false;
  return true;
}
function pickEvent() {
  const fixed = EVENTS.filter(e => (e.day || e.days || e.after) && eventEligible(e));
  if (fixed.length) return fixed[0];
  const loose = EVENTS.filter(e => !(e.day || e.days || e.after) && eventEligible(e));
  if (loose.length && rand() < .6) return pick(loose);
  return null;
}
function applyChoice(e, ch) {
  G.done[e.days ? e.id + G.day : e.id] = true; G.stats.events++;
  if (ch.need && !canPay(ch.need)) return;
  for (const f of ch.fx || []) {
    if (ITEMS[f.k]) { G.inv[f.k] = Math.max(0, G.inv[f.k] + f.v); }
    else for (const c of G.chars) c.st[f.k] = clamp(c.st[f.k] + f.v, 0, 100);
  }
  if (ch.flag) { if (ch.flag === 'truce') G.flags.truceUntil = G.day + 3; else { G.flags[ch.flag] = true; G.flags[ch.flag + 'Day'] = G.day; } }
  if (ch.flag === 'dog' && !G.pets.some(p => p.kind === 'dog')) G.pets.push({ kind: 'dog', name: 'Fındık', row: 2, x: 140, face: 1, pose: 'idle', t: 2, goal: null });
  if (ch.recruit && !G.chars.some(c => c.id === ch.recruit)) { const c = mkChar(ch.recruit, G.home.door.row, G.home.door.x + 20); c.st = { hunger: 55, energy: 60, mood: 70, health: 90 }; G.chars.push(c); rebuildCards(); }
  hudDirty(); save();
}

function radioTip() {
  const tips = ['Hırdavatçıda bol parça var ama rakunlar orada.', 'Eczane ilaç için tek adres.', 'Kakao herkesin moralini yükseltir.', 'Soba geceleri odun yakar: odun biriktir!', 'Nöbetçi rakun baskınlarını çoğunlukla durdurur.', 'Park güvenli; odun ve tohum bulunur.'];
  toast('Radyo: ' + pick(tips), 'icon.radio');
}
