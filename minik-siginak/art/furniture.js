/*
 * MinikArt · furniture.js — home stations and furniture (original art, drawn in code).
 *
 * Part of the MinikArt kit (see art/STYLE.md). Hand-made-from-salvage but cosy: patched planks,
 * mismatched screws, tape, little hearts. Every asset is deterministic, faces right and is cheap
 * enough to draw every frame.
 *
 * Anchors: bottom-centre on the floor; wall items (window, picture, clock, toolwall) bottom-centre
 * of the object; st.bulb top-centre at the ceiling.
 */
(function (K) {
  'use strict';
  if (!K) return;
  const { P, OL, LW, TAU, rr, orr, circ, ell, blob, line, stick, poly, smoothPath, star, flame, shadow, glow, face, shade, mix, hash2 } = K;
  const PI = Math.PI;

  // ---------- local tokens (computed once) ----------
  const HL = 'rgba(255,255,255,.42)', HL2 = 'rgba(255,255,255,.26)';
  const DK = 'rgba(61,43,69,.13)', SEAM = 'rgba(61,43,69,.32)';
  const TAPE = 'rgba(255,243,214,.96)';
  const HOLE = mix(P.woodDeep, P.ink, .55);
  const SOIL = mix(P.woodDeep, P.ink, .32);
  const DOORWAY = mix(P.plumDark, P.skyNight, .5);
  const TERRA = mix(P.coral, P.woodLight, .35);
  const FABRIC = mix(P.pink, P.rose, .2);
  const GOLD = mix(P.sun, P.woodLight, .3);
  const RIM = mix(P.plumDark, P.metalDark, .45);
  const PEG = mix(P.woodLight, P.paper, .45);
  const RIB = shade(P.sky, -.12);
  const BOOKS = [P.coral, P.sun, P.mint, P.lilac, P.sky, P.pink, P.leaf, P.plum, P.teal, P.rose];

  const c01 = v => (v == null || v !== v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : +v;
  const fr = v => v - Math.floor(v);

  // ---------- local helpers ----------
  function fillR(ctx, x, y, w, h, r, col) { rr(ctx, x, y, w, h, r); ctx.fillStyle = col; ctx.fill(); }
  function hl(ctx, x, y, w, h, r) { fillR(ctx, x, y, w, h, r == null ? Math.min(w, h) / 2 : r, HL); }
  function seam(ctx, x1, y1, x2, y2, lw) { line(ctx, x1, y1, x2, y2, SEAM, lw || 1.3); }
  function dot(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function nail(ctx, x, y) { dot(ctx, x, y, 1.35, P.metalDark); dot(ctx, x - .4, y - .45, .5, P.metalLight); }
  function rivet(ctx, x, y) { circ(ctx, x, y, 1.5, P.metalLight, 1); }
  function screw(ctx, x, y, r, a) {
    circ(ctx, x, y, r, P.metalLight, 1.1);
    const c = Math.cos(a) * r * .65, s = Math.sin(a) * r * .65;
    line(ctx, x - c, y - s, x + c, y + s, OL, 1);
  }
  /** Strip of masking tape with torn ends, centred on (x,y). */
  function tape(ctx, x, y, w, h, rot) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    const a = w / 2, b = h / 2;
    ctx.beginPath(); ctx.moveTo(-a, -b); ctx.lineTo(a, -b); ctx.lineTo(a - .9, -b / 3); ctx.lineTo(a, b / 3); ctx.lineTo(a - .6, b);
    ctx.lineTo(-a, b); ctx.lineTo(-a + .9, b / 3); ctx.lineTo(-a, -b / 3); ctx.closePath();
    ctx.fillStyle = TAPE; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = SEAM; ctx.stroke();
    ctx.restore();
  }
  /** Outlined plank with one highlight, a grain line and two nails. */
  function plank(ctx, x, y, w, h, col, nails) {
    orr(ctx, x, y, w, h, Math.min(3, h / 2.2), col);
    hl(ctx, x + 2.5, y + 1.5, w - 5, Math.max(1.2, h * .2));
    if (w > 18 && h > 5) seam(ctx, x + w * .28, y + h * .64, x + w * .68, y + h * .64, 1.1);
    if (nails !== false) { nail(ctx, x + 3.4, y + h / 2); nail(ctx, x + w - 3.4, y + h / 2); }
  }
  function plankAt(ctx, cx, cy, len, th, ang, col, nails) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); plank(ctx, -len / 2, -th / 2, len, th, col, nails); ctx.restore();
  }
  function starO(ctx, x, y, r, col, lw) { star(ctx, x, y, r, col); ctx.lineWidth = lw || 1.1; ctx.strokeStyle = OL; ctx.stroke(); }
  function heartPath(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y + s * .95);
    ctx.bezierCurveTo(x - s * 1.5, y - s * .05, x - s * .75, y - s * 1.2, x, y - s * .45);
    ctx.bezierCurveTo(x + s * .75, y - s * 1.2, x + s * 1.5, y - s * .05, x, y + s * .95);
    ctx.closePath();
  }
  function heart(ctx, x, y, s, col, lw) {
    heartPath(ctx, x, y, s); ctx.fillStyle = col; ctx.fill();
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = OL; ctx.stroke(); }
  }
  function dropPath(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - 1.7 * s);
    ctx.bezierCurveTo(x + .3 * s, y - .9 * s, x + s, y - .3 * s, x + s, y + .3 * s);
    ctx.arc(x, y + .3 * s, s, 0, PI);
    ctx.bezierCurveTo(x - s, y - .3 * s, x - .3 * s, y - .9 * s, x, y - 1.7 * s);
    ctx.closePath();
  }
  /** Leaf from (x,y) pointing at angle ang. */
  function leaf(ctx, x, y, len, wid, ang, col, lw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * .45, -wid, len, 0);
    ctx.quadraticCurveTo(len * .45, wid, 0, 0); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = lw || 1.6; ctx.strokeStyle = OL; ctx.stroke();
    if (len > 7) line(ctx, len * .18, 0, len * .72, 0, 'rgba(255,255,255,.45)', 1);
    ctx.restore();
  }
  /** Three-layer flame with a thin outline (for small fire windows). */
  function fire(ctx, x, y, s, t, ph) {
    const f = Math.sin(t * 17 + ph) * 1.6 + Math.sin(t * 11.3 + ph * 2.3) * 1.2;
    flame(ctx, x, y, (19 + f) * s, 8.5 * s, P.fire1); ctx.lineWidth = 1.5; ctx.strokeStyle = OL; ctx.stroke();
    flame(ctx, x + .7 * s + Math.sin(t * 9 + ph) * .5, y, (13.5 + f * .7) * s, 5.8 * s, P.fire2);
    flame(ctx, x, y, (7.5 + f * .4) * s, 3.1 * s, P.fire3);
  }
  /** Soft rising steam puffs. */
  function puffs(ctx, x, y, t, n, rise, sway, size) {
    for (let i = 0; i < n; i++) {
      const p = fr(t * .55 + i / n), a = Math.min(1, p * 5) * (1 - p) * .9;
      if (a <= .02) continue;
      const px = x + Math.sin(p * 6 + i * 2.1) * sway, py = y - p * rise, r = size * (.55 + p * .7);
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(61,43,69,' + (a * .35).toFixed(3) + ')'; ctx.stroke();
    }
  }
  function note(ctx, x, y, s, col) {
    ell(ctx, x, y, 2.7 * s, 2 * s, col, 1.3, -.35);
    line(ctx, x + 2.4 * s, y - .4 * s, x + 2.4 * s, y - 8 * s, OL, 1.4);
    ctx.beginPath(); ctx.moveTo(x + 2.4 * s, y - 8 * s); ctx.quadraticCurveTo(x + 6.2 * s, y - 6.6 * s, x + 5 * s, y - 3.6 * s); ctx.stroke();
  }
  /** Hanging hand saw: handle top-left at (x,y), blade pointing right (about 30 long). */
  function saw(ctx, x, y, handleCol) {
    poly(ctx, [[x + 8, y + .4], [x + 30, y + 2], [x + 30, y + 6.4], [x + 8, y + 8.6]], P.metalLight, 1.7);
    ctx.beginPath(); ctx.moveTo(x + 9, y + 8.5);
    for (let i = 0; i < 6; i++) { const xx = x + 9 + i * 3.4, yy = y + 8.5 - i * .34; ctx.lineTo(xx + 1.7, yy + 1.5); ctx.lineTo(xx + 3.4, yy - .3); }
    ctx.lineWidth = 1; ctx.strokeStyle = OL; ctx.stroke();
    line(ctx, x + 11, y + 2.8, x + 27, y + 3.7, 'rgba(255,255,255,.75)', 1.2);
    orr(ctx, x, y - 1, 10, 10.5, 3.5, handleCol, 1.8);
    ell(ctx, x + 4.4, y + 4.2, 1.7, 2.4, 'rgba(61,43,69,.55)', 0);
  }

  // ======================================================================
  // st.workbench
  // ======================================================================
  function benchFx(ctx, t) {
    for (let i = 0; i < 4; i++) {
      const p = fr(t * .8 + i / 4), x = -30 + i * 15 + Math.sin(i * 3.1 + t * 2) * 3, y = -43 + p * 38;
      ctx.globalAlpha = Math.min(1, (1 - p) * 1.6);
      ctx.beginPath(); ctx.arc(x, y, 2.3, p * 6, p * 6 + 4.4);
      ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = P.woodLight; ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const S = [[-24, -64], [-10, -58], [-31, -52]];
    for (let i = 0; i < 3; i++) {
      const s = Math.sin(fr(t * 1.2 + i * .37) * PI);
      if (s > .08) starO(ctx, S[i][0], S[i][1], 1.5 + 3.6 * s, P.sunLight);
    }
  }
  function screwJar(ctx, x) {
    orr(ctx, x, -57, 13, 11, 3.5, P.glass);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const sx = x + 3 + (i % 3) * 3.5, sy = -49.5 - (i > 2 ? 3 : 0); ctx.moveTo(sx + 1.2, sy); ctx.arc(sx, sy, 1.2, 0, TAU); }
    ctx.fillStyle = P.metalDark; ctx.fill();
    hl(ctx, x + 2, -55, 2.2, 6, 1);
    orr(ctx, x - 1, -60.5, 15, 4.5, 1.5, P.coral, 1.8);
  }
  function lyingHammer(ctx) {
    stick(ctx, -14, -48.6, 5, -48.6, P.woodLight, 2.6);
    orr(ctx, 3.5, -55, 6.5, 9, 2, P.metal, 1.8);
    line(ctx, 5, -53.5, 5, -48, 'rgba(255,255,255,.6)', 1.1);
  }
  function bench1(ctx, t, act) {
    // a single salvaged post at the back with a rope coil and a pencil on a nail
    orr(ctx, 41, -67, 6, 27, 2, P.woodDark);
    nail(ctx, 44, -63);
    circ(ctx, 44, -56.5, 5.4, P.paper, 1.8); circ(ctx, 44, -56.5, 2.2, P.woodDark, 1.3);
    ctx.beginPath(); ctx.arc(44, -56.5, 3.8, 2.2, 5.6); ctx.strokeStyle = SEAM; ctx.lineWidth = 1; ctx.stroke();
    // legs: one plank leg, one pipe leg (mismatched salvage)
    orr(ctx, -37, -40, 5, 37, 2, P.woodDeep);
    orr(ctx, 31, -40, 5, 37, 2, P.woodDeep);
    orr(ctx, -46, -40, 9, 40, 2.5, P.woodDark);
    seam(ctx, -41.5, -34, -41.5, -6);
    stick(ctx, 41, -40, 41, -5, P.metal, 5);
    line(ctx, 39.7, -37, 39.7, -8, 'rgba(255,255,255,.6)', 1.2);
    tape(ctx, 41, -24, 10, 5.5, 0);
    orr(ctx, 36.5, -5, 9, 5, 2, P.metalDark, 2);
    // lower shelf + clutter
    plank(ctx, -47, -16, 93, 6, P.woodLight);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const x = -32.5 + i * 3, d = (i - 1.5) * .9; ctx.moveTo(x, -26); ctx.lineTo(x + d, -31); ctx.moveTo(x + d - 1.2, -31); ctx.lineTo(x + d + 1.2, -31); }
    ctx.strokeStyle = OL; ctx.lineWidth = 1.3; ctx.stroke();
    orr(ctx, -37, -27, 15, 11, 3, P.metal);
    hl(ctx, -35, -25, 2.6, 6, 1.3);
    seam(ctx, -36, -21.5, -23, -21.5);
    plank(ctx, 6, -21, 30, 5, P.wood, false);
    plank(ctx, 10, -26, 22, 5, P.woodLight, false);
    // top: two mismatched planks joined by a mending plate
    if (act) orr(ctx, -38.7, -66, 5.5, 20, 1.5, P.woodLight, 1.8);
    orr(ctx, -50, -46, 60, 9, 3, P.woodLight);
    hl(ctx, -47, -44.6, 50, 2);
    orr(ctx, 8, -46.5, 42, 9.5, 3, P.wood);
    hl(ctx, 11, -45, 34, 2);
    seam(ctx, 16, -40, 44, -40, 1.1);
    orr(ctx, 2, -44.5, 13, 6, 1.5, P.metalLight, 1.3); nail(ctx, 4.6, -41.5); nail(ctx, 12.4, -41.5);
    // hand-made wooden clamp vise
    stick(ctx, -43, -52, -22, -52, P.metal, 1.6);
    orr(ctx, -46, -61, 7, 15, 2, P.woodDark);
    orr(ctx, -33, -58.5, 6.5, 12.5, 2, P.woodDark);
    hl(ctx, -44.5, -59.5, 1.8, 9, .9);
    circ(ctx, -21, -52, 2.8, P.metalLight, 1.2);
    line(ctx, -21, -55.6, -21, -48.4, OL, 1.1);
    lyingHammer(ctx);
    // pencil stub and a tin of screws
    stick(ctx, 10, -48, 19, -48, P.sun, 1.4); poly(ctx, [[19, -49.7], [22.5, -48], [19, -46.3]], P.woodLight, 1);
    screwJar(ctx, 24);
  }
  function bench2(ctx, t, act) {
    // painted pegboard with every tool on its hook
    orr(ctx, -47, -70, 94, 25, 4, P.mint);
    hl(ctx, -44, -68, 36, 2.3);
    ctx.beginPath();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) { const x = -40.5 + c * 7.4, y = -64 + r * 7; ctx.moveTo(x + .9, y); ctx.arc(x, y, .9, 0, TAU); }
    ctx.fillStyle = 'rgba(61,43,69,.22)'; ctx.fill();
    screw(ctx, -43.5, -66.5, 1.5, .5); screw(ctx, 43.5, -66.5, 1.5, 1.4);
    saw(ctx, -41, -66, P.coral);
    // hammer (head up)
    stick(ctx, -4, -64, -4, -55, P.woodLight, 2.3);
    orr(ctx, -9.5, -68.5, 11, 5, 2, P.metal, 1.7);
    // wrench
    stick(ctx, 6, -63, 6, -56, P.metalLight, 2.4);
    circ(ctx, 6, -65.5, 3.2, P.metalLight, 1.5); dot(ctx, 6, -68.1, 1.5, P.mint);
    circ(ctx, 6, -54.5, 2.3, P.metalLight, 1.3); dot(ctx, 6, -54.5, .9, P.mint);
    // screwdrivers
    for (const [x, c] of [[13, P.coral], [19, P.sun]]) {
      line(ctx, x, -61, x, -54, OL, 3.2); line(ctx, x, -61, x, -54.5, P.metalLight, 1.2);
      orr(ctx, x - 2.2, -68, 4.4, 8, 2, c, 1.5);
    }
    // pliers
    stick(ctx, 24.5, -54.5, 27.5, -62, P.coral, 2);
    stick(ctx, 30.5, -54.5, 27.5, -62, P.coral, 2);
    poly(ctx, [[26.2, -62.5], [28.8, -62.5], [28, -68], [27, -68]], P.metalDark, 1.3);
    // legs, metal feet, back legs
    orr(ctx, -38, -38, 5, 34, 2, P.woodDeep); orr(ctx, 33, -38, 5, 34, 2, P.woodDeep);
    orr(ctx, -47, -38, 9, 34, 2.5, P.wood); orr(ctx, 38, -38, 9, 34, 2.5, P.wood);
    hl(ctx, -45.5, -35, 2, 26, 1); hl(ctx, 39.5, -35, 2, 26, 1);
    orr(ctx, -48.5, -5, 12, 5, 2, P.metalDark, 2); orr(ctx, 36.5, -5, 12, 5, 2, P.metalDark, 2);
    // shelf with a coral toolbox and a paint tin
    plank(ctx, -46, -16, 92, 6, P.wood);
    ctx.beginPath(); ctx.arc(-23, -29, 5, PI, 0); ctx.lineWidth = 4.4; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = 1.8; ctx.strokeStyle = P.metalDark; ctx.stroke();
    orr(ctx, -36, -29, 26, 13, 3, P.coral);
    hl(ctx, -33.5, -27.5, 12, 2);
    seam(ctx, -35, -24, -11, -24);
    orr(ctx, -25, -26, 4, 4, 1, P.sun, 1.2);
    orr(ctx, -4, -27, 12, 11, 2.5, P.sky);
    fillR(ctx, -3, -23.5, 10, 4, 1, P.cream);
    ctx.beginPath(); ctx.moveTo(-4, -27); ctx.quadraticCurveTo(-1.5, -27, -1.5, -24); ctx.arc(-2.6, -24, 1.1, 0, PI); ctx.lineTo(-4, -27);
    ctx.fillStyle = P.lilac; ctx.fill();
    orr(ctx, -5, -28.5, 14, 3, 1.5, P.metalLight, 1.4);
    // drawer under the top
    orr(ctx, 6, -38, 30, 13, 3, P.woodLight);
    hl(ctx, 8.5, -36.5, 14, 1.8);
    circ(ctx, 21, -31.5, 2.5, P.sun, 1.5);
    heart(ctx, 12, -31.5, 2.4, P.pink, 1);
    // thick butcher-block top with metal corners
    orr(ctx, -50, -47, 100, 10, 3, P.woodLight);
    hl(ctx, -46, -45.5, 60, 2.2);
    ctx.beginPath(); for (let x = -38; x < 44; x += 11) { ctx.moveTo(x, -41.5); ctx.lineTo(x, -38.5); } ctx.strokeStyle = SEAM; ctx.lineWidth = 1.1; ctx.stroke();
    orr(ctx, -50, -47, 7, 10, 2, P.metal, 1.7); rivet(ctx, -46.5, -42);
    orr(ctx, 43, -47, 7, 10, 2, P.metal, 1.7); rivet(ctx, 46.5, -42);
    // low teal vise (work piece clamped sideways while active)
    if (act) plank(ctx, -33, -56, 26, 5, P.woodLight, false);
    orr(ctx, -46, -51.5, 20, 4.5, 2, P.tealDark, 1.8);
    orr(ctx, -45, -59, 7, 8, 2, P.teal);
    orr(ctx, -34.5, -58, 6, 7, 2, P.teal);
    fillR(ctx, -38.5, -58.5, 1.5, 6.5, .5, P.metalLight);
    hl(ctx, -43.5, -57.5, 1.8, 4, .9);
    stick(ctx, -28.5, -54.5, -22, -54.5, P.metalDark, 1.6);
    stick(ctx, -22, -58, -22, -51, P.metalDark, 1.2);
    // little parts organiser with three drawers
    orr(ctx, 9, -56, 24, 9, 2.5, P.sky);
    for (let i = 0; i < 3; i++) { orr(ctx, 11 + i * 7, -54.3, 6, 5.6, 1.5, [P.cream, P.sunLight, P.pink][i], 1.1); dot(ctx, 14 + i * 7, -51.5, .8, OL); }
    // clamp lamp (lights up while working)
    if (act) glow(ctx, 31, -58, 20, P.glow, .7);
    stick(ctx, 43, -47, 43, -61, P.metalDark, 2);
    stick(ctx, 43, -61, 37.5, -65, P.metalDark, 2);
    circ(ctx, 43, -61, 2, P.metal, 1.2);
    ctx.save(); ctx.translate(35.5, -65); ctx.rotate(.55);
    circ(ctx, 0, 4.6, 2.6, act ? P.fire3 : P.cream, 1.2);
    poly(ctx, [[-3, -3.5], [3, -3.5], [6.5, 4], [-6.5, 4]], P.sun, 1.7);
    ctx.restore();
  }
  K.define('st.workbench', {
    w: 100, h: 70, tags: ['prop', 'station', 'home', 'craft'],
    states: { level: [1, 2], active: [false, true] },
    defaults: { level: 1, active: false },
    desc: 'Salvage crafting bench with a vise. level 2 adds a tool pegboard, drawer, toolbox, clamp lamp and metal corners; active shows sawdust curls and sparkles.',
    draw(ctx, o) {
      const t = o.t || 0, act = !!o.active;
      shadow(ctx, 0, -1, 48, 3.5);
      if ((o.level | 0) >= 2) bench2(ctx, t, act); else bench1(ctx, t, act);
      if (act) benchFx(ctx, t);
    },
  });

  // ======================================================================
  // st.bed / st.floorbed
  // ======================================================================
  const QUILT = [P.sun, P.mint, P.lilac, P.sky, P.pink];
  function quilt(ctx, path, x0, y0, x1, y1, base, cw, ch) {
    cw = cw || 10; ch = ch || 8;
    ctx.save(); path(); ctx.fillStyle = base || P.coral; ctx.fill(); ctx.clip();
    for (let i = 0, x = x0; x < x1; i++, x += cw) for (let j = 0, y = y0; y < y1; j++, y += ch) {
      if ((i + j) % 2) continue;
      ctx.fillStyle = QUILT[(i * 3 + j) % 5]; ctx.fillRect(x, y, cw, ch);
    }
    ctx.setLineDash([2, 2]); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = x0 + cw; x < x1; x += cw) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = y0 + ch; y < y1; y += ch) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = HL2; ctx.fillRect(x0, y0, x1 - x0, 3);
    ctx.restore();
    path(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
  }
  function pillow(ctx, x, y, rx, ry, rot, dent) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-rx, -ry * .75);
    ctx.quadraticCurveTo(0, -ry * 1.55, rx, -ry * .75); ctx.quadraticCurveTo(rx * 1.22, 0, rx, ry * .75);
    ctx.quadraticCurveTo(0, ry * 1.4, -rx, ry * .75); ctx.quadraticCurveTo(-rx * 1.22, 0, -rx, -ry * .75); ctx.closePath();
    ctx.fillStyle = P.white; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) { ctx.moveTo(i * rx * .36 + .9, -ry * .1); ctx.arc(i * rx * .36, -ry * .1, .9, 0, TAU); }
    ctx.fillStyle = P.lilac; ctx.fill();
    hl(ctx, -rx * .7, -ry * .75, rx * .7, ry * .35);
    if (dent) { ctx.beginPath(); ctx.arc(rx * .1, -ry * 1.4, ry * .9, .35 * PI, .7 * PI); ctx.strokeStyle = SEAM; ctx.lineWidth = 1.3; ctx.stroke(); }
    ctx.restore();
  }
  K.define('st.bed', {
    w: 104, h: 48, tags: ['prop', 'station', 'home', 'sleep'],
    states: { used: [false, true] }, defaults: { used: false },
    desc: 'Hand-made pallet bed on a brick, striped mattress and a patchwork quilt. used=true rumples and pulls back the quilt.',
    draw(ctx, o) {
      const used = !!o.used;
      shadow(ctx, 0, -1, 50, 3.5);
      // brick support + side rail
      orr(ctx, -7, -11, 14, 11, 2, P.stone);
      seam(ctx, -6, -5.5, 6, -5.5); seam(ctx, 0, -10, 0, -5.5);
      plank(ctx, -44, -21, 88, 10, P.woodDark);
      tape(ctx, -27, -16, 5.5, 11, .1);
      // mattress
      orr(ctx, -43, -31, 86, 11, 5, P.cream);
      ctx.beginPath(); for (let x = -37; x < 42; x += 6) { ctx.moveTo(x, -29); ctx.lineTo(x, -22); }
      ctx.strokeStyle = 'rgba(142,111,214,.32)'; ctx.lineWidth = 1.6; ctx.stroke();
      // pillow
      if (used) pillow(ctx, -30, -35, 11, 5.2, -.14, true); else pillow(ctx, -31, -36, 11, 6, 0, false);
      // quilt
      if (!used) {
        quilt(ctx, () => rr(ctx, -20, -35, 63, 19, 5), -20, -35, 43, -16);
        orr(ctx, -21, -35.5, 9, 19.5, 3.5, P.white);
        ctx.beginPath(); ctx.moveTo(-18.5, -33); ctx.lineTo(-18.5, -19); ctx.moveTo(-15, -33); ctx.lineTo(-15, -19);
        ctx.strokeStyle = 'rgba(142,111,214,.35)'; ctx.lineWidth = 1.3; ctx.stroke();
      } else {
        const pts = [[-12, -31], [-5, -36], [5, -35], [13, -39], [22, -35], [31, -38], [40, -35], [45, -30], [45, -21], [43, -15], [33, -17], [23, -14], [12, -17], [2, -15], [-6, -18], [-12, -23]];
        quilt(ctx, () => smoothPath(ctx, pts), -14, -40, 46, -13);
        ctx.beginPath(); ctx.moveTo(4, -31); ctx.quadraticCurveTo(9, -26, 8, -20); ctx.moveTo(26, -32); ctx.quadraticCurveTo(30, -27, 28, -21);
        ctx.strokeStyle = 'rgba(61,43,69,.4)'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      // headboard with a painted heart, footboard
      orr(ctx, -52, -43, 11, 43, 5, P.wood);
      hl(ctx, -50, -40, 2.6, 30, 1.3);
      heart(ctx, -46.5, -34, 3.2, P.coral, 1.3);
      nail(ctx, -46.5, -24); nail(ctx, -46.5, -12);
      circ(ctx, -46.5, -44.5, 3.6, P.woodLight, 2);
      orr(ctx, 42, -31, 10, 31, 4.5, P.wood);
      hl(ctx, 44, -28, 2.4, 20, 1.2);
      nail(ctx, 47, -20);
      circ(ctx, 47, -32.5, 3.2, P.woodLight, 2);
    },
  });
  K.define('st.floorbed', {
    w: 80, h: 22, tags: ['prop', 'station', 'home', 'sleep'],
    states: { used: [false, true] }, defaults: { used: false },
    desc: 'Floor bed: folded blankets on a low pallet with a pillow. used=true rumples the top quilt.',
    draw(ctx, o) {
      const used = !!o.used;
      shadow(ctx, 0, -1, 40, 3);
      orr(ctx, -38, -8, 76, 8, 2.5, P.woodDark);
      for (let i = 0; i < 5; i++) fillR(ctx, -32 + i * 14.5, -5.5, 6, 3.5, 1.2, HOLE);
      hl(ctx, -35, -7, 30, 1.4);
      orr(ctx, -37, -14, 74, 7, 3.5, P.lilac);
      ctx.setLineDash([2, 2]); seam(ctx, -33, -10.5, 33, -10.5, 1); ctx.setLineDash([]);
      hl(ctx, -34, -13, 26, 1.6);
      pillow(ctx, -27, -16.5, 10, 4.2, used ? -.12 : 0, used);
      if (!used) {
        quilt(ctx, () => rr(ctx, -15, -19, 51, 7, 3.5), -15, -19, 36, -12, P.teal, 6, 3.5);
        orr(ctx, -16, -19.5, 7, 7.5, 3, P.white, 2);
      } else {
        const pts = [[-12, -17], [-4, -20], [6, -18.5], [15, -21], [25, -18.5], [33, -20], [37, -16], [35, -12], [24, -13], [12, -12], [0, -13], [-10, -12.5]];
        quilt(ctx, () => smoothPath(ctx, pts), -14, -22, 38, -11, P.teal, 6, 3.5);
      }
    },
  });

  // ======================================================================
  // st.stove — cook stove
  // ======================================================================
  function logs(ctx, x, y, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(.22); orr(ctx, -6, -1.8, 12, 3.6, 1.8, col, 1.2);
    ctx.rotate(-.44); orr(ctx, -6, -1.8, 12, 3.6, 1.8, shade(col, .12), 1.2);
    ctx.restore();
  }
  K.define('st.stove', {
    w: 62, h: 74, tags: ['prop', 'station', 'home', 'cook'],
    states: { lit: [false, true], cooking: [false, true] }, defaults: { lit: false, cooking: false },
    desc: 'Patched mint enamel cook stove with a round fire window and a tea towel. lit: flickering fire and warm glow; cooking: a stew pot (steams when lit), otherwise a kettle.',
    draw(ctx, o) {
      const t = o.t || 0, lit = !!o.lit, cook = !!o.cooking;
      shadow(ctx, 0, -1, 30, 3.5);
      if (lit) { glow(ctx, -11, -29, 32, P.glow, .55); ell(ctx, -6, -1, 28, 3, 'rgba(255,190,110,.25)'); }
      orr(ctx, -25, -8, 8, 8, 2.5, P.metalDark); orr(ctx, 17, -8, 8, 8, 2.5, P.metalDark);
      // body
      orr(ctx, -28, -51, 56, 45, 9, P.mint);
      hl(ctx, -24, -48, 24, 3.2);
      fillR(ctx, -26, -14, 52, 7, 4, DK);
      // fire door with a round window
      orr(ctx, -24, -43, 26, 29, 7, P.metal);
      hl(ctx, -21.5, -40, 2.6, 20, 1.3);
      const wx = -11, wy = -29, wr = 8.5;
      ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, wr, 0, TAU);
      ctx.fillStyle = lit ? P.fire1 : HOLE; ctx.fill(); ctx.clip();
      if (lit) { fire(ctx, wx, wy + 6.5, .62, t, 0); logs(ctx, wx, wy + 7.2, P.woodDeep); }
      else { logs(ctx, wx, wy + 6.5, P.stoneDark); dot(ctx, wx - 3, wy + 4.2, .9, 'rgba(255,170,90,.6)'); }
      ctx.restore();
      circ(ctx, wx, wy, wr, null, 2);
      ctx.beginPath(); ctx.arc(wx, wy, wr - 2.6, 3.6, 4.4); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.stroke();
      dot(ctx, -21.5, -38, 1.1, P.metalDark); dot(ctx, -21.5, -19, 1.1, P.metalDark);
      orr(ctx, -1, -32, 4.5, 6, 2, P.sun, 1.3);
      // knobs (one is a bottle cap) and a little gauge
      circ(ctx, 10, -43, 3.2, P.coral, 1.5); line(ctx, 10, -43, 10, -45.5, OL, 1.1);
      circ(ctx, 19.5, -43, 3.3, P.sun, 1.5);
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.moveTo(19.5 + Math.cos(a) * 3.3, -43 + Math.sin(a) * 3.3); ctx.lineTo(19.5 + Math.cos(a) * 2.2, -43 + Math.sin(a) * 2.2); }
      ctx.strokeStyle = SEAM; ctx.lineWidth = 1; ctx.stroke();
      circ(ctx, 15, -31.5, 5.6, P.cream, 1.5);
      const ga = lit ? -.35 + Math.sin(t * 2) * .08 : -2.6;
      line(ctx, 15, -31.5, 15 + Math.cos(ga) * 4, -31.5 + Math.sin(ga) * 4, P.coralDark, 1.3);
      dot(ctx, 15, -31.5, 1, OL);
      // riveted patch plate
      orr(ctx, 7, -23, 16, 7.5, 1.5, P.metalLight, 1.4);
      dot(ctx, 9, -21, .8, OL); dot(ctx, 21, -21, .8, OL); dot(ctx, 9, -17.5, .8, OL); dot(ctx, 21, -17.5, .8, OL);
      // towel rail + checked tea towel
      stick(ctx, -23, -11, 24, -11, P.metalLight, 1.8);
      ctx.save(); rr(ctx, 9, -13, 12, 12, 3); ctx.fillStyle = P.cream; ctx.fill(); ctx.clip();
      ctx.fillStyle = 'rgba(255,127,92,.55)';
      for (let i = 0; i < 3; i++) { ctx.fillRect(9 + i * 4.4, -13, 2.2, 12); ctx.fillRect(9, -12 + i * 4.2, 12, 2.1); }
      ctx.restore();
      rr(ctx, 9, -13, 12, 12, 3); ctx.lineWidth = 1.8; ctx.strokeStyle = OL; ctx.stroke();
      orr(ctx, 8, -14.5, 14, 4, 2, P.coral, 1.5);
      // top plate
      orr(ctx, -31, -55, 62, 6, 3, P.metalDark);
      hl(ctx, -28, -54, 30, 1.5);
      if (cook) {
        const j = lit ? -Math.abs(Math.sin(t * 9)) * 1.1 : 0;
        orr(ctx, -24, -63, 5, 3.5, 1.5, P.coralDark, 1.4); orr(ctx, 7, -63, 5, 3.5, 1.5, P.coralDark, 1.4);
        orr(ctx, -20, -66, 28, 11, 5, P.coral);
        hl(ctx, -17, -64, 8, 2.4);
        heart(ctx, -6, -60, 2.6, P.cream, 0);
        orr(ctx, -22, -69 + j, 32, 4, 2, P.coralDark, 1.8);
        circ(ctx, -6, -70.3 + j, 1.9, P.sun, 1.3);
        if (lit) puffs(ctx, -6, -71, t, 3, 7, 3, 2.6);
      } else {
        ctx.beginPath(); ctx.arc(13, -65.5, 6.2, 1.12 * PI, 1.88 * PI);
        ctx.lineWidth = 4.2; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = 1.6; ctx.strokeStyle = P.metalDark; ctx.stroke();
        stick(ctx, 19, -60, 24.5, -65, P.teal, 2.6);
        orr(ctx, 5, -66, 16, 11, 5.5, P.teal);
        hl(ctx, 7.5, -64, 5, 2.4);
        orr(ctx, 8.5, -68, 9, 3, 1.5, P.tealDark, 1.3);
        circ(ctx, 13, -69, 1.4, P.sun, 1.1);
        if (lit) puffs(ctx, 25.5, -67, t, 2, 6, 1.5, 1.8);
      }
    },
  });

  // ======================================================================
  // st.heater — little pot-belly wood stove + pipe
  // ======================================================================
  K.define('st.heater', {
    w: 56, h: 110, tags: ['prop', 'station', 'home', 'heat'],
    states: { lit: [false, true] }, defaults: { lit: false },
    desc: 'Little coral pot-belly wood stove with a heart fire window, a stove pipe and a drying mitten. lit animates the fire and heat; o.pipeTop sets the pipe height (default 110).',
    draw(ctx, o) {
      const t = o.t || 0, lit = !!o.lit, top = -(o.pipeTop > 70 ? +o.pipeTop : 110);
      shadow(ctx, 0, -1, 25, 3.5);
      if (lit) { glow(ctx, 0, -31, 36, P.glow, .55); ell(ctx, 0, -1, 27, 3, 'rgba(255,190,110,.28)'); }
      // pipe
      const px = 2;
      stick(ctx, px, -52, px, top + 3.5, P.metal, 9);
      ctx.beginPath(); for (let y = -66; y > top + 8; y -= 15) { ctx.moveTo(px - 4.5, y); ctx.lineTo(px + 4.5, y); }
      ctx.strokeStyle = SEAM; ctx.lineWidth = 1.3; ctx.stroke();
      line(ctx, px - 2.2, -56, px - 2.2, top + 7, 'rgba(255,255,255,.55)', 1.5);
      orr(ctx, px - 8, top, 16, 5, 2, P.metalDark);
      stick(ctx, px + 5, -77, px + 9.5, -77, P.metalDark, 1.5); circ(ctx, px + 11, -77, 2, P.coral, 1.2);
      tape(ctx, px, -93, 12, 5, -.15);
      // mitten drying on a string
      ctx.save(); ctx.translate(px - 4.5, -84); ctx.rotate(Math.sin(t * 1.7) * (lit ? .16 : .05));
      line(ctx, 0, 0, -4, 6.5, OL, 1.1);
      ell(ctx, -1.2, 12.5, 2.4, 3.3, P.sky, 1.7, .35);
      orr(ctx, -10, 9, 10, 11, 4.5, P.sky, 1.8);
      fillR(ctx, -9, 13, 8, 2, 1, P.cream);
      orr(ctx, -10.5, 6, 11, 4, 2, P.cream, 1.6);
      ctx.restore();
      // heat shimmer
      if (lit) {
        ctx.beginPath();
        for (const x0 of [-13, 15]) {
          for (let i = 0; i <= 8; i++) { const y = -56 - i * 2.2, x = x0 + Math.sin(i * .9 - t * 6 + x0) * 1.6; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        }
        ctx.strokeStyle = 'rgba(255,150,90,.45)'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      // feet + base ring
      orr(ctx, -19, -11, 7, 11, 3, RIM); orr(ctx, 12, -11, 7, 11, 3, RIM);
      orr(ctx, -21, -17, 42, 7, 3.5, RIM);
      // belly
      ell(ctx, 0, -33, 21, 18, P.coral, LW);
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, -33, 21, 18, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = DK; ctx.fillRect(-22, -23, 44, 10);
      ctx.restore();
      ell(ctx, -10, -42, 6, 3.2, HL, 0, -.55);
      orr(ctx, -15, -55, 30, 6, 3, RIM);
      hl(ctx, -12, -54, 12, 1.5);
      // door with a heart window
      orr(ctx, -10, -41, 20, 18, 6, RIM);
      ctx.save(); heartPath(ctx, 0, -31.5, 6.2);
      ctx.fillStyle = lit ? P.fire1 : HOLE; ctx.fill(); ctx.clip();
      if (lit) { fire(ctx, 0, -25.5, .5, t, 1.3); logs(ctx, 0, -25.5, P.woodDeep); }
      else logs(ctx, 0, -26, P.stoneDark);
      ctx.restore();
      heartPath(ctx, 0, -31.5, 6.2); ctx.lineWidth = 1.6; ctx.strokeStyle = OL; ctx.stroke();
      stick(ctx, 8, -32, 13, -32, P.metalLight, 1.5);
      dot(ctx, -8, -38, 1, P.metalLight); dot(ctx, -8, -26, 1, P.metalLight);
      screw(ctx, -16, -27, 1.6, .4);
    },
  });

  // ======================================================================
  // st.water — rain / snow-melt barrel with funnel
  // ======================================================================
  K.define('st.water', {
    w: 50, h: 90, tags: ['prop', 'station', 'home', 'water'],
    states: { fill: [0, .5, 1] }, defaults: { fill: .5 },
    desc: 'Snow-melt water barrel with a snowy funnel, gauge window and tap. fill 0..1 sets the water level shown in the window; the tap drips when not empty.',
    draw(ctx, o) {
      const t = o.t || 0, f = c01(o.fill);
      shadow(ctx, 0, -1, 24, 3.5);
      orr(ctx, -23, -8, 46, 8, 2.5, P.woodDark);
      fillR(ctx, -16, -5.5, 7, 3.5, 1, HOLE); fillR(ctx, -3.5, -5.5, 7, 3.5, 1, HOLE); fillR(ctx, 9, -5.5, 7, 3.5, 1, HOLE);
      // barrel
      orr(ctx, -20, -64, 40, 56, 9, P.sky);
      hl(ctx, -17, -59, 3.6, 42, 1.8);
      fillR(ctx, 13, -60, 4.5, 48, 2.2, DK);
      orr(ctx, -21, -55, 42, 4, 2, RIB, 1.5);
      orr(ctx, -21, -21, 42, 4, 2, RIB, 1.5);
      tape(ctx, -14.5, -37, 9, 3.4, .6); tape(ctx, -14.5, -37, 9, 3.4, -.6);
      dropPath(ctx, 13.5, -38, 2.4); ctx.fillStyle = P.white; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = OL; ctx.stroke();
      // gauge window
      const gx = -8, gy = -58, gw = 15, gh = 44, ih = gh - 4;
      orr(ctx, gx, gy, gw, gh, 6, P.cream, 2);
      ctx.save(); rr(ctx, gx + 2, gy + 2, gw - 4, ih, 4.5); ctx.fillStyle = 'rgba(191,232,247,.55)'; ctx.fill(); ctx.clip();
      if (f > 0) {
        const wt = gy + 2 + ih * (1 - f);
        ctx.beginPath(); ctx.moveTo(gx, gy + gh);
        for (let i = 0; i <= 4; i++) ctx.lineTo(gx + i * gw / 4, wt + Math.sin(t * 3 + i * 1.7) * .9);
        ctx.lineTo(gx + gw, gy + gh); ctx.closePath();
        ctx.fillStyle = P.skyDeep; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(gx, wt + 1.2, gw, 1.3);
        const bh = ih * f;
        for (let i = 0; i < 2; i++) { const p = fr(t * .5 + i * .5); if (bh > 6) dot(ctx, gx + 5 + i * 4, gy + gh - 3 - p * (bh - 4), 1, 'rgba(255,255,255,.7)'); }
      }
      ctx.restore();
      line(ctx, gx + 4, gy + 5, gx + 4, gy + 13, 'rgba(255,255,255,.9)', 1.4);
      ctx.beginPath(); for (const k of [.25, .5, .75]) { const y = gy + 2 + ih * (1 - k); ctx.moveTo(gx + gw - 1, y); ctx.lineTo(gx + gw + 2.5, y); }
      ctx.strokeStyle = OL; ctx.lineWidth = 1.3; ctx.stroke();
      // tap + drip
      stick(ctx, 20, -15, 26.5, -15, P.metalLight, 2.6);
      stick(ctx, 26.5, -15, 26.5, -12, P.metalLight, 2.6);
      stick(ctx, 23, -15, 23, -19.5, P.coral, 1.5); circ(ctx, 23, -20.5, 1.8, P.coral, 1.1);
      if (f > .02) {
        const p = fr(t * 1.1), a = p < .8 ? 1 : (1 - p) * 5;
        ctx.globalAlpha = a; dropPath(ctx, 26.5, -7.5 + p * 6, 1.4); ctx.fillStyle = P.sky; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = OL; ctx.stroke(); ctx.globalAlpha = 1;
      }
      // lid, funnel, snow
      orr(ctx, -21, -67, 42, 6, 3, RIB);
      hl(ctx, -18, -66, 14, 1.4);
      orr(ctx, -5, -72, 10, 7, 2, P.sun, 2);
      poly(ctx, [[-21, -80], [21, -80], [6, -70.5], [-6, -70.5]], P.sun, 2.2);
      fillR(ctx, -15, -78.5, 10, 2, 1, HL);
      blob(ctx, [[-12, -82.5, 3.4], [-4, -84, 4.2], [5, -83.5, 3.8], [12.5, -82.5, 3]], P.snow, 1.8);
      orr(ctx, -24, -82, 48, 4.5, 2.2, shade(P.sun, -.12), 1.8);
    },
  });

  // ======================================================================
  // st.garden — indoor veggie planter
  // ======================================================================
  const GARDEN = [[-36, 0], [-22, 1], [-7.5, 2], [7, 0], [21, 3], [35, 1]]; // [x, type] 0 carrot 1 lettuce 2 tomato 3 radish
  const SEED_COL = [P.coral, P.leafLight, P.berry, P.rose];
  function veg(ctx, x, type, g, t) {
    const y = -24, s = c01((g - .08) / .92), sw = Math.sin(t * 1.5 + x * .3) * .06;
    if (s <= 0) {
      ell(ctx, x - 2.5, y - .8, 1.5, 1, P.paper, 1); ell(ctx, x + 2.2, y - .4, 1.5, 1, P.paper, 1);
      return;
    }
    if (s < .3) {
      const k = s / .3, h = 3 + 6 * k;
      line(ctx, x, y, x + sw * 10, y - h, P.leafDark, 1.6);
      leaf(ctx, x + sw * 10, y - h, 3 + 3 * k, 1.8 + k, -PI * .9, P.leafLight, 1.3);
      leaf(ctx, x + sw * 10, y - h, 3 + 3 * k, 1.8 + k, -PI * .1, P.leafLight, 1.3);
      return;
    }
    const k = (s - .3) / .7;
    if (type === 0) { // carrot
      for (const i of [-1, 1, 0]) leaf(ctx, x, y, 7 + 11 * k, 2.4 + .8 * k, -PI / 2 + i * .42 + sw, i ? P.leaf : P.leafLight, 1.4);
      if (k > .35) { ctx.beginPath(); ctx.arc(x, y + 1.5, 2.5 + 2.5 * k, PI, 0); ctx.closePath(); ctx.fillStyle = P.coral; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OL; ctx.stroke(); }
    } else if (type === 1) { // lettuce
      const r = 3.2 + 4.6 * k;
      blob(ctx, [[x - r * .65, y - r * .45, r * .7], [x + r * .65, y - r * .45, r * .7], [x, y - r * .85, r * .78]], P.leafLight, 1.6);
      ctx.beginPath(); ctx.arc(x - r * .3, y - r * .6, r * .45, 3.6, 5.6); ctx.moveTo(x + r * .75, y - r * .7); ctx.arc(x + r * .3, y - r * .6, r * .45, 5.8, 7.6);
      ctx.strokeStyle = P.leafDark; ctx.lineWidth = 1.1; ctx.stroke();
      dot(ctx, x - r * .35, y - r * 1.1, r * .18, HL);
    } else if (type === 2) { // tomato on a stake
      const h = 8 + 13 * k;
      stick(ctx, x + 3.5, y + 1, x + 3.5, y - 6 - 12 * k, P.woodLight, 1.4);
      line(ctx, x, y, x + sw * 8, y - h, P.leafDark, 1.8);
      for (let i = 0; i < 3; i++) {
        const ly = y - h * (.3 + i * .3);
        leaf(ctx, x, ly, 4 + 4 * k, 2 + k, (i % 2 ? -PI * .15 : -PI * .85) + sw, i === 1 ? P.leafLight : P.leaf, 1.3);
      }
      if (k > .45) {
        const ripe = k > .8, col = ripe ? P.berry : P.leafLight;
        for (const [dx, dy] of [[-3.5, .45], [3, .62], [-1, .8]]) {
          const tx = x + dx, ty = y - h * dy;
          circ(ctx, tx, ty, 2.4 + k, col, 1.3);
          dot(ctx, tx - .8, ty - .9, .7, 'rgba(255,255,255,.75)');
        }
        if (ripe) { const s2 = Math.sin(fr(t * .9) * PI); if (s2 > .1) starO(ctx, x + 8, y - h - 1, 1.2 + 2.2 * s2, P.sunLight, 1); }
      }
    } else { // radish
      for (const i of [-1, 1]) leaf(ctx, x, y - 1, 5 + 7 * k, 3 + 1.4 * k, -PI / 2 + i * .5 + sw, P.leaf, 1.4);
      if (k > .3) {
        ctx.beginPath(); ctx.arc(x, y + 1, 2.4 + 2.2 * k, PI, 0); ctx.closePath(); ctx.fillStyle = P.rose; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OL; ctx.stroke();
        dot(ctx, x - 1.2, y - 1.5 - k, .8, 'rgba(255,255,255,.7)');
      }
    }
  }
  K.define('st.garden', {
    w: 96, h: 46, tags: ['prop', 'station', 'home', 'food'],
    states: { planted: [true, false], growth: [0, .33, .66, 1] }, defaults: { planted: true, growth: .5 },
    desc: 'Crate planter of carrots, lettuce, a tomato and radishes. planted=false is bare soil with a trowel; growth 0 shows seeds and row markers, 1 is lush and ripe.',
    draw(ctx, o) {
      const t = o.t || 0, g = c01(o.growth), planted = o.planted !== false;
      shadow(ctx, 0, -1, 46, 3.5);
      // soil
      ctx.beginPath(); ctx.moveTo(-44, -20);
      for (let i = 0; i <= 11; i++) { const x = -44 + i * 8; ctx.quadraticCurveTo(x + 4, -27.5 + hash2(i, 1, 4) * 2, x + 8, -25.5); }
      ctx.lineTo(44, -20); ctx.closePath(); ctx.fillStyle = SOIL; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OL; ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 9; i++) { const x = -40 + i * 10 + hash2(i, 2, 4) * 4; ctx.moveTo(x + .9, -23.2); ctx.arc(x, -23.2, .9, 0, TAU); }
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
      if (planted) {
        // seed packet on a stick
        stick(ctx, -41, -24, -41, -33, P.woodLight, 1.4);
        orr(ctx, -46, -43, 10, 10, 1.5, P.paper, 1.5);
        ctx.beginPath(); ctx.moveTo(-43.5, -40); ctx.lineTo(-38.5, -40); ctx.lineTo(-41, -34.5); ctx.closePath(); ctx.fillStyle = P.coral; ctx.fill();
        leaf(ctx, -41, -40, 3, 1.4, -PI / 2, P.leaf, 1);
        if (g < .5) for (let i = 1; i < 6; i += 2) {
          const x = GARDEN[i][0] + 5.5, c = SEED_COL[GARDEN[i][1]];
          stick(ctx, x, -24, x, -31, P.woodLight, 1);
          poly(ctx, [[x, -34], [x + 5, -32.5], [x, -31]], c, 1.1);
        }
        for (let i = 0; i < GARDEN.length; i++) veg(ctx, GARDEN[i][0], GARDEN[i][1], g, t);
      } else {
        ctx.save(); ctx.translate(26, -27); ctx.rotate(.5);
        orr(ctx, -2, -13, 4, 9, 2, P.coral, 1.6);
        poly(ctx, [[-3.5, -4], [3.5, -4], [2.5, 3], [0, 5], [-2.5, 3]], P.metalLight, 1.6);
        ctx.restore();
        ell(ctx, 18, -25, 3.5, 1.6, SOIL, 1.4); ell(ctx, -12, -25, 2.5, 1.2, SOIL, 1.4);
      }
      // crate front: corner posts, two planks (one is a mint painted scrap)
      orr(ctx, -48, -25, 7, 25, 2, P.woodDark); orr(ctx, 41, -25, 7, 25, 2, P.woodDark);
      plank(ctx, -45, -22, 58, 9, P.wood);
      plank(ctx, 11, -22, 34, 9, P.mint);
      plank(ctx, -45, -13, 90, 9, P.woodLight);
      heart(ctx, 28, -17.5, 2.6, P.coral, 1.1);
      nail(ctx, -44.5, -21.5); nail(ctx, 44.5, -21.5);
    },
  });

  // ======================================================================
  // st.radio — radio on a small table
  // ======================================================================
  K.define('st.radio', {
    w: 56, h: 62, tags: ['prop', 'station', 'home', 'fun'],
    states: { on: [false, true] }, defaults: { on: false },
    desc: 'Round coral radio with a taped antenna on a little table with a lace doily. on: glowing dial, pulsing speaker and floating notes.',
    draw(ctx, o) {
      const t = o.t || 0, on = !!o.on, pulse = on ? Math.max(0, Math.sin(t * 12)) * .7 : 0;
      shadow(ctx, 0, -1, 27, 3.5);
      // table
      orr(ctx, -23, -25, 5, 25, 2, P.wood); orr(ctx, 18, -25, 5, 25, 2, P.wood);
      plank(ctx, -24, -10, 48, 4.5, P.woodLight, false);
      orr(ctx, -10, -15, 9, 5, 1.5, P.lilac, 1.4); orr(ctx, -9, -18.5, 8, 3.8, 1.5, P.sky, 1.4); // two cassette-ish boxes
      orr(ctx, -27, -29, 54, 6, 3, P.woodLight);
      hl(ctx, -24, -28, 24, 1.6);
      // lace doily hanging over the edge
      ctx.beginPath(); ctx.moveTo(-15, -29);
      for (let i = 0; i < 6; i++) { const x = -15 + i * 5; ctx.arc(x + 2.5, -25.5, 2.5, PI, 0, true); }
      ctx.lineTo(15, -29.5); ctx.closePath();
      ctx.fillStyle = P.cream; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = OL; ctx.stroke();
      for (let i = 0; i < 6; i++) dot(ctx, -12.5 + i * 5, -25.5, .7, SEAM);
      // antenna (taped joint)
      stick(ctx, 10, -50, 21.5, -58.5, P.metalLight, 1.4);
      circ(ctx, 22.5, -59.5, 2, P.coral, 1.2);
      tape(ctx, 12.5, -52, 5, 3, .65);
      // carry handle
      ctx.beginPath(); ctx.moveTo(-12, -51); ctx.quadraticCurveTo(-1, -60, 10, -51);
      ctx.lineWidth = 4.6; ctx.strokeStyle = OL; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = P.woodDeep; ctx.stroke();
      // body
      orr(ctx, -22, -53, 42, 24, 8, P.coral);
      hl(ctx, -18, -50.5, 16, 3);
      fillR(ctx, -20, -35, 38, 4, 2.5, DK);
      // speaker
      const sr = 8.3 + pulse;
      circ(ctx, -9, -41, sr, P.cream, 1.8);
      ctx.beginPath(); ctx.arc(-9, -41, sr * .66, 0, TAU); ctx.moveTo(-9 + sr * .33, -41); ctx.arc(-9, -41, sr * .33, 0, TAU);
      ctx.strokeStyle = SEAM; ctx.lineWidth = 1.2; ctx.stroke();
      dot(ctx, -9, -41, 1.3, P.coralDark);
      // dial
      orr(ctx, 3, -49, 14, 8, 2.5, on ? P.sunLight : P.cream, 1.5);
      if (on) glow(ctx, 10, -45, 12, P.glow, .5);
      ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(5 + i * 2.5, -47.5); ctx.lineTo(5 + i * 2.5, -46); } ctx.strokeStyle = SEAM; ctx.lineWidth = 1; ctx.stroke();
      const nx = on ? 11 + Math.sin(t * .7) * 1.5 : 6;
      line(ctx, nx, -48, nx, -42.5, P.berry, 1.3);
      circ(ctx, 6.5, -36, 2.8, P.sun, 1.4); circ(ctx, 14, -36, 2.8, P.mint, 1.4);
      dot(ctx, 17.5, -36, 1, on ? P.leafLight : P.stoneDark);
      // music
      if (on) {
        for (let i = 0; i < 2; i++) {
          const p = fr(t * .45 + i * .5), a = Math.min(1, p * 4) * (1 - p);
          ctx.globalAlpha = a;
          note(ctx, -17 - p * 6 + Math.sin(p * 7 + i) * 1.5, -50 - p * 8, .85, i ? P.plum : P.teal);
          ctx.globalAlpha = 1;
        }
      }
    },
  });

  // ======================================================================
  // st.armchair / st.chair / st.table
  // ======================================================================
  K.define('st.armchair', {
    w: 66, h: 60, tags: ['prop', 'station', 'home', 'sit'],
    desc: 'Cosy rose armchair with a mint patch, a knitted lilac throw and a heart cushion. Faces right (back on the left).',
    draw(ctx) {
      const C = FABRIC, CL = shade(FABRIC, .25), CD = shade(FABRIC, -.14);
      shadow(ctx, 0, -1, 31, 3.5);
      orr(ctx, -26, -10, 6, 10, 2, P.woodDark); orr(ctx, 20, -10, 6, 10, 2, P.woodDark);
      // reclined back + knitted throw
      ctx.save(); ctx.translate(-18, -17); ctx.rotate(-.08);
      orr(ctx, -10, -42, 21, 42, 9, C);
      hl(ctx, -6, -38, 4, 20, 2);
      dot(ctx, 3, -30, 1.3, CD); dot(ctx, 3, -19, 1.3, CD);
      ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(-12, -35); ctx.quadraticCurveTo(-12, -44, -3, -44); ctx.lineTo(6, -44);
      ctx.quadraticCurveTo(12, -44, 12, -39); ctx.lineTo(11, -35.5); ctx.lineTo(-4, -34); ctx.lineTo(-4.5, -13); ctx.closePath();
      ctx.fillStyle = P.lilac; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11.5, -27); ctx.lineTo(-4.5, -27); ctx.moveTo(-11.5, -20); ctx.lineTo(-4.5, -20); ctx.moveTo(-6, -40.5); ctx.lineTo(10, -40);
      ctx.strokeStyle = P.cream; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 4; i++) { const x = -11 + i * 2.2; ctx.moveTo(x, -13); ctx.lineTo(x - .3, -9.5); }
      ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
      // seat cushion + heart cushion
      orr(ctx, -17, -37, 34, 9, 4.5, CL);
      ctx.save(); ctx.translate(-6, -42); ctx.rotate(-.25); heart(ctx, 0, 0, 6.5, P.sun, 2); hl(ctx, -5, -4, 3, 2); ctx.restore();
      // side panel + arm roll
      orr(ctx, -29, -31, 60, 22, 10, C);
      hl(ctx, -24, -28, 18, 2.4);
      fillR(ctx, -27, -15, 56, 5, 3, DK);
      orr(ctx, -1, -41, 32, 13, 6.5, C);
      hl(ctx, 3, -39, 16, 2.4);
      ctx.beginPath(); ctx.arc(24.5, -34.5, 3.4, 0, TAU * .8); ctx.strokeStyle = CD; ctx.lineWidth = 1.5; ctx.stroke();
      seam(ctx, -1, -28, 30, -28, 1.1);
      // sewn-on patch
      orr(ctx, -21, -25, 12, 10, 2, P.mint, 1.5);
      ctx.setLineDash([1.6, 1.6]); rr(ctx, -19.6, -23.6, 9.2, 7.2, 1.2); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    },
  });
  K.define('st.chair', {
    w: 30, h: 52, tags: ['prop', 'home', 'sit'],
    desc: 'Wooden chair with a heart cut-out, a coral cushion and a taped leg. Faces right (back on the left).',
    draw(ctx) {
      shadow(ctx, 0, -1, 15, 2.5);
      orr(ctx, -14, -52, 6, 52, 3, P.wood);
      orr(ctx, -15, -51, 9, 22, 3.5, P.woodLight);
      heartPath(ctx, -10.5, -42, 2.8); ctx.fillStyle = HOLE; ctx.fill();
      hl(ctx, -13.5, -49, 2, 6, 1);
      stick(ctx, -9, -10, 10, -10, P.woodDark, 2);
      orr(ctx, 8.5, -26, 5.5, 26, 2, P.wood);
      tape(ctx, 11.2, -13, 8, 4.5, 0);
      orr(ctx, -15, -28, 30, 5, 2.5, P.woodLight);
      hl(ctx, -12, -27, 18, 1.4);
      orr(ctx, -12, -34, 24, 6.5, 3.2, P.coral);
      dot(ctx, -6, -31, .9, P.cream); dot(ctx, 0, -31, .9, P.cream); dot(ctx, 6, -31, .9, P.cream);
      line(ctx, -11, -29.5, -13.5, -26, OL, 1.1);
    },
  });
  K.define('st.table', {
    w: 80, h: 44, tags: ['prop', 'home', 'surface'],
    desc: 'Kitchen table with mismatched legs (one square, one turned) and a scalloped gingham tablecloth; the top is left clear for food.',
    draw(ctx) {
      shadow(ctx, 0, -1, 38, 3.5);
      orr(ctx, -27, -38, 5, 36, 2, P.woodDeep); orr(ctx, 23, -38, 5, 36, 2, P.woodDeep);
      plank(ctx, -32, -15, 64, 4.5, P.woodDark, false);
      orr(ctx, -36, -38, 7, 38, 2, P.woodDark);
      hl(ctx, -34.5, -35, 1.8, 28, .9);
      orr(ctx, 29.5, -38, 6, 38, 2.5, P.wood);
      ell(ctx, 32.5, -24, 5, 3.4, P.wood, 2); ell(ctx, 32.5, -10, 4.5, 3, P.wood, 2);
      hl(ctx, 30.5, -35, 1.6, 8, .8);
      tape(ctx, -32.5, -20, 9, 4.5, 0);
      orr(ctx, -40, -44, 80, 7, 3, P.woodLight);
      // tablecloth
      const cloth = () => {
        ctx.beginPath(); ctx.moveTo(-34, -45); ctx.lineTo(34, -45); ctx.lineTo(34, -36);
        for (let i = 0; i < 8; i++) { const x = 34 - i * 8.5; ctx.arc(x - 4.25, -36, 4.25, 0, PI); }
        ctx.closePath();
      };
      ctx.save(); cloth(); ctx.fillStyle = P.cream; ctx.fill(); ctx.clip();
      ctx.fillStyle = 'rgba(255,107,139,.32)';
      for (let x = -34; x < 34; x += 6) ctx.fillRect(x, -46, 3, 16);
      for (let y = -44; y < -31; y += 6) ctx.fillRect(-35, y, 70, 3);
      ctx.fillStyle = HL2; ctx.fillRect(-34, -45, 68, 2.5);
      ctx.restore();
      cloth(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      heart(ctx, 0, -38.5, 2.6, P.rose, 1.1);
    },
  });

  // ======================================================================
  // st.guitar
  // ======================================================================
  K.define('st.guitar', {
    w: 30, h: 64, tags: ['prop', 'station', 'home', 'fun'],
    desc: 'Acoustic guitar on a little stand, patched with tape, a star sticker and a ribbon on the head.',
    draw(ctx) {
      shadow(ctx, 0, -1, 13, 2.5);
      stick(ctx, -8, -1, -2, -9, P.metalDark, 1.5); stick(ctx, 8, -1, 2, -9, P.metalDark, 1.5);
      // neck + head
      stick(ctx, 0, -36, 0, -55, P.woodDeep, 4.6);
      ctx.beginPath(); for (let y = -52; y > -38; y -= 4) { ctx.moveTo(-2, y); ctx.lineTo(2, y); } ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = .8; ctx.stroke();
      for (const y of [-60.5, -56.5]) { circ(ctx, -5.5, y, 1.4, P.metalLight, 1); circ(ctx, 5.5, y, 1.4, P.metalLight, 1); }
      orr(ctx, -4.2, -63.5, 8.4, 10.5, 3, P.woodDark);
      hl(ctx, -2.6, -62, 1.8, 6, .9);
      // little ribbon bow
      ell(ctx, -3, -52.5, 2.6, 1.6, P.coral, 1.1, .4); ell(ctx, 3, -52.5, 2.6, 1.6, P.coral, 1.1, -.4); dot(ctx, 0, -52.5, 1.2, P.coralDark);
      // body
      blob(ctx, [[0, -17.5, 12.5], [0, -32, 9]], P.woodLight, 2);
      ctx.beginPath(); ctx.arc(0, -17.5, 10.6, .15 * PI, .85 * PI); ctx.strokeStyle = 'rgba(167,112,79,.55)'; ctx.lineWidth = 2; ctx.stroke();
      ell(ctx, -4.5, -35, 2.4, 3.6, HL, 0, .3); ell(ctx, -7, -21, 2.4, 5, HL, 0, .2);
      ell(ctx, 5, -21, 3, 4.2, P.coral, 1.1, -.3);
      circ(ctx, 0, -26.5, 5.6, null, 1); ctx.strokeStyle = 'rgba(167,112,79,.8)'; ctx.stroke();
      circ(ctx, 0, -26.5, 4, HOLE, 1.3);
      orr(ctx, -5, -13.5, 10, 3, 1.5, P.woodDeep, 1.1);
      ctx.beginPath(); for (const x of [-1.5, -.5, .5, 1.5]) { ctx.moveTo(x, -12.5); ctx.lineTo(x * .8, -55); }
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = .55; ctx.stroke();
      starO(ctx, -6, -11.5, 3, P.sunLight, 1);
      tape(ctx, 6.5, -32, 7, 3.4, .55);
    },
  });

  // ======================================================================
  // st.bookshelf — stacked crates of books
  // ======================================================================
  const SHELF = (() => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const row = []; let x = -30, k = 0;
      while (true) {
        const w = 5 + Math.floor(hash2(i, k, 5) * 4), h = 13 + Math.floor(hash2(i, k, 9) * 7);
        if (x + w > 30.5) break;
        row.push({ x, w, h, c: BOOKS[Math.floor(hash2(i, k, 13) * BOOKS.length)], band: hash2(i, k, 21) > .45 });
        x += w; k++;
      }
      out.push(row);
    }
    return out;
  })();
  function book(ctx, x, base, w, h, c, band) {
    orr(ctx, x, base - h, w, h, 1.5, c, 1.5);
    if (band) fillR(ctx, x + .9, base - h + 3, w - 1.8, 1.6, .5, 'rgba(255,255,255,.6)');
    fillR(ctx, x + .9, base - 5, w - 1.8, 1.3, .5, 'rgba(61,43,69,.25)');
  }
  function ornament(ctx, i, x, base) {
    if (i === 0) { // snow globe
      orr(ctx, x - 5, base - 4, 10, 4, 1.5, P.woodDark, 1.4);
      circ(ctx, x, base - 9, 5.4, 'rgba(191,232,247,.95)', 1.6);
      fillR(ctx, x - 2, base - 9, 4, 3.5, .5, P.coral); poly(ctx, [[x - 2.8, base - 9], [x, base - 12], [x + 2.8, base - 9]], P.rose, 1);
      dot(ctx, x - 2, base - 12, .7, P.white); dot(ctx, x + 2.5, base - 11, .6, P.white);
    } else if (i === 1) { // tiny succulent
      orr(ctx, x - 4, base - 6, 8, 6, 2, TERRA, 1.5);
      blob(ctx, [[x - 2, base - 8, 2.3], [x + 2, base - 8, 2.3], [x, base - 10.5, 2.5]], P.leaf, 1.4);
    } else { // candle in a jar
      orr(ctx, x - 4, base - 9, 8, 9, 2.5, 'rgba(191,232,247,.95)', 1.5);
      fillR(ctx, x - 2, base - 6, 4, 5, 1, P.cream);
      flame(ctx, x, base - 6, 3.5, 1.3, P.fire2);
    }
  }
  K.define('st.bookshelf', {
    w: 70, h: 100, tags: ['prop', 'station', 'home', 'fun'],
    states: { full: [0, .5, 1] }, defaults: { full: 1 },
    desc: 'Three stacked salvage crates used as a bookshelf; full 0..1 sets how many books are on it (little keepsakes fill the gaps).',
    draw(ctx, o) {
      const full = c01(o.full);
      shadow(ctx, 0, -1, 35, 3.5);
      orr(ctx, -31, -4, 8, 4, 1.5, P.woodDeep, 1.8); orr(ctx, 23, -4, 8, 4, 1.5, P.woodDeep, 1.8);
      const cols = [P.woodLight, P.mint, P.wood];
      for (let i = 0; i < 3; i++) {
        const top = -33 - i * 30, base = top + 26, col = cols[i];
        orr(ctx, -35, top, 70, 30, 3, col);
        fillR(ctx, -31, top + 3.5, 62, 22.5, 2, HOLE);
        line(ctx, -31, top + 14.5, 31, top + 14.5, 'rgba(255,255,255,.07)', 1.2);
        const row = SHELF[i], n = Math.round(full * row.length);
        ctx.save(); rr(ctx, -31, top + 3.5, 62, 22.5, 2); ctx.clip();
        if (i === 1) ctx.scale(-1, 1);
        for (let k = 0; k < n; k++) { const b = row[k]; book(ctx, b.x, base, b.w, b.h, b.c, b.band); }
        if (n > 0 && n < row.length) {
          const b = row[n], a = .32, px = row[n - 1].x + row[n - 1].w + b.h * Math.sin(a) + .3;
          ctx.save(); ctx.translate(px, base); ctx.rotate(-a); book(ctx, 0, 0, b.w, b.h, b.c, b.band); ctx.restore();
        }
        if (n <= row.length - 5) ornament(ctx, i, 23, base);
        ctx.restore();
        rr(ctx, -31, top + 3.5, 62, 22.5, 2); ctx.lineWidth = 1.4; ctx.strokeStyle = OL; ctx.stroke();
        hl(ctx, -33, top + 1, 30, 1.6);
        nail(ctx, -33, top + 2); nail(ctx, 33, top + 2); nail(ctx, -33, top + 28); nail(ctx, 33, top + 28);
      }
      // a little stack on top
      orr(ctx, -27, -96.5, 22, 3.5, 1.5, P.coral, 1.5);
      orr(ctx, -25, -100, 17, 3.5, 1.5, P.sky, 1.5);
      starO(ctx, 16, -96.5, 3.2, P.sunLight, 1.1);
    },
  });

  // ======================================================================
  // st.lamp / st.bulb
  // ======================================================================
  K.define('st.lamp', {
    w: 30, h: 96, tags: ['prop', 'home', 'light'],
    states: { on: [false, true] }, defaults: { on: false },
    desc: 'Floor lamp with a polka-dot lilac shade, pink fringe and a pull string. on: warm bulb, glow and a soft light cone.',
    draw(ctx, o) {
      const on = !!o.on;
      shadow(ctx, 0, -1, 11, 2.5);
      if (on) {
        poly(ctx, [[-12, -76], [12, -76], [15, -3], [-15, -3]], 'rgba(255,217,138,.16)', 0);
        glow(ctx, 0, -78, 25, P.glow, .7);
      }
      orr(ctx, -10, -6, 20, 6, 3, P.teal);
      hl(ctx, -7, -5, 7, 1.4);
      stick(ctx, 0, -6, 0, -74, GOLD, 2.2);
      circ(ctx, 0, -38, 2.2, GOLD, 1.3);
      circ(ctx, 0, -74, 4.6, on ? P.fire3 : P.cream, 1.6);
      // shade
      const sh = () => { ctx.beginPath(); ctx.moveTo(-8, -96); ctx.lineTo(8, -96); ctx.quadraticCurveTo(10, -96, 10.6, -94); ctx.lineTo(14.5, -79); ctx.quadraticCurveTo(15, -77, 13, -77); ctx.lineTo(-13, -77); ctx.quadraticCurveTo(-15, -77, -14.5, -79); ctx.lineTo(-10.6, -94); ctx.quadraticCurveTo(-10, -96, -8, -96); ctx.closePath(); };
      sh(); ctx.fillStyle = on ? mix(P.lilac, P.sunLight, .45) : P.lilac; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
      ctx.beginPath(); for (const [x, y] of [[-6, -90], [3, -92], [8, -84], [-10, -82], [-1, -83]]) { ctx.moveTo(x + 1.3, y); ctx.arc(x, y, 1.3, 0, TAU); }
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
      fillR(ctx, -8, -94, 3, 10, 1.5, HL);
      heart(ctx, 5, -86.5, 2, P.pink, 0);
      for (let i = 0; i < 7; i++) circ(ctx, -12 + i * 4, -76, 1.7, P.pink, 1.1);
      line(ctx, 9, -76, 9, -66, OL, .9); circ(ctx, 9, -65, 1.6, P.sun, 1);
    },
  });
  K.define('st.bulb', {
    w: 20, h: 40, ay: 0, tags: ['prop', 'home', 'light', 'ceiling'],
    states: { on: [false, true] }, defaults: { on: false },
    desc: 'Bare ceiling bulb on a cord with a little ceiling rose (anchor top-centre at the ceiling). on: warm glow; it sways gently with o.t.',
    draw(ctx, o) {
      const on = !!o.on, t = o.t || 0;
      orr(ctx, -6, -1, 12, 4, 2, P.cream, 1.6);
      ctx.save(); ctx.translate(0, 2); ctx.rotate(Math.sin(t * 1.3) * .035);
      if (on) glow(ctx, 0, 31, 19, P.glow, .8);
      line(ctx, 0, 0, 0, 22, OL, 1.6);
      tape(ctx, 0, 11, 4, 3, .2);
      orr(ctx, -4, 20, 8, 7, 2, P.metalDark, 1.6);
      ctx.beginPath(); ctx.moveTo(-4, 23.5); ctx.lineTo(4, 23.5); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.stroke();
      blob(ctx, [[0, 30, 3.6], [0, 32.5, 5.6]], on ? P.fire3 : P.cream, 1.7);
      ctx.beginPath(); ctx.moveTo(-1.8, 27); ctx.lineTo(-1.8, 31); ctx.lineTo(-.6, 32.5); ctx.lineTo(.6, 31); ctx.lineTo(1.8, 32.5); ctx.lineTo(1.8, 27);
      ctx.strokeStyle = on ? P.fire1 : 'rgba(61,43,69,.4)'; ctx.lineWidth = 1; ctx.stroke();
      ell(ctx, -2.5, 30.5, 1.2, 2.2, 'rgba(255,255,255,.85)', 0, .3);
      ctx.restore();
    },
  });

  // ======================================================================
  // st.rug / st.plant
  // ======================================================================
  K.define('st.rug', {
    w: 110, h: 10, tags: ['prop', 'home', 'deco', 'floor'],
    states: { color: [P.coral, P.teal, P.plum] }, defaults: { color: P.coral },
    desc: 'Flat woven rug lying on the floor with a diamond pattern and tassels; o.color sets the main colour.',
    draw(ctx, o) {
      const c = o.color || P.coral, cl = shade(c, .6), cd = shade(c, -.2);
      ctx.beginPath();
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const y = -8.3 + k * 1.75; ctx.moveTo(s * 50, y); ctx.lineTo(s * 54.5, y + .5); }
      ctx.strokeStyle = OL; ctx.lineWidth = 2.6; ctx.stroke(); ctx.strokeStyle = P.cream; ctx.lineWidth = 1.1; ctx.stroke();
      orr(ctx, -51, -6, 102, 6, 2.5, cd, 2);
      orr(ctx, -51, -10, 102, 7.5, 3.5, c, 2);
      fillR(ctx, -47, -9, 94, 1.1, .5, cl);
      fillR(ctx, -47, -4.6, 94, 1, .5, cl);
      ctx.beginPath();
      for (let x = -42; x <= 42; x += 12) { ctx.moveTo(x - 3.5, -6.6); ctx.lineTo(x, -8.2); ctx.lineTo(x + 3.5, -6.6); ctx.lineTo(x, -5); ctx.closePath(); }
      ctx.fillStyle = P.cream; ctx.fill();
      ctx.beginPath(); for (let x = -36; x <= 36; x += 12) { ctx.moveTo(x + 1, -6.6); ctx.arc(x, -6.6, 1, 0, TAU); }
      ctx.fillStyle = P.sun; ctx.fill();
    },
  });
  K.define('st.plant', {
    w: 30, h: 44, tags: ['prop', 'home', 'deco'],
    desc: 'Leafy houseplant in a terracotta pot with a painted heart; leaves sway a little with o.t.',
    draw(ctx, o) {
      const t = o.t || 0, sw = Math.sin(t * 1.3 + (o.seed || 0)) * .04;
      shadow(ctx, 0, -1, 10, 2.5);
      const L = [[-2.25, 15, P.leaf], [-1.05, 15, P.leafDark], [-1.85, 20, P.leafLight], [-1.3, 23, P.leaf], [-.65, 17, P.leafLight]];
      for (let i = 0; i < L.length; i++) {
        const [a, len, col] = L[i], ang = a + sw * (i % 2 ? 1 : -1);
        leaf(ctx, Math.cos(a) * 2, -18, len, len * .36, ang, col, 1.6);
      }
      ctx.save(); ctx.translate(7, -18); ctx.rotate(.5 + sw); leaf(ctx, 0, 0, 10, 4, 0, P.leaf, 1.6); ctx.restore();
      dot(ctx, -6, -37, 2.2, P.pink); dot(ctx, -6, -37, .9, P.sun);
      poly(ctx, [[-10, -17], [10, -17], [7.5, 0], [-7.5, 0]], TERRA, 2.2);
      fillR(ctx, -7.5, -14, 2.6, 10, 1.3, HL);
      heart(ctx, 1, -8.5, 2.8, P.cream, 0);
      orr(ctx, -12, -20, 24, 5, 2.5, shade(TERRA, .1), 2);
    },
  });

  // ======================================================================
  // wall things: st.toolwall, st.picture, st.clock, st.window
  // ======================================================================
  K.define('st.toolwall', {
    w: 70, h: 50, tags: ['wall', 'deco', 'home'],
    desc: 'Pegboard of hand tools (saw, wrench, screwdrivers, pliers, hammer, tape, brush) over a little ledge. Wall mounted, anchor bottom-centre.',
    draw(ctx) {
      orr(ctx, -34, -50, 68, 44, 5, PEG);
      hl(ctx, -31, -48, 30, 2.2);
      ctx.beginPath();
      for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { const x = -28 + c * 7, y = -44 + r * 6.6; ctx.moveTo(x + .85, y); ctx.arc(x, y, .85, 0, TAU); }
      ctx.fillStyle = 'rgba(61,43,69,.22)'; ctx.fill();
      screw(ctx, -30, -46, 1.7, .5); screw(ctx, 30, -46, 1.7, 1.2); screw(ctx, -30, -11, 1.7, 2); screw(ctx, 30, -11, 1.7, .2);
      // top row
      saw(ctx, -29, -43, P.sun);
      stick(ctx, 8, -40.5, 8, -32, P.metalLight, 2.3);
      circ(ctx, 8, -43, 3.2, P.metalLight, 1.4); dot(ctx, 8, -45.6, 1.5, PEG);
      circ(ctx, 8, -30.5, 2.3, P.metalLight, 1.2); dot(ctx, 8, -30.5, .9, PEG);
      for (const [x, c] of [[15, P.coral], [21, P.teal]]) {
        line(ctx, x, -38, x, -29.5, OL, 3.2); line(ctx, x, -38, x, -30, P.metalLight, 1.2);
        orr(ctx, x - 2.2, -45, 4.4, 8, 2, c, 1.4);
      }
      stick(ctx, 25, -29.5, 28.5, -39, P.coral, 1.8); stick(ctx, 31.5, -29.5, 28, -39, P.coral, 1.8);
      poly(ctx, [[27, -39.5], [29.5, -39.5], [28.8, -45], [27.8, -45]], P.metalDark, 1.2);
      // bottom row
      stick(ctx, -28, -21, -11, -21, P.woodLight, 2.6);
      orr(ctx, -12.5, -27, 6.5, 12, 2, P.metal, 1.7);
      line(ctx, -11, -25.5, -11, -17, 'rgba(255,255,255,.6)', 1.1);
      circ(ctx, 3, -21, 5.2, P.mint, 1.8); circ(ctx, 3, -21, 2.3, PEG, 1.3);
      stick(ctx, 13, -27, 13, -19, P.sun, 2);
      orr(ctx, 10.5, -19.5, 5, 3, 1, P.metalLight, 1.2);
      poly(ctx, [[10.5, -16.5], [15.5, -16.5], [15, -12.5], [11, -12.5]], P.coral, 1.3);
      // painted silhouette of the missing tool
      ctx.setLineDash([2, 2]); rr(ctx, 21, -27, 9, 13, 2); ctx.strokeStyle = 'rgba(61,43,69,.45)'; ctx.lineWidth = 1.1; ctx.stroke(); ctx.setLineDash([]);
      // ledge
      orr(ctx, -27, -3, 5, 3, 1, P.woodDark, 1.4); orr(ctx, 22, -3, 5, 3, 1, P.woodDark, 1.4);
      plank(ctx, -35, -9, 70, 6, P.wood);
      orr(ctx, -24, -17, 9, 8, 2.5, P.glass, 1.6); orr(ctx, -25, -19, 11, 3, 1.2, P.coral, 1.3);
      dot(ctx, -21, -12, 1, P.metalDark); dot(ctx, -18, -12.5, 1, P.metalDark);
      orr(ctx, 18, -15.5, 9, 6.5, 2, P.lilac, 1.5); orr(ctx, 17.4, -16.5, 10.2, 2.2, 1, P.metalLight, 1.2);
    },
  });

  function kidDrawing(ctx) {
    ctx.save(); ctx.translate(0, -15); ctx.rotate(-.05);
    orr(ctx, -16, -14, 32, 27, 1.5, P.white, 1.6);
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-12, -2); ctx.lineTo(-3, -2); ctx.lineTo(-3, 6); ctx.strokeStyle = P.coral; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-13.5, -1.5); ctx.lineTo(-7.5, -8); ctx.lineTo(-1.5, -1.5); ctx.strokeStyle = P.berry; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8.5, 6); ctx.lineTo(-8.5, 2); ctx.lineTo(-6, 2); ctx.lineTo(-6, 6); ctx.strokeStyle = P.woodDark; ctx.stroke();
    ctx.beginPath(); ctx.arc(10, -7.5, 2.6, 0, TAU);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.moveTo(10 + Math.cos(a) * 3.8, -7.5 + Math.sin(a) * 3.8); ctx.lineTo(10 + Math.cos(a) * 5.4, -7.5 + Math.sin(a) * 5.4); }
    ctx.strokeStyle = P.sun; ctx.stroke();
    ctx.beginPath();
    for (const x of [3, 9.5]) { ctx.moveTo(x + 1.5, -1); ctx.arc(x, -1, 1.5, 0, TAU); ctx.moveTo(x, .5); ctx.lineTo(x, 5); ctx.moveTo(x, 5); ctx.lineTo(x - 1.5, 8); ctx.moveTo(x, 5); ctx.lineTo(x + 1.5, 8); }
    ctx.moveTo(3, 2.5); ctx.lineTo(9.5, 2.5);
    ctx.strokeStyle = P.skyDeep; ctx.stroke();
    heart(ctx, 6.3, -4.6, 1.5, P.rose, 0);
    ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(0, 7.5, 14, 10); ctx.strokeStyle = P.leaf; ctx.stroke();
    ctx.restore();
    tape(ctx, -14, -27.5, 8, 3.5, -.6); tape(ctx, 14, -28.5, 8, 3.5, .6);
  }
  K.define('st.picture', {
    w: 36, h: 30, tags: ['wall', 'deco', 'home'],
    states: { kind: [0, 1, 2, 3] }, defaults: { kind: 0 },
    desc: 'Wall picture. kind 0 snowy hills with a cabin, 1 portrait of a cream cat, 2 flowers in a vase, 3 a child\'s crayon drawing taped up.',
    draw(ctx, o) {
      const k = ((o.kind | 0) % 4 + 4) % 4;
      if (k === 3) { kidDrawing(ctx); return; }
      orr(ctx, -18, -30, 36, 30, 4, [P.woodLight, GOLD, P.mint][k]);
      hl(ctx, -16, -28.7, 20, 1.8);
      const bg = [shade(P.sky, .45), shade(P.pink, .5), P.paper][k];
      ctx.save(); rr(ctx, -14, -26, 28, 22, 2); ctx.fillStyle = bg; ctx.fill(); ctx.clip();
      if (k === 0) {
        circ(ctx, 7, -20, 3.4, P.sunLight, 1.2);
        ell(ctx, -6, -3, 16, 9, P.snowShade, 1.4);
        ell(ctx, 10, -2, 14, 7, P.snow, 1.4);
        poly(ctx, [[-10, -12], [-6.5, -19], [-3, -12]], P.leafDark, 1.2);
        fillR(ctx, -7.2, -12.5, 1.4, 2.5, .3, P.woodDeep);
        orr(ctx, 4, -11, 7, 5, 1, P.coral, 1.2); poly(ctx, [[3, -11], [7.5, -14.5], [12, -11]], P.berry, 1.2);
        dot(ctx, 7.5, -9, .9, P.sunLight);
      } else if (k === 1) {
        ell(ctx, 0, -2, 11, 6, P.cream, 1.4);
        poly(ctx, [[-8.5, -16], [-7.5, -23.5], [-2.5, -18.5]], P.cream, 1.4); poly(ctx, [[8.5, -16], [7.5, -23.5], [2.5, -18.5]], mix(P.coral, P.sun, .5), 1.4);
        ell(ctx, 0, -13, 9.5, 7.5, P.cream, 1.6);
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, -13, 9.5, 7.5, 0, 0, TAU); ctx.clip(); ell(ctx, 6.5, -17, 5, 4, mix(P.coral, P.sun, .5), 0); ctx.restore();
        ctx.beginPath(); ctx.ellipse(0, -13, 9.5, 7.5, 0, 0, TAU); ctx.lineWidth = 1.6; ctx.strokeStyle = OL; ctx.stroke();
        face(ctx, 0, -13.5, { gap: 7, eye: 1.5 });
        ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-11, -11); ctx.moveTo(-6, -9); ctx.lineTo(-11, -8.5); ctx.moveTo(6, -10); ctx.lineTo(11, -11); ctx.moveTo(6, -9); ctx.lineTo(11, -8.5);
        ctx.strokeStyle = SEAM; ctx.lineWidth = .8; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(-6, -18); ctx.moveTo(0, -9); ctx.lineTo(0, -21); ctx.moveTo(0, -9); ctx.lineTo(6, -17);
        ctx.strokeStyle = P.leafDark; ctx.lineWidth = 1.3; ctx.stroke();
        for (const [x, y, c] of [[-6, -18, P.coral], [0, -21, P.sun], [6, -17, P.lilac]]) {
          ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.moveTo(x + Math.cos(a) * 2.2 + 1.5, y + Math.sin(a) * 2.2); ctx.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.5, 0, TAU); }
          ctx.fillStyle = c; ctx.fill(); dot(ctx, x, y, 1.1, P.cream);
        }
        orr(ctx, -5, -10, 10, 8, 3, P.teal, 1.4);
        fillR(ctx, -3.5, -8.5, 1.6, 4, .8, HL);
        fillR(ctx, -14, -2, 28, 2, 0, mix(P.woodLight, P.paper, .5));
      }
      ctx.restore();
      rr(ctx, -14, -26, 28, 22, 2); ctx.lineWidth = 1.6; ctx.strokeStyle = OL; ctx.stroke();
    },
  });

  K.define('st.clock', {
    w: 28, h: 28, tags: ['wall', 'deco', 'home'],
    desc: 'Round teal wall clock with a heart at twelve. o.hour (0-24, decimals for minutes) sets the hands, default 10:10; the seconds hand ticks with o.t.',
    draw(ctx, o) {
      const cy = -13;
      ctx.beginPath(); ctx.arc(0, -25.4, 2.2, PI, 0); ctx.lineWidth = 1.4; ctx.strokeStyle = OL; ctx.stroke();
      circ(ctx, 0, cy, 12.4, P.teal);
      ctx.beginPath(); ctx.arc(0, cy, 11, 3.5, 4.6); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
      circ(ctx, 0, cy, 9.2, P.cream, 1.5);
      ctx.beginPath();
      for (let i = 1; i < 12; i++) { const a = i / 12 * TAU - PI / 2, r = i % 3 ? .55 : 1, x = Math.cos(a) * 7.3, y = cy + Math.sin(a) * 7.3; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
      ctx.fillStyle = OL; ctx.fill();
      heart(ctx, 0, cy - 7.2, 1.5, P.coral, 0);
      let hr = o.hour != null ? +o.hour : 10 + 10 / 60;
      if (!(hr === hr)) hr = 10 + 10 / 60;
      const mn = fr(hr) * 60, ha = fr(hr / 12) * TAU - PI / 2, ma = mn / 60 * TAU - PI / 2;
      line(ctx, 0, cy, Math.cos(ha) * 4.6, cy + Math.sin(ha) * 4.6, OL, 2);
      line(ctx, 0, cy, Math.cos(ma) * 6.8, cy + Math.sin(ma) * 6.8, OL, 1.5);
      const sa = (Math.floor(o.t || 0) % 60) / 60 * TAU - PI / 2;
      line(ctx, 0, cy, Math.cos(sa) * 7.3, cy + Math.sin(sa) * 7.3, P.coral, .9);
      circ(ctx, 0, cy, 1.3, P.sun, 1);
    },
  });

  K.define('st.window', {
    w: 60, h: 58, tags: ['wall', 'home', 'window'],
    states: { snow: [false, true], night: [false, true], boarded: [0, 1, 2] },
    defaults: { boarded: 0, night: false, snow: false },
    desc: 'Four-pane window with a scalloped valance and tie-back curtains. boarded 0/1/2 = clear / a few planks / fully boarded; night=true dark glass with a tiny moon reflection; snow=true snow on the sill, frost and flakes.',
    draw(ctx, o) {
      const night = !!o.night, snow = !!o.snow, b = Math.max(0, Math.min(2, o.boarded | 0)), t = o.t || 0;
      orr(ctx, -27, -57, 54, 48, 5, P.cream);
      // glass
      ctx.save(); rr(ctx, -22.5, -52, 45, 39, 3); ctx.fillStyle = night ? P.glassNight : P.glass; ctx.fill(); ctx.clip();
      if (night) {
        circ(ctx, 12, -44, 4.6, P.sunLight, 0); circ(ctx, 14.3, -45.6, 4, P.glassNight, 0);
        star(ctx, -12, -45, 1.6, P.sunLight); star(ctx, 4, -24, 1.2, P.sunLight); star(ctx, -16, -26, 1, P.sunLight);
      }
      ctx.fillStyle = night ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.moveTo(-20, -24); ctx.lineTo(-8, -50); ctx.lineTo(-3.5, -50); ctx.lineTo(-15.5, -24); ctx.closePath();
      ctx.moveTo(4, -15); ctx.lineTo(14, -36); ctx.lineTo(16, -36); ctx.lineTo(6, -15); ctx.closePath(); ctx.fill();
      if (snow) {
        ctx.beginPath();
        for (let i = 0; i < 7; i++) { const x = -20 + fr(hash2(i, 7, 3) + Math.sin(t * .8 + i) * .02) * 40, y = -52 + fr(hash2(i, 9, 3) + t * .12) * 40; ctx.moveTo(x + 1, y); ctx.arc(x, y, 1, 0, TAU); }
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
        ctx.beginPath();
        for (const [x, y] of [[-22.5, -13], [22.5, -13], [0, -13], [-22.5, -32], [22.5, -32], [0, -32]]) { ctx.moveTo(x + 5, y); ctx.arc(x, y, 5, 0, TAU); }
        ctx.fillStyle = 'rgba(244,248,255,.75)'; ctx.fill();
      }
      ctx.restore();
      rr(ctx, -22.5, -52, 45, 39, 3); ctx.lineWidth = 1.8; ctx.strokeStyle = OL; ctx.stroke();
      orr(ctx, -1.8, -52, 3.6, 39, 1.5, P.cream, 1.5);
      orr(ctx, -22.5, -34.3, 45, 3.6, 1.5, P.cream, 1.5);
      // tie-back curtains + valance
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 23, -52); ctx.lineTo(s * 15, -52); ctx.quadraticCurveTo(s * 17, -38, s * 21, -33); ctx.quadraticCurveTo(s * 18, -24, s * 20, -16); ctx.lineTo(s * 23, -16); ctx.closePath();
        ctx.fillStyle = P.pink; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = OL; ctx.stroke();
        orr(ctx, s * 21.5 - 2.5, -35, 5, 3.5, 1.5, P.sun, 1.2);
      }
      ctx.beginPath(); ctx.moveTo(-26, -51);
      for (let i = 0; i < 6; i++) ctx.arc(-21.7 + i * 8.66, -51, 4.33, PI, 0, true);
      ctx.lineTo(26, -56); ctx.lineTo(-26, -56); ctx.closePath();
      ctx.fillStyle = P.coral; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = OL; ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const x = -21.7 + i * 8.66; ctx.moveTo(x + 1, -50.5); ctx.arc(x, -50.5, 1, 0, TAU); }
      ctx.fillStyle = P.cream; ctx.fill();
      fillR(ctx, -24, -55.5, 20, 1.6, .8, HL);
      // boards
      if (b === 1) {
        plankAt(ctx, 0, -33, 56, 7.5, .62, P.wood);
        plankAt(ctx, 0, -33, 56, 7.5, -.6, P.woodLight);
        plankAt(ctx, 1, -20, 50, 7, .05, P.woodDark);
      } else if (b === 2) {
        const cols = [P.wood, P.woodLight, P.woodDark, P.mint, P.wood];
        for (let i = 0; i < 5; i++) {
          const y = -48.5 + i * 8.3, len = 50 + hash2(i, 1, 5) * 7, a = (hash2(i, 2, 5) - .5) * .09, dx = (hash2(i, 3, 5) - .5) * 4;
          plankAt(ctx, dx, y, len, 8, a, cols[i]);
        }
        tape(ctx, 9, -32, 4.5, 9, .1);
      }
      // sill
      orr(ctx, -30, -12, 60, 7, 3, P.woodLight);
      hl(ctx, -27, -11, 26, 1.6);
      orr(ctx, -22, -5.5, 6, 5.5, 2, P.woodDark, 1.6); orr(ctx, 16, -5.5, 6, 5.5, 2, P.woodDark, 1.6);
      if (snow) blob(ctx, [[-23, -12.5, 3.2], [-15, -13.5, 4.2], [-6, -13, 3.6], [3, -13.6, 4.3], [12, -13, 3.6], [22, -12.6, 3.4]], P.snow, 1.8);
    },
  });

  // ======================================================================
  // st.door — swings toward the viewer on its left hinge
  // ======================================================================
  K.define('st.door', {
    w: 52, h: 96, tags: ['prop', 'home', 'door'],
    states: { open: [0, .5, 1], level: [0, 1, 2] }, defaults: { open: 0, level: 0 },
    desc: 'Front door in its frame. level 0 plain wood with a round window, 1 boarded with planks, 2 reinforced with riveted metal plates and a bolt. open 0..1 swings it on its left hinge.',
    draw(ctx, o) {
      const op = c01(o.open), lv = Math.max(0, Math.min(2, o.level | 0));
      const ang = op * 1.35, sx = Math.cos(ang), X0 = -21, PW = 42, TOP = -91;
      const X = x => X0 + x * sx;
      // panel-space shapes: x is squashed by the swing, outlines stay crisp
      const prr = (x, y, w, h, r, fill, lw) => orr(ctx, X(x), y, w * sx, h, Math.min(r, w * sx / 2), fill, lw);
      const pdot = (x, y, r, fill, lw) => { ell(ctx, X(x), y, r * sx, r, fill, lw == null ? 1.2 : lw); };
      const pnail = (x, y) => nail(ctx, X(x), y);
      const base = mix(P.woodLight, P.wood, .45);
      // frame + doorway
      orr(ctx, -26, -96, 52, 96, 4, P.woodDark);
      hl(ctx, -24, -94, 2.4, 88, 1.2);
      rr(ctx, -21, TOP, 42, 91, 2); ctx.fillStyle = DOORWAY; ctx.fill();
      fillR(ctx, -21, -9, 42, 9, 0, shade(DOORWAY, .12));
      fillR(ctx, 6, -86, 10, 74, 4, 'rgba(255,255,255,.06)');
      rr(ctx, -21, TOP, 42, 91, 2); ctx.lineWidth = 1.8; ctx.strokeStyle = OL; ctx.stroke();
      if (lv === 2) { for (const [x, y] of [[-23.5, -93], [23.5, -93], [-23.5, -4], [23.5, -4]]) rivet(ctx, x, y); }
      // door edge (thickness) while open
      if (op > .01) orr(ctx, X(PW) - 1.5, TOP, 2 + 5.5 * Math.sin(ang), 91, 1.5, shade(base, -.25), 2);
      // panel
      prr(0, TOP, PW, 91, 3, base);
      if (sx > .35) fillR(ctx, X(3), TOP + 3, 2.4 * sx + .6, 84, 1, HL);
      // level 0 details (always under the boards / plates)
      prr(5, -85, 32, 28, 3, shade(base, -.06), 1.3);
      prr(5, -51, 14, 41, 3, shade(base, -.06), 1.3);
      prr(23, -51, 14, 41, 3, shade(base, -.06), 1.3);
      ell(ctx, X(21), -71, 6.4 * sx, 6.4, lv ? P.glassNight : P.glass, 1.6);
      if (sx > .4) line(ctx, X(21) - 2.2 * sx, -74, X(21) + 1 * sx, -69, 'rgba(255,255,255,.7)', 1.2);
      for (const y of [-80, -16]) prr(-.5, y, 5, 7, 1.5, P.metalDark, 1.3);
      if (lv === 1) {
        // boarded: three planks + a diagonal brace
        const pl = (y, h, c, nl, nr) => { prr(-1, y, PW + 2, h, 2.5, c); fillR(ctx, X(2), y + 1.5, (PW - 4) * sx, 1.4, .7, HL); pnail(nl, y + h / 2); pnail(nr, y + h / 2); };
        ctx.beginPath(); ctx.moveTo(X(4), -27); ctx.lineTo(X(10), -27); ctx.lineTo(X(38), -70); ctx.lineTo(X(32), -70); ctx.closePath();
        ctx.fillStyle = P.woodDark; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke();
        pl(-80, 10, P.wood, 4, 38);
        pl(-52, 9, P.mint, 6, 36);
        pl(-27, 10, P.woodLight, 4, 38);
        pnail(21, -38);
        tape(ctx, X(30), -47, 4 * sx + 1, 7, 0);
      } else if (lv === 2) {
        // reinforced: riveted plates, a steel band and a sliding bolt
        const plate = (y, h) => {
          prr(2.5, y, PW - 5, h, 3, P.metal);
          fillR(ctx, X(5), y + 2, (PW - 10) * sx, 2, 1, HL);
          for (const yy of [y + 3.5, y + h - 3.5]) for (const xx of [6, 21, 36]) pdot(xx, yy, 1.4, P.metalLight, 1);
        };
        plate(-87, 30); plate(-44, 37);
        ctx.save(); ctx.translate(X(21), -72); ctx.scale(sx, 1); star(ctx, 0, 0, 5.5, P.metalLight); ctx.restore();
        prr(-1, -55, PW + 2, 9, 2, P.metalDark);
        for (const xx of [4, 14, 28]) pdot(xx, -50.5, 1.4, P.metalLight, 1);
        prr(31, -56.5, 10, 4, 1.5, P.metalLight, 1.2);
        pdot(35, -52, 2.2, P.sun, 1.3);
      }
      // knob
      if (lv !== 2) { pdot(36, -46, 2.8, P.sun, 1.5); }
      // threshold
      orr(ctx, -24, -3, 48, 3, 1.5, P.woodDeep, 1.6);
    },
  });

  // ======================================================================
  // st.ladder
  // ======================================================================
  K.define('st.ladder', {
    w: 36, h: 146, tags: ['prop', 'home', 'climb'],
    defaults: { h: 146 },
    desc: 'Hand-made wooden ladder with mismatched rungs (one pipe, one taped, one rope-tied). Height from o.h (default 146); anchor bottom-centre.',
    draw(ctx, o) {
      const H = Math.max(30, +o.h || 146), n = Math.max(1, Math.floor((H - 8) / 16));
      shadow(ctx, 0, -1, 18, 3);
      const ropes = [];
      for (let i = 0; i < n; i++) {
        const y = -12 - i * 16, k = hash2(i, 3, 17), tilt = (k - .5) * 1.6;
        if (y < -H + 6) break;
        if (i % 4 === 2) stick(ctx, -13, y, 13, y + tilt * .3, P.metal, 3);
        else stick(ctx, -13, y - tilt * .5, 13, y + tilt * .5, k > .55 ? P.wood : P.woodLight, 3.6);
        if (i % 4 === 1) tape(ctx, 0, y, 5, 6.5, 0);
        if (i % 5 === 3) ropes.push(y);
      }
      for (const s of [-1, 1]) {
        stick(ctx, s * 13, -5, s * 13, -H + 5, P.woodLight, 5);
        line(ctx, s * 13 - 1.2, -8, s * 13 - 1.2, -H + 8, 'rgba(255,255,255,.55)', 1.2);
        orr(ctx, s * 13 - 4.6, -6, 9.2, 6, 2.5, RIM, 2);
      }
      ctx.beginPath();
      for (const y of ropes) for (const s of [-1, 1]) { ctx.moveTo(s * 13 - 4, y - 3); ctx.lineTo(s * 13 + 4, y + 2); ctx.moveTo(s * 13 - 4, y + 2); ctx.lineTo(s * 13 + 4, y - 3); }
      ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = P.paper; ctx.lineWidth = 1.5; ctx.stroke();
    },
  });

})(typeof window !== 'undefined' ? window.MinikArt : globalThis.MinikArt);
