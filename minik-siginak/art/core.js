/*
 * MinikArt — an original, reusable vector art kit for cute 2.5D canvas games.
 * Everything is drawn in code (no images), so assets scale to any resolution
 * and can be exported to PNG sprite sheets (see tools/export-assets.mjs).
 *
 * Usage:
 *   MinikArt.draw(ctx, 'st.bed', x, y, {used: true, t: seconds, scale: 1, flip: false});
 *   MinikArt.toCanvas('char.ece', {pose: 'walk', t: 0.2}, 2)  -> HTMLCanvasElement
 *
 * Conventions (see art/STYLE.md):
 *   - 1 art unit = 1 px at scale 1. Interior room height (floor to ceiling) = 130.
 *   - Each asset draws around its ANCHOR at (0,0). Most props: bottom-centre on the floor.
 *   - Positive y is down, so standing things are drawn at negative y.
 *   - Outline colour P.ink, line width LW, round joins. Flat fills + one highlight.
 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const P = {
    ink: '#3d2b45', inkSoft: 'rgba(61,43,69,.35)', shadow: 'rgba(61,43,69,.2)',
    cream: '#fff7ea', paper: '#ffe8c7', white: '#ffffff',
    coral: '#ff7f5c', coralDark: '#e8623f', sun: '#ffc94a', sunLight: '#ffe08a',
    leaf: '#5fbf6e', leafDark: '#4a9f59', leafLight: '#93dc89',
    mint: '#7fd3c7', teal: '#5cc0b5', tealDark: '#2f6f69',
    sky: '#7ed0ea', skyDeep: '#4f9de0', skyNight: '#2a2257', skyDusk: '#ff9f80',
    lilac: '#b9a3ff', plum: '#8e6fd6', plumDark: '#5c3f8e',
    pink: '#f59cc4', rose: '#ff6b8b', berry: '#ff4f74', blush: 'rgba(255,120,140,.55)',
    wood: '#c98a5d', woodDark: '#a7704f', woodLight: '#eaae73', woodDeep: '#8a5a3c',
    metal: '#a9b3d6', metalDark: '#7d86ab', metalLight: '#d9def0',
    stone: '#bdb8d6', stoneLight: '#e2def2', stoneDark: '#9a94b8',
    snow: '#f4f8ff', snowShade: '#d6e3f5', ice: '#bfe8f7',
    glass: '#bfe8f7', glassNight: '#3b3478',
    fire1: '#ff6b3d', fire2: '#ffa53d', fire3: '#fff09a', glow: '#ffd98a',
    skin1: '#ffdcc0', skin2: '#f2c09a', skin3: '#c98e66', skin4: '#8d5a3c',
    hairBrown: '#7a4b35', hairBlack: '#3a2c3f', hairBlond: '#f2c45c', hairRed: '#d9673f', hairPink: '#f08fb0',
  };
  const OL = P.ink;
  const LW = 2.5;
  const reg = new Map();
  const warned = new Set();

  // ---------- registry ----------
  function define(name, def) {
    if (!name || typeof def.draw !== 'function') throw new Error('MinikArt.define: bad asset ' + name);
    const d = {
      name,
      w: def.w || 64, h: def.h || 64,
      ax: def.ax != null ? def.ax : (def.w || 64) / 2,
      ay: def.ay != null ? def.ay : (def.h || 64),
      tags: def.tags || [],
      states: def.states || {},
      defaults: def.defaults || {},
      desc: def.desc || '',
      draw: def.draw,
    };
    reg.set(name, d);
    return d;
  }
  function has(name) { return reg.has(name); }
  function get(name) { return reg.get(name); }
  function list(prefix) { return [...reg.keys()].filter(k => !prefix || k.startsWith(prefix)).sort(); }

  function missing(ctx, name, x, y) {
    if (!warned.has(name)) { warned.add(name); if (root.console) console.warn('MinikArt: missing asset', name); }
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,0,170,.5)'; ctx.fillRect(-16, -32, 32, 32);
    ctx.restore();
  }

  /** Draw asset `name` with its anchor at (x, y). opts: scale, flip, alpha, t, plus asset states. */
  function draw(ctx, name, x, y, opts) {
    const d = reg.get(name);
    if (!d) { missing(ctx, name, x, y); return false; }
    const o = opts ? Object.assign({}, d.defaults, opts) : Object.assign({}, d.defaults);
    if (o.t == null) o.t = 0;
    ctx.save();
    ctx.translate(x, y);
    const s = o.scale || 1, f = o.flip ? -1 : 1;
    if (s !== 1 || f !== 1) ctx.scale(s * f, s);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    try { d.draw(ctx, o); } catch (e) { if (!warned.has(name + '!')) { warned.add(name + '!'); console.error('MinikArt draw error', name, e); } }
    ctx.restore();
    return true;
  }

  /** Render one asset to a new canvas (for sprite caching / PNG export). */
  function toCanvas(name, opts, scale, pad) {
    const d = reg.get(name); if (!d) return null;
    scale = scale || 1; pad = pad == null ? 6 : pad;
    const o = Object.assign({}, opts || {});
    const W = o.w != null && d.tags.includes('sized') ? o.w : d.w;
    const H = o.h != null && d.tags.includes('sized') ? o.h : d.h;
    const ax = d.tags.includes('sized') ? 0 : d.ax, ay = d.tags.includes('sized') ? 0 : d.ay;
    const c = document.createElement('canvas');
    c.width = Math.ceil((W + pad * 2) * scale); c.height = Math.ceil((H + pad * 2) * scale);
    const cx = c.getContext('2d');
    cx.scale(scale, scale);
    draw(cx, name, ax + pad, ay + pad, Object.assign({}, o, { scale: 1, flip: false }));
    return c;
  }

  // ---------- helpers (all take ctx first) ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  /** Rounded rect, filled, with ink outline (lw 0 = no outline). */
  function orr(ctx, x, y, w, h, r, fill, lw) {
    rr(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) { ctx.lineWidth = lw || LW; ctx.strokeStyle = OL; ctx.stroke(); }
  }
  function circ(ctx, x, y, r, fill, lw) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) { ctx.lineWidth = lw || LW; ctx.strokeStyle = OL; ctx.stroke(); }
  }
  function ell(ctx, x, y, rx, ry, fill, lw, rot) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = OL; ctx.stroke(); }
  }
  /** Union of circles [[x,y,r],...] with a single outer outline. */
  function blob(ctx, cs, fill, lw) {
    const o = lw == null ? LW : lw;
    if (o) { ctx.fillStyle = OL; for (const c of cs) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2] + o, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = fill; for (const c of cs) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, TAU); ctx.fill(); }
  }
  function line(ctx, x1, y1, x2, y2, col, lw) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = col || OL; ctx.lineWidth = lw || LW; ctx.stroke();
  }
  /** Thick stick with ink outline (e.g. handles, legs, pipes). */
  function stick(ctx, x1, y1, x2, y2, col, w) {
    line(ctx, x1, y1, x2, y2, OL, w + LW * 2); line(ctx, x1, y1, x2, y2, col, w);
  }
  function poly(ctx, pts, fill, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) { ctx.lineWidth = lw || LW; ctx.strokeStyle = OL; ctx.stroke(); }
  }
  /** Smooth closed path through points (quadratic midpoints). Path only. */
  function smoothPath(ctx, pts) {
    const n = pts.length; ctx.beginPath();
    ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    ctx.closePath();
  }
  function star(ctx, x, y, r, fill, points) {
    const n = (points || 4) * 2; ctx.beginPath();
    for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2, rad = i % 2 ? r * .4 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath(); ctx.fillStyle = fill || P.sunLight; ctx.fill();
  }
  /** Teardrop flame standing on (x,y), height h, half-width w. */
  function flame(ctx, x, y, h, w, col, outline) {
    ctx.beginPath(); ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 1.15, y - h * .55, x, y - h);
    ctx.quadraticCurveTo(x + w * 1.15, y - h * .55, x + w, y);
    ctx.quadraticCurveTo(x, y + w * .6, x - w, y); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    if (outline) { ctx.lineWidth = LW; ctx.strokeStyle = OL; ctx.stroke(); }
  }
  function shadow(ctx, x, y, rx, ry) { ell(ctx, x, y, rx, ry, P.shadow); }
  /** Soft radial glow (no outline). */
  function glow(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, alpha == null ? .55 : alpha)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /**
   * The shared cute face. (x,y) = centre between the eyes.
   * opts: {gap=7, eye=2.1, mood:'happy'|'sad'|'sleep'|'surprised'|'neutral'|'wink', blush=true, look:[dx,dy]}
   */
  function face(ctx, x, y, opts) {
    const o = opts || {}, gap = o.gap || 7, er = o.eye || 2.1, mood = o.mood || 'happy';
    const lx = (o.look && o.look[0]) || 0, ly = (o.look && o.look[1]) || 0;
    ctx.lineWidth = 1.7; ctx.strokeStyle = OL;
    if (mood === 'sleep') {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * gap / 2, y - .5, er + .6, .15 * Math.PI, .85 * Math.PI); ctx.stroke(); }
    } else if (mood === 'wink') {
      circ(ctx, x - gap / 2 + lx, y + ly, er, OL, 0);
      ctx.beginPath(); ctx.moveTo(x + gap / 2 - er, y); ctx.lineTo(x + gap / 2 + er, y); ctx.stroke();
    } else {
      const r = mood === 'surprised' ? er + .6 : er;
      for (const s of [-1, 1]) {
        circ(ctx, x + s * gap / 2 + lx, y + ly, r, OL, 0);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + s * gap / 2 + lx + r * .2, y + ly - r * .75, r * .55, r * .55);
      }
    }
    if (o.blush !== false) {
      ctx.fillStyle = P.blush;
      ell(ctx, x - gap / 2 - 2, y + 4.2, 2.6, 1.6, P.blush); ell(ctx, x + gap / 2 + 2, y + 4.2, 2.6, 1.6, P.blush);
    }
    ctx.lineWidth = 1.5; ctx.strokeStyle = OL; ctx.beginPath();
    if (mood === 'sad') ctx.arc(x, y + 6.2, 2, 1.15 * Math.PI, 1.85 * Math.PI);
    else if (mood === 'surprised') { ctx.ellipse(x, y + 4.5, 1.4, 1.8, 0, 0, TAU); }
    else if (mood === 'neutral' || mood === 'sleep') { ctx.moveTo(x - 1.5, y + 4.5); ctx.lineTo(x + 1.5, y + 4.5); }
    else ctx.arc(x, y + 3.6, 2, .15 * Math.PI, .85 * Math.PI);
    ctx.stroke();
  }

  // ---------- colour / rng ----------
  function hexToRgb(h) {
    if (h.startsWith('rgb')) { const m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
    h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function rgba(c, a) { const [r, g, b] = hexToRgb(c); return `rgba(${r},${g},${b},${a})`; }
  /** Mix two colours (hex/rgb) by t (0..1). */
  function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`; }
  function shade(c, k) { return k >= 0 ? mix(c, '#ffffff', k) : mix(c, P.ink, -k); }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 982451653); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

  root.MinikArt = {
    version: '1.0.0', TAU, P, OL, LW,
    define, draw, has, get, list, toCanvas,
    rr, orr, circ, ell, blob, line, stick, poly, smoothPath, star, flame, shadow, glow, face,
    rgba, mix, shade, rng: mulberry32, hash2,
  };
})(typeof window !== 'undefined' ? window : globalThis);
