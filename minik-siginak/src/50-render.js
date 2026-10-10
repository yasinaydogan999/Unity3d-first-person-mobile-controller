// ===== 50-render: camera, scene drawing, lighting, floating fx =====
const cvs = document.getElementById('stage');
const ctx = cvs.getContext('2d');
const lcvs = document.createElement('canvas'), lctx = lcvs.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
const cam = { x: 0, y: 0, z: 1, fitZ: 1, user: 1, minX: 0, maxX: 0, minY: 0, maxY: 0, offX: 0 };
let FX = [];
const roomCache = new Map();
let simT = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  cvs.width = Math.round(VW * DPR); cvs.height = Math.round(VH * DPR);
  cvs.style.width = VW + 'px'; cvs.style.height = VH + 'px';
  lcvs.width = Math.max(1, Math.ceil(VW / 2)); lcvs.height = Math.max(1, Math.ceil(VH / 2));
  fitCamera(false);
}
function curSite() { return G && G.phase === 'scav' && G.scav ? G.scav.site : G ? G.home : null; }
/** Fit the current building on screen. Title screen leaves room on the right for the menu card. */
function fitCamera(reset) {
  const s = curSite(); if (!s) return;
  const home = s.kind === 'home';
  const bx0 = home ? -250 : -70, bx1 = siteW(s) + (home ? 70 : 70);
  const by0 = -112, by1 = floorY(s.rows - 1) + 36;
  const titleShift = state === 'title' ? .44 : 0;
  const availW = VW * (1 - titleShift), availH = VH - 40;
  cam.fitZ = Math.min(availW / (bx1 - bx0), availH / (by1 - by0));
  if (reset) cam.user = 1;
  cam.z = cam.fitZ * cam.user;
  cam.minX = bx0; cam.maxX = bx1; cam.minY = by0; cam.maxY = by1;
  cam.offX = -VW * titleShift / 2;
  if (reset || !cam.x) { cam.x = (bx0 + bx1) / 2; cam.y = (by0 + by1) / 2 - 20 / cam.z; }
  clampCam();
}
function clampCam() {
  const hw = VW / 2 / cam.z, hh = VH / 2 / cam.z;
  const cx = (cam.minX + cam.maxX) / 2, cy = (cam.minY + cam.maxY) / 2;
  const spanX = Math.max(0, (cam.maxX - cam.minX) / 2 - hw), spanY = Math.max(0, (cam.maxY - cam.minY) / 2 - hh + 30);
  cam.x = clamp(cam.x, cx - spanX, cx + spanX);
  cam.y = clamp(cam.y, cy - spanY - 20, cy + spanY);
}
function w2s(x, y) { return [(x - cam.x) * cam.z + VW / 2 + cam.offX, (y - cam.y) * cam.z + VH / 2]; }
function s2w(x, y) { return [(x - VW / 2 - cam.offX) / cam.z + cam.x, (y - VH / 2) / cam.z + cam.y]; }
function setWorld() { const s = cam.z * DPR; ctx.setTransform(s, 0, 0, s, (VW / 2 + cam.offX - cam.x * cam.z) * DPR, (VH / 2 - cam.y * cam.z) * DPR); }
function invalidateRooms() { roomCache.clear(); }

function roomCanvas(s, room) {
  const zk = Math.round(cam.z * DPR * 20) / 20;
  const key = `${s.kind}:${s.locId || ''}:${room.r},${room.c}:${zk}:${room.style}:${room.hole}`;
  let c = roomCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = Math.ceil(ROOM_W * zk) + 2; c.height = Math.ceil(ROOM_H * zk) + 2;
  c._zk = zk;
  const x = c.getContext('2d'); x.scale(zk, zk);
  K.draw(x, 'room.wall', 0, 0, { w: ROOM_W, h: ROOM_H, style: room.style, color: room.color, dirt: s.kind === 'home' ? .25 : .45, seed: room.seed });
  if (room.hole) K.draw(x, 'room.hole', 18, 16, { w: 70, h: 54, seed: room.seed });
  if (roomCache.size > 80) roomCache.clear();
  roomCache.set(key, c);
  return c;
}

// ----- darkness model -----
function darkness() {
  if (!G) return 0;
  if (state === 'title') return .32;
  if (G.phase === 'scav') return .76;
  if (G.phase === 'plan' || G.phase === 'morning' && G.clock < 6.2) return .62;
  const h = G.clock;
  if (h < 6.6) return .5 * (6.6 - h);
  if (h < 17) return 0;
  return Math.min(.6, .6 * (h - 17) / 3);
}
function skyTime() {
  if (!G) return .5;
  if (state === 'title') return .52;
  if (G.phase === 'scav' || G.phase === 'plan') return .78;
  return clamp((G.clock - 6) / 24, 0, 1);
}

// ----- main render -----
function render(t) {
  simT = t;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#2a2257'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  if (!G) return;
  const s = curSite();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  K.draw(ctx, 'env.sky', 0, 0, { w: VW, h: VH, time: skyTime(), snowing: true, t });
  setWorld();
  drawSite(s, t);
  const d = darkness();
  if (d > .01) drawLighting(s, d, t);
  setWorld();
  drawAfterLight(s, t, d);
  drawFX(t);
}

function drawSite(s, t) {
  const home = s.kind === 'home', W = siteW(s), gy = floorY(s.rows - 1);
  K.draw(ctx, 'env.ground', -900, gy + 2, { w: W + 1800, h: 260, t });
  if (home) {
    K.draw(ctx, 'st.snowman', -150, gy + 4, { t });
    K.draw(ctx, 'st.mailbox', -64, gy + 4, { t });
    K.draw(ctx, 'st.sled', -214, gy + 4, { t });
  }
  K.draw(ctx, 'bld.foundation', -WALLW, gy + SLAB, { w: W + WALLW * 2, h: 40 });
  // rooms back walls + wall decor
  const night = darkness() > .3;
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
    const room = s.rooms[r][c], x0 = c * ROOM_W, y0 = ceilY(r);
    const rc = roomCanvas(s, room);
    ctx.drawImage(rc, x0, y0, rc.width / rc._zk, rc.height / rc._zk);
    for (const dcr of room.decor) {
      if (dcr.floor) continue;
      const opts = { t, kind: dcr.kind || 0, night, snow: true, w: dcr.w, h: dcr.h, seed: room.seed };
      K.draw(ctx, dcr.a, x0 + dcr.x, y0 + dcr.y, opts);
    }
  }
  if (home) K.draw(ctx, 'deco.stringlights', ROOM_W + 14, ceilY(2) + 6, { w: ROOM_W - 28, on: darkness() > .05 || state === 'title', t });
  // posts between rooms
  for (let r = 0; r < s.rows; r++) for (let c = 1; c < s.cols; c++) {
    const x = c * ROOM_W, y = ceilY(r);
    K.orr(ctx, x - 5, y - 1, 10, 34, 3, K.P.woodDark, 2);
    K.orr(ctx, x - 9, y + 26, 18, 7, 3, K.P.wood, 2);
  }
  // floors / ceilings
  K.draw(ctx, 'room.floor', -WALLW, -SLAB, { w: W + WALLW * 2, h: SLAB, style: 'wood' });
  for (let r = 0; r < s.rows; r++) K.draw(ctx, 'room.floor', -WALLW, floorY(r), { w: W + WALLW * 2, h: SLAB, style: r === s.rows - 1 ? 'concrete' : 'wood' });
  K.draw(ctx, 'bld.wallside', -WALLW, -SLAB, { w: WALLW, h: gy + SLAB * 2 });
  K.draw(ctx, 'bld.wallside', W, -SLAB, { w: WALLW, h: gy + SLAB * 2, side: 'right' });
  const smoke = home && G.home.objs.some(o => o.kind === 'heater' && o.lit);
  K.draw(ctx, 'bld.roof', -WALLW - 16, -SLAB - 84, { w: W + WALLW * 2 + 32, h: 84, snow: true, chimney: home, smoke: smoke || state === 'title', t });
  K.draw(ctx, 'deco.icicles', -WALLW - 10, -SLAB, { w: W + WALLW * 2 + 20, t });
  // bulbs
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
    const room = s.rooms[r][c];
    if (room.bulb && room.rubble <= 0) K.draw(ctx, 'st.bulb', c * ROOM_W + ROOM_W / 2, ceilY(r), { on: darkness() > .05, t });
  }
  // ladders, door
  for (const l of s.ladders) { const h = floorY(l.low) - floorY(l.high) + 12; K.draw(ctx, 'st.ladder', l.x, floorY(l.low), { h, t }); }
  const doorOpen = home ? (G.doorAnim || 0) : 0;
  K.draw(ctx, 'st.door', s.door.x, floorY(s.door.row), { level: home ? G.door : 0, open: doorOpen, t });
  // floor decor (places)
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) for (const dcr of s.rooms[r][c].decor) if (dcr.floor) K.draw(ctx, dcr.a, c * ROOM_W + dcr.x, floorY(r), { t });
  // objects
  for (const o of s.objs) {
    const room = roomOf(s, o.row, o.x);
    if (room && room.rubble > 0) continue;
    const y = floorY(o.row);
    if (o.t === 'station') {
      const opts = { t, level: o.level || 1, lit: !!o.lit, cooking: !!o.lit, fill: (o.fill || 0) / 4, growth: o.growth || 0, planted: !!o.planted, on: o.kind === 'radio' ? isUsing(o, 'relax') : undefined, used: isUsing(o, 'nap'), active: isUsing(o, 'craft') };
      if (o.isNew) { ctx.save(); const k = 1 + Math.sin(o.isNew * 6) * .04 * o.isNew; ctx.translate(o.x, y); ctx.scale(k, 2 - k); ctx.translate(-o.x, -y); K.draw(ctx, ST_ART[o.kind], o.x, y, opts); ctx.restore(); }
      else K.draw(ctx, ST_ART[o.kind], o.x, y, opts);
    } else {
      K.draw(ctx, CONT_ART[o.t] || 'st.crate', o.x, y, { t, open: !!o.open || o.searched, locked: !!o.locked && !o.searched, kind: o.kind, amount: o.searched ? .15 : .9, full: o.searched ? .1 : .9 });
      if (!o.searched && (s.kind === 'place' || room && room.revealed)) {
        const tw = Math.sin(t * 3 + o.id) * .5 + .5;
        K.star(ctx, o.x + o.w / 2 - 6, y - (o.t === 'lootpile' ? 44 : o.t === 'shelf' || o.t === 'cabinet' || o.t === 'fridge' || o.t === 'books' ? 104 : 46) - tw * 3, 4 + tw * 2, '#fff6b0');
      }
    }
  }
  // rubble
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
    const room = s.rooms[r][c];
    if (room.rubble > 0) K.draw(ctx, 'st.rubble', c * ROOM_W + ROOM_W / 2, floorY(r), { amount: .25 + .75 * room.rubble / Math.max(1, room.rubbleMax), seed: room.seed, t });
  }
  // pets
  if (home) for (const p of G.pets) K.draw(ctx, p.kind === 'dog' ? 'critter.dog' : 'critter.cat', p.x, floorY(p.row), { pose: p.pose, t, flip: p.face < 0 });
  // raccoons (places)
  if (!home && G.scav) for (const c of G.scav.coons) if (c.state !== 'gone') K.draw(ctx, 'critter.raccoon', c.x, floorY(c.row), { pose: c.state === 'flee' ? (c.sack ? 'steal' : 'run') : c.state === 'chase' ? 'sneak' : 'walk', t: t + c.id, flip: c.face < 0 });
  // characters
  if (home) {
    const list = G.chars.filter(c => !c.away).sort((a, b) => (a.id === G.sel) - (b.id === G.sel));
    for (const ch of list) drawChar(ch, t);
  } else if (G.scav) drawScavenger(G.scav, t);
  // fog over unexplored rooms
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
    const room = s.rooms[r][c];
    if (!room.revealed) K.draw(ctx, 'room.fog', c * ROOM_W, ceilY(r), { w: ROOM_W, h: ROOM_H, t: t + r + c, seed: room.seed });
  }
}
function isUsing(o, type) { if (!G) return false; return G.chars.some(c => !c.away && c.task && c.task.obj === o.id && c.task.type === type && !(c.path && c.path.length)); }

function charDrawPos(ch) {
  const t = ch.task;
  if (t && t.type === 'nap' && !(ch.path && ch.path.length)) {
    const o = objById(G.home, t.obj);
    if (o) return { x: o.x, y: floorY(o.row) - (o.kind === 'bed' ? 26 : 10), pose: 'sleep' };
  }
  return { x: ch.x, y: charY(ch), pose: ch.pose };
}
function drawChar(ch, t) {
  const p = charDrawPos(ch);
  const sel = ch.id === G.sel;
  if (sel && p.pose !== 'sleep' && p.pose !== 'climb') {
    ctx.save(); ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 18;
    K.ell(ctx, p.x, p.y + 1, 22, 6, 'rgba(255,201,74,.35)'); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffc94a'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 22, 6, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  const mood = p.pose === 'sleep' ? 'sleep' : ch.st.mood < 22 || ch.sick ? 'sad' : 'happy';
  K.draw(ctx, ch.art, p.x, p.y, { pose: p.pose, t: ch.anim, mood, flip: ch.face < 0 });
  if (sel) { const by = p.y - 92 - Math.abs(Math.sin(t * 4)) * 5; K.poly(ctx, [[p.x - 8, by], [p.x + 8, by], [p.x, by + 10]], '#ffc94a', 2.5); }
}
function drawScavenger(S, t) {
  let y = floorY(S.row);
  if (S.path && S.path[0] && S.path[0].t === 'climb') y = floorY(S.row) + (floorY(S.path[0].to) - floorY(S.row)) * S.climbP;
  K.draw(ctx, S.art, S.x, y, { pose: S.pose, t: S.anim, mood: S.pose === 'sad' ? 'sad' : 'happy', flip: S.face < 0, carry: S.bag.length >= S.cap });
}

// ----- lighting -----
function drawLighting(s, d, t) {
  const lw = lcvs.width, lh = lcvs.height, k = cam.z * .5;
  const ox = (VW / 2 + cam.offX) * .5 - cam.x * k, oy = VH / 4 - cam.y * k;
  lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, lw, lh);
  lctx.fillStyle = `rgba(22,16,58,${d})`; lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => {
    const sx = ox + x * k, sy = oy + y * k, sr = r * k;
    if (sx < -sr || sy < -sr || sx > lw + sr || sy > lh + sr) return;
    const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.6, `rgba(0,0,0,${a * .75})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  };
  const warm = [];
  if (s.kind === 'home') {
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
      const room = s.rooms[r][c];
      if (room.bulb && room.rubble <= 0 && room.revealed) { const x = c * ROOM_W + ROOM_W / 2, y = ceilY(r) + 40; hole(x, y, 150 + Math.sin(t * 3 + c) * 3, .95); warm.push([x, y, 130]); }
    }
    for (const o of s.objs) if ((o.kind === 'stove' || o.kind === 'heater') && o.lit) { hole(o.x, floorY(o.row) - 40, 110, .9); warm.push([o.x, floorY(o.row) - 40, 90]); }
    hole(ROOM_W * 1.5, ceilY(2) + 10, 120, .5);
    for (const ch of G.chars) if (!ch.away) hole(ch.x, charY(ch) - 34, 46, .45);
  } else if (G.scav) {
    const S = G.scav;
    let y = floorY(S.row); if (S.path && S.path[0] && S.path[0].t === 'climb') y += (floorY(S.path[0].to) - floorY(S.row)) * S.climbP;
    hole(S.x + S.face * 20, y - 36, 135 + Math.sin(t * 7) * 2, .97);
    warm.push([S.x + S.face * 20, y - 36, 100]);
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) for (const dcr of s.rooms[r][c].decor) if (dcr.a === 'st.window') hole(c * ROOM_W + dcr.x, ceilY(r) + dcr.y - 28, 60, .32);
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lcvs, 0, 0, cvs.width, cvs.height);
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r] of warm) {
    const [sx, sy] = w2s(x, y), sr = r * cam.z * DPR;
    const g = ctx.createRadialGradient(sx * DPR, sy * DPR, 0, sx * DPR, sy * DPR, sr);
    g.addColorStop(0, `rgba(255,170,80,${.16 * d})`); g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g; ctx.fillRect(sx * DPR - sr, sy * DPR - sr, sr * 2, sr * 2);
  }
  ctx.restore();
}

function drawAfterLight(s, t, d) {
  // raccoon eyes glint in the dark
  if (s.kind === 'place' && G.scav) {
    for (const c of G.scav.coons) {
      if (c.state === 'gone') continue;
      const y = floorY(c.row) - 22, x = c.x + (c.face > 0 ? 6 : -6);
      ctx.globalAlpha = .9; K.circ(ctx, x - 3, y, 2.2, '#fff3a3', 0); K.circ(ctx, x + 3, y, 2.2, '#fff3a3', 0);
      ctx.globalAlpha = .25; K.circ(ctx, x, y, 9, '#fff3a3', 0); ctx.globalAlpha = 1;
    }
  }
  if (s.kind !== 'home' || state !== 'play') return;
  // survivor overlays: progress, status, sleep
  for (const ch of G.chars) {
    if (ch.away) continue;
    const p = charDrawPos(ch), t0 = ch.task;
    if (t0 && !(ch.path && ch.path.length) && t0.dur && t0.dur < 900) {
      const f = clamp(t0.prog / t0.dur, 0, 1);
      K.orr(ctx, p.x - 18, p.y - 86, 36, 7, 3.5, '#fff7ea', 2);
      if (f > 0) { ctx.fillStyle = '#5fbf6e'; K.rr(ctx, p.x - 16.5, p.y - 84.5, 33 * f, 4, 2); ctx.fill(); }
    }
    let ic = null;
    if (ch.sick) ic = 'icon.sick'; else if (ch.st.hunger < 25) ic = 'icon.hunger'; else if (ch.st.energy < 15) ic = 'icon.energy'; else if (ch.st.mood < 20) ic = 'icon.mood';
    if (p.pose === 'sleep') { K.draw(ctx, 'fx.zzz', p.x + 14, p.y - 30, { t: (t * .5) % 1 }); }
    else if (ic) {
      const by = p.y - 104 + Math.sin(t * 3 + ch.anim) * 2;
      K.circ(ctx, p.x + 16, by, 11, '#fff7ea', 2);
      K.draw(ctx, ic, p.x + 16, by, { scale: .3 });
    }
    if (ch.queue.length) for (let i = 0; i < ch.queue.length; i++) { K.circ(ctx, p.x - 14 + i * 9, p.y - 74, 3.2, '#ffc94a', 1.5); }
  }
}

// ----- floating fx -----
function floatIcon(icon, txt, x, y) { FX.push({ k: 'icon', icon, txt, x, y, life: 0, max: 1.4 }); }
function floatFx(name, x, y) { FX.push({ k: 'fx', name, x, y, life: 0, max: 1.2 }); }
function floatText(txt, x, y) { FX.push({ k: 'text', txt, x, y, life: 0, max: 1.1 }); }
function dust(x, y) { for (let i = 0; i < 3; i++) FX.push({ k: 'fx', name: 'fx.dust', x: x + (i - 1) * 14, y: y - i * 4, life: -i * .08, max: .7 }); }
function updateFX(dt) { for (const f of FX) f.life += dt; if (FX.length) FX = FX.filter(f => f.life < f.max); }
function drawFX(t) {
  setWorld();
  ctx.font = '800 15px "Baloo 2", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const f of FX) {
    if (f.life < 0) continue;
    const p = f.life / f.max, a = p < .75 ? 1 : 1 - (p - .75) / .25;
    ctx.globalAlpha = a;
    if (f.k === 'icon') {
      const y = f.y - p * 34;
      K.draw(ctx, f.icon, f.x, y, { scale: .42 });
      if (f.txt) { ctx.lineWidth = 4; ctx.strokeStyle = K.P.ink; ctx.strokeText(f.txt, f.x + 14, y); ctx.fillStyle = '#fff7ea'; ctx.fillText(f.txt, f.x + 14, y); }
    } else if (f.k === 'fx') K.draw(ctx, f.name, f.x, f.y - p * 10, { t: p, scale: 1.2 });
    else { ctx.textAlign = 'center'; const y = f.y - p * 26; ctx.font = '800 20px "Baloo 2", system-ui, sans-serif'; ctx.lineWidth = 5; ctx.strokeStyle = K.P.ink; ctx.strokeText(f.txt, f.x, y); ctx.fillStyle = '#ffe08a'; ctx.fillText(f.txt, f.x, y); ctx.textAlign = 'left'; ctx.font = '800 15px "Baloo 2", system-ui, sans-serif'; }
  }
  ctx.globalAlpha = 1;
}
