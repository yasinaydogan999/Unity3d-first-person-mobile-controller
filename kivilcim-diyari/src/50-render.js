// ===== 50-render: camera, pencil-style ground, sprites, lighting, overlays, fx =====
const cvs = document.getElementById('stage');
const ctx = cvs.getContext('2d');
const lcvs = document.createElement('canvas'), lctx = lcvs.getContext('2d');
const hcvs = document.createElement('canvas'), hctx = hcvs.getContext('2d');
let VW = 0, VH = 0, DPR = 1, SC = 1, vignette = null;
const cam = { x: 0, y: 0, shake: 0 };
let FX = [];
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, OPTS.lite ? 1.25 : 2);
  VW = window.innerWidth; VH = window.innerHeight;
  cvs.width = Math.round(VW * DPR); cvs.height = Math.round(VH * DPR);
  cvs.style.width = VW + 'px'; cvs.style.height = VH + 'px';
  lcvs.width = hcvs.width = Math.max(1, Math.ceil(VW / 2)); lcvs.height = hcvs.height = Math.max(1, Math.ceil(VH / 2));
  SC = clamp(Math.min(VH / 420, VW / 700), .74, 1.6);
  vignette = null;
}
const PS = () => Math.round(SC * DPR * 4) / 4;
function camShake(v) { if (!RM) cam.shake = Math.max(cam.shake, v); }
function w2s(x, y) { return [(x - cam.x) * SC + VW / 2, (y - cam.y) * SC + VH / 2]; }
function s2w(x, y) { return [(x - VW / 2) / SC + cam.x, (y - VH / 2) / SC + cam.y]; }
function spr(name, x, y, o) { K.drawSprite(ctx, name, x, y, o, PS()); }
const q = (t, period, frames) => Math.floor(((t % period) + period) % period / period * frames) / frames * period;

// ----- ground -----
const TCOL = {
  [TL.GRASS]: ['#c1dc9d', '#bcd898'], [TL.FOREST]: ['#a2c88b', '#9dc487'], [TL.MEADOW]: ['#cde2a2', '#c9df9e'],
  [TL.SAND]: ['#f1dfb3', '#ecd7a6'], [TL.WATER]: ['#a7d6e6', '#9fd0e2'], [TL.DEEP]: ['#86c0d8', '#7fb9d2'],
  [TL.STONE]: ['#d3cddb', '#cbc4d4'], [TL.SOIL]: ['#bf9068', '#b78860'], [TL.WSOIL]: ['#94694b', '#8c6346'], [TL.FLOOR]: ['#e6bd8c', '#dfb383'],
};
function drawGround(x0, y0, x1, y1, t) {
  const S = G.seed;
  ctx.lineCap = 'round';
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const k = tileAt(tx, ty), px = tx * T, py = ty * T, h = h2(tx, ty, S + 7), h3 = h2(tx, ty, S + 8);
    const cols = TCOL[k];
    ctx.fillStyle = h < .5 ? cols[0] : cols[1];
    ctx.fillRect(px, py, T + .6, T + .6);
    if (k === TL.GRASS || k === TL.MEADOW || k === TL.FOREST) {
      ctx.strokeStyle = k === TL.FOREST ? 'rgba(52,96,58,.42)' : 'rgba(76,120,62,.38)'; ctx.lineWidth = 1.3; ctx.beginPath();
      const n = k === TL.FOREST ? 4 : 2 + (h3 < .3 ? 1 : 0);
      for (let i = 0; i < n; i++) { const gx = px + 6 + h2(tx, ty, S + 20 + i) * 36, gy = py + 10 + h2(tx, ty, S + 30 + i) * 32; ctx.moveTo(gx, gy); ctx.lineTo(gx - 2, gy - 6); ctx.moveTo(gx + 3, gy); ctx.lineTo(gx + 4, gy - 7); }
      if (k === TL.FOREST) for (let i = 0; i < 3; i++) { const sx = px + h2(tx, ty, S + 40 + i) * 40, sy = py + 8 + i * 13; ctx.moveTo(sx, sy + 8); ctx.lineTo(sx + 8, sy); }
      ctx.stroke();
      if (k === TL.MEADOW && h3 < .5) { for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ff9fb6', '#ffe58a', '#fff', '#c3b0ff'][(i + (h * 4 | 0)) % 4]; ctx.beginPath(); ctx.arc(px + 8 + h2(tx, ty, S + 50 + i) * 32, py + 8 + h2(tx, ty, S + 60 + i) * 32, 2.6, 0, TAU); ctx.fill(); } }
    } else if (k === TL.SAND) {
      ctx.fillStyle = 'rgba(160,120,80,.35)';
      for (let i = 0; i < 5; i++) ctx.fillRect(px + h2(tx, ty, S + 70 + i) * 44, py + h2(tx, ty, S + 80 + i) * 44, 1.6, 1.6);
    } else if (k === TL.WATER || k === TL.DEEP) {
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
      const wy = py + 14 + h * 18, wx = px + 6 + h3 * 14 + Math.sin(t * 1.1 + h * 9) * 3;
      ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 7, wy - 4, wx + 14, wy); ctx.quadraticCurveTo(wx + 21, wy + 4, wx + 28, wy);
      ctx.stroke();
      if (k === TL.DEEP) { ctx.strokeStyle = 'rgba(40,70,100,.18)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(px + i * 16, py + T); ctx.lineTo(px + i * 16 + 14, py + T - 14); } ctx.stroke(); }
    } else if (k === TL.STONE) {
      ctx.strokeStyle = 'rgba(80,70,100,.3)'; ctx.lineWidth = 1.3; ctx.beginPath();
      const cx0 = px + 8 + h * 26, cy0 = py + 10 + h3 * 22; ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + 7, cy0 + 5); ctx.lineTo(cx0 + 5, cy0 + 12); ctx.stroke();
    } else if (k === TL.SOIL || k === TL.WSOIL) {
      ctx.strokeStyle = k === TL.WSOIL ? 'rgba(40,24,20,.4)' : 'rgba(90,55,35,.42)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let r = 0; r < 4; r++) { const yy = py + 8 + r * 11; ctx.moveTo(px + 5, yy); ctx.quadraticCurveTo(px + 24, yy + 2, px + 43, yy); }
      ctx.stroke();
      if (k === TL.WSOIL) { ctx.fillStyle = 'rgba(190,230,255,.28)'; ctx.fillRect(px + 6, py + 6, 10, 3); }
      ctx.strokeStyle = 'rgba(61,43,69,.35)'; ctx.lineWidth = 1.4; ctx.strokeRect(px + 1.5, py + 1.5, T - 3, T - 3);
    } else if (k === TL.FLOOR) {
      ctx.strokeStyle = 'rgba(110,64,38,.38)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let r = 1; r < 4; r++) { ctx.moveTo(px, py + r * 12); ctx.lineTo(px + T, py + r * 12); }
      for (let r = 0; r < 4; r++) { const jx = px + 6 + h2(tx, ty, S + 90 + r) * 34; ctx.moveTo(jx, py + r * 12); ctx.lineTo(jx, py + r * 12 + 12); }
      ctx.stroke();
    }
    // sketchy outline where land meets water
    const kr = tileAt(tx + 1, ty), kb = tileAt(tx, ty + 1);
    const wet = WATERY(k);
    if (WATERY(kr) !== wet) edgeLine(px + T, py, px + T, py + T, h);
    if (WATERY(kb) !== wet) edgeLine(px, py + T, px + T, py + T, h3);
  }
}
function edgeLine(x1, y1, x2, y2, h) {
  ctx.strokeStyle = 'rgba(61,43,69,.55)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x1 - .5, y1 + h); ctx.lineTo(x2 + .5, y2 - h); ctx.stroke();
  ctx.strokeStyle = 'rgba(61,43,69,.25)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x1 + 1.5, y1 - 1 + h * 2); ctx.lineTo(x2 - 1, y2 + 1); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1 + (x1 === x2 ? 3 : 0), y1 + (y1 === y2 ? 3 : 0)); ctx.lineTo(x2 + (x1 === x2 ? 3 : 0), y2 + (y1 === y2 ? 3 : 0)); ctx.stroke();
}

// ----- objects -----
function joins(o) {
  const isB = (a) => a && (a.k === 'wall' || a.k === 'window' || a.k === 'door');
  return { n: isB(objAtTile(o.tx, o.ty - 1)), e: isB(objAtTile(o.tx + 1, o.ty)), w: isB(objAtTile(o.tx - 1, o.ty)) };
}
function drawObj(o, t, night) {
  const sh = o.shake > 0 ? Math.sin(o.shake * 60) * 3 : 0;
  switch (o.k) {
    case 'tree': spr('nt.tree', o.x + sh, o.y, { kind: o.kind, s: o.s }); break;
    case 'stump': spr('nt.stump', o.x + sh, o.y); break;
    case 'rock': spr('nt.rock', o.x + sh, o.y, { seed: o.seed, s: Math.round(o.s * 8) / 8 }); break;
    case 'bush': spr('nt.bush', o.x + sh, o.y, { berries: o.berries }); break;
    case 'grass': spr('nt.grass', o.x, o.y, { cut: !!o.cut }); break;
    case 'reeds': spr('nt.reeds', o.x, o.y); break;
    case 'mush': spr('nt.mush', o.x, o.y, { kind: o.kind }); break;
    case 'log': spr('nt.log', o.x + sh, o.y); break;
    case 'crate': spr('od.crate', o.x + sh, o.y, { open: !!o.open }); if (!o.open) K.star(ctx, o.x + 12, o.y - 40 - Math.sin(t * 3 + o.x) * 2, 4 + Math.sin(t * 5 + o.y) * 1.2, '#fff6b0'); break;
    case 'radio': spr('od.radio', o.x, o.y, { fixed: G.radioFixed, parts: G.radioParts }); if (!G.radioFixed && Math.sin(t * 6) > 0) K.circ(ctx, o.x + 20, o.y - 83, 3.6, '#ff5b6b', 0); if (have('part') && !G.radioFixed) { const by = o.y - 104 - Math.abs(Math.sin(t * 4)) * 8; K.poly(ctx, [[o.x - 9, by], [o.x + 9, by], [o.x, by + 11]], '#7ef29a'); } break;
    case 'wall': spr('bd.wall', o.x, o.y, { mat: o.mat, e: joins(o), hh: o.hh, crack: !!o.crack }); break;
    case 'window': spr('bd.window', o.x, o.y, { mat: o.mat, e: joins(o), night }); break;
    case 'door': { const open = Math.hypot(G.p.x - o.x, G.p.y - (o.y - 20)) < 54; spr('bd.door', o.x, o.y, { mat: o.mat, e: joins(o), open }); break; }
    case 'fence': { const f = (a) => a && a.k === 'fence'; spr('bd.fence', o.x, o.y, { e: { w: f(objAtTile(o.tx - 1, o.ty)), e: f(objAtTile(o.tx + 1, o.ty)) } }); break; }
    case 'crop': spr(CROPS[o.kind].art, o.x, o.y - 4, { stage: o.g >= 1 ? 3 : Math.min(2, Math.floor(o.g * 3)) }); if (o.g >= 1) K.star(ctx, o.x + 14, o.y - 44 - Math.sin(t * 3 + o.x) * 2, 4, '#fff6b0'); break;
    case 'thing': {
      const it = ITEMS[o.item], lit = o.until > G.wt;
      if (o.thing === 'fire') { spr('od.fire', o.x, o.y, { lit: false }); if (lit) { const k = .55 + Math.min(1, (o.until - G.wt) / 6) * .5; K.campFlame(ctx, o.x, o.y - 6, k, t + o.tx); } }
      else if (o.thing === 'torch') { spr('od.torch', o.x, o.y, { lit: false }); if (lit) K.campFlame(ctx, o.x, o.y - 55, .55, t + o.ty); }
      else {
        const ao = Object.assign({}, it.ao || {});
        if (o.item === 'lamp') ao.on = night; if (o.item === 'heater' || o.item === 'stove') ao.lit = night || nearStationLit(o);
        if (o.item === 'bed') ao.used = !!G.sleep && Math.hypot(G.p.x - o.x, G.p.y - o.y) < 60;
        spr(it.art, o.x, o.y, ao);
      }
      break;
    }
  }
}
function nearStationLit(o) { return Math.hypot(G.p.x - o.x, G.p.y - o.y) < 120; }

function drawPlayer(t) {
  const p = G.p, art = SURV[G.char].art;
  const pose = G.sleep ? 'sleep' : p.pose;
  const period = { walk: .5, work: .7, search: 1, eat: .8, idle: 3, sleep: 2 }[pose] || 1;
  const tq = q(p.anim, period, pose === 'idle' ? 12 : 8);
  if (p.hurt > 0 && (p.hurt * 20 | 0) % 2) ctx.globalAlpha = .55;
  spr(art, p.x, p.y, { pose, t: tq, mood: p.hp < 30 || p.warm < 20 ? 'sad' : 'happy', flip: p.flip });
  ctx.globalAlpha = 1;
  if (p.swing > 0) { const pr = 1 - p.swing / .26; ctx.strokeStyle = `rgba(255,255,255,${.8 * (1 - pr)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x + (p.flip ? -6 : 6), p.y - 30, 30, (p.flip ? Math.PI + .3 : -.3) - pr * 1.2 * (p.flip ? -1 : 1), (p.flip ? Math.PI + .3 : -.3) + pr * 1.2 * (p.flip ? -1 : 1), p.flip); ctx.stroke(); }
  if (p.fish) { const f = p.fish, bob = Math.sin(t * 6) * 2 + (f.t > f.dur - .4 ? 4 : 0); ctx.strokeStyle = K.P.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x + (p.flip ? -18 : 18), p.y - 50); ctx.quadraticCurveTo((p.x + f.x) / 2, p.y - 70, f.x, f.y + bob); ctx.stroke(); K.circ(ctx, f.x, f.y + bob, 4, K.P.coral, 1.6); }
}
function drawCat(t) {
  const c = G.cat, pose = c.pose, tq = q(c.t, pose === 'walk' ? .42 : 2.8, pose === 'walk' ? 6 : 8);
  spr('critter.cat', c.x, c.y, { pose, t: tq, flip: c.flip });
  if (c.dance && (t * 3 | 0) % 2) floatFx('fx.note', c.x, c.y - 40);
}

// ----- frame -----
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#efe4cf'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  if (!G) return;
  const sh = cam.shake > 0 ? (Math.random() - .5) * cam.shake * 10 : 0;
  const cx = cam.x + sh, cy = cam.y + sh;
  const s = SC * DPR;
  ctx.setTransform(s, 0, 0, s, VW / 2 * DPR - cx * s, VH / 2 * DPR - cy * s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const hw = VW / 2 / SC, hh = VH / 2 / SC;
  const x0 = cx - hw, x1 = cx + hw, y0 = cy - hh, y1 = cy + hh;
  drawGround(Math.floor(x0 / T) - 1, Math.floor(y0 / T) - 1, Math.floor(x1 / T) + 1, Math.floor(y1 / T) + 1, t);
  const night = darkness(G.t) > .35;
  // flat decor first
  const vis = objsIn(x0 - 80, y0 - 20, x1 + 80, y1 + 140);
  for (const o of vis) if (o.k === 'flowers') spr('nt.flowers', o.x, o.y, { kind: o.kind });
  for (const o of vis) if (o.k === 'thing' && ITEMS[o.item].flat) spr(ITEMS[o.item].art, o.x, o.y - 8, ITEMS[o.item].ao || {});
  drawPreview(t);
  // sorted pass
  const list = [];
  for (const o of vis) { if (o.k === 'flowers' || o.k === 'thing' && ITEMS[o.item].flat) continue; o._k = o.y; list.push(o); }
  for (const m of G.mobs) { m._k = m.y; m._mob = 1; list.push(m); }
  const P0 = { _k: G.p.y, _p: 1 }, C0 = { _k: G.cat.y, _c: 1 };
  list.push(P0, C0);
  if (G.trader) list.push({ _k: G.trader.y, _t: 1 });
  list.sort((a, b) => a._k - b._k);
  for (const o of list) {
    if (o._p) drawPlayer(t);
    else if (o._c) drawCat(t);
    else if (o._t) { spr('od.cart', G.trader.x + 50, G.trader.y - 6); spr('npc.trader', G.trader.x, G.trader.y, { pose: Math.hypot(G.p.x - G.trader.x, G.p.y - G.trader.y) < 140 ? 'wave' : 'idle', t: q(t, 3, 6) }); }
    else if (o._mob) { ctx.globalAlpha = Math.max(0, Math.min(1, o.a)); spr('mob.shadow', o.x, o.y, { flash: o.flash > 0, wob: Math.round(o.wob % TAU * 2) / 2 }); ctx.globalAlpha = 1; }
    else drawObj(o, t, night);
  }
  drawFX();
  // weather, light, paper
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const d = darkness(G.t);
  if (d > .01) drawLighting(d, t, cx, cy);
  const glow = Math.max(0, 1 - Math.abs(G.t - .58) / .06) + Math.max(0, 1 - Math.abs(G.t - .02) / .03);
  if (glow > 0) { ctx.fillStyle = `rgba(255,150,100,${Math.min(1, glow) * .14})`; ctx.fillRect(0, 0, cvs.width, cvs.height); }
  if (G.weather === 'rain') drawRain(t);
  // mob eyes glow through the dark
  ctx.setTransform(s, 0, 0, s, VW / 2 * DPR - cx * s, VH / 2 * DPR - cy * s);
  for (const m of G.mobs) {
    const a = Math.max(0, Math.min(1, m.a)); if (a <= 0) continue;
    let lx = G.p.x - m.x, ly = G.p.y - m.y; const l = Math.hypot(lx, ly) || 1; lx = lx / l * 2; ly = ly / l * 1.5;
    ctx.globalAlpha = a;
    for (const ex of [-6, 6]) { K.ell(ctx, m.x + ex, m.y - 20, 4.6, 5.6, '#fff3a3'); K.circ(ctx, m.x + ex + lx, m.y - 20 + ly, 2.3, K.P.ink, 0); if (d > .3) { ctx.globalAlpha = a * .25; K.circ(ctx, m.x + ex, m.y - 20, 9, '#fff3a3', 0); ctx.globalAlpha = a; } }
    ctx.globalAlpha = 1;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!OPTS.lite) {
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .24;
    ctx.fillStyle = K.paperPattern(ctx, 256, 11); ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  if (!vignette) vignette = makeVignette();
  ctx.drawImage(vignette, 0, 0, cvs.width, cvs.height);
  // screen-space
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawJoystick();
  const p = G.p;
  if (p.hurt > 0 || p.hp < 30 || p.warm < 25) {
    const R0 = Math.min(VW, VH) * .35, R1 = Math.max(VW, VH) * .75;
    const a = Math.max(p.hurt / .45 * .45, p.hp < 30 ? .16 + .1 * Math.sin(t * 5) : 0);
    if (a > 0) { const g = ctx.createRadialGradient(VW / 2, VH / 2, R0, VW / 2, VH / 2, R1); g.addColorStop(0, 'rgba(255,60,90,0)'); g.addColorStop(1, `rgba(220,40,80,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
    if (p.warm < 25) { const g = ctx.createRadialGradient(VW / 2, VH / 2, R0, VW / 2, VH / 2, R1); g.addColorStop(0, 'rgba(170,220,255,0)'); g.addColorStop(1, `rgba(170,220,255,${(25 - p.warm) / 25 * .5})`); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  }
  if (G.sleep) {
    const st = G.sleep.t, a = st < 1 ? st : Math.max(0, 1 - (st - 1.2));
    ctx.fillStyle = `rgba(30,22,60,${a})`; ctx.fillRect(0, 0, VW, VH);
    if (a > .3) { ctx.globalAlpha = a; ctx.font = '800 34px "Baloo 2", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff7ea'; ctx.fillText('Zzz…', VW / 2, VH / 2); ctx.globalAlpha = 1; }
  }
}
function makeVignette() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256 * VH / VW || 144;
  const x = c.getContext('2d'), g = x.createRadialGradient(c.width / 2, c.height / 2, c.height * .32, c.width / 2, c.height / 2, c.width * .62);
  g.addColorStop(0, 'rgba(61,43,69,0)'); g.addColorStop(1, 'rgba(61,43,69,.38)');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  return c;
}

// ----- placement preview -----
function drawPreview(t) {
  const h = held(); if (!h || G.sleep) return;
  const it = ITEMS[h], tg = target;
  const a = .5 + Math.sin(t * 5) * .12;
  if (tg && tg.kind === 'tile') {
    const hut = tg.act === 'hut', w = hut ? HUT_W : (it.fw || 1), hh = hut ? HUT_H : 1;
    const gx = hut ? (tg.tx - HUT_HW) * T : tg.tx * T, gy = hut ? (tg.ty - HUT_H + 1) * T : tg.ty * T;
    ctx.save(); ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.strokeRect(gx + 2, gy + 2, w * T - 4, hh * T - 4); ctx.restore();
    ctx.globalAlpha = a;
    if (tg.act === 'place') {
      if (it.place === 'block') spr(it.art, tg.tx * T + T / 2, tg.ty * T + T, Object.assign({ e: {} }, it.ao));
      else if (it.place === 'fence') spr('bd.fence', tg.tx * T + T / 2, tg.ty * T + T, { e: {} });
      else spr(it.art, tg.tx * T + (it.fw || 1) * T / 2, tg.ty * T + T, it.ao || {});
    } else if (tg.act === 'floor') { ctx.fillStyle = TCOL[TL.FLOOR][0]; ctx.fillRect(gx, gy, T, T); }
    else if (tg.act === 'till') { ctx.fillStyle = TCOL[TL.SOIL][0]; ctx.fillRect(gx, gy, T, T); }
    else if (tg.act === 'plant') spr(CROPS[it.seed].art, gx + T / 2, gy + T - 4, { stage: 0 });
    else if (tg.act === 'hut') { ctx.fillStyle = TCOL[TL.FLOOR][0]; ctx.fillRect(gx, gy, w * T, hh * T); }
    ctx.globalAlpha = 1;
  } else if (tg && tg.far) {
    const [fx, fy] = aimTile();
    ctx.save(); ctx.setLineDash([5, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(230,70,90,.8)'; ctx.strokeRect(fx * T + 3, fy * T + 3, T - 6, T - 6); ctx.restore();
  } else if (it.place === 'hut') {
    // show the whole footprint, with the tiles in the way crossed out
    const [fx, fy] = aimTile() || frontTile();
    ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(230,70,90,.75)'; ctx.strokeRect((fx - HUT_HW) * T + 2, (fy - HUT_H + 1) * T + 2, HUT_W * T - 4, HUT_H * T - 4); ctx.setLineDash([]);
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(230,70,90,${a + .2})`; ctx.beginPath();
    for (const [i, j] of hutBlocked(fx, fy)) { const x = i * T + 14, y = j * T + 14; ctx.moveTo(x, y); ctx.lineTo(x + T - 28, y + T - 28); ctx.moveTo(x + T - 28, y); ctx.lineTo(x, y + T - 28); }
    ctx.stroke(); ctx.restore();
  } else if (usesTile(h)) {
    const [fx, fy] = aimTile() || frontTile();
    ctx.save(); ctx.setLineDash([5, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(230,70,90,.8)'; ctx.strokeRect(fx * T + 3, fy * T + 3, T - 6, T - 6); ctx.restore();
  }
}

// ----- lighting with cross-hatched darkness -----
function drawLighting(d, t, cx, cy) {
  const lw = lcvs.width, lh = lcvs.height, k = SC * .5;
  const ox = lw / 2 - cx * k, oy = lh / 2 - cy * k;
  lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, lw, lh);
  lctx.fillStyle = `rgba(28,20,60,${d})`; lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => {
    const sx = ox + x * k, sy = oy + y * k, sr = r * k;
    if (sx < -sr || sy < -sr || sx > lw + sr || sy > lh + sr) return;
    const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.6, `rgba(0,0,0,${a * .78})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  };
  for (const l of LIGHTS) hole(l.x, l.y, l.r * 1.15 + (l.heat ? Math.sin(t * 9 + l.x) * 4 : 0), l.win ? .5 : 1);
  const p = G.p;
  hole(p.x, p.y - 24, have('lantern') ? 185 : 92, have('lantern') ? .95 : .7);
  if (G.inside) hole(p.x, p.y - 30, 160, .6);
  // hatch the dark (pencil night)
  hctx.setTransform(1, 0, 0, 1, 0, 0); hctx.globalCompositeOperation = 'source-over'; hctx.clearRect(0, 0, lw, lh);
  hctx.fillStyle = K.hatchPattern(hctx, 5, .9, true, 3); hctx.fillRect(0, 0, lw, lh);
  hctx.globalCompositeOperation = 'destination-in'; hctx.drawImage(lcvs, 0, 0);
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lcvs, 0, 0, cvs.width, cvs.height);
  ctx.globalAlpha = .55; ctx.drawImage(hcvs, 0, 0, cvs.width, cvs.height); ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  for (const l of LIGHTS) {
    if (l.win) continue;
    const [sx, sy] = w2s(l.x, l.y), sr = l.r * SC * DPR;
    const g = ctx.createRadialGradient(sx * DPR, sy * DPR, 0, sx * DPR, sy * DPR, sr);
    g.addColorStop(0, `rgba(255,160,70,${.2 * d})`); g.addColorStop(1, 'rgba(255,130,50,0)');
    ctx.fillStyle = g; ctx.fillRect(sx * DPR - sr, sy * DPR - sr, sr * 2, sr * 2);
  }
  ctx.restore();
}
let RAIN = [];
function drawRain(t) {
  if (RAIN.length < 90) for (let i = RAIN.length; i < 90; i++) RAIN.push({ x: Math.random(), y: Math.random(), s: .6 + Math.random() * .6 });
  ctx.strokeStyle = 'rgba(120,150,190,.45)'; ctx.lineWidth = 1.3 * DPR; ctx.beginPath();
  for (const r of RAIN) {
    const y = ((r.y + t * .9 * r.s) % 1) * cvs.height, x = ((r.x + t * .15 * r.s) % 1) * cvs.width;
    ctx.moveTo(x, y); ctx.lineTo(x - 4 * DPR, y + 14 * DPR);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(90,110,150,.08)'; ctx.fillRect(0, 0, cvs.width, cvs.height);
}

// ----- floating fx & particles -----
function floatIcon(icon, txt, x, y) { FX.push({ k: 'icon', icon, txt, x, y, life: 0, max: 1.4 }); }
function floatFx(name, x, y) { FX.push({ k: 'fx', name, x, y, life: 0, max: 1.1 }); }
function floatText(txt, x, y) { FX.push({ k: 'text', txt, x, y, life: 0, max: 1.1 }); }
function dust(x, y) { burst(x, y, 6, 'rgba(200,180,150,.9)', 'poof'); }
function burst(x, y, n, col, kind) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 40 + Math.random() * 90; FX.push({ k: 'p', kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50, life: 0, max: .45 + Math.random() * .5, col, sz: kind === 'poof' ? 5 + Math.random() * 5 : kind === 'leaf' ? 4 + Math.random() * 2 : 2.2 + Math.random() * 1.8, rot: Math.random() * TAU }); }
}
function updateFX(dt) {
  for (const f of FX) {
    f.life += dt;
    if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; if (f.kind === 'poof' || f.kind === 'star') { f.vx *= .9; f.vy *= .9; } else if (f.kind === 'spark') f.vy -= 30 * dt; else f.vy += 300 * dt; }
  }
  if (FX.length) FX = FX.filter(f => f.life < f.max);
  if (FX.length > 260) FX.splice(0, FX.length - 260);
}
function drawFX() {
  ctx.textBaseline = 'middle';
  for (const f of FX) {
    const p = f.life / f.max, a = p < .7 ? 1 : 1 - (p - .7) / .3;
    ctx.globalAlpha = Math.max(0, a);
    if (f.k === 'p') {
      ctx.fillStyle = f.col;
      if (f.kind === 'leaf') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot + f.life * 6); ctx.beginPath(); ctx.ellipse(0, 0, f.sz, f.sz * .55, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      else if (f.kind === 'poof') { ctx.beginPath(); ctx.arc(f.x, f.y, f.sz * (1 + f.life * 2), 0, TAU); ctx.fill(); }
      else if (f.kind === 'star') K.star(ctx, f.x, f.y, f.sz * 1.8, f.col);
      else { ctx.beginPath(); ctx.arc(f.x, f.y, f.sz, 0, TAU); ctx.fill(); }
    } else if (f.k === 'icon') {
      const y = f.y - p * 34;
      K.draw(ctx, f.icon, f.x, y, { scale: .42 });
      if (f.txt) { ctx.font = '800 15px "Baloo 2", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.lineWidth = 4; ctx.strokeStyle = K.P.ink; ctx.strokeText(f.txt, f.x + 14, y); ctx.fillStyle = '#fff7ea'; ctx.fillText(f.txt, f.x + 14, y); }
    } else if (f.k === 'fx') K.draw(ctx, f.name, f.x, f.y - p * 12, { t: p, scale: 1.2 });
    else { ctx.font = '800 20px "Baloo 2", system-ui, sans-serif'; ctx.textAlign = 'center'; const y = f.y - p * 26; ctx.lineWidth = 5; ctx.strokeStyle = K.P.ink; ctx.strokeText(f.txt, f.x, y); ctx.fillStyle = '#ff8a9a'; ctx.fillText(f.txt, f.x, y); }
  }
  ctx.globalAlpha = 1;
}
