// ===== 10-world: sites (home + places), geometry, reachability, paths =====
const ST_ART = { workbench: 'st.workbench', bed: 'st.bed', floorbed: 'st.floorbed', stove: 'st.stove', water: 'st.water', heater: 'st.heater', garden: 'st.garden', armchair: 'st.armchair', radio: 'st.radio', guitar: 'st.guitar', bookshelf: 'st.bookshelf' };
const ST_W = { workbench: 100, bed: 104, floorbed: 80, stove: 62, water: 50, heater: 56, garden: 96, armchair: 66, radio: 56, guitar: 30, bookshelf: 70 };
const ST_NAME = { workbench: 'Atölye', bed: 'Yatak', floorbed: 'Yer Yatağı', stove: 'Ocak', water: 'Su Toplayıcı', heater: 'Soba', garden: 'Saksı Bahçe', armchair: 'Koltuk', radio: 'Radyo', guitar: 'Gitar', bookshelf: 'Kitaplık' };
const CONT_ART = { crate: 'st.crate', cabinet: 'st.cabinet', fridge: 'st.fridge', lootpile: 'st.lootpile', shelf: 'st.shelf', counter: 'st.counter', books: 'st.bookshelf' };
const CONT_W = { crate: 44, cabinet: 60, fridge: 50, lootpile: 80, shelf: 90, counter: 100, books: 70 };
const CONT_NAME = { crate: 'Sandık', cabinet: 'Dolap', fridge: 'Buzdolabı', lootpile: 'Yığın', shelf: 'Raf', counter: 'Tezgâh', books: 'Kitaplık' };
const DECOR_PLACE = { 'st.chalkboard': { wall: true, y: 70 }, 'st.toolwall': { wall: true, y: 70 }, 'st.table': {}, 'st.chair': {}, 'st.sled': {}, 'st.snowman': {} };

function ceilY(r) { return r * (ROOM_H + SLAB); }
function floorY(r) { return ceilY(r) + ROOM_H; }
function siteW(s) { return s.cols * ROOM_W; }
function roomOf(s, row, x) { const c = Math.floor(x / ROOM_W); if (row < 0 || row >= s.rows || c < 0 || c >= s.cols) return null; return s.rooms[row][c]; }
function objById(s, id) { for (const o of s.objs) if (o.id === id) return o; return null; }

function addStation(s, kind, row, x, extra) {
  const o = Object.assign({ id: s.nid++, t: 'station', kind, row, x, w: ST_W[kind] || 60 }, extra || {});
  if (kind === 'water') o.fill = o.fill || 0;
  if (kind === 'garden') { o.growth = o.growth || 0; o.planted = !!o.planted; }
  if (kind === 'stove' || kind === 'heater') o.lit = false;
  s.objs.push(o); bumpSite(s);
  return o;
}
function bumpSite(s) { s.ver = (s.ver || 0) + 1; }

function buildHome() {
  const s = { kind: 'home', cols: HOME.cols, rows: HOME.rows, rooms: [], ladders: HOME.ladders.map(l => Object.assign({}, l)), door: Object.assign({}, HOME.door), objs: [], nid: 1, ver: 0 };
  for (let r = 0; r < s.rows; r++) {
    const row = [];
    for (let c = 0; c < s.cols; c++) {
      const d = HOME.rooms[r][c];
      row.push({ r, c, style: d.style, color: d.color, rubble: d.rubble, rubbleMax: d.rubble, revealed: false, bulb: !!d.bulb, hole: !!d.hole, seed: r * 31 + c * 7 + 3, decor: (d.decor || []).map(x => Object.assign({}, x)) });
      for (const it of d.items) {
        const x = c * ROOM_W + it.x;
        if (it.t === 'station') addStation(s, it.kind, r, x);
        else s.objs.push({ id: s.nid++, t: it.t, kind: it.kind || 'mixed', row: r, x, w: CONT_W[it.t] || 50, loot: Object.assign({}, it.loot || {}), locked: !!it.locked, searched: false });
      }
    }
    s.rooms.push(row);
  }
  updateReveal(s);
  return s;
}

// --- reachability graph (cached per site version) ---
const graphCache = new WeakMap();
function graph(s) {
  const hit = graphCache.get(s);
  if (hit && hit.ver === s.ver) return hit;
  const rows = [];
  for (let r = 0; r < s.rows; r++) {
    const segs = []; let start = null;
    for (let c = 0; c < s.cols; c++) {
      const open = s.rooms[r][c].rubble <= 0;
      if (open && start === null) start = c;
      if (!open && start !== null) { segs.push([start * ROOM_W, c * ROOM_W]); start = null; }
    }
    if (start !== null) segs.push([start * ROOM_W, s.cols * ROOM_W]);
    rows.push(segs);
  }
  const g = { ver: s.ver, rows };
  graphCache.set(s, g);
  return g;
}
function segIndex(g, row, x) {
  const segs = g.rows[row]; if (!segs) return -1;
  for (let i = 0; i < segs.length; i++) if (x >= segs[i][0] - 2 && x <= segs[i][1] + 2) return i;
  return -1;
}
function walkable(s, row, x) { return segIndex(graph(s), row, x) >= 0; }

/** Steps from a position to a target: [{t:'walk',row,x},{t:'climb',x,to}...], or null if unreachable. */
function planPath(s, from, to) {
  const g = graph(s);
  const a = segIndex(g, from.row, from.x), b = segIndex(g, to.row, to.x);
  if (a < 0 || b < 0) return null;
  const key = (r, i) => r * 100 + i;
  const start = key(from.row, a), goal = key(to.row, b);
  const prev = new Map([[start, null]]);
  const q = [[from.row, a]];
  while (q.length) {
    const [r, i] = q.shift();
    if (key(r, i) === goal) break;
    for (const l of s.ladders) {
      let nr = -1;
      if (l.low === r) nr = l.high; else if (l.high === r) nr = l.low; else continue;
      if (segIndex(g, r, l.x) !== i) continue;
      const ni = segIndex(g, nr, l.x); if (ni < 0) continue;
      const k = key(nr, ni); if (prev.has(k)) continue;
      prev.set(k, { r, i, ladder: l, nr }); q.push([nr, ni]);
    }
  }
  if (!prev.has(goal)) return null;
  const hops = [];
  for (let k = goal; prev.get(k); ) { const p = prev.get(k); hops.unshift(p); k = key(p.r, p.i); }
  const steps = [];
  for (const h of hops) { steps.push({ t: 'walk', row: h.r, x: h.ladder.x }); steps.push({ t: 'climb', x: h.ladder.x, to: h.nr }); }
  steps.push({ t: 'walk', row: to.row, x: clampSeg(g, to.row, b, to.x) });
  return steps;
}
function clampSeg(g, row, i, x) { const sg = g.rows[row][i]; return Math.max(sg[0] + 12, Math.min(sg[1] - 12, x)); }

/** Reveal rooms reachable from the entrance, plus rubble rooms next to them. */
function updateReveal(s) {
  const g = graph(s);
  const startSeg = segIndex(g, s.door.row, s.door.x);
  const reach = new Set();
  if (startSeg >= 0) {
    const q = [[s.door.row, startSeg]]; reach.add(s.door.row * 100 + startSeg);
    while (q.length) {
      const [r, i] = q.shift();
      for (const l of s.ladders) {
        let nr = -1; if (l.low === r) nr = l.high; else if (l.high === r) nr = l.low; else continue;
        if (segIndex(g, r, l.x) !== i) continue;
        const ni = segIndex(g, nr, l.x); if (ni < 0) continue;
        const k = nr * 100 + ni; if (reach.has(k)) continue; reach.add(k); q.push([nr, ni]);
      }
    }
  }
  let newly = 0;
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
    const room = s.rooms[r][c];
    const cx = c * ROOM_W + ROOM_W / 2;
    let vis = false;
    const i = segIndex(g, r, cx);
    if (room.rubble <= 0 && i >= 0 && reach.has(r * 100 + i)) vis = true;
    if (room.rubble > 0) {
      for (const dc of [-1, 1]) {
        const nc = c + dc; if (nc < 0 || nc >= s.cols) continue;
        const nb = s.rooms[r][nc]; if (nb.rubble > 0) continue;
        const ni = segIndex(g, r, nc * ROOM_W + ROOM_W / 2);
        if (ni >= 0 && reach.has(r * 100 + ni)) vis = true;
      }
    }
    if (vis && !room.revealed) { room.revealed = true; newly++; }
  }
  return newly;
}

/** Where to stand to dig into a rubble room, reachable from `from`. */
function rubbleStand(s, room, from) {
  let best = null, bestLen = 1e9;
  for (const dc of [-1, 1]) {
    const nc = room.c + dc; if (nc < 0 || nc >= s.cols) continue;
    if (s.rooms[room.r][nc].rubble > 0) continue;
    const x = dc < 0 ? room.c * ROOM_W - 18 : (room.c + 1) * ROOM_W + 18;
    const p = planPath(s, from, { row: room.r, x });
    if (!p) continue;
    const len = pathLen(from, p);
    if (len < bestLen) { bestLen = len; best = { row: room.r, x, face: dc < 0 ? 1 : -1 }; }
  }
  return best;
}
function pathLen(from, steps) {
  let x = from.x, len = 0;
  for (const st of steps) { if (st.t === 'walk') { len += Math.abs(st.x - x); x = st.x; } else len += ROOM_H + SLAB; }
  return len;
}

/** Find a free spot for a new station of width w, preferring near (row,x). */
function findSlot(s, w, near) {
  const g = graph(s);
  let best = null, bestScore = 1e9;
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
    const room = s.rooms[r][c];
    if (room.rubble > 0 || !room.revealed) continue;
    if (segIndex(g, r, c * ROOM_W + ROOM_W / 2) < 0) continue;
    const L = c * ROOM_W + 8, R = (c + 1) * ROOM_W - 8;
    const occ = [];
    for (const o of s.objs) if (o.row === r && o.x + o.w / 2 > L && o.x - o.w / 2 < R) occ.push([o.x - o.w / 2 - 6, o.x + o.w / 2 + 6]);
    for (const l of s.ladders) if (l.low === r || l.high === r) occ.push([l.x - 26, l.x + 26]);
    if (s.door.row === r) occ.push([s.door.x - 32, s.door.x + 32]);
    occ.sort((a, b) => a[0] - b[0]);
    let cur = L;
    const free = [];
    for (const [a, b] of occ) { if (a > cur) free.push([cur, a]); cur = Math.max(cur, b); }
    if (cur < R) free.push([cur, R]);
    for (const [a, b] of free) {
      if (b - a < w) continue;
      const x = Math.max(a + w / 2, Math.min(b - w / 2, near.x));
      const score = Math.abs(r - near.row) * 500 + Math.abs(x - near.x);
      if (score < bestScore) { bestScore = score; best = { row: r, x }; }
    }
  }
  return best;
}

// --- places for night scavenging ---
function buildPlace(loc, pool, seed, hasAid) {
  const rnd = K.rng(seed);
  const s = { kind: 'place', locId: loc.id, cols: 3, rows: 2, rooms: [], ladders: [], door: { row: 1, x: 34 }, objs: [], nid: 1, ver: 0 };
  const ladderCol = 1 + (rnd() < .5 ? 0 : 1);
  s.ladders.push({ low: 1, high: 0, x: ladderCol * ROOM_W + (rnd() < .5 ? 40 : 180) });
  const rubbleAt = rnd() < .45 ? [rnd() < .5 ? 0 : 1, rnd() < .5 ? 0 : 2] : null;
  for (let r = 0; r < 2; r++) {
    const row = [];
    for (let c = 0; c < 3; c++) {
      const st = loc.walls[(r + c) % loc.walls.length];
      const col = loc.wallColor[(r * 3 + c) % loc.wallColor.length];
      let rub = 0;
      if (rubbleAt && rubbleAt[0] === r && rubbleAt[1] === c && !(r === 1 && c === 0) && Math.floor(s.ladders[0].x / ROOM_W) !== c) rub = 2;
      row.push({ r, c, style: st, color: col, rubble: rub, rubbleMax: rub, revealed: true, bulb: false, hole: rnd() < .2, seed: Math.floor(rnd() * 999), decor: [] });
    }
    s.rooms.push(row);
  }
  // decor + containers
  const contTypes = loc.props.map(p => Object.keys(CONT_ART).find(k => CONT_ART[k] === p)).filter(Boolean);
  if (!contTypes.length) contTypes.push('crate');
  const decorArts = loc.props.filter(p => DECOR_PLACE[p]);
  const conts = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const room = s.rooms[r][c];
    if (rnd() < .55) room.decor.push({ a: 'st.window', x: 40 + rnd() * 140, y: 76 });
    if (decorArts.length && rnd() < .6) { const a = decorArts[Math.floor(rnd() * decorArts.length)]; room.decor.push({ a, x: 60 + rnd() * 100, y: DECOR_PLACE[a].wall ? DECOR_PLACE[a].y : 0, floor: !DECOR_PLACE[a].wall }); }
    const n = (r === 1 && c === 0) ? 1 : 1 + (rnd() < .6 ? 1 : 0);
    const used = [];
    if (r === 1 && c === 0) used.push([0, 70]);
    for (const l of s.ladders) if (Math.floor(l.x / ROOM_W) === c) used.push([l.x - c * ROOM_W - 28, l.x - c * ROOM_W + 28]);
    for (let k = 0; k < n; k++) {
      const t = rnd() < .3 ? 'lootpile' : contTypes[Math.floor(rnd() * contTypes.length)];
      const w = CONT_W[t];
      for (let tries = 0; tries < 8; tries++) {
        const lx = 12 + w / 2 + rnd() * (ROOM_W - 24 - w);
        if (used.some(([a, b]) => lx + w / 2 > a && lx - w / 2 < b)) continue;
        used.push([lx - w / 2 - 6, lx + w / 2 + 6]);
        const o = { id: s.nid++, t, kind: 'mixed', row: r, x: c * ROOM_W + lx, w, loot: {}, locked: false, searched: false };
        s.objs.push(o); conts.push(o); break;
      }
    }
  }
  // distribute loot from the place's remaining pool
  const bag = [];
  for (const k in pool) for (let i = 0; i < pool[k]; i++) bag.push(k);
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  const total = Math.min(bag.length, 9 + Math.floor(rnd() * 5));
  let bi = 0;
  for (let i = 0; i < conts.length && bi < total; i++) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n && bi < total; k++) { const it = bag[bi++]; conts[i].loot[it] = (conts[i].loot[it] || 0) + 1; }
  }
  for (let i = 0; bi < total && conts.length; i = (i + 1) % conts.length) { const it = bag[bi++]; conts[i].loot[it] = (conts[i].loot[it] || 0) + 1; }
  // lootpile kinds follow their contents; one cabinet/crate gets locked with a bonus
  for (const o of conts) {
    if (o.t === 'lootpile') { const ks = Object.keys(o.loot); o.kind = ks.length === 1 ? (ks[0] === 'wood' ? 'wood' : ks[0] === 'parts' ? 'parts' : ks[0] === 'cloth' ? 'cloth' : (ks[0] === 'food' || ks[0] === 'cocoa' || ks[0] === 'water') ? 'food' : 'mixed') : 'mixed'; }
    if (!Object.keys(o.loot).length) o.searched = true;
  }
  const lockable = conts.filter(o => (o.t === 'cabinet' || o.t === 'crate') && !o.searched);
  if (lockable.length && rnd() < .7) { const o = lockable[Math.floor(rnd() * lockable.length)]; o.locked = true; const bonus = Object.keys(pool)[0]; o.loot[bonus] = (o.loot[bonus] || 0) + 2; }
  if (hasAid) { const o = { id: s.nid++, t: 'crate', kind: 'mixed', row: 0, x: 2 * ROOM_W + 110, w: 44, loot: { food: 3, meal: 2, meds: 1 }, locked: false, searched: false, aid: true }; s.objs.push(o); }
  return s;
}
