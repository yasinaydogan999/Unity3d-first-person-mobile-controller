/*
 * MinikArt · characters.js
 * Chibi survivors, the five Minik Sığınak presets, critters and the travelling cat trader.
 * Everything is drawn in code, faces right and stands on a bottom-centre anchor (see STYLE.md).
 *
 *   MinikArt.character(ctx, spec, o)   draws one survivor with its feet at (0,0) of the current transform.
 *
 *   spec = {skin, hair, hairStyle:'bob'|'bun'|'spiky'|'long'|'curly'|'short',
 *           hat:null|'beanie'|'cap'|'earmuffs'|'bandana', top, topStyle:'hoodie'|'coat'|'sweater'|'overalls',
 *           bottom, shoes, scarf:null|colour, glasses, apron:null|colour, beard, age:'kid'|'adult'|'old',
 *           // optional extras
 *           hatColor, hatColor2 (earmuff band), shirt (under overalls), curls (puffy curly edge),
 *           cane (old folks lean on a walking stick in idle/walk/sad), boots (tall rain boots), blink (phase offset)}
 *   o    = {pose, t, mood, carry, look:[dx,dy], seated, moving, shadow, blink}
 *     pose:  idle walk work search climb sleep sit eat carry happy sad wave  (+ extras: cold read cheer)
 *     mood:  happy sad sleep (also neutral surprised wink). pose sleep forces closed eyes, sad forces a frown.
 *     carry: what is held overhead in pose 'carry' (or with idle/walk): box wood parts cloth food water meds.
 *     seated: true puts idle/eat/work/read/sad/wave/cold on the implied 22-unit seat (e.g. eating at a table).
 *     moving: false keeps the legs still in pose 'carry'.
 *     sleep lies on its back, head on the LEFT (x≈-30), feet on the right (x≈+30); flip:true mirrors it.
 */
(function (K) {
  'use strict';
  if (!K) return;
  const { P, OL, LW, TAU, orr, circ, ell, blob, line, glow, face, shade } = K;
  const PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max, min = Math.min;
  const HL = 'rgba(255,255,255,.4)';
  const SOFT = P.inkSoft;

  // ---------- local helpers ----------
  const _sh = new Map();
  /** memoised shade(): shade() parses colours, so cache the few tints each character needs. */
  function sh(c, k) { const key = c + '|' + k; let v = _sh.get(key); if (v === undefined) { v = shade(c, k); _sh.set(key, v); } return v; }

  /** Soft "noodle" limb through a joint (elbow/knee) with ink outline. */
  function limb(ctx, x1, y1, ex, ey, x2, y2, col, w) {
    const cx = 2 * ex - (x1 + x2) / 2, cy = 2 * ey - (y1 + y2) / 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.lineWidth = w + LW * 2; ctx.strokeStyle = OL; ctx.stroke();
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  }
  /** Polyline limb (crisp bent knee) with ink outline. */
  function seg(ctx, pts, col, w) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineWidth = w + LW * 2; ctx.strokeStyle = OL; ctx.stroke();
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  }
  /** Quadratic curve stroke without outline (tail tips, stripes on strokes). */
  function qstroke(ctx, x1, y1, cx, cy, x2, y2, col, w) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  }
  function qpt(x1, y1, cx, cy, x2, y2, u) {
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return [a * x1 + b * cx + c * x2, a * y1 + b * cy + c * y2];
  }
  /** Tiny 4-point sparkle with an ink rim (impact pings). */
  function sparkle(ctx, x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - PI / 2, d = i % 2 ? r * 0.38 : r; ctx.lineTo(x + cos(a) * d, y + sin(a) * d); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = OL; ctx.stroke();
  }
  function tearDrop(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - 2.6 * s);
    ctx.quadraticCurveTo(x + 2 * s, y, x, y + 1.6 * s); ctx.quadraticCurveTo(x - 2 * s, y, x, y - 2.6 * s);
    ctx.fillStyle = P.ice; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = OL; ctx.stroke();
  }
  /** Face wrapper: K.face plus a soft blink for open-eyed moods. */
  function faceB(ctx, x, y, gap, eye, mood, look, blink) {
    if (blink && (mood === 'happy' || mood === 'neutral')) {
      face(ctx, x, y, { gap, eye: 0.01, mood, look });
      ctx.beginPath(); ctx.lineWidth = 1.7; ctx.strokeStyle = OL;
      for (let s = -1; s <= 1; s += 2) { ctx.moveTo(x + s * gap / 2 - eye, y + 0.4); ctx.quadraticCurveTo(x + s * gap / 2, y + 1.3, x + s * gap / 2 + eye, y + 0.4); }
      ctx.stroke();
    } else face(ctx, x, y, { gap, eye, mood, look });
  }
  function blinkAt(t, phase) { return ((t + phase * 1.3) % 3.7 + 3.7) % 3.7 > 3.57; }

  // =====================================================================
  //  Parametric survivor
  // =====================================================================
  const DEF = {
    skin: P.skin2, hair: P.hairBrown, hairStyle: 'short', hat: null, top: P.coral, topStyle: 'sweater',
    bottom: '#6b6597', shoes: P.woodDark, scarf: null, glasses: false, apron: null, beard: false, age: 'adult',
  };
  const HAT_COL = { beanie: P.sun, cap: P.coral, earmuffs: P.cream, bandana: P.rose };

  function dims(age) {
    if (age === 'kid') return {
      kid: true, R: 12.8, hX: 0.8, hY: -38.5, hipY: -10, top: -26, bot: -8.5, wT: 7.4, wB: 9.4,
      sY: -23, sF: 1.6, sB: -2.4, up: 5.6, fo: 5.2, armW: 5, legW: 6.4, legX: 3.1, handR: 3, shoe: 0.9,
      lean: 0, eye: 2.3, gap: 7.2, legL: 7.5,
    };
    const D = {
      kid: false, R: 13.5, hX: 1, hY: -45.5, hipY: -13, top: -32, bot: -11, wT: 8.5, wB: 10.5,
      sY: -28.5, sF: 2, sB: -3, up: 7, fo: 6.5, armW: 5.5, legW: 7, legX: 3.6, handR: 3.2, shoe: 1,
      lean: 0, eye: 2.2, gap: 7.4, legL: 10,
    };
    if (age === 'old') { D.old = true; D.lean = 0.07; D.hY = -44.5; }
    return D;
  }

  const memo = new WeakMap();
  const EMPTY = {};
  function resolve(spec) {
    spec = spec || EMPTY;
    let S = memo.get(spec);
    if (S) return S;
    S = Object.assign({}, DEF);
    for (const k in spec) if (spec[k] !== undefined) S[k] = spec[k];
    const D = S.D = dims(S.age);
    const ov = S.topStyle === 'overalls';
    S.skinB = sh(S.skin, -0.1);
    S.hairD = sh(S.hair, -0.22); S.hairL = sh(S.hair, 0.4);
    S.shirt = S.shirt || (ov ? P.cream : S.top);
    S.sleeve = ov ? S.shirt : S.top; S.sleeveB = sh(S.sleeve, -0.13);
    S.topD = sh(S.top, -0.14); S.topL = sh(S.top, 0.42);
    S.legCol = ov ? S.top : S.bottom; S.legColB = sh(S.legCol, -0.14);
    S.shoesB = sh(S.shoes, -0.12);
    S.hatCol = S.hatColor || HAT_COL[S.hat] || P.coral; S.hatD = sh(S.hatCol, -0.16); S.hatL = sh(S.hatCol, 0.45);
    S.band = S.hatColor2 || P.plum;
    if (S.scarf) { S.scarfD = sh(S.scarf, -0.16); S.scarfL = sh(S.scarf, 0.5); }
    if (S.apron) { S.apronD = sh(S.apron, -0.14); }
    S.btn = S.topStyle === 'coat' ? (S.top === P.sun ? P.coral : P.sunLight) : P.sun;
    S.blinkPh = +S.blink || 0;
    // how far the back of the head (hair) reaches, used to lay the sleeper on the floor
    S.backR = D.R + (S.hairStyle === 'curly' ? 0.3 * D.R + 2 : S.hairStyle === 'bob' ? 2.6 : 1.8);
    memo.set(spec, S);
    return S;
  }

  // ---------- pose rig ----------
  const SIT_UY = -10;                 // hips lifted onto a 22-unit seat
  const SEATABLE = { idle: 1, eat: 1, work: 1, read: 1, sad: 1, wave: 1, cold: 1 };

  function rig(S, o) {
    const D = S.D, t = +o.t || 0, pose = o.pose || 'idle';
    const R = {
      pose, t, y: 0, lower: 'stand', ph: 0, tuck: 0, lean: D.lean, bob: 0, uy: 0, hx: 0, hy: 0, tilt: 0,
      aF: [0.14, 0.3], aB: [-0.12, 0.3], item: null, carry: null, mood: o.mood || 'happy', look: o.look || null,
      tear: -1, blink: o.blink !== false && blinkAt(t, S.blinkPh), sway: 0, blow: 0, lying: false, hit: 0, e: 0, shiver: 0,
    };
    const br = sin(t * 2.4 + S.blinkPh);
    const walkLegs = (cyc) => {
      const ph = t * TAU / cyc, s = sin(ph);
      R.lower = 'walk'; R.ph = ph; R.bob = (abs(s) - 0.5) * 1.3; R.sway = -1.5 - abs(s) * 1.5; R.blow = 1;
      return s;
    };
    switch (pose) {
      case 'walk': {
        const s = walkLegs(0.5); R.lean += 0.05;
        R.aF = [0.12 - 0.6 * s, 0.42]; R.aB = [-0.06 + 0.6 * s, 0.42];
        if (S.cane) { R.aF = [0.5 - 0.12 * s, -0.1]; R.item = 'cane'; }
        break;
      }
      case 'work': {
        const c = (t / 0.62) % 1; let e;
        if (c < 0.58) { const u = c / 0.58; e = 1 - u * u * (3 - 2 * u); }
        else if (c < 0.7) { const u = (c - 0.58) / 0.12; e = u * u; }
        else e = 1;
        R.e = e; R.hit = c >= 0.7 && c < 0.86 ? 1 - (c - 0.7) / 0.16 : 0;
        R.aF = [1.95 - e * 0.75, 0.42 - e * 0.22]; R.item = 'hammer';
        R.aB = [1.2, 0.5];
        R.lean += 0.06 + e * 0.05; R.bob = e * 0.7; R.hy = 0.5; R.look = R.look || [1, 0.9];
        break;
      }
      case 'search': {
        const w = sin(t * 7);
        R.lean += 0.32; R.hy = 1; R.look = R.look || [1, 1.3];
        R.aF = [1.3 + w * 0.16, 0.25 - w * 0.12, 1.08]; R.aB = [1.08 - w * 0.16, 0.3 + w * 0.12, 1.08];
        R.bob = abs(w) * 0.3;
        break;
      }
      case 'eat': {
        const c = (t / 1.3) % 1, e = 0.5 - 0.5 * cos(c * TAU);
        R.e = e; R.item = 'bowl'; R.bob = br * 0.4;
        R.aB = { x: 9.5, y: -27.5, bend: -1 };
        R.aF = { x: 14 - e, y: -30 - e * 5.5, bend: -1 };
        if (e > 0.84) R.mood = 'surprised';
        if (!R.look && e < 0.45) R.look = [0.6, 1];
        break;
      }
      case 'carry': {
        R.carry = o.carry && o.carry !== true ? o.carry : 'box';
        if (o.moving !== false) walkLegs(0.56); else R.bob = br * 0.5;
        break;
      }
      case 'happy':
      case 'cheer': {
        const c = (t / 0.55) % 1, h = sin(c * PI);
        R.y = -h * 7; R.lower = 'hop'; R.tuck = h;
        R.aF = [2.0 + h * 0.25, 0.45, 1.15]; R.aB = [-2.0 - h * 0.25, -0.45, 1.15];
        if (R.mood !== 'wink' && R.mood !== 'surprised') R.mood = 'happy';
        R.look = R.look || [0.3, -0.6];
        break;
      }
      case 'sad':
        R.hy = 2.2; R.tilt = 0.14; R.lean += 0.05; R.bob = 0.8 + sin(t * 1.3) * 0.45;
        R.aF = [0.04, 0.06]; R.aB = [-0.03, 0.06]; R.mood = 'sad'; R.tear = (t / 2.4) % 1;
        if (S.cane) { R.aF = [0.42, -0.08]; R.item = 'cane'; }
        break;
      case 'wave':
        R.aF = [1.65, 1.05 + 0.32 * sin(t * TAU * 2.2), 1.15]; R.bob = br * 0.5; R.tilt = -0.05;
        break;
      case 'sit':
        R.lower = 'sit'; R.uy = SIT_UY; R.aF = [0.95, 0.55]; R.aB = [0.85, 0.55]; R.bob = br * 0.4;
        break;
      case 'cold': {
        R.shiver = sin(t * 47) * 0.45; R.bob = 0.6; R.hy = 1.2; R.tilt = 0.06;
        R.aF = { x: -1, y: -24, bend: 1 }; R.aB = { x: 6, y: -25, bend: 1 };
        if (R.mood === 'happy') R.mood = 'sad';
        break;
      }
      case 'read': {
        R.item = 'book'; R.bob = br * 0.4; R.hy = 0.8; R.look = R.look || [0.8, 1];
        R.aF = { x: 13.5, y: -27, bend: -1 }; R.aB = { x: 9, y: -26, bend: -1 };
        break;
      }
      default: // idle
        R.bob = br * 0.55; R.aF = [0.14 + br * 0.03, 0.32]; R.aB = [-0.12 - br * 0.03, 0.3];
        if (S.cane) { R.aF = [0.5, -0.1]; R.item = 'cane'; }
    }
    if (o.carry && (pose === 'idle' || pose === 'walk')) { R.carry = o.carry === true ? 'box' : o.carry; R.item = null; }
    if (o.seated && SEATABLE[pose]) { R.lower = 'sit'; R.uy = SIT_UY; if (R.item === 'cane') { R.item = null; R.aF = [0.95, 0.55]; } }
    if (R.mood === 'sleep') { R.tilt += 0.08; R.hy += 0.6; }
    return R;
  }

  // ---------- arms ----------
  /** Returns [sx, sy, ex, ey, hx, hy] for an arm given [angle, bend, len] (0 = down, + = forward) or an IK target {x, y, bend}. */
  function armGeom(D, a, front) {
    const sx = front ? D.sF : D.sB, sy = D.sY;
    if (a.length) {
      const ls = a[2] || 1, up = D.up * ls, fo = D.fo * ls;
      const ex = sx + sin(a[0]) * up, ey = sy + cos(a[0]) * up, t2 = a[0] + a[1];
      return [sx, sy, ex, ey, ex + sin(t2) * fo, ey + cos(t2) * fo];
    }
    const up = D.up * (a.ls || 1), fo = D.fo * (a.ls || 1);
    const dx = a.x - sx, dy = a.y - sy, d = Math.hypot(dx, dy) || 1;
    let ex, ey;
    if (d >= up + fo - 0.01) { ex = sx + dx * 0.5; ey = sy + dy * 0.5; }
    else {
      const k = Math.acos(max(-1, min(1, (up * up + d * d - fo * fo) / (2 * up * d))));
      const ang = Math.atan2(dy, dx) + k * (a.bend || 1);
      ex = sx + cos(ang) * up; ey = sy + sin(ang) * up;
    }
    return [sx, sy, ex, ey, a.x, a.y];
  }
  function drawArm(ctx, S, g, front, handOnly) {
    const D = S.D;
    if (!handOnly) limb(ctx, g[0], g[1], g[2], g[3], g[4], g[5], front ? S.sleeve : S.sleeveB, D.armW);
    circ(ctx, g[4], g[5], D.handR, front ? S.skin : S.skinB, 2);
  }

  // ---------- legs & shoes ----------
  function shoe(ctx, x, y, col, s, boots) {
    const h = (boots ? 8.5 : 6) * s, w = 10.5 * s;
    orr(ctx, x - 4 * s, y - h, w, h, 3 * s, col, 2.2);
    ell(ctx, x - 0.6 * s, y - h + 2 * s, 2.2 * s, 1.1 * s, HL);
    if (boots) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - 3.2 * s, y - h + 3.6 * s, 8.6 * s, 1.2 * s); }
  }
  function drawLeg(ctx, S, R, fr) {
    const D = S.D, col = fr ? S.legCol : S.legColB, sc = fr ? S.shoes : S.shoesB;
    const hx = fr ? D.legX : -D.legX + 0.8, hy = D.hipY, ank = 3.2 * D.shoe;
    if (R.lower === 'sit') {
      const sy = hy + R.uy, sw = sin(R.t * 2.6 + (fr ? 0 : 2.2)) * 1.6;
      const kx = hx + (fr ? 9.5 : 8.5), ky = sy + 0.5, ax = kx + 1.2 + sw, ay = ky + D.legL * 0.72;
      seg(ctx, [hx - 1, sy, kx, ky, ax, ay], col, D.legW);
      shoe(ctx, ax, ay + ank, sc, D.shoe, S.boots);
      return;
    }
    let fx = hx + 0.6, fy = 0, kb = 0;
    if (R.lower === 'walk') { const p = R.ph + (fr ? 0 : PI), l = max(0, cos(p)); fx += sin(p) * 4.4; fy = -l * 3.2; kb = l * 2.2; }
    else if (R.lower === 'hop') { fy = -R.tuck * 3; kb = R.tuck * 2.5; fx += (fr ? 0.8 : -0.8) * R.tuck; }
    else if (R.lower === 'lie') { fx = hx * 0.4 + 0.6; }
    const ax = fx, ay = fy - ank;
    limb(ctx, hx, hy, (hx + ax) / 2 + kb, (hy + ay) / 2, ax, ay, col, D.legW);
    shoe(ctx, fx, fy, sc, D.shoe, S.boots);
  }

  // ---------- torso & clothes ----------
  function torsoPath(ctx, D, ext, fl) {
    const t = D.top, b = D.bot + ext, wt = D.wT, wb = D.wB + fl;
    ctx.beginPath();
    ctx.moveTo(-wt + 3, t);
    ctx.lineTo(wt - 3, t);
    ctx.quadraticCurveTo(wt + 1, t, wt + 1.2, t + 4.5);
    ctx.quadraticCurveTo(wb + 1.4, (t + b) / 2 + 2, wb, b - 3.5);
    ctx.quadraticCurveTo(wb, b, wb - 3.5, b);
    ctx.lineTo(-wb + 3.5, b);
    ctx.quadraticCurveTo(-wb, b, -wb, b - 3.5);
    ctx.quadraticCurveTo(-wb - 0.6, (t + b) / 2 + 2, -wt - 1.2, t + 4.5);
    ctx.quadraticCurveTo(-wt - 1, t, -wt + 3, t);
    ctx.closePath();
  }
  function drawTorso(ctx, S, D, back) {
    const st = S.topStyle, coat = st === 'coat';
    const ext = coat ? 5 : 0, fl = coat ? 1.2 : 0, b = D.bot + ext, t = D.top;
    torsoPath(ctx, D, ext, fl);
    ctx.fillStyle = st === 'overalls' ? S.shirt : S.top; ctx.fill();
    ctx.save(); ctx.clip();
    if (st === 'sweater') {
      ctx.fillStyle = S.topD; ctx.fillRect(-D.wB - 2, b - 3.8, 2 * D.wB + 4, 4);
      ctx.strokeStyle = SOFT; ctx.lineWidth = 1.1; ctx.beginPath();
      for (let x = -D.wB + 1.5; x < D.wB; x += 2.6) { ctx.moveTo(x, b - 3.4); ctx.lineTo(x, b); }
      ctx.stroke();
      if (!back) { ctx.fillStyle = S.topL; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-5 + i * 3.6, t + 8.5 + (i % 2) * 1.3, 1.05, 0, TAU); ctx.fill(); } }
    } else if (st === 'hoodie') {
      ctx.fillStyle = S.topD; ctx.fillRect(-D.wB - 2, b - 3, 2 * D.wB + 4, 3.2);
      if (!back) {
        orr(ctx, 0.5, b - 9.5, D.wB + 3, 6, 2.6, S.topD, 1.6);
        line(ctx, D.wT - 2.6, t + 1.5, D.wT - 2, t + 8, P.cream, 1.4);
        circ(ctx, D.wT - 2, t + 8.3, 1.1, P.cream, 1);
      } else { ctx.strokeStyle = SOFT; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, t + 9); ctx.lineTo(0, b - 3.5); ctx.stroke(); }
    } else if (coat) {
      ctx.fillStyle = S.topD; ctx.fillRect(-D.wB - 3, b - 2.6, 2 * D.wB + 6, 3);
      if (!back) {
        ctx.strokeStyle = SOFT; ctx.lineWidth = 1.4; ctx.beginPath();
        ctx.moveTo(D.wB - 3.4, t + 3); ctx.lineTo(D.wB + fl - 3.6, b - 2.6);
        ctx.moveTo(D.wB - 10, b - 9); ctx.lineTo(D.wB - 5.2, b - 9.4); ctx.stroke();
        for (let i = 0; i < 3; i++) orr(ctx, D.wB - 5.3, t + 6 + i * 5.4, 3.8, 2.1, 1, S.btn, 1.2);
      } else {
        ctx.strokeStyle = SOFT; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, t + 6); ctx.lineTo(0, b - 2.6); ctx.stroke();
        orr(ctx, -6, b - 9.5, 12, 2.8, 1.4, S.topD, 1.4);
        circ(ctx, -4.6, b - 8.1, 0.9, S.btn, 0); circ(ctx, 4.6, b - 8.1, 0.9, S.btn, 0);
      }
    } else if (st === 'overalls') {
      ctx.fillStyle = S.top; ctx.fillRect(-D.wB - 2, b - 6.5, 2 * D.wB + 4, 8);
      line(ctx, -D.wB - 2, b - 6.5, D.wB + 2, b - 6.5, OL, 1.8);
      if (!back) {
        orr(ctx, -2.2, t + 5.5, D.wB + 5, 12, 2.5, S.top, 1.8);
        orr(ctx, 2.2, t + 9, 5.6, 4.4, 1.5, S.topD, 1.2);
        line(ctx, -1.2, t + 6.4, -D.wT + 0.5, t - 1, OL, 5.4); line(ctx, -1.2, t + 6.4, -D.wT + 0.5, t - 1, S.top, 2.8);
        circ(ctx, -1, t + 7.3, 1.35, P.sun, 1.2);
      } else {
        for (let s = -1; s <= 1; s += 2) { line(ctx, s * 4, b - 6.5, -s * 6.5, t - 1, OL, 5.4); line(ctx, s * 4, b - 6.5, -s * 6.5, t - 1, S.top, 2.8); }
        orr(ctx, -3.5, b - 6.2, 7, 4.6, 1.5, S.topD, 1.2);
      }
    }
    ctx.fillStyle = HL; K.rr(ctx, -D.wT - 1, t + 3, 3, 8.5, 1.5); ctx.fill();
    ctx.restore();
    torsoPath(ctx, D, ext, fl); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
  }
  function drawHood(ctx, S, D) {
    ell(ctx, -D.wT + 0.2, D.top + 1.2, 7, 5.4, S.topD, LW, -0.25);
    ctx.beginPath(); ctx.ellipse(-D.wT + 0.8, D.top + 1.4, 3.6, 2.4, -0.25, 0, TAU); ctx.fillStyle = sh(S.top, -0.3); ctx.fill();
  }
  function drawApron(ctx, S, D) {
    const c = S.apron, t = D.top, b = D.bot, wy = b - 6.2;
    line(ctx, 1, t + 5.5, -2.2, t - 0.8, OL, 4.6); line(ctx, 1, t + 5.5, -2.2, t - 0.8, c, 2);
    line(ctx, -D.wB - 0.6, wy, 0, wy, OL, 4.4); line(ctx, -D.wB - 0.6, wy, 0, wy, c, 1.9);
    ell(ctx, -D.wB - 3, wy - 1.8, 2.9, 1.9, c, 1.5, -0.55); ell(ctx, -D.wB - 3, wy + 1.8, 2.9, 1.9, c, 1.5, 0.55);
    circ(ctx, -D.wB - 0.9, wy, 1.5, S.apronD, 1.5);
    orr(ctx, -0.6, t + 5.2, D.wB + 2.6, b - t + 0.6, 2.6, c, 2);
    ctx.fillStyle = 'rgba(255,247,234,.85)';
    for (const p of [[2.4, t + 8.5], [7.6, t + 11], [3.6, t + 14.5], [8.6, t + 17.5], [2.6, t + 20]]) { ctx.beginPath(); ctx.arc(p[0], p[1], 0.95, 0, TAU); ctx.fill(); }
    orr(ctx, 3, b - 3.4, 6.2, 4.2, 1.6, S.apronD, 1.3);
  }
  function drawScarf(ctx, S, D, R, back) {
    const c = S.scarf, t = D.top;
    if (back) { // seen from behind: tail hangs down the back
      orr(ctx, 1, t + 1, 5, 11, 2.4, c, 2);
      ctx.fillStyle = S.scarfL; ctx.fillRect(1.2, t + 7.2, 4.6, 1.5);
      orr(ctx, -D.wT - 2.2, t - 2.6, 2 * D.wT + 4.4, 6.4, 3.2, c, 2.2);
      return;
    }
    if (R.blow) {
      const f = sin(R.t * 13) * 0.12;
      ctx.save(); ctx.translate(-D.wT + 1.5, t + 1); ctx.rotate(1.2 + f);
      orr(ctx, -2.6, -1, 5.2, 11, 2.4, S.scarfD, 2);
      ctx.fillStyle = S.scarfL; ctx.fillRect(-2.4, 5.6, 4.8, 1.5);
      ctx.restore();
    }
    orr(ctx, -D.wT - 2.2, t - 2.6, 2 * D.wT + 4.6, 6.4, 3.2, c, 2.2);
    ctx.fillStyle = S.scarfL; ctx.fillRect(-D.wT + 0.5, t - 0.2, 2 * D.wT - 1, 1.3);
    if (!R.blow) {
      ctx.save(); ctx.translate(D.wT - 3.4, t + 1.8); ctx.rotate(-0.1);
      orr(ctx, -2.7, 0, 5.4, 11, 2.4, c, 2);
      ctx.fillStyle = S.scarfL; ctx.fillRect(-2.5, 6.2, 5, 1.5);
      ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let x = -1.6; x <= 1.7; x += 1.65) { ctx.moveTo(x, 11); ctx.lineTo(x, 12.8); }
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- head ----------
  function hairShine(ctx, S, r) {
    ctx.beginPath(); ctx.arc(-r * 0.04, -r * 0.02, r * 0.78, -2.5, -1.85);
    ctx.strokeStyle = S.hairL; ctx.lineWidth = 2; ctx.stroke();
  }
  function hairBack(ctx, S, D, R) {
    const r = D.R, st = S.hairStyle;
    if (st === 'long') {
      ctx.beginPath();
      if (R.lying) { // spread over the pillow
        ctx.moveTo(-r * 0.9, r * 0.1);
        ctx.bezierCurveTo(-r * 1.5, -r * 1.2, -r * 0.6, -r * 2.1, r * 0.2, -r * 1.85);
        ctx.quadraticCurveTo(r * 0.8, -r * 1.6, r * 0.6, -r * 0.9);
      } else {
        const sw = R.sway;
        ctx.moveTo(-r * 0.1, -r * 0.98);
        ctx.bezierCurveTo(-r * 1.45, -r * 0.9, -r * 1.3 + sw * 0.3, r * 0.5, -r * 1.12 + sw, r * 1.62);
        ctx.quadraticCurveTo(-r * 0.92 + sw, r * 1.98, -r * 0.5 + sw * 0.7, r * 1.74);
        ctx.quadraticCurveTo(-r * 0.25, r * 1.1, r * 0.1, r * 0.5);
      }
      ctx.closePath(); ctx.fillStyle = S.hair; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      if (!R.lying) qstroke(ctx, -r * 0.8, r * 0.3, -r * 0.95 + R.sway * 0.4, r * 1.0, -r * 0.82 + R.sway * 0.8, r * 1.5, S.hairD, 1.4);
    } else if (st === 'bun') {
      const bx = -r * 0.5, by = -r * 0.88, br = r * 0.42;
      if (S.curls) {
        blob(ctx, [[bx, by, br * 0.78], [bx - br * 0.6, by + br * 0.25, br * 0.55], [bx + br * 0.5, by - br * 0.35, br * 0.55], [bx - br * 0.35, by - br * 0.6, br * 0.55], [bx + br * 0.55, by + br * 0.35, br * 0.5]], S.hair);
        circ(ctx, bx - br * 0.3, by - br * 0.3, br * 0.22, S.hairL, 0);
      } else {
        circ(ctx, bx, by, br, S.hair);
        ctx.beginPath(); ctx.arc(bx + 0.5, by + 0.5, br * 0.5, -2.2, 1.2); ctx.strokeStyle = S.hairD; ctx.lineWidth = 1.4; ctx.stroke();
        circ(ctx, bx - br * 0.35, by - br * 0.35, br * 0.2, S.hairL, 0);
      }
    } else if (st === 'curly') {
      const cs = [];
      for (let i = 0; i < 8; i++) { const a = -0.25 * PI - i * 0.155 * PI; cs.push([cos(a) * r * 0.95, sin(a) * r * 0.95 - 0.5, r * (0.4 - (i === 7 ? 0.08 : 0))]); }
      blob(ctx, cs, S.hair);
    }
  }
  // Hair cap: covers the crown and the back of the head, leaving a big friendly face.
  function capPath(ctx, r, st) {
    const low = st === 'bob' || st === 'long';
    const a0 = low ? -0.5 : -0.58, x0 = cos(a0) * r, y0 = sin(a0) * r;
    const ro = r + (st === 'bob' ? 2.4 : low ? 2 : st === 'curly' ? 2 : 1.5);
    const nape = (low ? 0.55 : 0.72) * PI;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    if (st === 'spiky') {
      const a1 = nape - TAU, n = 6;
      ctx.lineTo(cos(a0 - 0.05) * ro, sin(a0 - 0.05) * ro);
      for (let i = 0; i < n; i++) {
        const aa = a0 + (a1 - a0) * (i + 0.5) / n, ab = a0 + (a1 - a0) * (i + 1) / n;
        const k = ro + 6.5 - abs(i - 2) * 0.9;
        ctx.quadraticCurveTo(cos(aa) * k, sin(aa) * k, cos(ab) * ro, sin(ab) * ro);
      }
    } else ctx.arc(0, 0, ro, a0 - 0.04, nape, true);
    if (low) {
      ctx.quadraticCurveTo(-r * 0.14, r * 1.1, r * 0.12, r * 0.88);   // lock curls under at the jaw
      ctx.quadraticCurveTo(-r * 0.1, r * 0.42, -r * 0.04, -r * 0.2);  // up the cheek, over the ear
      ctx.quadraticCurveTo(r * 0.32, -r * 0.3, r * 0.58, -r * 0.28);  // blunt bangs
      ctx.quadraticCurveTo(r * 0.76, -r * 0.3, x0, y0);
    } else {
      ctx.quadraticCurveTo(-r * 0.68, r * 0.5, -r * 0.52, r * 0.16);  // back edge to behind the ear
      ctx.quadraticCurveTo(-r * 0.48, -r * 0.22, -r * 0.1, -r * 0.3); // over the ear to the temple
      ctx.quadraticCurveTo(r * 0.2, -r * 0.64, r * 0.48, -r * 0.44);  // swept fringe
      ctx.quadraticCurveTo(r * 0.68, -r * 0.4, x0, y0);
    }
    ctx.closePath();
  }
  function hairCap(ctx, S, D) {
    const r = D.R, st = S.hairStyle;
    let bumps = null;
    if (S.curls || st === 'curly') {
      bumps = [];
      const ro = r + 1.1;
      if (st !== 'curly') for (let i = 0; i < 6; i++) { const a = -0.95 - i * 0.5; bumps.push([cos(a) * ro, sin(a) * ro, 2.3]); }
      bumps.push([r * 0.36, -r * 0.5, 2.3], [r * 0.08, -r * 0.4, 2.2]);
      ctx.fillStyle = OL;
      for (const b of bumps) { ctx.beginPath(); ctx.arc(b[0], b[1], b[2] + LW, 0, TAU); ctx.fill(); }
    }
    capPath(ctx, r, st); ctx.fillStyle = S.hair; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    if (bumps) { ctx.fillStyle = S.hair; for (const b of bumps) { ctx.beginPath(); ctx.arc(b[0], b[1], b[2], 0, TAU); ctx.fill(); } }
    if (st === 'short' && !S.hat) { // cowlick
      ctx.beginPath(); ctx.moveTo(-r * 0.25, -r - 1); ctx.quadraticCurveTo(-r * 0.1, -r - 6, r * 0.25, -r - 4.5);
      ctx.quadraticCurveTo(r * 0.05, -r - 3.5, r * 0.1, -r - 0.8); ctx.fillStyle = S.hair; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OL; ctx.stroke();
    }
    hairShine(ctx, S, r);
  }
  const EAR_X = -0.3, EAR_Y = 0.16;
  function ear(ctx, S, r) {
    ell(ctx, r * EAR_X, r * EAR_Y, 3, 3.8, S.skin, 2);
    ctx.beginPath(); ctx.arc(r * EAR_X + 0.4, r * EAR_Y, 1.5, -1.3, 1.3); ctx.strokeStyle = SOFT; ctx.lineWidth = 1.2; ctx.stroke();
  }
  function beard(ctx, S, r) {
    const ro = r + 1.8;
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, r * 0.02);
    ctx.lineTo(cos(0.66 * PI) * ro, sin(0.66 * PI) * ro);
    ctx.arc(0, 0, ro, 0.66 * PI, 0.15 * PI, true);
    ctx.quadraticCurveTo(r * 0.62, r * 0.84, r * 0.28, r * 0.76);
    ctx.quadraticCurveTo(-r * 0.1, r * 0.72, -r * 0.18, r * 0.2);
    ctx.closePath(); ctx.fillStyle = S.hair; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.82, 0.32 * PI, 0.46 * PI); ctx.strokeStyle = S.hairL; ctx.lineWidth = 1.6; ctx.stroke();
  }
  function drawHat(ctx, S, D, R) {
    const r = D.R, c = S.hatCol;
    switch (S.hat) {
      case 'beanie': {
        ctx.save(); ctx.rotate(-0.1);
        ctx.beginPath(); ctx.moveTo(-r - 2.2, -r * 0.2);
        ctx.bezierCurveTo(-r - 2.4, -r * 1.52, r + 2.4, -r * 1.52, r + 2.2, -r * 0.2); ctx.closePath();
        ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
        ctx.strokeStyle = SOFT; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let x = -8; x <= 8; x += 5.3) { ctx.moveTo(x, -r * 0.45); ctx.quadraticCurveTo(x * 1.05, -r * 0.85, x * 0.7, -r * 1.08); }
        ctx.stroke();
        ell(ctx, -r * 0.5, -r * 0.82, 2.6, 1.5, HL, 0, -0.5);
        circ(ctx, -1, -r * 1.3, 4.6, S.hatL, 2.2);
        circ(ctx, -2.4, -r * 1.3 - 1.4, 1.4, 'rgba(255,255,255,.7)', 0);
        orr(ctx, -r - 3, -r * 0.44, 2 * r + 6, 7.2, 3.5, S.hatD, 2.2);
        ctx.strokeStyle = SOFT; ctx.lineWidth = 1.1; ctx.beginPath();
        for (let x = -r; x <= r + 1; x += 2.8) { ctx.moveTo(x, -r * 0.44 + 1.6); ctx.lineTo(x, -r * 0.44 + 5.6); }
        ctx.stroke();
        ctx.restore(); break;
      }
      case 'cap': {
        ctx.save(); ctx.rotate(-0.06);
        ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.44);
        ctx.quadraticCurveTo(r + 8, -r * 0.66, r + 9.5, -r * 0.22);
        ctx.quadraticCurveTo(r + 3, -r * 0.06, r * 0.35, -r * 0.2); ctx.closePath();
        ctx.fillStyle = S.hatD; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r - 1.8, -r * 0.1);
        ctx.bezierCurveTo(-r - 2, -r * 1.44, r + 1.5, -r * 1.5, r + 1.3, -r * 0.3);
        ctx.quadraticCurveTo(0, -r * 0.44, -r - 1.8, -r * 0.1); ctx.closePath();
        ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-0.5, -r * 1.1); ctx.quadraticCurveTo(r * 0.55, -r * 0.98, r * 0.66, -r * 0.4);
        ctx.strokeStyle = SOFT; ctx.lineWidth = 1.3; ctx.stroke();
        ell(ctx, -r * 0.45, -r * 0.8, 2.8, 1.5, HL, 0, -0.5);
        circ(ctx, -0.5, -r * 1.13, 1.9, S.hatD, 1.5);
        ctx.restore(); break;
      }
      case 'earmuffs': {
        const ex = -r * 0.1, ey = r * 0.16;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(-r * 0.62, -r * 0.7, -r * 0.08, -r - 1.6);
        ctx.lineWidth = 3.2 + 4; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = 3.2; ctx.strokeStyle = S.band; ctx.stroke();
        blob(ctx, [[ex, ey, 4.8], [ex - 2.4, ey - 2.6, 3], [ex + 2.6, ey - 2.2, 3], [ex - 2.6, ey + 2.5, 3], [ex + 2.5, ey + 2.6, 3]], c, 2.2);
        circ(ctx, ex - 1.4, ey - 1.6, 1.6, 'rgba(255,255,255,.75)', 0);
        break;
      }
      case 'bandana': {
        const f = R.blow ? sin(R.t * 12) * 0.15 : 0;
        ctx.save(); ctx.translate(-r - 0.4, -r * 0.32);
        for (const a of [0.35, 0.95]) {
          ctx.save(); ctx.rotate(a + f);
          ctx.beginPath(); ctx.moveTo(0, -1.6); ctx.quadraticCurveTo(-5, -2, -7.5, 1.2); ctx.quadraticCurveTo(-4, 3, 0, 1.6); ctx.closePath();
          ctx.fillStyle = S.hatD; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = OL; ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(-r - 1.8, -r * 0.18);
        ctx.bezierCurveTo(-r - 2, -r * 1.44, r + 1.8, -r * 1.44, r * 0.94, -r * 0.42);
        ctx.quadraticCurveTo(0, -r * 0.62, -r - 1.8, -r * 0.18); ctx.closePath();
        ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        for (const p of [[-6, -r * 0.8], [-1, -r * 1.02], [4.5, -r * 0.82], [-9, -r * 0.45], [8, -r * 0.6]]) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.05, 0, TAU); ctx.fill(); }
        circ(ctx, -r - 0.6, -r * 0.32, 2.4, S.hatD, 1.8);
        break;
      }
    }
  }
  function drawGlasses(ctx, fx, fy, D, r) {
    const g = D.gap / 2, lr = 3.4;
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.5; ctx.strokeStyle = OL;
    ctx.beginPath(); ctx.arc(fx - g, fy, lr, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(fx + g, fy, lr, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx - g - lr, fy - 0.6); ctx.lineTo(-r * 0.12, fy - 1.6); ctx.stroke();
  }
  function drawHead(ctx, S, D, R) {
    const r = D.R, st = S.hairStyle;
    circ(ctx, 0, 0, r, S.skin);
    if (S.beard) beard(ctx, S, r);
    hairCap(ctx, S, D);
    if (st !== 'bob' && st !== 'long' && S.hat !== 'earmuffs') ear(ctx, S, r);
    const fx = r * 0.4, fy = r * 0.17;
    faceB(ctx, fx, fy, D.gap, D.eye, R.mood, R.look, R.blink);
    if (R.tear >= 0 && R.tear < 0.8) tearDrop(ctx, fx + D.gap / 2 + 1.2, fy + 3 + R.tear * 7, 0.9);
    if (S.glasses) drawGlasses(ctx, fx + (R.look ? R.look[0] * 0.3 : 0), fy, D, r);
    if (S.hat) drawHat(ctx, S, D, R);
  }

  // ---------- held things ----------
  function drawHammer(ctx, hx, hy, ang) {
    const dx = sin(ang), dy = cos(ang), L = 12;
    const tx = hx + dx * L, ty = hy + dy * L;
    line(ctx, hx - dx * 2.5, hy - dy * 2.5, tx, ty, OL, 2.8 + 4); line(ctx, hx - dx * 2.5, hy - dy * 2.5, tx, ty, P.woodLight, 2.8);
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(-ang);
    orr(ctx, -5.5, -3, 11, 6, 2, P.metal, 2);
    ctx.fillStyle = HL; ctx.fillRect(-4, -1.8, 4.5, 1.4);
    ctx.restore();
    return [tx, ty];
  }
  function drawBowl(ctx, x, y) {
    ctx.beginPath(); ctx.moveTo(x - 6.8, y - 2.2); ctx.lineTo(x + 6.8, y - 2.2);
    ctx.quadraticCurveTo(x + 6.6, y + 5, x, y + 5); ctx.quadraticCurveTo(x - 6.6, y + 5, x - 6.8, y - 2.2); ctx.closePath();
    ctx.fillStyle = P.sky; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OL; ctx.stroke();
    ctx.fillStyle = HL; ctx.fillRect(x - 4.6, y - 0.6, 2.2, 2.6);
    ell(ctx, x, y - 2.2, 6.8, 1.9, '#ffb86b', 1.8);
    circ(ctx, x - 2, y - 2.4, 0.9, P.leaf, 0); circ(ctx, x + 2.2, y - 2, 0.9, P.coral, 0);
  }
  function drawSpoon(ctx, hx, hy, phi) {
    const L = 8, tx = hx + cos(phi) * L, ty = hy + sin(phi) * L;
    line(ctx, hx - cos(phi) * 2, hy - sin(phi) * 2, tx, ty, OL, 1.8 + 3); line(ctx, hx - cos(phi) * 2, hy - sin(phi) * 2, tx, ty, P.metalLight, 1.8);
    ell(ctx, tx + cos(phi) * 1.5, ty + sin(phi) * 1.5, 2.6, 1.8, P.metalLight, 1.5, phi);
  }
  function drawBook(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25);
    orr(ctx, -7.5, -5, 15, 10, 1.8, P.teal, 2);
    orr(ctx, -6.5, -4.6, 6.3, 8.6, 1, P.cream, 1.2); orr(ctx, 0.2, -4.6, 6.3, 8.6, 1, P.cream, 1.2);
    ctx.strokeStyle = SOFT; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 3; i++) { ctx.moveTo(-5.4, -2.4 + i * 2.2); ctx.lineTo(-1.5, -2.4 + i * 2.2); ctx.moveTo(1.4, -2.4 + i * 2.2); ctx.lineTo(5.3, -2.4 + i * 2.2); }
    ctx.stroke();
    ctx.restore();
  }
  function drawCane(ctx, hx, hy) {
    const fx = hx + 2.5;
    line(ctx, hx, hy - 2, fx, -1.2, OL, 2.6 + 4); line(ctx, hx, hy - 2, fx, -1.2, P.woodDark, 2.6);
    ctx.beginPath(); ctx.arc(hx + 2.6, hy - 2.2, 2.7, PI, TAU);
    ctx.lineWidth = 2.6 + 4; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = P.woodDark; ctx.stroke();
  }

  /** Things carried overhead. Anchor = bottom-centre of the item. Returns [halfWidth, height]. */
  function drawLoad(ctx, kind, x, y) {
    ctx.save(); ctx.translate(x, y);
    let hw = 12, h = 14;
    switch (kind) {
      case 'wood':
        hw = 13; h = 12;
        for (const [ly, lx] of [[-3.2, -1], [-3.2, 1.5], [-8.8, 0]]) {
          if (lx < 0 && ly > -4) continue;
          orr(ctx, -13, ly - 2.8, 24, 5.8, 2.9, P.wood, 2);
          circ(ctx, 11, ly, 2.9, P.woodLight, 1.8);
          circ(ctx, 11, ly, 1, P.woodDark, 0);
        }
        orr(ctx, -13, -6 - 2.8, 24, 5.8, 2.9, P.woodDark, 2);
        circ(ctx, 11, -6, 2.9, P.woodLight, 1.8); circ(ctx, 11, -6, 1, P.woodDark, 0);
        line(ctx, -3, -12, -3, 0, OL, 4); line(ctx, -3, -12, -3, 0, P.coral, 2);
        break;
      case 'parts':
        hw = 12; h = 13;
        orr(ctx, -12, -8, 24, 8, 3, P.metal, 2);
        ctx.save(); ctx.translate(-4, -9); ctx.fillStyle = OL;
        for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.fillRect(-1.8, -6.2, 3.6, 3.4); }
        ctx.restore();
        circ(ctx, -4, -9, 4.6, P.sun, 2); circ(ctx, -4, -9, 1.6, P.metalDark, 1.2);
        orr(ctx, 2, -12.5, 9, 4.5, 2, P.metalDark, 1.8);
        ctx.fillStyle = HL; ctx.fillRect(-10, -6.5, 6, 1.6);
        break;
      case 'cloth':
        hw = 12; h = 13;
        orr(ctx, -12, -5, 24, 5, 2.4, P.lilac, 2);
        orr(ctx, -11, -9.5, 22, 5, 2.4, P.mint, 2);
        orr(ctx, -12, -14, 24, 5, 2.4, P.pink, 2);
        ctx.fillStyle = 'rgba(255,255,255,.7)'; for (const p of [[-7, -11.5], [-1, -11.5], [5, -11.5]]) { ctx.beginPath(); ctx.arc(p[0], p[1], 0.9, 0, TAU); ctx.fill(); }
        break;
      case 'food':
        hw = 12; h = 15;
        circ(ctx, -5, -10, 4, P.berry, 1.8); circ(ctx, 1, -11.5, 4, P.leaf, 1.8);
        ctx.beginPath(); ctx.moveTo(5, -9); ctx.lineTo(10, -16); ctx.lineTo(8, -8); ctx.closePath(); ctx.fillStyle = P.coral; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = OL; ctx.stroke();
        orr(ctx, -12, -9, 24, 9, 3, P.woodLight, 2);
        ctx.strokeStyle = SOFT; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-12, -4.5); ctx.lineTo(12, -4.5);
        ctx.moveTo(-4, -9); ctx.lineTo(-4, 0); ctx.moveTo(4, -9); ctx.lineTo(4, 0); ctx.stroke();
        break;
      case 'water':
        hw = 10; h = 16;
        orr(ctx, -10, -13, 20, 13, 4, P.sky, 2);
        orr(ctx, 2, -16.5, 6, 4.5, 1.6, P.skyDeep, 1.8);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; K.rr(ctx, -7.5, -10.5, 3, 7, 1.5); ctx.fill();
        line(ctx, -6, -13, -1, -16, OL, 2.4); line(ctx, -1, -16, 1.5, -13, OL, 2.4);
        break;
      case 'meds':
        hw = 11; h = 13;
        orr(ctx, -11, -12, 22, 12, 3.5, P.cream, 2);
        orr(ctx, -4, -14.5, 8, 3.5, 1.5, P.mint, 1.8);
        ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.bezierCurveTo(-6, -6, -4, -10.5, 0, -8.4); ctx.bezierCurveTo(4, -10.5, 6, -6, 0, -2.6);
        ctx.fillStyle = P.rose; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = OL; ctx.stroke();
        break;
      default: // box
        hw = 12; h = 14;
        orr(ctx, -12, -14, 24, 14, 3, P.woodLight, 2.2);
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-10, -12.5, 8, 2);
        ctx.strokeStyle = SOFT; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(12, -7); ctx.stroke();
        orr(ctx, -2.6, -14, 5.2, 14, 1, P.sunLight, 1.4);
    }
    ctx.restore();
    return [hw, h];
  }

  // ---------- full standing renderer ----------
  function drawFigure(ctx, S, R, o) {
    const D = S.D;
    if (!R.lying && o.shadow !== false) {
      const k = 1 - min(0.5, -R.y / 14);
      ell(ctx, 1 + (R.lower === 'sit' ? 4 : 0), 0, 14 * k, 3.6 * k, P.shadow);
    }
    ctx.save();
    if (R.y || R.shiver) ctx.translate(R.shiver, R.y);
    const pivot = D.hipY + R.uy;
    const U = () => { ctx.translate(0, pivot); if (R.lean) ctx.rotate(R.lean); ctx.translate(0, -D.hipY + R.bob); };
    const H = () => { U(); ctx.translate(D.hX + R.hx, D.hY + R.hy); if (R.tilt) ctx.rotate(R.tilt); };
    const carry = R.carry;
    const gF = carry ? null : armGeom(D, R.aF, true), gB = carry ? null : armGeom(D, R.aB, false);
    // carried load: hands at the load's sides, arms tucked behind the big head
    let load = null;
    if (carry) {
      const lx = D.hX + R.hx, ly = D.hY - D.R - 3.5;
      load = { x: lx, y: ly };
      load.gF = armGeom(D, { x: lx + 11.5, y: ly - 5 }, true);
      load.gB = armGeom(D, { x: lx - 11, y: ly - 5.5 }, false);
    }

    // 1 · hair behind the head
    ctx.save(); H(); hairBack(ctx, S, D, R); ctx.restore();
    // 2 · back arm, hood
    ctx.save(); U();
    if (gB) drawArm(ctx, S, gB, false);
    if (S.topStyle === 'hoodie') drawHood(ctx, S, D);
    ctx.restore();
    // 3 · legs
    drawLeg(ctx, S, R, false);
    if (R.lower !== 'sit') drawLeg(ctx, S, R, true);
    // 4 · torso
    ctx.save(); U();
    if (load) { limb(ctx, load.gB[0], load.gB[1], load.gB[2], load.gB[3], load.gB[4], load.gB[5], S.sleeveB, D.armW); limb(ctx, load.gF[0], load.gF[1], load.gF[2], load.gF[3], load.gF[4], load.gF[5], S.sleeve, D.armW); }
    drawTorso(ctx, S, D, false);
    ctx.restore();
    if (R.lower === 'sit') drawLeg(ctx, S, R, true);
    ctx.save(); U();
    if (S.apron) drawApron(ctx, S, D);
    if (S.scarf) drawScarf(ctx, S, D, R, false);
    ctx.restore();
    // 5 · head
    ctx.save(); H(); drawHead(ctx, S, D, R); ctx.restore();
    // 6 · held things + front arm
    ctx.save(); U();
    if (load) {
      drawLoad(ctx, carry, load.x, load.y);
      drawArm(ctx, S, load.gB, false, true);
      drawArm(ctx, S, load.gF, true, true);
    } else {
      if (R.item === 'bowl') {
        drawBowl(ctx, gB[4] + 0.5, gB[5] - 2.6);
        drawSpoon(ctx, gF[4], gF[5], 2.45 + R.e * 1.25);
      } else if (R.item === 'book') drawBook(ctx, (gF[4] + gB[4]) / 2, (gF[5] + gB[5]) / 2 - 3);
      else if (R.item === 'cane') drawCane(ctx, gF[4], gF[5] - (R.lower === 'stand' ? 0 : 0));
      else if (R.item === 'hammer') {
        const t2 = R.aF[0] + R.aF[1];
        const tip = drawHammer(ctx, gF[4], gF[5], t2 - 0.9 + (1 - R.e) * 1.35);
        if (R.hit > 0) sparkle(ctx, tip[0] + 6, tip[1] + 2, 2.5 + R.hit * 3, P.white);
      }
      if (R.pose === 'cold') drawArm(ctx, S, gB, false, true);
      drawArm(ctx, S, gF, true);
    }
    ctx.restore();
    ctx.restore();
  }

  // ---------- back view (ladder) ----------
  function drawClimb(ctx, S, o) {
    const D = S.D, t = +o.t || 0, r = D.R, st = S.hairStyle;
    const ph = t * TAU / 0.7, s = sin(ph);
    const by = -abs(cos(ph)) * 1.2;
    const R = { t, blow: 0, sway: 0 };
    if (o.shadow !== false) ell(ctx, 0, 0, 11, 3, P.shadow);
    ctx.save(); ctx.translate(0, by);
    // legs: one foot up on the next rung
    for (const side of [-1, 1]) {
      const lift = max(0, side * s) * 7, x = side * 3.8;
      const ax = x + side * 0.4, ay = -lift - 3.2 * D.shoe;
      limb(ctx, side * 3.4, D.hipY, x + side * (lift * 0.25), (D.hipY + ay) / 2, ax, ay, side < 0 ? S.legColB : S.legCol, D.legW);
      orr(ctx, ax - 4, -lift - 5.5 * D.shoe, 8, 5.5 * D.shoe, 2.6, side < 0 ? S.shoesB : S.shoes, 2.2);
    }
    // arms reach up to the rails, alternating
    const sx = D.wT - 1.5;
    const arms = [];
    for (const side of [-1, 1]) {
      const hy = D.hY - 2 - side * s * 5, hx = side * 15;
      arms.push([side * sx, D.sY - 1, side * (sx + 6), (D.sY + hy) / 2, hx, hy]);
    }
    for (const a of arms) limb(ctx, a[0], a[1], a[2], a[3], a[4], a[5], S.sleeve, D.armW);
    if (st === 'long') { // hair down the back
      ctx.beginPath(); ctx.moveTo(-r * 0.75, D.hY); ctx.quadraticCurveTo(-r * 0.95, D.top + 8, -r * 0.55, D.top + 12);
      ctx.quadraticCurveTo(0, D.top + 15, r * 0.55, D.top + 12); ctx.quadraticCurveTo(r * 0.95, D.top + 8, r * 0.75, D.hY); ctx.closePath();
      ctx.fillStyle = S.hair; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    }
    if (S.topStyle === 'hoodie') { ell(ctx, 0, D.top + 3.5, 7.5, 5.2, S.topD, LW); }
    drawTorso(ctx, S, D, true);
    if (S.topStyle === 'hoodie') { ell(ctx, 0, D.top + 3, 7.4, 5, S.topD, LW); ctx.beginPath(); ctx.ellipse(0, D.top + 2.4, 4, 2.4, 0, 0, TAU); ctx.fillStyle = sh(S.top, -0.3); ctx.fill(); }
    if (st === 'long') {
      ctx.beginPath(); ctx.moveTo(-r * 0.62, D.top - 1); ctx.quadraticCurveTo(-r * 0.7, D.top + 8, -r * 0.4, D.top + 11);
      ctx.quadraticCurveTo(0, D.top + 13.5, r * 0.4, D.top + 11); ctx.quadraticCurveTo(r * 0.7, D.top + 8, r * 0.62, D.top - 1); ctx.closePath();
      ctx.fillStyle = S.hair; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    }
    if (S.apron) {
      const wy = D.bot - 6.2;
      line(ctx, -D.wB - 1, wy, D.wB + 1, wy, OL, 4.4); line(ctx, -D.wB - 1, wy, D.wB + 1, wy, S.apron, 1.9);
      ell(ctx, -2.8, wy - 0.4, 3, 2, S.apron, 1.5, 0.4); ell(ctx, 2.8, wy - 0.4, 3, 2, S.apron, 1.5, -0.4);
      line(ctx, -1.5, wy + 1, -2.5, wy + 5, OL, 3.6); line(ctx, -1.5, wy + 1, -2.5, wy + 5, S.apron, 1.6);
      line(ctx, 1.5, wy + 1, 2.5, wy + 5, OL, 3.6); line(ctx, 1.5, wy + 1, 2.5, wy + 5, S.apron, 1.6);
      circ(ctx, 0, wy, 1.6, S.apronD, 1.5);
      line(ctx, -2, D.top - 1, -2.2, D.top + 3, OL, 4); line(ctx, -2, D.top - 1, -2.2, D.top + 3, S.apron, 1.8);
    }
    if (S.scarf) drawScarf(ctx, S, D, R, true);
    // head from behind
    ctx.save(); ctx.translate(0, D.hY);
    if (st === 'bun') {
      if (S.curls) blob(ctx, [[0, -r * 1.02, r * 0.34], [-r * 0.28, -r * 0.9, r * 0.26], [r * 0.28, -r * 0.92, r * 0.26], [0, -r * 1.25, r * 0.24]], S.hair);
      else circ(ctx, 0, -r * 1.02, r * 0.38, S.hair);
    }
    if (st === 'curly') { const cs = []; for (let i = 0; i < 9; i++) { const a = PI * 0.1 - i * PI * 0.15; cs.push([cos(a) * r * 0.95, sin(a) * r * 0.95, r * 0.38]); } blob(ctx, cs, S.hair); }
    ell(ctx, -r * 0.98, r * 0.18, 2.6, 3.4, S.skin, 2); ell(ctx, r * 0.98, r * 0.18, 2.6, 3.4, S.skin, 2);
    circ(ctx, 0, 0, r, S.skin);
    const low = st === 'bob' || st === 'long';
    const ro = r + (st === 'bob' ? 2.6 : low ? 2.1 : 1.6);
    ctx.beginPath();
    if (st === 'spiky') {
      const a0 = 0.2 * PI, a1 = 0.8 * PI - TAU, n = 8;
      ctx.moveTo(cos(a0) * ro, sin(a0) * ro);
      for (let i = 0; i < n; i++) {
        const aa = a0 + (a1 - a0) * (i + 0.5) / n, ab = a0 + (a1 - a0) * (i + 1) / n;
        ctx.quadraticCurveTo(cos(aa) * (ro + 6.5), sin(aa) * (ro + 6.5), cos(ab) * ro, sin(ab) * ro);
      }
    } else ctx.arc(0, 0, ro, (low ? 0.42 : 0.2) * PI, (low ? 0.58 : 0.8) * PI, true);
    if (low) ctx.quadraticCurveTo(0, r * 1.05, cos(0.42 * PI) * ro, sin(0.42 * PI) * ro);
    else { const nx = cos(0.2 * PI) * ro; ctx.quadraticCurveTo(-nx * 0.5, r * 0.45, 0, r * 0.62); ctx.quadraticCurveTo(nx * 0.5, r * 0.45, nx, sin(0.2 * PI) * ro); }
    ctx.closePath(); ctx.fillStyle = S.hair; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    if (S.curls || st === 'curly') { ctx.fillStyle = S.hairD; for (const p of [[-5, -4], [3, -7], [6, 2], [-3, 5]]) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.4, 0, TAU); ctx.fill(); } }
    ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.1, r * 0.75, -2.6, -1.9); ctx.strokeStyle = S.hairL; ctx.lineWidth = 2; ctx.stroke();
    // hats from behind
    const c = S.hatCol;
    if (S.hat === 'beanie') {
      ctx.beginPath(); ctx.moveTo(-r - 2.2, -r * 0.25); ctx.bezierCurveTo(-r - 2.4, -r * 1.55, r + 2.4, -r * 1.55, r + 2.2, -r * 0.25); ctx.closePath();
      ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      circ(ctx, 0, -r * 1.3, 4.6, S.hatL, 2.2);
      orr(ctx, -r - 3, -r * 0.48, 2 * r + 6, 7.2, 3.5, S.hatD, 2.2);
    } else if (S.hat === 'cap') {
      ctx.beginPath(); ctx.moveTo(-r - 1.8, -r * 0.2); ctx.bezierCurveTo(-r - 2, -r * 1.48, r + 2, -r * 1.48, r + 1.8, -r * 0.2);
      ctx.quadraticCurveTo(0, -r * 0.4, -r - 1.8, -r * 0.2); ctx.closePath();
      ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      orr(ctx, -3.5, -r * 0.62, 7, 3.6, 1.8, S.skin, 1.6);
      circ(ctx, 0, -r * 1.14, 1.9, S.hatD, 1.5);
    } else if (S.hat === 'earmuffs') {
      ctx.beginPath(); ctx.arc(0, 0, r + 1.6, PI * 1.05, PI * 1.95);
      ctx.lineWidth = 7.2; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = 3.2; ctx.strokeStyle = S.band; ctx.stroke();
      for (const sd of [-1, 1]) blob(ctx, [[sd * r * 0.95, r * 0.12, 5.2], [sd * (r * 0.95 + 2), r * 0.12 - 2.4, 3], [sd * (r * 0.95 + 2), r * 0.12 + 2.4, 3]], c, 2.2);
    } else if (S.hat === 'bandana') {
      ctx.beginPath(); ctx.moveTo(-r - 1.8, -r * 0.25); ctx.bezierCurveTo(-r - 2, -r * 1.48, r + 2, -r * 1.48, r + 1.8, -r * 0.25);
      ctx.quadraticCurveTo(0, -r * 0.05, -r - 1.8, -r * 0.25); ctx.closePath();
      ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      for (const a of [-0.4, 0.4]) { ctx.save(); ctx.translate(0, -r * 0.12); ctx.rotate(a); orr(ctx, -1.8, 0, 3.6, 8, 1.8, S.hatD, 1.8); ctx.restore(); }
      circ(ctx, 0, -r * 0.12, 2.4, S.hatD, 1.8);
    }
    ctx.restore();
    // hands on the rails
    for (const a of arms) circ(ctx, a[4], a[5], D.handR, S.skin, 2);
    ctx.restore();
  }

  // ---------- lying on its back ----------
  function drawSleep(ctx, S, o) {
    const D = S.D, t = +o.t || 0;
    const R = rig(S, Object.assign({}, o, { pose: 'idle', carry: null, seated: false }));
    const b = sin(t * 1.7);
    R.lying = true; R.lower = 'lie'; R.mood = 'sleep'; R.tilt = 0; R.hy = 0; R.bob = 0; R.y = 0; R.lean = 0;
    R.hx = 2.5; R.item = null; R.blink = false; R.look = null; R.tear = -1; R.blow = 0; R.sway = 0;
    R.aF = [1.55 + b * 0.04, 0.35]; R.aB = [1.35 + b * 0.04, 0.45];
    const top = D.hY - D.R - (S.hat ? 6 : 2);
    const X0 = -top / 2, Y0 = -(S.backR - D.hX - R.hx);
    if (o.shadow !== false) ell(ctx, 0, 0, 31, 3.4, P.shadow);
    ctx.save();
    ctx.translate(X0 - 1, Y0); ctx.rotate(-PI / 2);
    drawFigure(ctx, S, R, o);
    ctx.restore();
  }

  function character(ctx, spec, o) {
    o = o || EMPTY;
    const S = resolve(spec);
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const pose = o.pose || 'idle';
    if (pose === 'sleep') drawSleep(ctx, S, o);
    else if (pose === 'climb') drawClimb(ctx, S, o);
    else drawFigure(ctx, S, rig(S, o), o);
    ctx.restore();
  }
  K.character = character;

  // ---------- presets ----------
  const SPECS = {
    ece: {
      skin: P.skin3, hair: P.hairBlack, hairStyle: 'bun', curls: true, hat: null,
      top: '#f4b73f', topStyle: 'sweater', bottom: '#6e5c9c', shoes: P.woodDeep, apron: P.coral, age: 'adult', blink: 0,
    },
    mert: {
      skin: P.skin1, hair: P.hairRed, hairStyle: 'short', hat: 'beanie', hatColor: P.sun,
      top: P.teal, topStyle: 'overalls', shirt: '#ffe3cf', bottom: P.teal, shoes: P.woodDark, beard: true, age: 'adult', blink: 1.1,
    },
    lale: {
      skin: P.skin2, hair: P.hairPink, hairStyle: 'long', hat: 'earmuffs', hatColor: P.cream, hatColor2: P.plum,
      top: P.lilac, topStyle: 'hoodie', bottom: '#5e5f96', shoes: P.mint, age: 'adult', blink: 2.3,
    },
    deniz: {
      skin: P.skin4, hair: P.hairBlack, hairStyle: 'short', hat: 'cap', hatColor: P.coral,
      top: P.sky, topStyle: 'coat', bottom: '#5b6fae', shoes: P.berry, boots: true, scarf: P.sun, age: 'kid', blink: 0.6,
    },
    nermin: {
      skin: P.skin1, hair: '#dcd7e8', hairStyle: 'bun', hat: null,
      top: P.plum, topStyle: 'coat', bottom: '#a58fcf', shoes: P.woodDeep, glasses: true, age: 'old', cane: true, blink: 1.7,
    },
  };
  const DESC = {
    ece: 'Ece the cook: warm brown skin, curly black bun, mustard sweater and a dotted coral apron.',
    mert: 'Mert the handyman: red hair and beard, mustard beanie, teal overalls.',
    lale: 'Lale the runner: long pink hair, cream earmuffs, lilac hoodie and mint sneakers.',
    deniz: 'Deniz, the kid who joins later: coral cap, sky duffle coat, yellow scarf and rain boots.',
    nermin: 'Nermin, the elderly neighbour: grey bun, round glasses, plum coat and a walking stick.',
  };
  const POSES = ['idle', 'walk', 'work', 'search', 'climb', 'sleep', 'sit', 'eat', 'carry', 'happy', 'sad', 'wave'];
  K.characterSpecs = SPECS;
  K.characterPoses = POSES.concat(['cold', 'read', 'cheer']);
  for (const id in SPECS) {
    const spec = SPECS[id];
    K.define('char.' + id, {
      w: 50, h: 80, tags: ['char', id === 'nermin' ? 'npc' : 'survivor'],
      states: { mood: ['happy', 'sad', 'sleep'], pose: POSES },
      defaults: { pose: 'idle', mood: 'happy' },
      desc: DESC[id],
      draw(ctx, o) { character(ctx, spec, o); },
    });
  }

  // =====================================================================
  //  Critters
  // =====================================================================
  /** Quadruped leg: hip at (x, top), paw resting on the floor; ph animates a step. */
  function qLeg(ctx, x, top, col, w, ph, walk, stride, liftK) {
    let dx = 0, lift = 0;
    if (walk) { dx = sin(ph) * (stride || 3); lift = max(0, cos(ph)) * (liftK || 2.2); }
    const ey = -(w / 2 + LW) - lift;
    limb(ctx, x, top, x + dx * 0.4 + lift * 0.3, (top + ey) / 2, x + dx, ey, col, w);
  }

  // ----- Pamuk the cat -----
  const CAT = { fur: '#fff4e6', furB: '#eedfcc', patch: '#f5a862', inner: P.pink, nose: P.rose };
  function catEar(ctx, x, y, a, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-4.4, 2.5); ctx.quadraticCurveTo(-3.4, -5.5, -0.6, -8.4); ctx.quadraticCurveTo(2.6, -6, 4.4, 2); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = LW / s; ctx.strokeStyle = OL; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.4, 1); ctx.quadraticCurveTo(-1.8, -3.8, -0.6, -5.4); ctx.quadraticCurveTo(1.2, -3.8, 2.2, 1); ctx.closePath();
    ctx.fillStyle = CAT.inner; ctx.fill();
    ctx.restore();
  }
  function catHead(ctx, x, y, r, mood, look, tilt, blink, earCol) {
    ctx.save(); ctx.translate(x, y); if (tilt) ctx.rotate(tilt);
    catEar(ctx, -r * 0.5, -r * 0.6, -0.42, r / 9.5, CAT.patch);
    catEar(ctx, r * 0.4, -r * 0.68, 0.3, r / 9.5, earCol || CAT.fur);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.08, r, 0, 0, TAU);
    ctx.fillStyle = CAT.fur; ctx.fill();
    ctx.save(); ctx.clip();
    ell(ctx, -r * 0.62, -r * 0.62, r * 0.62, r * 0.48, CAT.patch);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.08, r, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    const fx = r * 0.36, fy = r * 0.12;
    faceB(ctx, fx, fy, 6.2, 2, mood, look, blink);
    ell(ctx, fx, fy + 2.4, 1.3, 0.85, CAT.nose);
    ctx.strokeStyle = SOFT; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(r * 0.92, fy + 2.4); ctx.lineTo(r * 1.42, fy + 1.6);
    ctx.moveTo(r * 0.92, fy + 3.8); ctx.lineTo(r * 1.4, fy + 4.4);
    ctx.stroke();
    ctx.restore();
  }
  function catTail(ctx, x1, y1, cx, cy, x2, y2, w) {
    limb(ctx, x1, y1, (x1 + 2 * cx + x2) / 4, (y1 + 2 * cy + y2) / 4, x2, y2, CAT.fur, w);
    const p = qpt(x1, y1, cx, cy, x2, y2, 0.62), c2 = qpt(x1, y1, cx, cy, x2, y2, 0.82);
    qstroke(ctx, p[0], p[1], c2[0], c2[1], x2, y2, CAT.patch, w);
  }
  function drawCat(ctx, o) {
    const t = +o.t || 0, pose = o.pose || 'idle', look = o.look || null;
    const blink = o.blink !== false && blinkAt(t, 0.4);
    let mood = o.mood || 'happy';
    if (pose === 'sleep') {
      const b = sin(t * 1.6) * 0.5;
      shadow0(ctx, 18);
      catTail(ctx, -13, -5, -6, 2, 10, -1.5, 4.4);
      ctx.beginPath(); ctx.ellipse(-1.5, -8.3 - b * 0.5, 15, 8.3 + b * 0.5, 0, 0, TAU); ctx.fillStyle = CAT.fur; ctx.fill();
      ctx.save(); ctx.clip(); ell(ctx, -5, -15, 8, 5, CAT.patch); ell(ctx, 6, -16, 3, 2.2, CAT.patch); ctx.restore();
      ctx.beginPath(); ctx.ellipse(-1.5, -8.3 - b * 0.5, 15, 8.3 + b * 0.5, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      catTail(ctx, -14, -3.5, -2, 2.5, 14, -2.5, 4.4);
      ell(ctx, 11.5, -3, 3.4, 2.4, CAT.fur, 2);
      catHead(ctx, 8, -10, 8, 'sleep', null, 0.22, false);
      return;
    }
    if (pose === 'sit') {
      const b = sin(t * 2) * 0.35, fl = sin(t * 1.4) * 1.5;
      shadow0(ctx, 13);
      ctx.beginPath(); ctx.ellipse(-1.5, -12.5, 8.8, 11.6 + b * 0.3, 0, 0, TAU); ctx.fillStyle = CAT.fur; ctx.fill();
      ctx.save(); ctx.clip(); ell(ctx, -7, -16, 6, 7, CAT.patch); ctx.restore();
      ctx.beginPath(); ctx.ellipse(-1.5, -12.5, 8.8, 11.6 + b * 0.3, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      ell(ctx, -5, -6, 6.6, 5.4, CAT.fur, LW);
      ctx.save(); ctx.beginPath(); ctx.ellipse(-5, -6, 6.6, 5.4, 0, 0, TAU); ctx.clip(); ell(ctx, -8.5, -9, 4, 3.5, CAT.patch); ctx.restore();
      ctx.beginPath(); ctx.ellipse(-5, -6, 6.6, 5.4, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      limb(ctx, 2.5, -13, 2.6, -9, 2.8, -4.75, CAT.furB, 4.4);
      limb(ctx, 5.8, -13, 6, -9, 6.3, -4.75, CAT.fur, 4.4);
      catTail(ctx, -10, -3.2, -2, 2.5, 11 + fl, -2.6, 4.2);
      catHead(ctx, 2.5, -27 + b, 9.5, mood, look || [0.4, 0], 0.04, blink);
      return;
    }
    const walk = pose === 'walk', ph = t * TAU / 0.42;
    const bob = walk ? abs(sin(ph)) * 0.9 : sin(t * 2.2) * 0.35;
    const sw = walk ? sin(ph * 0.5) * 2 : sin(t * 1.7) * 3;
    shadow0(ctx, 17);
    catTail(ctx, -12, -15 - bob, -22 + sw * 0.3, -15, -19 + sw, -30 - (walk ? 2 : 0), 4.6);
    qLeg(ctx, -11.5, -12, CAT.furB, 4.4, ph, walk);
    qLeg(ctx, 2.5, -12, CAT.furB, 4.4, ph + PI, walk);
    ctx.beginPath(); ctx.ellipse(-2.5, -14.5 - bob, 12.5, 7.4, 0, 0, TAU); ctx.fillStyle = CAT.fur; ctx.fill();
    ctx.save(); ctx.clip(); ell(ctx, -6.5, -21 - bob, 7.5, 5, CAT.patch); ell(ctx, -13, -14, 3, 4, CAT.patch); ctx.restore();
    ctx.beginPath(); ctx.ellipse(-2.5, -14.5 - bob, 12.5, 7.4, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    qLeg(ctx, -8, -12, CAT.fur, 4.4, ph + PI, walk);
    qLeg(ctx, 6, -12, CAT.fur, 4.4, ph, walk);
    orr(ctx, 4, -17.5 - bob, 8, 3, 1.5, P.rose, 1.6);
    circ(ctx, 8.5, -13.8 - bob, 1.7, P.sun, 1.3);
    catHead(ctx, 9.5, -24.5 - bob * 1.2, 9.5, mood, look, walk ? 0 : sin(t * 0.9) * 0.05, blink);
  }
  function shadow0(ctx, rx) { ell(ctx, 0, 0, rx, 3.2, P.shadow); }

  // ----- the puppy -----
  const DOG = { fur: '#f3c690', furB: '#dfae78', ear: '#a96f47', light: '#fff3df', collar: P.sky, tag: P.sun };
  function dogHead(ctx, x, y, r, mood, look, tilt, blink, flop, tongue) {
    ctx.save(); ctx.translate(x, y); if (tilt) ctx.rotate(tilt);
    // far ear peeks over the crown
    ctx.save(); ctx.translate(r * 0.3, -r * 0.78); ctx.rotate(0.5 + flop * 0.5);
    ell(ctx, 0, 2, 3, 4.6, sh(DOG.ear, -0.12), 2); ctx.restore();
    circ(ctx, 0, 0, r, DOG.fur);
    ell(ctx, -r * 0.35, -r * 0.55, 2.8, 1.6, HL, 0, -0.5);
    ell(ctx, r * 0.74, r * 0.4, r * 0.56, r * 0.42, DOG.light, 2);
    if (tongue) {
      ctx.beginPath(); ctx.moveTo(r * 0.55, r * 0.72); ctx.quadraticCurveTo(r * 0.6, r * 1.15 + tongue, r * 0.82, r * 1.1 + tongue);
      ctx.quadraticCurveTo(r * 1.0, r * 1.0, r * 0.92, r * 0.72); ctx.closePath();
      ctx.fillStyle = P.rose; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = OL; ctx.stroke();
    }
    faceB(ctx, r * 0.4, -r * 0.08, 6.2, 2.1, mood, look, blink);
    ell(ctx, r * 1.2, r * 0.16, 2.4, 1.8, OL); circ(ctx, r * 1.2 - 0.8, r * 0.16 - 0.7, 0.6, '#fff', 0);
    // near floppy ear
    ctx.save(); ctx.translate(-r * 0.28, -r * 0.7); ctx.rotate(flop);
    ctx.beginPath(); ctx.moveTo(-3.2, 0); ctx.quadraticCurveTo(-7, 6.5, -4.6, 12.2);
    ctx.quadraticCurveTo(-1.4, 14.6, 1.8, 11.4); ctx.quadraticCurveTo(3.4, 5, 3.6, 0); ctx.closePath();
    ctx.fillStyle = DOG.ear; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
  function dogTail(ctx, x1, y1, x2, y2, w) {
    limb(ctx, x1, y1, (x1 + x2) / 2 - 1.5, (y1 + y2) / 2, x2, y2, DOG.fur, w);
    qstroke(ctx, x1 + (x2 - x1) * 0.7, y1 + (y2 - y1) * 0.7, x1 + (x2 - x1) * 0.85, y1 + (y2 - y1) * 0.85, x2, y2, DOG.light, w);
  }
  function drawDog(ctx, o) {
    const t = +o.t || 0, pose = o.pose || 'idle', look = o.look || null;
    const blink = o.blink !== false && blinkAt(t, 1.9);
    const mood = o.mood || 'happy';
    if (pose === 'sleep') {
      const b = sin(t * 1.5) * 0.5;
      shadow0(ctx, 19);
      dogTail(ctx, -14, -6, -18, -2, 4.6);
      ctx.beginPath(); ctx.ellipse(-2, -8.5 - b * 0.5, 15.5, 8.5 + b * 0.5, 0, 0, TAU); ctx.fillStyle = DOG.fur; ctx.fill();
      ctx.save(); ctx.clip(); ell(ctx, -6, -15.5, 7, 4.2, DOG.furB); ctx.restore();
      ctx.beginPath(); ctx.ellipse(-2, -8.5 - b * 0.5, 15.5, 8.5 + b * 0.5, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      ell(ctx, 13, -3, 3.6, 2.6, DOG.light, 2); ell(ctx, 8.5, -2.8, 3.4, 2.5, DOG.light, 2);
      dogHead(ctx, 9, -9.5, 8.4, 'sleep', null, 0.28, false, 0.5, 0);
      return;
    }
    if (pose === 'sit') {
      const wag = sin(t * 12) * 2.2, pant = abs(sin(t * 5)) * 0.8;
      shadow0(ctx, 14);
      dogTail(ctx, -8, -3.5, -16 + wag, -3 - abs(wag) * 0.6, 4.6);
      ctx.beginPath(); ctx.ellipse(-1.5, -13, 9.2, 12, 0, 0, TAU); ctx.fillStyle = DOG.fur; ctx.fill();
      ctx.save(); ctx.clip(); ell(ctx, 5, -12, 4.5, 8, DOG.light); ctx.restore();
      ctx.beginPath(); ctx.ellipse(-1.5, -13, 9.2, 12, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      ell(ctx, -5, -6, 7, 5.6, DOG.fur, LW);
      ell(ctx, -1.5, -1.8, 4, 2.2, DOG.light, 2);
      limb(ctx, 2.5, -13, 2.6, -9, 2.8, -5, DOG.furB, 5);
      limb(ctx, 6, -13, 6.2, -9, 6.6, -5, DOG.fur, 5);
      ell(ctx, 7.4, -2.2, 3, 2.1, DOG.light, 1.8);
      orr(ctx, -2, -23.5, 10, 3.2, 1.6, DOG.collar, 1.6); circ(ctx, 5.5, -19.4, 1.9, DOG.tag, 1.3);
      dogHead(ctx, 3, -29, 10, mood, look || [0.4, 0], -0.04, blink, sin(t * 2) * 0.05, pant);
      return;
    }
    const walk = pose === 'walk', ph = t * TAU / 0.4;
    const bob = walk ? abs(sin(ph)) * 1 : sin(t * 2.4) * 0.35;
    const wag = sin(t * (walk ? 10 : 13)) * 2.6;
    shadow0(ctx, 18);
    dogTail(ctx, -14, -17 - bob, -19 + wag, -25 - bob, 4.6);
    qLeg(ctx, -11, -12, DOG.furB, 5, ph, walk);
    qLeg(ctx, 3, -12, DOG.furB, 5, ph + PI, walk);
    ctx.beginPath(); ctx.ellipse(-3, -15 - bob, 13, 8, 0, 0, TAU); ctx.fillStyle = DOG.fur; ctx.fill();
    ctx.save(); ctx.clip(); ell(ctx, -6, -22 - bob, 8, 4.6, DOG.furB); ell(ctx, 6, -10, 6, 6, DOG.light); ctx.restore();
    ctx.beginPath(); ctx.ellipse(-3, -15 - bob, 13, 8, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    qLeg(ctx, -7.5, -12, DOG.fur, 5, ph + PI, walk);
    qLeg(ctx, 6.5, -12, DOG.fur, 5, ph, walk);
    orr(ctx, 4.5, -19 - bob, 8, 3.2, 1.6, DOG.collar, 1.6); circ(ctx, 9, -15.2 - bob, 1.9, DOG.tag, 1.3);
    dogHead(ctx, 10, -26 - bob * 1.2, 10, mood, look, walk ? 0 : sin(t * 1.1) * 0.05, blink, walk ? sin(ph) * 0.18 : sin(t * 2) * 0.05, walk ? 0 : abs(sin(t * 5)) * 0.8);
  }

  // ----- the raccoon -----
  const RAC = { fur: '#aea7c8', furB: '#9790b5', leg: '#776f93', light: '#efebf7', mask: '#5d5576', ring: '#6c6489', sack: '#ecc996', sackD: '#cfa877' };
  function racHead(ctx, x, y, r, mood, look, tilt, blink, earBack) {
    ctx.save(); ctx.translate(x, y); if (tilt) ctx.rotate(tilt);
    const eb = earBack ? -3 : 0;
    circ(ctx, -r * 0.55 + eb, -r * 0.72, 3.8, RAC.furB); circ(ctx, -r * 0.55 + eb, -r * 0.72, 1.8, RAC.mask, 0);
    circ(ctx, r * 0.1 + eb, -r * 0.86, 4, RAC.fur); circ(ctx, r * 0.1 + eb, -r * 0.86, 2, RAC.light, 0);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * 0.95, 0, 0, TAU); ctx.fillStyle = RAC.fur; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    // snout
    ctx.beginPath(); ctx.moveTo(r * 0.15, r * 0.02); ctx.quadraticCurveTo(r * 1.5, -r * 0.08, r * 1.42, r * 0.42);
    ctx.quadraticCurveTo(r * 0.95, r * 0.86, r * 0.12, r * 0.68); ctx.closePath();
    ctx.fillStyle = RAC.light; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    // white brows + dark mask
    const fx = r * 0.36, fy = -r * 0.1, g = 7.2;
    ell(ctx, fx - 1, fy - 4.6, 6.6, 2.2, RAC.light, 0, -0.08);
    ctx.fillStyle = RAC.mask; ctx.beginPath();
    ctx.ellipse(fx - g / 2, fy + 0.5, 4.5, 3.4, 0.25, 0, TAU); ctx.ellipse(fx + g / 2, fy + 0.4, 4.3, 3.3, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx - g / 2 - 3, fy - 1.5); ctx.quadraticCurveTo(-r * 0.6, fy, -r * 0.88, fy + 3.5); ctx.lineTo(-r * 0.7, fy + 5.2); ctx.quadraticCurveTo(-r * 0.3, fy + 3.5, fx - g / 2 - 1, fy + 3); ctx.fill();
    if (mood === 'sleep' || (blink && mood === 'happy')) { /* closed eyes read on the mask */ }
    else { circ(ctx, fx - g / 2 + (look ? look[0] * 0.5 : 0), fy, 2.9, '#fff', 0); if (mood !== 'wink') circ(ctx, fx + g / 2 + (look ? look[0] * 0.5 : 0), fy, 2.9, '#fff', 0); }
    if (mood === 'sleep' || (blink && mood === 'happy') || mood === 'wink') {
      face(ctx, fx, fy, { gap: g, eye: mood === 'wink' ? 2 : 0.01, mood: mood === 'wink' ? 'wink' : 'happy', look, blush: true });
      ctx.lineWidth = 1.8; ctx.strokeStyle = '#fff'; ctx.beginPath();
      if (mood === 'wink') { ctx.moveTo(fx + g / 2 - 2.4, fy); ctx.quadraticCurveTo(fx + g / 2, fy - 1.6, fx + g / 2 + 2.4, fy); }
      else for (let s = -1; s <= 1; s += 2) { ctx.moveTo(fx + s * g / 2 - 2.2, fy); ctx.quadraticCurveTo(fx + s * g / 2, fy + 1.6, fx + s * g / 2 + 2.2, fy); }
      ctx.stroke();
    } else face(ctx, fx, fy, { gap: g, eye: 2.05, mood, look });
    ell(ctx, r * 1.4, r * 0.1, 2.2, 1.7, OL); circ(ctx, r * 1.4 - 0.8, r * 0.1 - 0.6, 0.6, '#fff', 0);
    ctx.restore();
  }
  /** Ringed bushy tail along a quadratic curve. */
  function racTail(ctx, x1, y1, cx, cy, x2, y2) {
    const n = 7, pts = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), p = qpt(x1, y1, cx, cy, x2, y2, u);
      pts.push([p[0], p[1], 3.6 + sin(u * PI) * 2.2 - u * 0.8]);
    }
    ctx.fillStyle = OL; for (const p of pts) { ctx.beginPath(); ctx.arc(p[0], p[1], p[2] + LW, 0, TAU); ctx.fill(); }
    for (let i = 0; i < n; i++) { const p = pts[i]; ctx.fillStyle = i % 2 ? RAC.ring : (i === n - 1 ? RAC.ring : RAC.fur); ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, TAU); ctx.fill(); }
    const p = pts[2]; ell(ctx, p[0] - 1, p[1] - p[2] * 0.5, 1.8, 1, HL);
  }
  function drawRaccoon(ctx, o) {
    const t = +o.t || 0, pose = o.pose || 'idle', blink = o.blink !== false && blinkAt(t, 2.7);
    let mood = o.mood || 'happy', look = o.look || null;
    if (pose === 'steal') {
      const ph = t * TAU / 0.6, s = sin(ph), bob = abs(s) * 1.2;
      shadow0(ctx, 15);
      racTail(ctx, -5, -9, -16, -5, -19 + s, -18);
      // sack slung over the shoulder
      ctx.save(); ctx.translate(0, -bob);
      ctx.beginPath(); ctx.moveTo(-6, -29); ctx.quadraticCurveTo(-23, -30, -20.5, -18); ctx.quadraticCurveTo(-18, -9, -9, -11);
      ctx.quadraticCurveTo(-3, -13, -4.5, -21); ctx.closePath();
      ctx.fillStyle = RAC.sack; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      ctx.save(); ctx.translate(-12.5, -18); ctx.rotate(-0.2); orr(ctx, -3.2, -2.6, 6.4, 5.2, 1.4, P.coral, 1.4);
      ctx.strokeStyle = OL; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-2.2, -3.4); ctx.lineTo(-2.2, -1.8); ctx.moveTo(2.2, 1.8); ctx.lineTo(2.2, 3.4); ctx.stroke(); ctx.restore();
      ell(ctx, -16.5, -25, 2.4, 1.3, HL, 0, -0.6);
      // a carrot peeking out
      ctx.save(); ctx.translate(-17, -28); ctx.rotate(-0.7);
      ctx.beginPath(); ctx.moveTo(-2.2, 0); ctx.lineTo(0, -8); ctx.lineTo(2.2, 0); ctx.closePath(); ctx.fillStyle = P.coral; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = OL; ctx.stroke();
      ell(ctx, -1.5, 2.4, 1.4, 2.4, P.leaf, 1.3, -0.4); ell(ctx, 1.5, 2.4, 1.4, 2.4, P.leaf, 1.3, 0.4);
      ctx.restore();
      ctx.restore();
      // tiptoe legs
      for (const fr of [0, 1]) {
        const p = ph + (fr ? 0 : PI), lift = max(0, cos(p)) * 2.5, x = fr ? 2.5 : -3;
        limb(ctx, x, -11, x + 1 + lift * 0.4, -7, x + sin(p) * 2.5, -4.75 - lift, fr ? RAC.leg : sh(RAC.leg, -0.12), 5);
      }
      ctx.save(); ctx.translate(0, -bob);
      ctx.beginPath(); ctx.ellipse(-0.5, -18, 8.6, 10.2, 0.05, 0, TAU); ctx.fillStyle = RAC.fur; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      ell(ctx, 2, -16.5, 4.8, 7, RAC.light);
      // arm over the shoulder gripping the sack
      limb(ctx, 2, -22, 1, -28, -5.5, -28.5, RAC.leg, 4.6);
      circ(ctx, -5.8, -28.6, 2.8, RAC.leg, 2);
      limb(ctx, 4, -19, 7, -16, 6, -13, RAC.leg, 4.4);
      racHead(ctx, 3.5, -34, 9.5, o.mood || 'wink', look || [0.8, 0], 0.08, blink, false);
      ctx.restore();
      return;
    }
    let walk = false, cyc = 0.45, stride = 3, liftK = 2.2, low = 0, lean = 0, earBack = false, tail;
    if (pose === 'walk') walk = true;
    else if (pose === 'sneak') { walk = true; cyc = 0.95; stride = 3.6; liftK = 3.4; low = 3.5; mood = o.mood || 'neutral'; look = look || [sin(t * 1.6) * 1.2, 0]; }
    else if (pose === 'run') { walk = true; cyc = 0.3; stride = 6; liftK = 3; lean = 0.06; earBack = true; mood = o.mood || 'surprised'; }
    const ph = t * TAU / cyc;
    const bob = pose === 'run' ? abs(cos(ph)) * 2.4 : walk ? abs(sin(ph)) * 0.9 : sin(t * 2.2) * 0.35;
    const by = -15 + low - bob;
    shadow0(ctx, 19);
    if (pose === 'run') tail = [-14, by - 1, -22, by - 3, -30, by - 1 + sin(ph) * 1.5];
    else if (pose === 'sneak') tail = [-14, by, -22, by - 1, -28, by - 4];
    else { const sw = sin(t * 1.6) * 2; tail = [-14, by - 1, -23, by - 1, -21 + sw, by - 15]; }
    racTail(ctx, tail[0], tail[1], tail[2], tail[3], tail[4], tail[5]);
    ctx.save(); if (lean) { ctx.translate(0, by); ctx.rotate(lean); ctx.translate(0, -by); }
    const legTop = by + 3;
    const L = (x, p, c) => {
      if (pose === 'run') {
        const a = sin(p) * 0.85, len = 11 - low;
        const ex = x + sin(a) * len, ey = min(-4.75, legTop + cos(a) * len);
        limb(ctx, x, legTop, x + sin(a) * len * 0.5 + 1, legTop + len * 0.5, ex, ey, c, 5);
      } else qLeg(ctx, x, legTop, c, 5, p, walk, stride, liftK);
    };
    if (pose === 'run') { L(-10, ph + PI, sh(RAC.leg, -0.12)); L(4, ph + 0.4, sh(RAC.leg, -0.12)); }
    else { L(-11, ph, sh(RAC.leg, -0.12)); L(3, ph + PI, sh(RAC.leg, -0.12)); }
    ctx.beginPath(); ctx.ellipse(-3, by, 13.5 + (pose === 'run' ? 1.5 : 0), 8 - low * 0.3, 0, 0, TAU); ctx.fillStyle = RAC.fur; ctx.fill();
    ctx.save(); ctx.clip(); ell(ctx, 3, by + 6, 9, 4.5, RAC.light); ell(ctx, -6, by - 7, 6, 2.2, HL); ctx.restore();
    ctx.beginPath(); ctx.ellipse(-3, by, 13.5 + (pose === 'run' ? 1.5 : 0), 8 - low * 0.3, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    if (pose === 'run') { L(-7, ph + PI + 0.4, RAC.leg); L(7, ph, RAC.leg); }
    else { L(-7.5, ph + PI, RAC.leg); L(6.5, ph, RAC.leg); }
    const hx = pose === 'sneak' ? 11.5 : 10.5, hy = by - (pose === 'sneak' ? 6 : 10) - bob * 0.2;
    racHead(ctx, hx, hy, 9.5, mood, look, pose === 'sneak' ? 0.12 : pose === 'run' ? 0.1 : sin(t * 0.9) * 0.06 - 0.04, blink && pose !== 'run', earBack);
    ctx.restore();
  }

  // ----- Bay Bıyık, the travelling cat trader -----
  const TR = {
    fur: '#a9b3d6', furB: '#8f99c2', stripe: '#7d86ab', light: '#fff4e2', coat: P.teal, scarf: P.sun,
    hat: '#7b5f9e', band: P.coral, pack: '#e6b77f', packD: '#c9955e', strap: P.woodDeep, roll: P.rose, boots: P.woodDark,
  };
  const TRADER_D = Object.assign(dims('adult'), { R: 14, hY: -46 });
  function drawTrader(ctx, o) {
    const t = +o.t || 0, pose = o.pose || 'idle', D = TRADER_D, r = D.R;
    const blink = o.blink !== false && blinkAt(t, 3.1);
    const br = sin(t * 2.2), bob = br * 0.5;
    const mood = o.mood || 'happy';
    ell(ctx, -6, 0, 24, 3.6, P.shadow);
    // tail swishing out from under the pack
    const sw = sin(t * 1.5) * 2.5;
    limb(ctx, -7, -13, -19, -12, -21 + sw, -27, TR.fur, 4.8);
    qstroke(ctx, -19.5 + sw * 0.6, -18, -20.8 + sw, -22, -21 + sw, -27, TR.stripe, 4.8);
    // legs in little boots
    for (const fr of [0, 1]) {
      const x = fr ? 3.6 : -2.8;
      limb(ctx, x, -13, x + 0.3, -8, x + 0.6, -4, fr ? TR.fur : TR.furB, 6.6);
      orr(ctx, x - 3.6, -8, 10, 8, 3, fr ? TR.boots : sh(TR.boots, -0.12), 2.2);
      ctx.fillStyle = HL; ctx.fillRect(x - 2.2, -6.4, 3.2, 1.3);
    }
    ctx.save(); ctx.translate(0, bob);
    // big backpack
    orr(ctx, -31, -67, 24, 49, 7, TR.pack, LW);
    ctx.fillStyle = HL; K.rr(ctx, -28.5, -63, 3.4, 16, 1.7); ctx.fill();
    orr(ctx, -32.5, -45, 9, 14, 3.5, TR.packD, 2.2);
    line(ctx, -29.5, -41, -26, -41, SOFT, 1.3);
    orr(ctx, -31.5, -67, 24, 14, 6, TR.packD, 2.2);
    orr(ctx, -21.5, -56, 4.5, 6, 1.3, P.sunLight, 1.6);
    // rolled blanket on top
    orr(ctx, -34, -76, 29, 10, 5, TR.roll, LW);
    ctx.strokeStyle = sh(TR.roll, -0.2); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-26, -75); ctx.lineTo(-26, -67); ctx.moveTo(-14, -75); ctx.lineTo(-14, -67); ctx.stroke();
    ell(ctx, -6.5, -71, 2.8, 4.6, sh(TR.roll, 0.35), 2);
    // pot and lantern hanging
    line(ctx, -33, -33, -35, -29, OL, 1.4);
    ctx.beginPath(); ctx.moveTo(-40, -29); ctx.lineTo(-30, -29); ctx.quadraticCurveTo(-30, -21, -35, -21); ctx.quadraticCurveTo(-40, -21, -40, -29); ctx.closePath();
    ctx.fillStyle = P.metal; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OL; ctx.stroke();
    glow(ctx, -35, -50, 9, P.glow, 0.5);
    line(ctx, -32, -60, -35, -57, OL, 1.4);
    orr(ctx, -38.5, -57, 7, 2.6, 1, P.plum, 1.5);
    orr(ctx, -38, -54.5, 6, 8, 2, P.sunLight, 1.8);
    ctx.fillStyle = P.fire2; ctx.beginPath(); ctx.ellipse(-35, -50, 1.4, 2.2, 0, 0, TAU); ctx.fill();
    orr(ctx, -38.5, -46.6, 7, 2.6, 1, P.plum, 1.5);
    // back paw on the strap
    limb(ctx, -3, -28.5, -1, -23, 2, -20, TR.furB, 5.5);
    circ(ctx, 2.3, -19.8, 3.1, TR.furB, 2);
    // coat body
    const tD = Object.assign({}, D);
    const tS = { topStyle: 'coat', top: TR.coat, topD: sh(TR.coat, -0.14), btn: P.sunLight };
    drawTorso(ctx, tS, tD, false);
    // pack strap over the shoulder
    ctx.beginPath(); ctx.moveTo(-7.5, -31); ctx.quadraticCurveTo(2, -29, 1, -14);
    ctx.lineWidth = 3.4 + 4; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = 3.4; ctx.strokeStyle = TR.strap; ctx.stroke();
    orr(ctx, -0.6, -24, 3.6, 3.2, 0.8, P.sun, 1.3);
    // scarf
    drawScarf(ctx, { scarf: TR.scarf, scarfD: sh(TR.scarf, -0.16), scarfL: sh(TR.scarf, 0.5) }, D, { t, blow: 0 }, false);
    // head
    ctx.save(); ctx.translate(D.hX + 0.5, D.hY + (pose === 'wave' ? 0 : 0)); ctx.rotate(pose === 'wave' ? -0.06 : sin(t * 0.8) * 0.03);
    catEarT(ctx, -r * 0.62, -r * 0.62, -0.45);
    catEarT(ctx, r * 0.42, -r * 0.74, 0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.06, r, 0, 0, TAU); ctx.fillStyle = TR.fur; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = TR.stripe; ctx.lineWidth = 2; ctx.beginPath();
    for (const x of [-4.5, -0.5, 3.5]) { ctx.moveTo(x, -r - 1); ctx.lineTo(x + 0.6, -r + 4.5 - abs(x + 0.5) * 0.25); }
    ctx.moveTo(-r - 1, -2); ctx.lineTo(-r + 4, -1); ctx.moveTo(-r - 1, 2.5); ctx.lineTo(-r + 3.5, 3); ctx.stroke();
    ell(ctx, r * 0.55, r * 0.5, r * 0.62, r * 0.42, TR.light);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.06, r, 0, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    const fx = r * 0.4, fy = r * 0.08;
    faceB(ctx, fx, fy, 7.6, 2.2, mood, o.look || null, blink);
    // big curly moustache
    const my = fy + 4.6;
    ctx.beginPath();
    ctx.moveTo(fx, my - 0.6);
    ctx.bezierCurveTo(fx - 3, my - 2.4, fx - 7.5, my - 1, fx - 8.8, my - 4.2);
    ctx.bezierCurveTo(fx - 9.6, my + 1.8, fx - 4, my + 3.4, fx, my + 1.2);
    ctx.bezierCurveTo(fx + 4, my + 3.4, fx + 9.6, my + 1.8, fx + 8.8, my - 4.2);
    ctx.bezierCurveTo(fx + 7.5, my - 1, fx + 3, my - 2.4, fx, my - 0.6);
    ctx.closePath(); ctx.fillStyle = P.white; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OL; ctx.stroke();
    ell(ctx, fx, my - 1.4, 1.6, 1.1, P.rose, 1.2);
    // wide-brimmed traveller hat
    ctx.save(); ctx.translate(-1, -r * 0.82); ctx.rotate(-0.08);
    ctx.beginPath(); ctx.moveTo(-8.5, -1); ctx.bezierCurveTo(-9.5, -12, 9.5, -12.5, 8.5, -1); ctx.closePath();
    ctx.fillStyle = TR.hat; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8.6, -4.2); ctx.quadraticCurveTo(0, -6.4, 8.6, -4.2); ctx.lineTo(8.5, -1); ctx.quadraticCurveTo(0, -3, -8.5, -1); ctx.closePath();
    ctx.fillStyle = TR.band; ctx.fill(); ctx.lineWidth = 1.8; ctx.stroke();
    ctx.save(); ctx.translate(-6, -5); ctx.rotate(-0.9 + sin(t * 2) * 0.05);
    ell(ctx, 0, -6, 2.4, 6.5, P.leafLight, 1.8); line(ctx, 0, -1, 0, -11, P.leafDark, 1.1);
    ctx.restore();
    ell(ctx, -4, -8.5, 2.4, 1.3, HL, 0, -0.4);
    ell(ctx, 0, 0, 18, 3.6, TR.hat, LW);
    ctx.beginPath(); ctx.ellipse(0, -0.6, 15, 1.6, 0, PI * 1.1, PI * 1.9); ctx.strokeStyle = sh(TR.hat, 0.3); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    ctx.restore();
    // front paw
    let g;
    if (pose === 'wave') g = armGeom(D, [1.65, 1.05 + 0.32 * sin(t * TAU * 2.2), 1.15], true);
    else g = armGeom(D, [0.18 + br * 0.03, 0.35], true);
    limb(ctx, g[0], g[1], g[2], g[3], g[4], g[5], TR.coat, D.armW);
    circ(ctx, g[4], g[5], 3.4, TR.fur, 2);
    ctx.strokeStyle = SOFT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g[4] + 1, g[5] - 2); ctx.lineTo(g[4] + 1.6, g[5] - 0.2); ctx.stroke();
    ctx.restore();
  }
  function catEarT(ctx, x, y, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-5, 3); ctx.quadraticCurveTo(-3.8, -6, -0.6, -9.6); ctx.quadraticCurveTo(3, -7, 5, 2.5); ctx.closePath();
    ctx.fillStyle = TR.fur; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.6, 1); ctx.quadraticCurveTo(-2, -4.4, -0.6, -6.2); ctx.quadraticCurveTo(1.4, -4.4, 2.4, 1); ctx.closePath();
    ctx.fillStyle = P.pink; ctx.fill();
    ctx.restore();
  }

  K.define('critter.cat', {
    w: 48, h: 44, tags: ['critter', 'pet'],
    states: { pose: ['idle', 'walk', 'sit', 'sleep'] }, defaults: { pose: 'idle' },
    desc: 'Pamuk, the shelter cat: cream fur with ginger patches and a little bell collar.',
    draw: drawCat,
  });
  K.define('critter.dog', {
    w: 50, h: 46, tags: ['critter', 'pet'],
    states: { pose: ['idle', 'walk', 'sit', 'sleep'] }, defaults: { pose: 'idle' },
    desc: 'A caramel puppy with floppy ears, a wagging tail and a sky-blue collar.',
    draw: drawDog,
  });
  K.define('critter.raccoon', {
    w: 64, h: 50, tags: ['critter', 'thief'],
    states: { pose: ['idle', 'walk', 'sneak', 'run', 'steal'] }, defaults: { pose: 'idle' },
    desc: 'A cheeky raccoon with a mask and ringed tail; steal tiptoes off with a patched sack.',
    draw: drawRaccoon,
  });
  K.define('npc.trader', {
    w: 84, h: 92, ax: 46, ay: 92, tags: ['npc', 'critter', 'trader'],
    states: { pose: ['idle', 'wave'] }, defaults: { pose: 'idle' },
    desc: 'Bay Bıyık, a travelling cat merchant with a curly moustache, felt hat, scarf and a huge backpack.',
    draw: drawTrader,
  });
})(typeof window !== 'undefined' ? window.MinikArt : globalThis.MinikArt);
