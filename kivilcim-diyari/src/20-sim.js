// ===== 20-sim: player, actions, building, farming, crafting, stats, night, quests =====
let G = null, target = null;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = () => Math.random();
const randi = (a, b) => a + Math.floor(rand() * (b - a + 1));

function newGame(charId) {
  G = {
    v: 1, seed: (rand() * 1e9) | 0, char: charId || 'ece', day: 1, t: .1, wt: 2.4, weather: 'clear', mods: {}, nid: 1,
    p: { x: T / 2, y: T * 1.5, fx: 0, fy: 1, flip: false, hp: 100, food: 90, warm: 100, pose: 'idle', anim: 0, swing: 0, cd: 0, hurt: 0, fish: null, rest: 0 },
    inv: { wood: 0, stone: 0, fiber: 0, berry: 3 }, hot: [null, null, null, null, null, null, null, null], sel: -1, canWater: 0,
    home: { x: T / 2, y: T * 1.5 }, stat: { got: {}, placed: {}, tilled: 0, planted: 0, harvested: 0, cooked: 0, kills: 0, slept: 0, far: 0, crates: 0 },
    q: 0, radioParts: 0, radioFixed: false, trader: null, cat: { x: -T, y: T * 2, pose: 'sit', t: 0, flip: false },
    mobs: [], sleep: null, over: null, saveT: 0, spawnT: 4,
  };
  return G;
}

// ----- inventory -----
function have(k) { return G.inv[k] || 0; }
function give(k, n, x, y, quiet) {
  if (!n) return;
  G.inv[k] = Math.max(0, have(k) + n);
  if (n > 0) { G.stat.got[k] = (G.stat.got[k] || 0) + n; autoHot(k); }
  if (x != null && !quiet) floatIcon(ITEMS[k].ic || 'icon.star', (n > 0 ? '+' : '') + n, x, y);
  hudDirty(k);
}
function canPay(cost) { for (const k in cost) if (have(k) < cost[k]) return false; return true; }
function pay(cost) { for (const k in cost) G.inv[k] -= cost[k]; hudDirty(); }
function costText(c) { return Object.entries(c).map(([k, v]) => `${v} ${ITEMS[k].n}`).join(', '); }
/** Tools, seeds, placeables and good food go to the hotbar automatically. */
function autoHot(k) {
  const it = ITEMS[k]; if (!it) return;
  if (!(it.tool || it.seed || it.place || it.use || it.heal)) return;
  if (G.hot.includes(k)) return;
  let i = G.hot.indexOf(null); if (i < 0) i = G.hot.findIndex(h => !have(h));
  if (i >= 0) G.hot[i] = k;
}
function held() { const k = G.sel >= 0 ? G.hot[G.sel] : null; return k && have(k) > 0 ? k : null; }
function selectHot(i) { G.sel = G.sel === i ? -1 : i; sfx('tap'); hudDirty(); tapTip(); }
function tapTip() { if (!G.tipTap && usesTile(held())) { G.tipTap = 1; setTimeout(() => toast('İpucu: ekranda yakındaki bir kareye dokun ve sürükle, sıra sıra yerleşir!', 'icon.hand'), 900); } }
/** Picking from the bag always works: a full hotbar swaps the item into the current (or last) slot. */
function selectItem(k) { autoHot(k); let i = G.hot.indexOf(k); if (i < 0) { i = G.sel >= 0 ? G.sel : G.hot.length - 1; G.hot[i] = k; } G.sel = i; hudDirty(); tapTip(); }

// ----- time -----
function darkness(t) { if (t < .04) return .78 * (1 - t / .04); if (t < .52) return 0; if (t < .64) return .78 * (t - .52) / .12; return .78; }
function isNight() { return G.t >= NIGHT_AT || G.t < .03; }
function clockText() { const h = (6 + G.t * 24) % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10; return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }

// ----- lights & heat around a point -----
let LIGHTS = [];
function collectLights() {
  const p = G.p, out = [];
  for (const o of objsIn(p.x - 900, p.y - 700, p.x + 900, p.y + 800)) {
    if (o.k === 'thing') {
      if ((o.thing === 'fire' || o.thing === 'torch') && o.until > G.wt) out.push({ x: o.x, y: o.y - (o.thing === 'torch' ? 52 : 14), r: o.thing === 'fire' ? 150 : 115, heat: o.thing === 'fire', o });
      else if (o.item === 'lamp') out.push({ x: o.x, y: o.y - 70, r: 120, o });
      else if (o.item === 'heater') out.push({ x: o.x, y: o.y - 40, r: 110, heat: true, o });
      else if (o.item === 'stove') out.push({ x: o.x, y: o.y - 30, r: 60, heat: true, o });
    } else if (o.k === 'window') out.push({ x: o.x, y: o.y - 30, r: 70, win: true, o });
  }
  LIGHTS = out;
}
function lightAt(x, y, k) { for (const l of LIGHTS) if (!l.win && Math.hypot(l.x - x, l.y - y) < l.r * (k || 1)) return l; return null; }
function heatAt(x, y) { for (const l of LIGHTS) if (l.heat && Math.hypot(l.x - x, l.y - y) < l.r * .85) return l; return null; }
/** Player is "home" when standing on a floor that is closed off by walls in four directions. */
function indoors(x, y) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  if (tileAt(tx, ty) !== TL.FLOOR) return false;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of dirs) {
    let hit = false;
    for (let k = 1; k <= 7; k++) { const o = objAtTile(tx + dx * k, ty + dy * k); if (o && BLOCKS[o.k] && o.k !== 'fence') { hit = true; break; } }
    if (!hit) return false;
  }
  return true;
}

// ----- target & actions -----
function frontPoint() { const p = G.p; return [p.x + p.fx * 34, p.y - 6 + p.fy * 30]; }
function frontTile() { const [x, y] = frontPoint(); return [Math.floor(x / T), Math.floor(y / T)]; }
const REMOVABLE = { grass: 1, flowers: 1, mush: 1 };
const INTERACT = { tree: 1, stump: 1, rock: 1, bush: 1, grass: 1, reeds: 1, mush: 1, log: 1, crate: 1, crop: 1, radio: 1, thing: 1 };

function placeFree(tx, ty, w, solid) {
  const p = G.p, ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
  for (let k = 0; k < w; k++) {
    const t = tileAt(tx + k, ty);
    if (WATERY(t)) return false;
    const o = objAtTile(tx + k, ty);
    if (o && !REMOVABLE[o.k] && !(o.k === 'grass' && o.cut)) return false;
    if (solid && tx + k === ptx && ty === pty) return false;
  }
  return true;
}
function clearSoft(tx, ty, w) { for (let k = 0; k < (w || 1); k++) { const o = objAtTile(tx + k, ty); if (o && REMOVABLE[o.k]) removeObj(o); } }
// ready-made hut: HUT_W × HUT_H with the door in the middle of the bottom wall at (dx, dy)
const HUT_W = 7, HUT_H = 5, HUT_HW = 3;
const HUT_CLEAR = { grass: 1, flowers: 1, mush: 1, bush: 1, reeds: 1, stump: 1, log: 1 };
function hutBlocked(dx, dy) {
  const p = G.p, ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T), bad = [];
  for (let j = dy - HUT_H + 1; j <= dy; j++) for (let i = dx - HUT_HW; i <= dx + HUT_HW; i++) {
    const o = objAtTile(i, j);
    if ((i === ptx && j === pty) || WATERY(tileAt(i, j)) || o && !HUT_CLEAR[o.k]) bad.push([i, j]);
  }
  return bad;
}
// tile picked by tapping the world (touch building / farming); null = use the tile in front
let aim = null;
const TILE_TOOLS = { hoe: 1, can: 1, rod: 1, hammer: 1, fert: 1 };
function usesTile(h) { const it = h && ITEMS[h]; return !!it && (!!it.place || !!it.seed || !!TILE_TOOLS[h]); }
function aimTile() { return aim && usesTile(held()) ? [aim.tx, aim.ty] : null; }
const AIM_REACH = T * 3.6;
function hutSpot() {
  const p = G.p, [fx, fy] = frontTile(), ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
  const doors = [[fx, fy], [ptx, pty - 1], [ptx, pty + HUT_H], [ptx + HUT_HW + 1, pty], [ptx - HUT_HW - 1, pty]];
  for (const [dx, dy] of doors) if (!hutBlocked(dx, dy).length) return [dx, dy];
  return null;
}

/** What the action button would do right now. */
function findTarget() {
  const p = G.p, [fx, fy] = frontPoint(), at = aimTile(), [tx, ty] = at || frontTile(), h = held(), it = h ? ITEMS[h] : null;
  // 1) shadow critters in reach
  const reach = have('spear') ? 66 : 52;
  let best = null, bd = 1e9;
  for (const m of G.mobs) { if (m.dying) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < reach && d < bd) { bd = d; best = { kind: 'mob', m, label: 'Kovala', ic: have('spear') ? 'icon.spear' : 'icon.hand' }; } }
  if (best) return best;
  if (G.trader && Math.hypot(G.trader.x - p.x, G.trader.y - p.y) < 64 && !at) return { kind: 'trader', label: 'Takas', ic: 'icon.trade' };
  if (at && Math.hypot((tx + .5) * T - p.x, (ty + .5) * T - p.y) > AIM_REACH) return { kind: 'nope', why: 'Çok uzak, biraz yaklaş.', label: 'Çok uzak', ic: 'icon.cross', far: true };
  // 2) tile action with the held item (placing, farming, fishing, dismantling)
  if (it) {
    const t = tileAt(tx, ty), occ = objAtTile(tx, ty);
    if (it.place) {
      if (it.place === 'hut') { const s = at ? (hutBlocked(tx, ty).length ? null : [tx, ty]) : hutSpot(); if (s) return { kind: 'tile', act: 'hut', tx: s[0], ty: s[1], label: 'Kulübe kur', ic: 'icon.home' }; }
      else if (it.place === 'floor') { if (!WATERY(t) && t !== TL.FLOOR && (!occ || REMOVABLE[occ.k] || occ.k === 'thing')) return { kind: 'tile', act: 'floor', tx, ty, label: 'Zemin döşe', ic: 'icon.build' }; }
      else { const w = it.fw || 1, solid = it.place !== 'thing' || !it.flat; if (placeFree(tx, ty, w, solid)) return { kind: 'tile', act: 'place', tx, ty, label: 'Yerleştir', ic: it.ic || 'icon.build' }; }
    } else if (h === 'hoe') {
      if ((t === TL.GRASS || t === TL.FOREST || t === TL.MEADOW) && (!occ || REMOVABLE[occ.k])) return { kind: 'tile', act: 'till', tx, ty, label: 'Çapala', ic: 'icon.hoe' };
    } else if (it.seed) {
      if ((t === TL.SOIL || t === TL.WSOIL) && !occ) return { kind: 'tile', act: 'plant', tx, ty, label: 'Ek', ic: it.ic };
    } else if (h === 'can') {
      if (WATERY(t)) return { kind: 'tile', act: 'fill', tx, ty, label: 'Doldur', ic: 'icon.water' };
      if ((t === TL.SOIL || occ && occ.k === 'crop') && G.canWater > 0 && t !== TL.WSOIL) return { kind: 'tile', act: 'water', tx, ty, label: `Sula (${G.canWater})`, ic: 'icon.can' };
    } else if (h === 'rod') {
      if (WATERY(t)) return { kind: 'tile', act: 'fish', tx, ty, label: 'Balık tut', ic: 'icon.rod' };
    } else if (h === 'hammer') {
      if (occ && (BLOCKS[occ.k] || occ.k === 'thing' || occ.k === 'crop')) return { kind: 'tile', act: 'dismantle', o: occ, tx, ty, label: 'Sök', ic: 'icon.hammer' };
      if (t === TL.FLOOR && !occ) return { kind: 'tile', act: 'unfloor', tx, ty, label: 'Zemini sök', ic: 'icon.hammer' };
    } else if (h === 'fert') {
      if (occ && occ.k === 'crop' && occ.g < 1) return { kind: 'tile', act: 'fert', o: occ, label: 'Gübrele', ic: 'icon.seeds' };
    }
  }
  // 3) objects in front (or the tapped one)
  if (at) { const o = objAtTile(tx, ty); if (o && INTERACT[o.k] && !(o.k === 'bush' && o.berries <= 0 || o.k === 'grass' && o.cut || o.k === 'crate' && o.open || o.k === 'crop' && o.g < 1)) return Object.assign({ kind: 'obj', o }, objLabel(o)); }
  else for (const o of objsIn(fx - 80, fy - 70, fx + 80, fy + 110)) {
    if (!INTERACT[o.k]) continue;
    if (o.k === 'bush' && o.berries <= 0 || o.k === 'grass' && o.cut || o.k === 'crate' && o.open) continue;
    if (o.k === 'crop' && o.g < 1) continue;
    if (o.k === 'thing' && !(o.thing === 'fire' || o.thing === 'torch' || FURN_USE[o.item] || o.thing === 'tent')) continue;
    const d = edgeDist(o, fx, fy);
    if (d < 30 && d < bd) { bd = d; best = { kind: 'obj', o }; }
  }
  if (best) { Object.assign(best, objLabel(best.o)); return best; }
  // 4) friends
  if (G.trader && Math.hypot(G.trader.x - p.x, G.trader.y - p.y) < 80) return { kind: 'trader', label: 'Takas', ic: 'icon.trade' };
  if (Math.hypot(G.cat.x - p.x, G.cat.y - p.y) < 46) return { kind: 'cat', label: 'Sev', ic: 'icon.paw' };
  // 5) holding something that can't be used here: say why
  if (it) {
    const why = it.place === 'hut' ? 'Kulübe için 7×5 açık alan lazım: kırmızı çarpılı kareleri temizle ya da açıklığa git.'
      : it.place ? (at ? 'Bu kare dolu ya da su.' : 'Önündeki kare dolu ya da su. Boş bir kareye dön ya da ekranda boş kareye dokun.')
      : h === 'hoe' ? 'Çapa çimenli boş toprağa vurulur.'
      : it.seed ? 'Tohum çapalanmış tarlaya ekilir (önce Çapa).'
      : h === 'can' ? (G.canWater > 0 ? 'Tarlaya ya da ekine dönerek sula.' : 'Kabı göle ya da Su Fıçısına dönerek doldur.')
      : h === 'rod' ? 'Oltayı atmak için suya dön.' : h === 'hammer' ? 'Sökmek için bir yapıya dön.' : null;
    if (why) return { kind: 'nope', why, label: it.place ? 'Yer yok' : 'Burada olmaz', ic: 'icon.cross' };
  }
  return null;
}
function objLabel(o) {
  switch (o.k) {
    case 'tree': return { label: 'Kes', ic: 'icon.axe' };
    case 'stump': return { label: 'Kök sök', ic: 'icon.axe' };
    case 'rock': return { label: 'Kır', ic: 'icon.pickaxe' };
    case 'log': return { label: 'Kes', ic: 'icon.wood' };
    case 'bush': return { label: 'Topla', ic: 'icon.berry' };
    case 'grass': return { label: 'Yol', ic: 'icon.fiber' };
    case 'reeds': return { label: 'Topla', ic: 'icon.fiber' };
    case 'mush': return { label: 'Topla', ic: 'icon.mush' };
    case 'crate': return { label: 'Aç', ic: 'icon.scrap' };
    case 'crop': return { label: 'Hasat', ic: ITEMS[CROPS[o.kind].yield[0]].ic };
    case 'radio': return { label: have('part') ? 'Parça tak' : 'Telsiz', ic: 'icon.part' };
    case 'thing': {
      if (o.thing === 'fire' || o.thing === 'torch') return { label: o.until > G.wt ? 'Odun at' : 'Yak', ic: 'icon.wood' };
      const u = o.thing === 'tent' ? 'sleep' : FURN_USE[o.item];
      const L = { craft: ['Üret', 'icon.craft'], cook: ['Pişir', 'icon.eat'], sleep: ['Uyu', 'icon.sleep'], warm: ['Isın', 'icon.warm'], fill: ['Kabı doldur', 'icon.water'], rest: ['Dinlen', 'icon.heart'], music: ['Çal', 'icon.star'], read: ['Oku', 'icon.book'] }[u] || ['Bak', 'icon.hand'];
      return { label: L[0], ic: L[1] };
    }
  }
  return { label: 'Vur', ic: 'icon.hand' };
}

let nopeWhy = '', nopeAt = 0;
function doAction() {
  const p = G.p, tg = target;
  p.swing = .26; p.cd = .3;
  if (!tg) { sfx('swing'); return; }
  if (tg.kind === 'mob') { hitMob(tg.m); return; }
  if (tg.kind === 'cat') { floatFx('fx.heart', G.cat.x, G.cat.y - 40); p.hp = Math.min(100, p.hp + 2); sfx('purr'); p.cd = .6; return; }
  if (tg.kind === 'trader') { openTrade(); return; }
  if (tg.kind === 'nope') {
    // holding the button on a full tile shouldn't nag every half second
    p.swing = 0; p.cd = .3; const now = performance.now();
    if (tg.why !== nopeWhy || now - nopeAt > 2600) { toast(tg.why, 'icon.cross'); sfx('deny'); }
    nopeWhy = tg.why; nopeAt = now; return;
  }
  if (tg.kind === 'tile') { tileAction(tg); return; }
  const o = tg.o, mert = G.char === 'mert' ? 2 : 1;
  if (o.x !== p.x) p.flip = o.x < p.x;
  switch (o.k) {
    case 'tree': {
      o.hp -= (have('axe') ? 2 : 1) * mert; o.shake = .3; sfx('chop'); burst(o.x, o.y - 60, 5, ['#62bd6b', '#f49ab8', '#ffad5a', '#4fae84'][o.kind || 0], 'leaf');
      if (o.hp <= 0) { give('wood', 3 + (have('axe') ? 1 : 0), o.x, o.y - 70); if (rand() < .25) give('berry', 1, o.x + 16, o.y - 60); patchObj(o, { k: 'stump', r: 10, hp: 2 }); sfx('fall'); }
      break;
    }
    case 'stump': o.hp -= (have('axe') ? 2 : 1) * mert; o.shake = .25; sfx('chop'); if (o.hp <= 0) { give('wood', 1, o.x, o.y - 30); removeObj(o); } break;
    case 'log': o.hp -= (have('axe') ? 2 : 1) * mert; o.shake = .25; sfx('chop'); if (o.hp <= 0) { give('wood', 3, o.x, o.y - 30); if (rand() < .4) give('mush', 1, o.x + 14, o.y - 26); removeObj(o); } break;
    case 'rock': {
      o.hp -= (have('pick') ? 2 : 1) * mert; o.shake = .25; sfx('rock'); burst(o.x, o.y - 12, 4, '#cfcae3', 'chip');
      if (o.hp <= 0) { give('stone', 3 + (have('pick') ? 1 : 0), o.x, o.y - 30); if (rand() < .15) give('scrap', 1, o.x + 16, o.y - 24); removeObj(o); }
      break;
    }
    case 'bush': patchObj(o, { berries: o.berries - 1, pickAt: G.wt }); o.shake = .2; give('berry', 1, o.x, o.y - 30); if (rand() < .12) give('s_carrot', 1, o.x + 14, o.y - 24); sfx('pick'); p.cd = .22; break;
    case 'grass': patchObj(o, { cut: true, cutAt: G.wt }); give('fiber', randi(1, 2), o.x, o.y - 30); if (rand() < .35) give('s_wheat', 1, o.x + 14, o.y - 24); sfx('pick'); p.cd = .2; break;
    case 'reeds': give('fiber', 2, o.x, o.y - 40); removeObj(o); sfx('pick'); break;
    case 'mush': give('mush', 1, o.x, o.y - 24); removeObj(o); sfx('pick'); break;
    case 'crate': {
      o.hp = (o.hp || 2) - 1; o.shake = .25; sfx('knock');
      if (o.hp <= 0) {
        const r = K.rng(o.loot || 7);
        patchObj(o, { open: true, hp: 0 }); G.stat.crates++;
        give('scrap', 1 + Math.floor(r() * 3), o.x, o.y - 40);
        if (r() < .6) give('cloth', 1 + Math.floor(r() * 2), o.x + 16, o.y - 50);
        if (r() < .5) give(r() < .5 ? 's_carrot' : 's_pumpkin', 2, o.x - 16, o.y - 50);
        if (r() < .3) give('bread', 1, o.x, o.y - 62);
        if (r() < .32) { give('part', 1, o.x, o.y - 74); toast('Telsiz parçası buldun! Kamptaki telsize götür.', 'icon.part'); sfx('fanfare'); }
        else sfx('loot');
      }
      break;
    }
    case 'crop': harvest(o); break;
    case 'radio': useRadio(o); break;
    case 'thing': useThing(o); break;
  }
}
function harvest(o) {
  const c = CROPS[o.kind];
  give(c.yield[0], randi(c.yield[1], c.yield[2]), o.x, o.y - 40);
  give(c.seed[0], randi(c.seed[1], c.seed[2]), o.x + 16, o.y - 30);
  removeObj(o); G.stat.harvested++; sfx('fanfare'); burst(o.x, o.y - 20, 6, '#ffe873', 'star');
}
function tileAction(tg) {
  const p = G.p, h = held(), it = ITEMS[h], x = tg.tx * T + T / 2, y = tg.ty * T + T;
  if (Math.abs(x - p.x) > 10) p.flip = x < p.x;
  switch (tg.act) {
    case 'place': {
      clearSoft(tg.tx, tg.ty, it.fw || 1);
      if (it.place === 'block') addObj({ k: it.kind || 'wall', mat: it.mat, tx: tg.tx, ty: tg.ty });
      else if (it.place === 'fence') addObj({ k: 'fence', tx: tg.tx, ty: tg.ty });
      else {
        const o = addObj({ k: 'thing', thing: it.thing, item: h, tx: tg.tx, ty: tg.ty, fw: it.fw || 1 });
        if (it.thing === 'fire') o.until = G.wt + 6; if (it.thing === 'torch') o.until = G.wt + 30;
        if (h === 'bed' || h === 'tent') { G.home = { x: o.x, y: o.y + 20 }; toast('Ev noktan burası oldu', 'icon.home'); }
        if (it.thing === 'furn') G.stat.placed.furn = (G.stat.placed.furn || 0) + 1;
      }
      G.stat.placed[it.place === 'block' ? 'block' : h] = (G.stat.placed[it.place === 'block' ? 'block' : h] || 0) + 1;
      G.inv[h]--; dust(x, y - 16); sfx('build'); vibrate(12);
      if (!have(h)) { G.sel = -1; }
      p.cd = .18; break;
    }
    case 'floor': clearSoft(tg.tx, tg.ty, 1); setTile(tg.tx, tg.ty, TL.FLOOR); G.inv.floor--; G.stat.placed.floor = (G.stat.placed.floor || 0) + 1; sfx('build'); if (!have('floor')) G.sel = -1; p.cd = .15; break;
    case 'hut': buildHut(tg.tx, tg.ty); break;
    case 'till': clearSoft(tg.tx, tg.ty, 1); setTile(tg.tx, tg.ty, G.weather === 'rain' ? TL.WSOIL : TL.SOIL); G.stat.tilled++; dust(x, y - 10); sfx('dig'); p.cd = .22; break;
    case 'plant': addObj({ k: 'crop', kind: it.seed, tx: tg.tx, ty: tg.ty, g: 0, wet: tileAt(tg.tx, tg.ty) === TL.WSOIL || G.weather === 'rain', lt: G.wt }); G.inv[h]--; G.stat.planted++; sfx('pick'); if (!have(h)) G.sel = -1; p.cd = .15; break;
    case 'fill': G.canWater = 16; toast('Sulama kabı doldu (16)', 'icon.water'); sfx('water'); break;
    case 'water': {
      setTile(tg.tx, tg.ty, TL.WSOIL); const o = objAtTile(tg.tx, tg.ty); if (o && o.k === 'crop') patchObj(o, { wet: true });
      G.canWater--; burst(x, y - 14, 5, '#7ed0ea', 'drop'); sfx('water'); p.cd = .15; break;
    }
    case 'fish': p.fish = { t: 0, dur: 1.4 + rand() * 1.6, x: x, y: y - 18 }; p.flip = x < p.x; sfx('splash'); p.cd = .5; break;
    case 'dismantle': {
      const o = tg.o, back = o.k === 'thing' ? o.item : o.k === 'crop' ? null : o.k === 'door' ? 'door' : o.k === 'window' ? 'window' : o.k === 'fence' ? 'fence' : (o.mat === 'stone' ? 'wall_s' : 'wall');
      removeObj(o); if (back) give(back, 1, o.x, o.y - 50); dust(o.x, o.y - 20); sfx('knock'); p.cd = .2; break;
    }
    case 'unfloor': setTile(tg.tx, tg.ty, TL.GRASS); give('floor', 1, x, y - 30); sfx('knock'); break;
    case 'fert': patchObj(tg.o, { g: Math.min(1, tg.o.g + .34) }); G.inv.fert--; burst(tg.o.x, tg.o.y - 20, 6, '#7fd17a', 'star'); sfx('happy'); if (!have('fert')) G.sel = -1; break;
  }
  hudDirty();
}
function buildHut(dx, dy) {
  G.inv.hut--; if (!have('hut')) G.sel = -1;
  const top = dy - HUT_H + 1, l = dx - HUT_HW, r = dx + HUT_HW;
  let n = 0;
  for (let j = top; j <= dy; j++) for (let i = l; i <= r; i++) {
    const o = objAtTile(i, j); if (o && HUT_CLEAR[o.k]) removeObj(o);
    setTile(i, j, TL.FLOOR);
    if (j !== top && j !== dy && i !== l && i !== r) continue;
    n++;
    if (i === dx && j === dy) addObj({ k: 'door', mat: 'wood', tx: i, ty: j });
    else if (j === top && (i === dx - 2 || i === dx + 2) || j === dy - 2 && (i === l || i === r)) addObj({ k: 'window', mat: 'wood', tx: i, ty: j });
    else addObj({ k: 'wall', mat: 'wood', tx: i, ty: j });
  }
  G.stat.placed.hut = 1; G.stat.placed.block = (G.stat.placed.block || 0) + n;
  dust(dx * T + T / 2, dy * T - 40); sfx('fanfare'); vibrate([20, 30, 20]);
  toast('Kulüben hazır! İçerisi gece sıcak ve güvenli.', 'icon.home');
}
function useThing(o) {
  const p = G.p;
  if (o.thing === 'fire' || o.thing === 'torch') {
    if (!have('wood')) { toast('Odunun yok', 'icon.wood'); sfx('deny'); return; }
    G.inv.wood--; o.until = Math.max(G.wt, o.until || 0) + (o.thing === 'fire' ? 4 : 24); if (o.thing === 'fire') o.until = Math.min(o.until, G.wt + 14);
    burst(o.x, o.y - 20, 8, '#ffb43d', 'spark'); sfx('fire'); hudDirty(); return;
  }
  const u = o.thing === 'tent' ? 'sleep' : FURN_USE[o.item];
  if (u === 'craft') openSheet('tool');
  else if (u === 'cook') openSheet('food');
  else if (u === 'sleep') trySleep(o);
  else if (u === 'fill') { if (!have('can')) { toast('Önce Sulama Kabı yap', 'icon.can'); return; } G.canWater = 16; toast('Sulama kabı doldu', 'icon.water'); sfx('water'); }
  else if (u === 'warm') { p.warm = Math.min(100, p.warm + 15); floatFx('fx.heart', p.x, p.y - 70); sfx('happy'); p.cd = .8; }
  else if (u === 'music') { sfx('music'); G.cat.dance = 4; floatFx('fx.note', o.x, o.y - 70); p.hp = Math.min(100, p.hp + 4); p.cd = 1.2; }
  else if (u === 'read') { toast(pick(BOOK_LINES), 'icon.book'); p.cd = 1; }
  else { if (p.rest > 0) { toast('Biraz önce dinlendin', 'icon.heart'); return; } p.hp = Math.min(100, p.hp + 12); p.rest = 30; floatFx('fx.heart', p.x, p.y - 70); sfx('happy'); p.cd = 1; }
}
const pick = a => a[Math.floor(Math.random() * a.length)];
const BOOK_LINES = ['"Kar tanesi gibi küçük ama inatçı ol." Güzel bir söz.', 'Bir tarif: Balkabağı turtası için ocak şart.', 'Haritalar diyor ki: harabelerde hâlâ telsiz parçaları var.', 'Bir kedi bakımı kitabı. Pamuk onaylar.', 'Çiftçi almanağı: sulanan ekin iki kat hızlı büyür.'];

function trySleep(o) {
  G.home = { x: o.x, y: o.y + 24 };
  if (!(G.t > .5 || G.t < .03)) { toast('Ev noktan kaydedildi. Akşam olunca uyuyabilirsin.', 'icon.home'); return; }
  if (G.mobs.some(m => !m.dying && Math.hypot(m.x - G.p.x, m.y - G.p.y) < 220)) { toast('Yakında gölgecik var, uyuyamazsın!', 'icon.cross'); sfx('deny'); return; }
  G.sleep = { t: 0, done: false };
}
function updateSleep(dt) {
  const s = G.sleep; s.t += dt;
  if (s.t >= 1 && !s.done) {
    s.done = true;
    const p = G.p;
    if (G.t > .5) newDay();
    G.t = .02; G.wt = (G.day - 1) * 24 + G.t * 24;
    p.hp = Math.min(100, p.hp + 30); p.warm = 100; p.food = Math.max(0, p.food - 12);
    G.mobs.length = 0; G.stat.slept++;
    save();
  }
  if (s.t >= 2.2) G.sleep = null;
}

function useRadio(o) {
  if (G.radioFixed) { toast(pick(RADIO_LINES), 'icon.part'); return; }
  const n = have('part');
  if (!n) { toast(`Telsiz bozuk: ${5 - G.radioParts} parça lazım. Harabelerdeki sandıklara bak.`, 'icon.part'); sfx('deny'); return; }
  G.radioParts = Math.min(5, G.radioParts + n); G.inv.part = 0; sfx('build');
  floatIcon('icon.part', `${G.radioParts}/5`, o.x, o.y - 100);
  if (G.radioParts >= 5) { G.radioFixed = true; sfx('fanfare'); vibrate([30, 50, 30, 50, 60]); showStory('Telsiz çalıştı!', 'Cızırtının arasından bir ses: "Kıvılcım Diyarı\'nın öbür ucundan selam! Biz de buradayız. Ocaklarımız yanıyor, tarlalarımız yeşil. Yalnız değilsin." Kamp ateşinin başında Pamuk mırıldanıyor.', 'radio'); }
  else toast(`Telsiz ${G.radioParts}/5`, 'icon.part');
  hudDirty();
}
const RADIO_LINES = ['Radyo: "Bu gece gökyüzü açık, yıldızlara bakın!"', 'Radyo: "Balkabağı turtası tarifimizi paylaşıyoruz: ocak, buğday, meyve..."', 'Radyo: "Gölgecikler ışıktan korkar, meşaleleri unutmayın."', 'Radyo: "Bay Bıyık her dört günde bir uğruyor, takas için hazırlanın."'];

// ----- crafting -----
function nearStation(kind) {
  const p = G.p;
  for (const o of objsIn(p.x - 200, p.y - 200, p.x + 200, p.y + 240)) {
    if (o.k !== 'thing') continue;
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d > 170) continue;
    if (kind === 'bench' && o.item === 'bench') return true;
    if (kind === 'stove' && o.item === 'stove') return true;
    if (kind === 'heat' && (o.item === 'stove' || o.item === 'heater' || o.thing === 'fire' && o.until > G.wt)) return true;
  }
  return false;
}
function recipeState(r) {
  if (ITEMS[r.id].tool && have(r.id)) return { ok: false, why: 'Var', own: true };
  if (r.need && !nearStation(r.need)) return { ok: false, why: NEED_NAME[r.need], need: true };
  if (!canPay(r.cost)) return { ok: false, why: 'Malzeme eksik' };
  return { ok: true };
}
function craft(id) {
  const r = RECIPES.find(x => x.id === id); if (!r) return false;
  const st = recipeState(r);
  if (!st.ok) { toast(st.why, 'icon.cross'); sfx('deny'); return false; }
  pay(r.cost); give(id, r.n || 1, null, null, true);
  if (r.cat === 'food' && r.id !== 'meds') G.stat.cooked++;
  const it = ITEMS[id];
  if (it.place || it.tool || it.seed || it.use) selectItem(id);
  toast(`${it.n}${(r.n || 1) > 1 ? ' ×' + r.n : ''} hazır!`, it.ic || 'icon.build');
  sfx('build'); vibrate(15);
  return true;
}

// ----- eating -----
function foodValue(k) { const it = ITEMS[k]; return it.food ? Math.round(it.food * (G.char === 'ece' ? 1.5 : 1)) : 0; }
function eatBest() {
  const p = G.p;
  const h = held();
  if (h && ITEMS[h].heal) { useMeds(); return; }
  if (h && ITEMS[h].food) { eat(h); return; }
  if (p.food >= 96) { if (p.hp < 70 && have('meds')) { useMeds(); return; } toast('Karnın tok', 'icon.hunger'); return; }
  const foods = Object.keys(ITEMS).filter(k => ITEMS[k].food && have(k) > 0);
  if (!foods.length) { if (p.hp < 70 && have('meds')) { useMeds(); return; } toast('Yiyecek yok: çalılardan meyve topla, tarla ek!', 'icon.hunger'); sfx('deny'); return; }
  const need = 100 - p.food;
  foods.sort((a, b) => Math.abs(foodValue(a) - need) - Math.abs(foodValue(b) - need));
  eat(foods[0]);
}
function eat(k) {
  const p = G.p, it = ITEMS[k];
  G.inv[k]--; p.food = Math.min(100, p.food + foodValue(k)); if (it.hp) p.hp = Math.min(100, p.hp + it.hp);
  floatIcon(it.ic, `+${foodValue(k)}`, p.x, p.y - 70); sfx('eat'); p.pose = 'eat'; p.eatT = .6; hudDirty();
}
function useMeds() { const p = G.p; if (!have('meds')) return; G.inv.meds--; p.hp = Math.min(100, p.hp + 35); floatFx('fx.sparkle', p.x, p.y - 60); sfx('happy'); hudDirty(); }

// ----- mobs -----
function hitMob(m) {
  const p = G.p, dmg = have('spear') ? 2 : 1;
  m.hp -= dmg; m.flash = .14;
  const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy) || 1;
  m.kx = dx / d * 300; m.ky = dy / d * 300; m.cd = Math.max(m.cd, .5);
  sfx('hit'); burst(m.x, m.y - 18, 5, '#9b7fd4', 'dot'); camShake(.2);
  if (m.hp <= 0) { m.gone = true; G.stat.kills++; burst(m.x, m.y - 16, 12, '#8a6cc4', 'poof'); burst(m.x, m.y - 20, 4, '#ffe873', 'star'); sfx('poof'); if (rand() < .3) give('scrap', 1, m.x, m.y - 40); }
}
function spawnMob() {
  const p = G.p;
  for (let k = 0; k < 20; k++) {
    const a = rand() * TAU, d = 520 + rand() * 260, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * .7;
    if (blockedAt(x, y, 12) || lightAt(x, y, 1.4)) continue;
    G.mobs.push({ x, y, vx: 0, vy: 0, kx: 0, ky: 0, hp: 3 + Math.floor((G.day - 1) / 3), spd: 70 + Math.min(G.day, 10) * 4, a: 0, cd: .8, flash: 0, wob: rand() * TAU, wa: rand() * TAU });
    return;
  }
}
function updateMobs(dt) {
  const p = G.p, night = G.t >= .63 || G.t < .01, safe = indoors(p.x, p.y);
  if (night && !G.sleep) {
    G.spawnT -= dt;
    if (G.spawnT <= 0) { G.spawnT = 5 + rand() * 4; const cap = Math.min(2 + Math.floor(G.day / 2), 8); if (G.mobs.filter(m => !m.dying).length < cap) spawnMob(); }
  }
  const dawn = G.t < .5 && G.t >= .012;
  for (const m of G.mobs) {
    if (m.gone) continue;
    m.wob += dt * 6;
    if (dawn && !m.dying) m.dying = true;
    if (m.dying) { m.a -= dt * 1.3; if (m.a <= 0) { m.gone = true; burst(m.x, m.y - 16, 8, '#8a6cc4', 'poof'); } continue; }
    m.a = Math.min(1, m.a + dt * 1.2); m.flash = Math.max(0, m.flash - dt); m.cd = Math.max(0, m.cd - dt);
    let dx = 0, dy = 0, sp = m.spd;
    const fin = lightAt(m.x, m.y, .92);
    const dp = Math.hypot(p.x - m.x, p.y - m.y);
    if (fin) { dx = m.x - fin.x; dy = m.y - fin.y; sp *= 1.3; }
    else if (dp < 520 && !safe && !G.sleep) {
      const pl = lightAt(p.x, p.y, 1);
      if (pl || have('lantern') && dp > 120) { const ax = m.x - p.x, ay = m.y - p.y, al = Math.hypot(ax, ay) || 1, R = pl ? 0 : 150; const tx = (pl ? pl.x : p.x) + ax / al * ((pl ? pl.r : R) + 24) - ay / al * Math.sin(m.wob * .2) * 30, ty = (pl ? pl.y : p.y) + ay / al * ((pl ? pl.r : R) + 24) + ax / al * Math.sin(m.wob * .2) * 30; dx = tx - m.x; dy = ty - m.y; sp *= .55; }
      else { dx = p.x - m.x; dy = p.y - m.y; }
    } else { m.wa += (rand() - .5) * dt * 3; dx = Math.cos(m.wa); dy = Math.sin(m.wa); sp *= .35; }
    const dl = Math.hypot(dx, dy); if (dl > 0) { dx /= dl; dy /= dl; }
    const k = Math.min(1, dt * 5); m.vx += (dx * sp - m.vx) * k; m.vy += (dy * sp - m.vy) * k;
    const kd = Math.pow(.004, dt); m.kx *= kd; m.ky *= kd;
    moveEnt(m, (m.vx + m.kx) * dt, (m.vy + m.ky) * dt, 11, true);
    if (!fin && m.a > .6 && !G.sleep && m.cd <= 0 && dp < 26) {
      p.hp -= 8; p.hurt = .45; m.cd = 1.1; G.cause = 'mob';
      const ux = (p.x - m.x) / (dp || 1), uy = (p.y - m.y) / (dp || 1);
      moveEnt(p, ux * 16, uy * 16, 12, false); m.kx = -ux * 170; m.ky = -uy * 170;
      camShake(.5); sfx('hurt'); vibrate(40); floatText('-8', p.x, p.y - 70);
    }
  }
  if (G.mobs.some(m => m.gone)) G.mobs = G.mobs.filter(m => !m.gone);
}

// ----- day cycle, weather, crops -----
function newDay() {
  G.day++;
  G.weather = rand() < .25 ? 'rain' : 'clear';
  for (const m of G.mobs) m.dying = true;
  for (const c of chunks.values()) {
    for (let i = 0; i < c.tiles.length; i++) if (c.tiles[i] === TL.WSOIL && G.weather !== 'rain') { c.tiles[i] = TL.SOIL; modOf(c.key).tiles[i] = TL.SOIL; }
    for (const o of c.objs) if (o.k === 'crop') patchObj(o, { wet: G.weather === 'rain' });
  }
  if (G.day % 4 === 0) spawnTrader(); else G.trader = null;
  banner(`${G.day}. Gün`, G.weather === 'rain' ? 'Yağmur yağıyor: ekinler kendiliğinden sulanıyor.' : pick(['Güneş doğdu, gölgecikler eridi.', 'Yeni bir gün, yeni bir macera.', 'Kuşlar ötüyor. Tarlana bir bak!']));
  sfx('morning'); save();
}
function growCrop(o, hours) {
  if (hours <= 0) { o.lt = G.wt; return; }
  const c = CROPS[o.kind]; if (!c) return;
  const rate = 1 / c.hours * (o.wet || G.weather === 'rain' ? 2 : 1) * (G.char === 'deniz' ? 1.5 : 1);
  const g = Math.min(1, (o.g || 0) + hours * rate);
  if (g !== o.g) patchObj(o, { g, lt: G.wt }); else o.lt = G.wt;
}
let cropT = 0;
function updateCrops(dt) {
  cropT += dt; if (cropT < 1) return; cropT = 0;
  for (const c of chunks.values()) for (const o of c.objs) if (o.k === 'crop') growCrop(o, G.wt - (o.lt || G.wt));
}
function spawnTrader() {
  G.trader = { x: G.home.x + 3 * T, y: G.home.y + T * .5, day: G.day, used: [] };
  toast('Gezgin tüccar Bay Bıyık evinin yakınına geldi!', 'icon.trade');
}

// ----- cat -----
function updateCat(dt) {
  const c = G.cat, p = G.p;
  c.t += dt; if (c.dance) c.dance = Math.max(0, c.dance - dt);
  const tx = p.x - (p.flip ? -1 : 1) * 44, ty = p.y + 10, d = Math.hypot(tx - c.x, ty - c.y);
  if (d > 900) { c.x = tx; c.y = ty; }
  if (d > 70) { const sp = Math.min(220, 60 + d * 1.2) * dt; c.x += (tx - c.x) / d * sp; c.y += (ty - c.y) / d * sp; c.pose = 'walk'; c.flip = tx < c.x; c.idle = 0; }
  else { c.idle = (c.idle || 0) + dt; c.pose = c.dance ? 'walk' : isNight() && heatAt(c.x, c.y) ? 'sleep' : c.idle > 6 ? 'sleep' : 'sit'; }
}

// ----- quests -----
let questT = 0;
function updateQuests(dt) {
  questT += dt; if (questT < .5) return; questT = 0;
  const q = QUESTS[G.q]; if (!q) return;
  const [a, b] = q.c(G);
  if (a >= b) {
    for (const k in q.r) give(k, q.r[k], null, null, true);
    G.q++;
    banner('Görev tamam!', `${q.t} · Ödül: ${costText(q.r)}`);
    sfx('fanfare'); vibrate([20, 40, 20]); save();
  }
}

// ----- main player update -----
function updatePlayer(dt, mx, my, actDown) {
  const p = G.p;
  p.anim += dt; p.swing = Math.max(0, p.swing - dt); p.cd = Math.max(0, p.cd - dt); p.hurt = Math.max(0, p.hurt - dt); p.rest = Math.max(0, p.rest - dt); if (p.eatT) p.eatT = Math.max(0, p.eatT - dt);
  const m = Math.hypot(mx, my);
  if (m > .05 && !G.sleep) {
    const sp = 150 * (G.char === 'lale' ? 1.25 : 1) * (p.food <= 0 ? .75 : 1) * Math.min(1, Math.max(.4, m));
    moveEnt(p, mx / m * sp * dt, my / m * sp * dt, 12, false);
    p.fx = mx / m; p.fy = my / m; if (Math.abs(mx) > .15) p.flip = mx < 0;
    p.pose = 'walk'; p.fish = null;
  } else p.pose = p.fish ? 'search' : p.swing > 0 ? 'work' : p.eatT ? 'eat' : 'idle';
  if (p.swing > 0 && m > .05) p.pose = 'work';
  if (p.fish) {
    p.fish.t += dt;
    if (p.fish.t >= p.fish.dur) { if (rand() < .78) { give('fish', 1, p.fish.x, p.fish.y - 30); sfx('splash'); } else toast('Balık kaçtı!', 'icon.fish'); p.fish = null; }
  }
  target = G.sleep ? null : findTarget();
  if (actDown && p.cd <= 0 && !G.sleep && !p.fish) doAction();
  // stats
  const dark = darkness(G.t), inside = indoors(p.x, p.y), heat = heatAt(p.x, p.y);
  p.food = Math.max(0, p.food - dt * .25);
  if (heat) p.warm = Math.min(100, p.warm + dt * 8);
  else if (inside) p.warm = Math.min(100, p.warm + dt * 2);
  else if (dark > .3) p.warm = Math.max(0, p.warm - dt * .9 * (dark / .78) * (have('lantern') ? .7 : 1));
  else p.warm = Math.min(100, p.warm + dt * (G.weather === 'rain' ? .2 : 1.5));
  let drain = 0; if (p.food <= 0) { drain += .8; G.cause = 'hunger'; } if (p.warm <= 0) { drain += 1; G.cause = 'cold'; }
  if (drain) p.hp -= drain * dt; else if (p.food > 50 && p.warm > 40) p.hp = Math.min(100, p.hp + dt * .4);
  G.inside = inside;
  const far = Math.hypot(p.x - G.home.x, p.y - G.home.y) / T; if (far > G.stat.far) G.stat.far = far;
  if (p.hp <= 0) faint();
}
function faint() {
  const p = G.p;
  p.hp = 60; p.food = Math.max(p.food, 45); p.warm = Math.max(p.warm, 70);
  p.x = G.home.x; p.y = G.home.y; G.mobs.forEach(m => m.dying = true);
  showStory('Bayıldın...', { mob: 'Gölgecikler seni çok yordu.', cold: 'Gece soğuğu seni üşüttü.', hunger: 'Açlıktan dizlerin titredi.' }[G.cause] + ' Pamuk seni evine kadar sürükledi. Eşyaların yerinde, devam!', 'faint');
}

function simulate(dt, input) {
  if (G.sleep) updateSleep(dt);
  else {
    const prev = G.t; G.t += dt / DAY_LEN;
    if (prev < NIGHT_AT && G.t >= NIGHT_AT) { banner('Gece çöküyor', 'Evine, ateşinin ya da meşalelerinin yanına dön.'); sfx('night'); G.spawnT = 3; }
    if (G.t >= 1) { G.t -= 1; newDay(); }
  }
  G.wt = (G.day - 1) * 24 + G.t * 24;
  streamChunks(G.p.x, G.p.y);
  collectLights();
  updatePlayer(dt, input.mx, input.my, input.act);
  updateMobs(dt); updateCrops(dt); updateCat(dt); updateQuests(dt);
  if (G.trader && G.t > .58) { G.trader = null; toast('Bay Bıyık yoluna devam etti', 'icon.trade'); }
  G.saveT += dt; if (G.saveT > 20) { G.saveT = 0; save(); }
}
