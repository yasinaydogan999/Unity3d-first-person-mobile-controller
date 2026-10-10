/* MinikArt nature: trees, rocks, bushes, mushrooms, grass, reeds, logs (bottom-centre anchors). */
(function (K) {
  'use strict';
  const { P, OL, TAU, orr, circ, ell, blob, line, stick, smoothPath, shadow } = K;
  const TREE_PAL = [['#62bd6b', '#93dc89', '#4a9f59'], ['#f49ab8', '#ffc9da', '#dc7a9d'], ['#ffad5a', '#ffd690', '#ea8a3d'], ['#4fae84', '#7ccda6', '#3a9370']];
  const TREE_CS = [[0, -6, 21], [-15, 4, 15], [15, 4, 15], [-8, -20, 14], [9, -19, 14]];

  K.define('nt.tree', {
    w: 80, h: 124, tags: ['nature', 'prop'], states: { kind: [0, 1, 2, 3], s: [1] }, defaults: { kind: 0, s: 1, sway: 0 },
    desc: 'Island tree: 0 round green, 1 pink blossom, 2 autumn orange, 3 pine. s scales it.',
    draw(ctx, o) {
      const s = o.s || 1, sw = o.sway || 0;
      shadow(ctx, 0, 1, 24 * s, 8 * s);
      orr(ctx, -6 * s, -30 * s, 12 * s, 32 * s, 5 * s, P.woodDark);
      ctx.strokeStyle = 'rgba(61,43,69,.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-1 * s, -26 * s); ctx.lineTo(-1 * s, -8 * s); ctx.moveTo(3 * s, -20 * s); ctx.lineTo(3 * s, -4 * s); ctx.stroke();
      if (o.kind === 3) {
        const pal = TREE_PAL[3];
        const tiers = [[-22 * s, 30, 30, pal[2]], [-40 * s, 24, 28, pal[0]], [-58 * s, 17, 26, pal[0]]];
        for (const [by, w, h, c] of tiers) {
          ctx.beginPath(); ctx.moveTo(sw - w * s, by); ctx.quadraticCurveTo(sw, by - h * s * 1.4, sw + w * s, by); ctx.quadraticCurveTo(sw, by + 6 * s, sw - w * s, by); ctx.closePath();
          ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.stroke();
        }
        ell(ctx, sw - 6 * s, -66 * s, 3 * s, 5 * s, pal[1], 0, -.4);
        for (const [a, b] of [[-10, -30], [8, -46], [-4, -50]]) circ(ctx, sw + a * s, b * s, 1.6 * s, '#fff', 0);
        return;
      }
      const pal = TREE_PAL[o.kind || 0], cx = sw, cy = -50 * s;
      blob(ctx, TREE_CS.map(c => [cx + c[0] * s, cy + c[1] * s, c[2] * s]), pal[2]);
      ctx.fillStyle = pal[0];
      for (const c of TREE_CS) { ctx.beginPath(); ctx.arc(cx + c[0] * s - 1.5 * s, cy + c[1] * s - 2.5 * s, c[2] * s * .85, 0, TAU); ctx.fill(); }
      ctx.fillStyle = pal[1];
      for (const [a, b, r] of [[-10, -24, 5.5], [-17, -2, 3.5], [6, -26, 3]]) { ctx.beginPath(); ctx.arc(cx + a * s, cy + b * s, r * s, 0, TAU); ctx.fill(); }
      if (o.kind === 1) for (const [a, b] of [[-6, -8], [10, -4], [-14, 8], [4, -18], [14, 10]]) circ(ctx, cx + a * s, cy + b * s, 1.8 * s, '#fff', 0);
      if (o.kind === 0 && o.fruit !== false) for (const [a, b] of [[-8, 2], [8, -8], [12, 8]]) circ(ctx, cx + a * s, cy + b * s, 3 * s, '#ff6b6b', 1.5);
    },
  });

  K.define('nt.stump', {
    w: 30, h: 26, tags: ['nature', 'prop'], states: { sprout: [false, true] }, defaults: { sprout: false },
    desc: 'Tree stump; sprout=true shows a little regrowing shoot.',
    draw(ctx, o) {
      shadow(ctx, 0, 1, 14, 5);
      orr(ctx, -10, -12, 20, 13, 5, P.woodDark); ell(ctx, 0, -12, 10, 4, '#e3b483', 2);
      ctx.beginPath(); ctx.ellipse(0, -12, 5, 2, 0, 0, TAU); ctx.strokeStyle = '#c48b5e'; ctx.lineWidth = 1.5; ctx.stroke();
      if (o.sprout) { ell(ctx, 4, -20, 4, 2.4, P.leaf, 1.2, -.6); ell(ctx, -2, -21, 3.5, 2, P.leaf, 1.2, .6); }
    },
  });

  K.define('nt.rock', {
    w: 52, h: 40, tags: ['nature', 'prop'], states: { seed: [1, 2, 3], s: [1] }, defaults: { seed: 1, s: 1 },
    desc: 'Lavender boulder; seed changes its outline, s scales it.',
    draw(ctx, o) {
      const s = o.s || 1, r = K.rng(o.seed * 977 + 13);
      shadow(ctx, 0, 1, 21 * s, 7 * s);
      const pts = [];
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, k = .8 + r() * .25, sa = Math.sin(a); pts.push([Math.cos(a) * 20 * k * s, (-9 + sa * (sa > 0 ? 8 : 16) * k) * s]); }
      smoothPath(ctx, pts); ctx.fillStyle = P.stone; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.stroke();
      ell(ctx, -6 * s, -17 * s, 6 * s, 3.5 * s, P.stoneLight);
      line(ctx, 4 * s, -12 * s, 9 * s, -5 * s, P.stoneDark, 1.8);
      if (o.seed % 3 === 0) ell(ctx, 6 * s, -20 * s, 6 * s, 3 * s, '#8ccf74');
    },
  });

  const BUSH = [[-9, -10, 11], [9, -10, 11], [0, -18, 12]];
  const BERRY = [[-10, -14], [6, -21], [12, -9], [-3, -8], [-1, -23], [-15, -6]];
  K.define('nt.bush', {
    w: 44, h: 36, tags: ['nature', 'prop'], states: { berries: [0, 1, 2, 3] }, defaults: { berries: 3 },
    desc: 'Berry bush; berries 0..3.',
    draw(ctx, o) {
      shadow(ctx, 0, 1, 18, 6);
      blob(ctx, BUSH, P.leafDark);
      ctx.fillStyle = P.leaf; for (const c of BUSH) { ctx.beginPath(); ctx.arc(c[0] - 1, c[1] - 2, c[2] * .85, 0, TAU); ctx.fill(); }
      circ(ctx, -5, -24, 3.5, P.leafLight, 0);
      const n = Math.min(6, (o.berries || 0) * 2);
      for (let i = 0; i < n; i++) { const [a, b] = BERRY[i]; circ(ctx, a, b, 3.4, P.berry, 1.6); ctx.fillStyle = '#fff'; ctx.fillRect(a - 1.6, b - 1.8, 1.4, 1.4); }
    },
  });

  K.define('nt.mush', {
    w: 26, h: 26, tags: ['nature', 'prop'], states: { kind: [0, 1] }, defaults: { kind: 0 },
    desc: 'Spotted mushroom: 0 red, 1 purple.',
    draw(ctx, o) {
      shadow(ctx, 0, 1, 8, 3);
      orr(ctx, -3.5, -11, 7, 11, 3, '#fff1dc', 2);
      ctx.beginPath(); ctx.moveTo(-11, -9); ctx.quadraticCurveTo(-11, -23, 0, -23); ctx.quadraticCurveTo(11, -23, 11, -9); ctx.closePath();
      ctx.fillStyle = o.kind ? '#b07ce8' : '#ff5d6c'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = OL; ctx.stroke();
      circ(ctx, -4, -15, 2, '#fff', 0); circ(ctx, 4, -18, 1.6, '#fff', 0); circ(ctx, 6, -12, 1.3, '#fff', 0);
    },
  });

  K.define('nt.grass', {
    w: 40, h: 38, tags: ['nature', 'prop'], states: { cut: [false, true] }, defaults: { cut: false },
    desc: 'Tall grass tuft that gives fibre; cut=true is a short stubble.',
    draw(ctx, o) {
      shadow(ctx, 0, 1, 14, 4);
      const blades = o.cut ? [[-8, -6, -10], [-2, -7, 0], [5, -6, 8]] : [[-12, -24, -16], [-6, -32, -6], [0, -36, 2], [6, -30, 10], [11, -22, 16], [-2, -26, -2]];
      for (const [bx, top, tip] of blades) {
        ctx.beginPath(); ctx.moveTo(bx - 3, 0); ctx.quadraticCurveTo(bx - 2, top * .6, tip, top); ctx.quadraticCurveTo(bx + 1, top * .55, bx + 3, 0); ctx.closePath();
        ctx.fillStyle = bx % 2 ? '#7fc46a' : '#9ad57d'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = OL; ctx.stroke();
      }
      if (!o.cut) { circ(ctx, 0, -36, 2.2, P.sunLight, 1.2); circ(ctx, -16, -24, 1.8, '#fff', 1); }
    },
  });

  K.define('nt.reeds', {
    w: 34, h: 50, tags: ['nature', 'prop'], states: {}, defaults: {},
    desc: 'Pond reeds with brown cattails (fibre).',
    draw(ctx) {
      for (const [bx, h, lean] of [[-9, 38, -4], [-2, 46, 1], [6, 40, 5], [11, 30, 7]]) {
        stick(ctx, bx, 0, bx + lean, -h, '#7fbf6a', 2.4);
        orr(ctx, bx + lean - 3, -h - 4, 6, 13, 3, '#a7704f', 1.8);
      }
      ell(ctx, -14, -6, 6, 2.5, '#7fbf6a', 1.6, -.5); ell(ctx, 14, -8, 7, 2.5, '#7fbf6a', 1.6, .5);
    },
  });

  K.define('nt.log', {
    w: 70, h: 30, tags: ['nature', 'prop'], states: {}, defaults: {},
    desc: 'Fallen mossy log (wood source).',
    draw(ctx) {
      shadow(ctx, 0, 1, 32, 6);
      orr(ctx, -30, -20, 56, 18, 9, P.woodDark);
      ctx.strokeStyle = 'rgba(61,43,69,.3)'; ctx.lineWidth = 1.3; ctx.beginPath();
      ctx.moveTo(-22, -14); ctx.lineTo(10, -14); ctx.moveTo(-14, -8); ctx.lineTo(16, -8); ctx.stroke();
      ell(ctx, 26, -11, 6.5, 9, '#e3b483', 2.2);
      ctx.beginPath(); ctx.ellipse(26, -11, 3, 4.5, 0, 0, TAU); ctx.strokeStyle = '#c48b5e'; ctx.lineWidth = 1.4; ctx.stroke();
      blob(ctx, [[-16, -20, 6], [-8, -21, 5]], '#8ccf74', 1.8);
      K.draw(ctx, 'nt.mush', -26, -2, { kind: 0, scale: .5 });
    },
  });

  K.define('nt.flowers', {
    w: 30, h: 16, tags: ['nature', 'prop'], states: { kind: [0, 1, 2] }, defaults: { kind: 0 },
    desc: 'A tiny flower patch (decor).',
    draw(ctx, o) {
      const cols = [['#ff8fb1', '#ffe36e'], ['#b9a3ff', '#fff'], ['#fff', '#ffc94a']][o.kind || 0];
      for (const [x, y] of [[-8, -5], [0, -9], [8, -4]]) { line(ctx, x, 0, x, y, '#6aa857', 1.6); circ(ctx, x, y, 3.2, cols[0], 1.2); circ(ctx, x, y, 1.1, cols[1], 0); }
    },
  });
})(window.MinikArt);
