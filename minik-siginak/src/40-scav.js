// ===== 40-scav: night scavenging (playable or quick) =====
function bagCap(ch) { return 8 + (G.tools.backpack ? 4 : 0) + (ch.trait === 'runner' ? 3 : 0); }
function poolTotal(id) { const p = G.locPools[id]; let n = 0; for (const k in p) n += p[k]; return n; }
function refillPools() {
  for (const l of LOCS) { const p = G.locPools[l.id]; for (const k in l.pool) p[k] = Math.min(l.pool[k], (p[k] || 0) + Math.ceil(l.pool[k] * .3)); }
}
function raccoonCount(loc) {
  let n = loc.danger;
  if (G.day >= 6) n++;
  if (loc.danger === 0 && G.day < 8) n = 0;
  return Math.min(3, n);
}

function startScav(locId, ch) {
  const loc = LOCS.find(l => l.id === locId);
  const visits = G.locVisits[locId] || 0;
  const aid = locId === 'park' && !!G.flags.aidPark;
  const site = buildPlace(loc, G.locPools[locId], G.seed + G.day * 131 + visits * 17, aid);
  if (aid) G.flags.aidPark = false;
  const rnd = K.rng(G.seed + G.day * 7 + visits);
  const coons = [];
  const n = raccoonCount(loc);
  const g = graph(site);
  for (let i = 0, tries = 0; coons.length < n && tries < 40; tries++) {
    const r = rnd() < .5 ? 0 : 1, c = Math.floor(rnd() * 3);
    if (r === 1 && c === 0) continue;
    const x = c * ROOM_W + 30 + rnd() * (ROOM_W - 60);
    if (segIndex(g, r, x) < 0) continue;
    coons.push({ id: i++, row: r, x, face: rnd() < .5 ? -1 : 1, state: 'wander', goal: x, t: rnd() * 3, sack: false, dir: 0 });
  }
  ch.away = true;
  G.scav = { loc: locId, site, ch: ch.id, name: ch.name, art: ch.art, trait: ch.trait, row: site.door.row, x: site.door.x + 10, face: 1, pose: 'idle', path: null, task: null, climbP: 0, anim: 0,
    bag: [], cap: bagCap(ch), t: 0, limit: SCAV_SECONDS, coons, stolen: [], taken: {}, shooT: 0 };
  G.phase = 'scav'; G.sel = null;
  closeModal(); showScavHud(true); fitCamera(true);
  toast(`${ch.name} ${loc.name}'a vardı. Eşyalara dokun, rakunlara dikkat!`, loc.danger ? 'icon.raccoon' : 'icon.search');
  sfx('door'); save();
}

function scavAct(target) {
  const S = G.scav; if (!S) return;
  const site = S.site;
  if (target.k === 'coon') {
    const c = target.c;
    if (c.row === S.row && Math.abs(c.x - S.x) < 150) { shoo(c); return; }
    scavGo({ row: c.row, x: c.x - Math.sign(c.x - S.x) * 60 }, null); return;
  }
  if (target.k === 'obj') {
    const o = target.o;
    if (o.searched) { toast('Burası boş', 'icon.search'); return; }
    if (o.locked && !G.tools.crowbar) { toast('Kilitli. Atölyede Levye yap.', 'icon.lock'); sfx('deny'); return; }
    scavGo({ row: o.row, x: o.x - 14 }, { type: 'search', obj: o.id, prog: 0, dur: (o.locked ? 2.6 : 1.8) * (S.trait === 'runner' ? .8 : 1) });
    return;
  }
  if (target.k === 'room') {
    const st = rubbleStand(site, target.room, { row: S.row, x: S.x });
    if (!st) { toast('Oraya ulaşılamıyor', 'icon.cross'); return; }
    scavGo(st, { type: 'clear', r: target.room.r, c: target.room.c, prog: 0, dur: 2, face: st.face }); return;
  }
  if (target.k === 'floor') { scavGo({ row: target.row, x: target.x }, null); return; }
  if (target.k === 'exit') { endScav(false); }
}
function scavGo(to, task) {
  const S = G.scav;
  const path = planPath(S.site, { row: S.row, x: S.x }, to);
  if (!path) { toast('Oraya ulaşılamıyor', 'icon.cross'); return; }
  S.path = path; S.task = task; S.climbP = 0; sfx('tap');
}
function shoo(c) {
  const S = G.scav;
  c.state = 'flee'; c.dir = c.x < S.x ? -1 : 1; c.face = c.dir;
  S.pose = 'wave'; S.shooT = 1.2;
  floatText('Kışşt!', S.x, floorY(S.row) - 84);
  sfx('shoo'); vibrate(15);
}

function updateScav(dt) {
  const S = G.scav; if (!S) return;
  S.t += dt; S.anim += dt; S.shooT = Math.max(0, S.shooT - dt);
  if (S.t >= S.limit) { toast('Şafak söküyor! Eve dönüş vakti.', 'icon.sun'); endScav(true); return; }
  const site = S.site;
  if (S.path && S.path.length) stepPath(S, dt, S.trait === 'runner' ? 98 : 82);
  else {
    S.path = null;
    const t = S.task;
    if (t) {
      if (t.face) S.face = t.face;
      S.pose = t.type === 'clear' ? 'work' : 'search';
      t.prog += dt;
      if (t.prog >= t.dur) {
        if (t.type === 'search') { scavLoot(objById(site, t.obj)); S.task = null; }
        else {
          const room = site.rooms[t.r][t.c]; room.rubble--; dust(S.x + S.face * 40, floorY(S.row) - 20); sfx('dig');
          if (room.rubble <= 0) { bumpSite(site); invalidateRooms(); S.task = null; } else t.prog = 0;
        }
      }
    } else if (S.shooT <= 0) S.pose = 'idle';
  }
  // raccoons
  const g = graph(site);
  for (const c of S.coons) {
    if (c.state === 'gone') continue;
    c.t -= dt;
    if (c.state === 'flee') {
      c.x += c.dir * 135 * dt;
      if (c.x < -40 || c.x > siteW(site) + 40) c.state = 'gone';
      continue;
    }
    const i = segIndex(g, c.row, c.x), sg = i >= 0 ? g.rows[c.row][i] : [0, siteW(site)];
    const same = c.row === S.row && !(S.path && S.path[0] && S.path[0].t === 'climb');
    const dx = S.x - c.x;
    if (same && S.t > 5 && Math.abs(dx) < 190 && segIndex(g, S.row, S.x) === i) {
      c.state = 'chase'; c.face = Math.sign(dx) || 1;
      c.x += c.face * 46 * dt;
      if (Math.abs(dx) < 20 && S.shooT <= 0) steal(c);
    } else {
      c.state = 'wander';
      if (c.t <= 0) { c.t = 2 + rand() * 3; c.goal = sg[0] + 20 + rand() * Math.max(10, sg[1] - sg[0] - 40); }
      const gx = c.goal - c.x;
      if (Math.abs(gx) > 3) { c.face = Math.sign(gx); c.x += c.face * 24 * dt; }
    }
    c.x = clamp(c.x, sg[0] + 10, sg[1] - 10);
  }
}
function steal(c) {
  const S = G.scav;
  if (S.bag.length) {
    const i = Math.floor(rand() * S.bag.length), k = S.bag.splice(i, 1)[0];
    S.stolen.push(k); c.sack = true;
    toast(`Rakun bir ${ITEMS[k].name.toLowerCase()} kaptı! Yaklaşınca üstüne dokun: Kışşt!`, 'icon.raccoon');
    floatIcon(ITEMS[k].icon, '-1', S.x, floorY(S.row) - 80);
  } else toast('Rakun çantanı boş bulunca kıkırdayıp kaçtı', 'icon.raccoon');
  c.state = 'flee'; c.dir = c.x < S.x ? -1 : 1; c.face = c.dir;
  S.pose = 'sad'; S.shooT = .8;
  sfx('steal'); vibrate(40); updateBag();
}
function scavLoot(o) {
  const S = G.scav; if (!o) return;
  let added = 0, left = 0, i = 0;
  for (const k of Object.keys(o.loot)) {
    while (o.loot[k] > 0) {
      if (S.bag.length >= S.cap) { left += o.loot[k]; break; }
      o.loot[k]--; S.bag.push(k); S.taken[k] = (S.taken[k] || 0) + 1; added++;
    }
    if (o.loot[k] <= 0) delete o.loot[k];
    if (added) floatIcon(ITEMS[k].icon, '+', o.x + (i++ - 1) * 18, floorY(o.row) - 64);
  }
  o.locked = false;
  if (!Object.keys(o.loot).length) { o.searched = true; o.open = true; }
  if (!added && !left) toast('Boş çıktı', 'icon.search');
  if (left) toast('Çanta doldu! Eve dönebilirsin.', 'icon.backpack');
  sfx(added ? 'loot' : 'deny'); updateBag();
}
function endScav(timeUp) {
  const S = G.scav; if (!S) return;
  const pool = G.locPools[S.loc];
  for (const k in S.taken) pool[k] = Math.max(0, (pool[k] || 0) - S.taken[k]);
  G.locVisits[S.loc] = (G.locVisits[S.loc] || 0) + 1;
  const got = {}; for (const k of S.bag) got[k] = (got[k] || 0) + 1;
  const res = { loc: S.loc, name: S.name, got, stolen: S.stolen.slice() };
  G.scav = null;
  showScavHud(false); fitCamera(true);
  resolveNight(res);
}
function quickScav(locId, ch) {
  const loc = LOCS.find(l => l.id === locId), pool = G.locPools[locId];
  const bag = [];
  for (const k in pool) for (let i = 0; i < pool[k]; i++) bag.push(k);
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  const n = Math.min(bag.length, Math.round(bagCap(ch) * (.6 + rand() * .25)));
  const taken = bag.slice(0, n);
  for (const k of taken) pool[k] = Math.max(0, pool[k] - 1);
  const stolen = [];
  if (rand() < loc.danger * .3 + (G.day >= 6 ? .1 : 0)) { for (let i = 0; i < 1 + (rand() < .4 ? 1 : 0) && taken.length; i++) stolen.push(taken.splice(Math.floor(rand() * taken.length), 1)[0]); }
  const got = {}; for (const k of taken) got[k] = (got[k] || 0) + 1;
  if (locId === 'park' && G.flags.aidPark) { G.flags.aidPark = false; got.food = (got.food || 0) + 3; got.meal = (got.meal || 0) + 2; got.meds = (got.meds || 0) + 1; }
  G.locVisits[locId] = (G.locVisits[locId] || 0) + 1;
  return { loc: locId, name: ch.name, got, stolen };
}
