// ===== 10-world: infinite chunked world, biomes, ruins, persistence diffs, spatial queries =====
const h2 = (x, y, s) => K.hash2(x, y, s);
function vnoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(x, y, s) { return vnoise(x, y, s) * .6 + vnoise(x * 2.07, y * 2.07, s + 17) * .28 + vnoise(x * 4.3, y * 4.3, s + 31) * .12; }

/** Base (generated) tile at tile coords. */
function genTile(tx, ty) {
  const S = G.seed;
  let e = fbm(tx / 34, ty / 34, S + 1);
  const d = Math.hypot(tx, ty);
  if (d < 16) e = Math.max(e, .56 - d * .008);
  if (e < .3) return TL.DEEP;
  if (e < .345) return TL.WATER;
  if (e < .385) return TL.SAND;
  if (fbm(tx / 26, ty / 26, S + 5) > .67 && d > 8) return TL.STONE;
  // a sunny clearing around the start so there is room for the first hut and field
  if (fbm(tx / 22, ty / 22, S + 9) > .58 + Math.max(0, 13 - d) * .025) return TL.FOREST;
  if (vnoise(tx / 13, ty / 13, S + 13) > .66) return TL.MEADOW;
  return TL.GRASS;
}

const chunks = new Map();
const ckey = (cx, cy) => cx + ',' + cy;
function modOf(key) { return G.mods[key] || (G.mods[key] = { rm: {}, st: {}, add: [], tiles: {} }); }

function genChunk(cx, cy) {
  const S = G.seed, key = ckey(cx, cy);
  const tiles = new Uint8Array(CH * CH);
  const x0 = cx * CH, y0 = cy * CH;
  for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) tiles[j * CH + i] = genTile(x0 + i, y0 + j);
  const objs = [];
  let n = 0;
  const add = (o) => { o.id = 'g' + key + ':' + (n++); o.gen = 1; if (o.x == null) { o.x = o.tx * T + T / 2; o.y = o.ty * T + T; } objs.push(o); return o; };
  const taken = new Uint8Array(CH * CH);
  const nearWater = (i, j) => { for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const t = (i + di >= 0 && i + di < CH && j + dj >= 0 && j + dj < CH) ? tiles[(j + dj) * CH + i + di] : genTile(x0 + i + di, y0 + j + dj); if (WATERY(t)) return true; } return false; };
  // ruin
  const rh = h2(cx, cy, S + 777);
  if (rh < .085 && Math.hypot(cx, cy) > 1.2) {
    const rw = 5 + (h2(cx, cy, S + 778) < .5 ? 1 : 0), rhh = 4 + (h2(cx, cy, S + 779) < .5 ? 1 : 0);
    const ox = 3 + Math.floor(h2(cx, cy, S + 780) * (CH - rw - 6)), oy = 3 + Math.floor(h2(cx, cy, S + 781) * (CH - rhh - 6));
    let ok = true;
    for (let j = oy - 1; j <= oy + rhh && ok; j++) for (let i = ox - 1; i <= ox + rw && ok; i++) if (WATERY(tiles[j * CH + i])) ok = false;
    if (ok) {
      const door = ox + (rw >> 1);
      for (let j = oy; j < oy + rhh; j++) for (let i = ox; i < ox + rw; i++) {
        tiles[j * CH + i] = TL.FLOOR; taken[j * CH + i] = 1;
        const edge = j === oy || j === oy + rhh - 1 || i === ox || i === ox + rw - 1;
        if (!edge) continue;
        if (j === oy + rhh - 1 && (i === door || i === door - 1)) continue;
        const hv = h2(x0 + i, y0 + j, S + 782);
        if (j !== oy && hv < .22) continue;
        const hh = j === oy ? 34 + hv * 8 : j === oy + rhh - 1 ? 12 + hv * 10 : 18 + hv * 18;
        add({ k: 'wall', mat: 'ruin', hh: Math.round(hh), crack: hv > .7, tx: x0 + i, ty: y0 + j });
      }
      const inner = [];
      for (let j = oy + 1; j < oy + rhh - 1; j++) for (let i = ox + 1; i < ox + rw - 1; i++) inner.push([i, j]);
      const nc = 1 + (h2(cx, cy, S + 783) < .5 ? 1 : 0);
      for (let k = 0; k < nc && inner.length; k++) {
        const [i, j] = inner.splice(Math.floor(h2(cx, cy, S + 790 + k) * inner.length), 1)[0];
        add({ k: 'crate', tx: x0 + i, ty: y0 + j, x: (x0 + i) * T + T / 2, y: (y0 + j) * T + T - 4, r: 14, hp: 2, open: false, loot: Math.floor(h2(cx, cy, S + 800 + k) * 1e6) });
      }
    }
  }
  // spawn camp
  if (cx === 0 && cy === 0) {
    add({ k: 'radio', tx: 1, ty: -2, x: 1 * T + T / 2, y: -2 * T + T, r: 22 });
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i >= 0 && j >= 0) taken[j * CH + i] = 1;
  }
  if (cx === -1 && cy === -1 || cx === 0 && cy === -1 || cx === -1 && cy === 0) {
    for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) if (Math.hypot(x0 + i, y0 + j) < 3.2) taken[j * CH + i] = 1;
  }
  // nature
  for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
    const idx = j * CH + i; if (taken[idx]) continue;
    const tx = x0 + i, ty = y0 + j, t = tiles[idx];
    if (Math.hypot(tx, ty) < 3.2) continue;
    const hv = h2(tx, ty, S + 101), jx = (h2(tx, ty, S + 102) - .5) * 18, jy = (h2(tx, ty, S + 103) - .5) * 14;
    const x = tx * T + T / 2 + jx, y = ty * T + T * .7 + jy;
    let o = null;
    const tree = () => { const kn = vnoise(tx / 9, ty / 9, S + 120); let kind = kn < .45 ? 0 : kn < .62 ? 1 : kn < .78 ? 0 : 2; if (t === TL.FOREST && h2(tx, ty, S + 121) < .3) kind = 3; return { k: 'tree', kind, s: [.92, 1, 1.08][Math.floor(h2(tx, ty, S + 122) * 3)], r: 13, hp: 4 }; };
    if (t === TL.GRASS) {
      if (hv < .035) o = tree(); else if (hv < .06) o = { k: 'bush', berries: 3, r: 12 }; else if (hv < .13) o = { k: 'grass', r: 0 };
      else if (hv < .142) o = { k: 'rock', seed: 1 + Math.floor(h2(tx, ty, 5) * 3), s: .9, r: 15, hp: 5 }; else if (hv < .19) o = { k: 'flowers', kind: Math.floor(h2(tx, ty, 9) * 3), r: 0 };
      else if (hv < .195) o = { k: 'mush', kind: 0, r: 0 };
    } else if (t === TL.FOREST) {
      if (hv < .3) o = tree(); else if (hv < .33) o = { k: 'bush', berries: 3, r: 12 }; else if (hv < .37) o = { k: 'mush', kind: h2(tx, ty, 4) < .25 ? 1 : 0, r: 0 };
      else if (hv < .385) o = { k: 'log', r: 18, hp: 2 }; else if (hv < .42) o = { k: 'grass', r: 0 };
    } else if (t === TL.MEADOW) {
      if (hv < .24) o = { k: 'flowers', kind: Math.floor(h2(tx, ty, 9) * 3), r: 0 }; else if (hv < .32) o = { k: 'grass', r: 0 };
      else if (hv < .37) o = { k: 'bush', berries: 3, r: 12 }; else if (hv < .39) o = tree();
    } else if (t === TL.STONE) {
      if (hv < .18) o = { k: 'rock', seed: 1 + Math.floor(h2(tx, ty, 5) * 3), s: .9 + h2(tx, ty, 6) * .35, r: 16, hp: 5 }; else if (hv < .2) o = { k: 'grass', r: 0 };
    } else if (t === TL.SAND) {
      if (hv < .14 && nearWater(i, j)) o = { k: 'reeds', r: 0 }; else if (hv < .17) o = { k: 'rock', seed: 2, s: .7, r: 12, hp: 3 };
    }
    if (o) { o.tx = tx; o.ty = ty; o.x = x; o.y = y; add(o); }
  }
  return { cx, cy, key, tiles, objs };
}

/** Apply saved changes on top of a generated chunk. */
function loadChunk(cx, cy) {
  const key = ckey(cx, cy);
  let c = chunks.get(key);
  if (c) return c;
  c = genChunk(cx, cy);
  const m = G.mods[key];
  if (m) {
    c.objs = c.objs.filter(o => !m.rm[o.id]);
    for (const o of c.objs) if (m.st[o.id]) Object.assign(o, m.st[o.id]);
    for (const i in m.tiles) c.tiles[+i] = m.tiles[i];
    for (const o of m.add) c.objs.push(o);
  }
  c.occ = new Map();
  for (const o of c.objs) occSet(c, o);
  chunks.set(key, c);
  catchUpChunk(c);
  return c;
}
function occSet(c, o) {
  if (o.k === 'flowers') return;
  const w = o.fw || 1;
  for (let k = 0; k < w; k++) c.occ.set((o.tx + k) + ',' + o.ty, o);
}
function occDel(o) {
  const w = o.fw || 1;
  for (let k = 0; k < w; k++) { const c = chunkAtTile(o.tx + k, o.ty); if (c && c.occ.get((o.tx + k) + ',' + o.ty) === o) c.occ.delete((o.tx + k) + ',' + o.ty); }
}
function chunkAtTile(tx, ty) { return loadChunk(Math.floor(tx / CH), Math.floor(ty / CH)); }
function objAtTile(tx, ty) { return chunkAtTile(tx, ty).occ.get(tx + ',' + ty) || null; }
function tileAt(tx, ty) { const c = chunkAtTile(tx, ty); return c.tiles[(ty - c.cy * CH) * CH + (tx - c.cx * CH)]; }
function tileAtXY(x, y) { return tileAt(Math.floor(x / T), Math.floor(y / T)); }
function setTile(tx, ty, t) {
  const c = chunkAtTile(tx, ty), i = (ty - c.cy * CH) * CH + (tx - c.cx * CH);
  c.tiles[i] = t; modOf(c.key).tiles[i] = t;
}
function chunkOfObj(o) { return chunkAtTile(o.tx, o.ty); }
function removeObj(o) {
  const c = chunkOfObj(o);
  const i = c.objs.indexOf(o); if (i >= 0) c.objs.splice(i, 1);
  occDel(o);
  const m = modOf(c.key);
  if (o.gen) { m.rm[o.id] = 1; delete m.st[o.id]; }
  else { const j = m.add.indexOf(o); if (j >= 0) m.add.splice(j, 1); }
}
function patchObj(o, p) {
  Object.assign(o, p);
  if (o.gen) { const m = modOf(chunkOfObj(o).key); m.st[o.id] = Object.assign(m.st[o.id] || {}, p); }
}
function addObj(o) {
  o.id = 'a' + (G.nid++);
  if (o.x == null) { o.x = o.tx * T + (o.fw || 1) * T / 2; o.y = o.ty * T + T; }
  const c = chunkAtTile(o.tx, o.ty);
  c.objs.push(o); modOf(c.key).add.push(o); occSet(c, o);
  return o;
}

/** Keep chunks around the player loaded; drop far ones (their changes live in G.mods). */
function streamChunks(px, py) {
  const pcx = Math.floor(px / T / CH), pcy = Math.floor(py / T / CH);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) loadChunk(pcx + dx, pcy + dy);
  if (chunks.size > 40) for (const [k, c] of chunks) if (Math.abs(c.cx - pcx) > 3 || Math.abs(c.cy - pcy) > 3) chunks.delete(k);
}
/** Objects whose anchor lies inside a world rectangle (loads chunks as needed). */
function objsIn(x0, y0, x1, y1, out) {
  out = out || [];
  const c0x = Math.floor(x0 / T / CH), c1x = Math.floor(x1 / T / CH), c0y = Math.floor(y0 / T / CH), c1y = Math.floor(y1 / T / CH);
  for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
    const c = loadChunk(cx, cy);
    for (const o of c.objs) if (o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1) out.push(o);
  }
  return out;
}

// ----- solidity & collision -----
const BLOCKS = { wall: 1, window: 1, door: 1, fence: 1 };
function isSolid(o, forMob) {
  if (o.k === 'door') return !!forMob;
  if (BLOCKS[o.k]) return true;
  if (o.k === 'thing') return !!SOLID_THINGS[o.thing] && !ITEMS[o.item].flat;
  return o.r > 0 && (o.k === 'tree' || o.k === 'rock' || o.k === 'bush' || o.k === 'log' || o.k === 'crate' || o.k === 'radio' || o.k === 'stump');
}
function boxOf(o) {
  if (BLOCKS[o.k]) return [o.tx * T, o.ty * T + (o.k === 'fence' ? 28 : 10), o.tx * T + T, o.ty * T + T];
  if (o.k === 'thing') { const w = (o.fw || 1) * T; return [o.tx * T + 6, o.ty * T + T - 22, o.tx * T + w - 6, o.ty * T + T]; }
  return null;
}
function blockedTile(x, y) { const t = tileAtXY(x, y); return WATERY(t); }
function blockedAt(x, y, r) {
  return blockedTile(x - r * .8, y - r * .4) || blockedTile(x + r * .8, y - r * .4) || blockedTile(x - r * .8, y + r * .4) || blockedTile(x + r * .8, y + r * .4);
}
function moveEnt(e, dx, dy, r, forMob) {
  if (dx && !blockedAt(e.x + dx, e.y, r)) e.x += dx;
  if (dy && !blockedAt(e.x, e.y + dy, r)) e.y += dy;
  NEAR_BUF.length = 0;
  const near = objsIn(e.x - 110, e.y - 60, e.x + 110, e.y + 110, NEAR_BUF);
  for (const o of near) {
    if (!isSolid(o, forMob)) continue;
    let nx = e.x, ny = e.y;
    const b = boxOf(o);
    if (b) {
      const qx = Math.max(b[0], Math.min(b[2], e.x)), qy = Math.max(b[1], Math.min(b[3], e.y));
      const ddx = e.x - qx, ddy = e.y - qy, d = Math.hypot(ddx, ddy);
      if (d >= r) continue;
      if (d > .001) { const k = (r - d) / d; nx = e.x + ddx * k; ny = e.y + ddy * k; }
      else { const l = e.x - b[0], rr = b[2] - e.x, t = e.y - b[1], bb = b[3] - e.y, m = Math.min(l, rr, t, bb); if (m === l) nx = b[0] - r; else if (m === rr) nx = b[2] + r; else if (m === t) ny = b[1] - r; else ny = b[3] + r; }
    } else {
      const ddx = e.x - o.x, ddy = e.y - o.y, d = Math.hypot(ddx, ddy), md = r + o.r * (o.s || 1);
      if (d >= md) continue;
      if (d < .001) ny = e.y + 1; else { const k = (md - d) / d; nx = e.x + ddx * k; ny = e.y + ddy * k; }
    }
    if (!blockedAt(nx, ny, r)) { e.x = nx; e.y = ny; }
  }
}
const NEAR_BUF = [];
function edgeDist(o, x, y) {
  const b = boxOf(o);
  if (b) { const qx = Math.max(b[0], Math.min(b[2], x)), qy = Math.max(b[1], Math.min(b[3], y)); return Math.hypot(x - qx, y - qy); }
  return Math.hypot(o.x - x, o.y - y) - (o.r || 8) * (o.s || 1);
}

/** Crops & regrowth catch up with time that passed while the chunk was unloaded. */
function catchUpChunk(c) {
  for (const o of c.objs) {
    if (o.k === 'crop') growCrop(o, Math.max(0, G.wt - (o.lt || G.wt)));
    if (o.k === 'grass' && o.cut && G.wt - (o.cutAt || 0) > 20) patchObj(o, { cut: false });
    if (o.k === 'bush' && o.berries < 3 && G.wt - (o.pickAt || 0) > 16) patchObj(o, { berries: 3 });
  }
}
