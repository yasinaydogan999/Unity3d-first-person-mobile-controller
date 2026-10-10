/* MinikArt outdoor: building blocks (2.5D, one tile = 48), crops, camp items, critter threats. */
(function (K) {
  'use strict';
  const { P, OL, TAU, orr, circ, ell, blob, line, stick, poly, flame, shadow, star, shade } = K;
  const TILE = 48, WALL_H = 40;
  const MATS = {
    wood: { top: '#eaae73', front: '#c98a5d', seam: 'rgba(61,43,69,.28)' },
    stone: { top: '#d6d1ea', front: '#a9a3c4', seam: 'rgba(61,43,69,.25)' },
    brick: { top: '#f6c2a2', front: '#e48f6c', seam: 'rgba(120,50,40,.3)' },
    ruin: { top: '#ffd1a9', front: '#f0a679', seam: 'rgba(61,43,69,.25)' },
  };
  K.TILE = TILE; K.WALL_H = WALL_H;

  function frontSeams(ctx, mat, y0, h, kind) {
    const m = MATS[mat] || MATS.wood;
    ctx.strokeStyle = m.seam; ctx.lineWidth = 1.4; ctx.beginPath();
    if (mat === 'wood') { for (let y = y0 + 10; y < y0 + h - 2; y += 10) { ctx.moveTo(-22, y); ctx.lineTo(22, y); } ctx.moveTo(-8, y0 + 2); ctx.lineTo(-8, y0 + 10); ctx.moveTo(10, y0 + 20); ctx.lineTo(10, y0 + 30); }
    else { for (let r = 0, y = y0 + 10; y < y0 + h - 1; y += 10, r++) { ctx.moveTo(-23, y); ctx.lineTo(23, y); const off = r % 2 ? 0 : 12; for (let x = -24 + off; x < 24; x += 24) { ctx.moveTo(x, y - 10); ctx.lineTo(x, y); } } }
    ctx.stroke();
  }
  /** One wall block. o.e = {n,e,s,w} neighbours (hides inner top edges); o.hh = height override (ruins). */
  function block(ctx, o, frontFn) {
    const m = MATS[o.mat] || MATS.wood, H = o.hh || WALL_H, e = o.e || {};
    ctx.fillStyle = P.shadow; ctx.fillRect(-24, -6, 52, 9);
    // front face
    ctx.fillStyle = m.front; ctx.fillRect(-24, -H, 48, H);
    frontSeams(ctx, o.mat, -H, H);
    if (frontFn) frontFn(ctx, H, m);
    ctx.lineWidth = 2.5; ctx.strokeStyle = OL;
    ctx.beginPath(); ctx.moveTo(-24, -H); ctx.lineTo(-24, 0); ctx.lineTo(24, 0); ctx.lineTo(24, -H); ctx.stroke();
    // top face
    const ty = -H - TILE;
    ctx.fillStyle = m.top; ctx.fillRect(-24, ty, 48, TILE);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-20, ty + 4, 18, 6);
    if (o.mat === 'wood') { ctx.strokeStyle = m.seam; ctx.lineWidth = 1.2; ctx.beginPath(); for (let x = -12; x < 24; x += 12) { ctx.moveTo(x, ty + 2); ctx.lineTo(x, ty + TILE - 2); } ctx.stroke(); }
    if (o.crack) { ctx.strokeStyle = 'rgba(61,43,69,.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -H); ctx.lineTo(0, -H + 9); ctx.lineTo(-4, -H + 15); ctx.stroke(); }
    ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.beginPath();
    if (!e.n) { ctx.moveTo(-24, ty); ctx.lineTo(24, ty); }
    if (!e.w) { ctx.moveTo(-24, ty); ctx.lineTo(-24, -H); }
    if (!e.e) { ctx.moveTo(24, ty); ctx.lineTo(24, -H); }
    ctx.moveTo(-24, -H); ctx.lineTo(24, -H);
    ctx.stroke();
  }
  const blockDef = { w: TILE, h: TILE + WALL_H + 6, ax: TILE / 2, ay: TILE + WALL_H + 3 };

  K.define('bd.wall', Object.assign({}, blockDef, {
    tags: ['build', 'block'], states: { mat: ['wood', 'stone', 'brick', 'ruin'] }, defaults: { mat: 'wood', e: {} },
    desc: 'Minecraft-like 2.5D wall block (one tile). Anchor = bottom-centre of the tile. o.e neighbours join top faces.',
    draw(ctx, o) { block(ctx, o); },
  }));
  K.define('bd.window', Object.assign({}, blockDef, {
    tags: ['build', 'block'], states: { mat: ['wood', 'stone', 'brick'], night: [false, true] }, defaults: { mat: 'wood', e: {} },
    desc: 'Wall block with a curtained window on its front face.',
    draw(ctx, o) {
      block(ctx, o, (c, H) => {
        orr(c, -14, -H + 7, 28, 22, 3, o.night ? '#ffd98a' : P.glass, 2.2);
        line(c, 0, -H + 8, 0, -H + 28, OL, 1.6); line(c, -13, -H + 18, 13, -H + 18, OL, 1.6);
        c.fillStyle = '#ff9fb2'; c.beginPath(); c.moveTo(-13, -H + 8); c.quadraticCurveTo(-8, -H + 16, -13, -H + 27); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(13, -H + 8); c.quadraticCurveTo(8, -H + 16, 13, -H + 27); c.closePath(); c.fill();
        orr(c, -16, -H + 28, 32, 4, 2, P.woodLight, 1.6);
      });
    },
  }));
  K.define('bd.door', Object.assign({}, blockDef, {
    tags: ['build', 'block'], states: { mat: ['wood', 'stone'], open: [false, true] }, defaults: { mat: 'wood', open: false, e: {} },
    desc: 'Door block: walk through it, critters cannot. open=true shows the leaf swung aside.',
    draw(ctx, o) {
      block(ctx, o, (c, H) => {
        if (o.open) { orr(c, -13, -H + 3, 26, H - 3, 3, '#5a4660', 2); orr(c, -16, -H + 3, 6, H - 3, 2, P.wood, 2); }
        else {
          orr(c, -13, -H + 3, 26, H - 3, 3, P.woodDeep, 2.2);
          c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-4, -H + 6); c.lineTo(-4, -2); c.moveTo(5, -H + 6); c.lineTo(5, -2); c.stroke();
          circ(c, 0, -H + 11, 3.5, P.glass, 1.6); circ(c, 8, -H + 22, 1.8, P.sun, 1.2);
        }
      });
    },
  }));
  K.define('bd.fence', {
    w: TILE, h: 40, ax: TILE / 2, ay: 34, tags: ['build'], states: { e: [{}, { w: true, e: true }] }, defaults: { e: {} },
    desc: 'Low picket fence; rails extend to joined neighbours (o.e.w / o.e.e).',
    draw(ctx, o) {
      const e = o.e || {};
      shadow(ctx, 0, 0, 20, 4);
      const l = e.w ? -24 : -6, r = e.e ? 24 : 6;
      orr(ctx, l, -22, r - l, 5, 2, P.woodLight, 2); orr(ctx, l, -12, r - l, 5, 2, P.woodLight, 2);
      poly(ctx, [[-5, 0], [-5, -26], [0, -32], [5, -26], [5, 0]], P.wood);
    },
  });

  // ---- crops (anchor bottom-centre of a tilled tile) ----
  const leaf = (ctx, x, y, a, l, w, col) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ell(ctx, 0, -l / 2, w, l / 2, col, 1.6); ctx.restore(); };
  K.define('cr.wheat', {
    w: 44, h: 50, tags: ['crop'], states: { stage: [0, 1, 2, 3] }, defaults: { stage: 0 },
    desc: 'Wheat: 0 sprouts, 1 young, 2 green ears, 3 golden ripe.',
    draw(ctx, o) {
      const st = o.stage | 0, ripe = st >= 3;
      const xs = [-12, -4, 4, 12];
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i] + (i % 2 ? 1 : -1), h = [8, 18, 30, 34][st] + (i % 2) * 3;
        stick(ctx, x, -2, x + (i - 1.5) * .8, -h, ripe ? '#e8c35a' : '#79c267', 1.6);
        if (st >= 2) ell(ctx, x + (i - 1.5) * .8, -h - 4, 3.2, 7, ripe ? '#f4cf5e' : '#a6d878', 1.6);
        if (st >= 1) leaf(ctx, x, -h * .45, (i % 2 ? .7 : -.7), 9, 2.2, ripe ? '#d9b04e' : '#79c267');
      }
    },
  });
  K.define('cr.carrot', {
    w: 44, h: 40, tags: ['crop'], states: { stage: [0, 1, 2, 3] }, defaults: { stage: 0 },
    desc: 'Carrots: leaves grow, orange shoulders peek out when ripe.',
    draw(ctx, o) {
      const st = o.stage | 0;
      for (const x of [-10, 10]) {
        if (st >= 3) { poly(ctx, [[x - 6, -2], [x + 6, -2], [x, 8]], '#ff9a3d', 2); }
        const n = st === 0 ? 2 : st === 1 ? 3 : 5, l = [7, 13, 19, 21][st];
        for (let k = 0; k < n; k++) leaf(ctx, x, -2, (k - (n - 1) / 2) * .45, l, 2.6, k % 2 ? '#5fbf6e' : '#7fd17a');
      }
    },
  });
  K.define('cr.pumpkin', {
    w: 48, h: 44, tags: ['crop'], states: { stage: [0, 1, 2, 3] }, defaults: { stage: 0 },
    desc: 'Pumpkin: sprout, vine, green pumpkin, big orange pumpkin.',
    draw(ctx, o) {
      const st = o.stage | 0;
      if (st === 0) { leaf(ctx, 0, -2, -.5, 9, 3, P.leaf); leaf(ctx, 0, -2, .5, 9, 3, P.leafLight); return; }
      ctx.strokeStyle = '#5a9f4c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-18, -4); ctx.quadraticCurveTo(-4, -14, 16, -6); ctx.stroke();
      for (const [x, a] of [[-14, -.6], [2, .4], [14, -.3]]) leaf(ctx, x, -6, a, 12, 6, P.leaf);
      if (st >= 2) {
        const r = st === 2 ? 8 : 14, col = st === 2 ? '#9fd36b' : '#ff9a3d';
        blob(ctx, [[-r * .55, -r, r * .75], [r * .55, -r, r * .75], [0, -r, r * .85]], col);
        ctx.strokeStyle = 'rgba(61,43,69,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-r * .35, -r * 1.7); ctx.quadraticCurveTo(-r * .5, -r, -r * .3, -r * .3); ctx.moveTo(r * .35, -r * 1.7); ctx.quadraticCurveTo(r * .5, -r, r * .3, -r * .3); ctx.stroke();
        stick(ctx, 0, -r * 1.75, 2, -r * 2.1, '#6b8f3a', 2.4);
        ell(ctx, -r * .45, -r * 1.35, r * .2, r * .12, 'rgba(255,255,255,.45)');
      }
    },
  });

  // ---- camp & home outside ----
  K.define('od.fire', {
    w: 56, h: 60, tags: ['camp', 'light'], states: { lit: [false, true] }, defaults: { lit: true },
    desc: 'Campfire ring. The game draws live flames on top of the unlit sprite.',
    draw(ctx, o) {
      shadow(ctx, 0, 1, 25, 8);
      if (o.lit) ell(ctx, 0, -2, 36, 12, 'rgba(255,170,80,.22)');
      const st = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; st.push([Math.cos(a) * 18, -3 + Math.sin(a) * 8, Math.sin(a)]); }
      for (const s of st) if (s[2] < 0) circ(ctx, s[0], s[1], 5, '#c4bfdb', 2);
      ctx.save(); ctx.translate(0, -6); ctx.rotate(.45); orr(ctx, -15, -3.5, 30, 7, 3.5, o.lit ? '#9b6143' : '#6e5a5e'); ctx.rotate(-.9); orr(ctx, -15, -3.5, 30, 7, 3.5, o.lit ? '#a86a48' : '#7a6468'); ctx.restore();
      if (o.lit) K.campFlame(ctx, 0, -6, 1, o.t || 0);
      for (const s of st) if (s[2] >= 0) circ(ctx, s[0], s[1], 5, '#cfcae6', 2);
    },
  });
  /** Live flame for fires/torches (draw every frame on top of cached sprites). */
  K.campFlame = function (ctx, x, y, k, t) {
    const fl = Math.sin(t * 17) * 2 + Math.sin(t * 11.3) * 1.6;
    flame(ctx, x, y, (34 + fl) * k, 15 * k, P.fire1, true); flame(ctx, x + 1, y, (24 + fl * .7) * k, 10 * k, P.fire2); flame(ctx, x, y, (13 + fl * .4) * k, 5.5 * k, P.fire3);
  };
  K.define('od.torch', {
    w: 24, h: 72, tags: ['camp', 'light'], states: { lit: [false, true] }, defaults: { lit: true },
    desc: 'Torch post (lights the night). The game draws the flame live.',
    draw(ctx, o) {
      shadow(ctx, 0, 0, 8, 3);
      stick(ctx, 0, 0, 0, -48, P.woodDark, 5);
      orr(ctx, -6, -56, 12, 9, 3, '#8a5a3c', 2);
      line(ctx, -6, -52, 6, -52, P.sun, 1.6);
      if (o.lit) K.campFlame(ctx, 0, -55, .55, o.t || 0);
    },
  });
  K.define('od.tent', {
    w: 76, h: 70, tags: ['camp', 'home'], states: {}, defaults: {},
    desc: 'Cosy little tent (sleep spot).',
    draw(ctx) {
      shadow(ctx, 0, 2, 36, 9);
      poly(ctx, [[-33, 2], [-4, -48], [4, -48], [33, 2]], P.teal, 3);
      poly(ctx, [[4, -48], [33, 2], [15, 2]], 'rgba(61,43,69,.14)', 0);
      line(ctx, -18, -22, 18, -22, 'rgba(255,255,255,.5)', 2);
      poly(ctx, [[-12, 2], [0, -28], [12, 2]], P.tealDark, 2.5);
      line(ctx, 0, -48, 0, -62, OL, 2.5);
      poly(ctx, [[0, -62], [12, -58], [0, -54]], P.rose, 2);
    },
  });
  K.define('od.crate', {
    w: 44, h: 46, tags: ['loot'], states: { open: [false, true] }, defaults: { open: false },
    desc: 'Wooden supply crate; open=true shows it looted.',
    draw(ctx, o) {
      shadow(ctx, 0, 1, 18, 6);
      if (!o.open) {
        orr(ctx, -15, -20, 30, 20, 3, '#d08c55'); orr(ctx, -16, -30, 32, 11, 3, '#eaae73');
        line(ctx, -5, -18, -5, -2, 'rgba(61,43,69,.35)', 1.6); line(ctx, 5, -18, 5, -2, 'rgba(61,43,69,.35)', 1.6);
        ctx.fillStyle = '#8f95b8'; ctx.fillRect(-14, -19, 4, 4); ctx.fillRect(10, -19, 4, 4);
      } else {
        orr(ctx, -15, -20, 30, 20, 3, '#b9764a'); orr(ctx, -16, -30, 32, 11, 3, '#6b4530');
        ctx.save(); ctx.translate(17, -22); ctx.rotate(.5); orr(ctx, 0, -6, 11, 25, 3, '#eaae73'); ctx.restore();
      }
    },
  });
  K.define('od.chest', {
    w: 48, h: 44, tags: ['home'], states: { open: [false, true] }, defaults: { open: false },
    desc: 'Storage chest with metal bands.',
    draw(ctx, o) {
      shadow(ctx, 0, 1, 20, 6);
      orr(ctx, -19, -22, 38, 22, 4, '#c98a5d');
      if (o.open) { orr(ctx, -19, -36, 38, 12, 5, '#8a5a3c'); ell(ctx, 0, -24, 15, 3, '#5a3d2c'); }
      else orr(ctx, -20, -34, 40, 14, 6, '#e0a066');
      ctx.fillStyle = P.metalDark; ctx.fillRect(-12, -33, 4, 32); ctx.fillRect(8, -33, 4, 32);
      orr(ctx, -4, -24, 8, 8, 2, P.sun, 1.8);
    },
  });
  K.define('od.cart', {
    w: 96, h: 70, tags: ['npc'], states: {}, defaults: {},
    desc: 'Travelling trader cart with a striped canopy.',
    draw(ctx) {
      shadow(ctx, 0, 1, 44, 8);
      orr(ctx, -38, -36, 76, 24, 6, '#c98a5d');
      for (let i = 0; i < 4; i++) orr(ctx, -36 + i * 19, -58, 19, 14, 4, i % 2 ? '#fff7ea' : P.coral, 2);
      stick(ctx, -34, -36, -34, -56, P.woodDark, 3); stick(ctx, 34, -36, 34, -56, P.woodDark, 3);
      for (const [x, c] of [[-22, P.berry], [-8, P.sun], [8, P.leaf], [22, '#ff9a3d']]) circ(ctx, x, -40, 5, c, 1.8);
      circ(ctx, -24, -10, 11, P.woodDeep); circ(ctx, -24, -10, 3.5, P.metalLight, 0); circ(ctx, 24, -10, 11, P.woodDeep); circ(ctx, 24, -10, 3.5, P.metalLight, 0);
    },
  });
  K.define('od.radio', {
    w: 60, h: 92, tags: ['home'], states: { fixed: [false, true] }, defaults: { fixed: false, parts: 0, needed: 5 },
    desc: 'Broken radio on a little table; the dots show repaired parts.',
    draw(ctx, o) {
      shadow(ctx, 0, 1, 30, 8);
      orr(ctx, -21, -26, 6, 27, 2, P.woodDark); orr(ctx, 15, -26, 6, 27, 2, P.woodDark);
      orr(ctx, -27, -33, 54, 10, 4, P.wood);
      stick(ctx, 10, -57, 20, -82, P.metal, 2);
      circ(ctx, 20, -83, 3.6, o.fixed ? '#7ef29a' : '#ff5b6b', 2);
      orr(ctx, -18, -58, 36, 26, 7, '#8b9be0');
      circ(ctx, -7, -46, 6.5, '#5d6aa8', 2); circ(ctx, 9, -49, 4, '#ffe26b', 2);
      for (let i = 0; i < (o.needed || 5); i++) circ(ctx, -4 + i * 5.2, -37.5, 1.9, i < (o.parts || 0) ? '#7ef29a' : '#5d6aa8', 0);
    },
  });
  K.define('mob.shadow', {
    w: 40, h: 44, tags: ['mob'], states: { flash: [false, true] }, defaults: { flash: false, wob: 0 },
    desc: 'Gölgecik: a shy shadow blob that roams at night (eyes are drawn live so they glow).',
    draw(ctx, o) {
      shadow(ctx, 0, 1, 15, 5);
      const w = Math.sin(o.wob || 0);
      ctx.beginPath(); ctx.moveTo(-15, -5); ctx.bezierCurveTo(-18, -42, 18, -42, 15, -5);
      ctx.quadraticCurveTo(11, -1 + w * 2, 7, -5); ctx.quadraticCurveTo(3.5, -1 - w * 2, 0, -5); ctx.quadraticCurveTo(-3.5, -1 + w * 2, -7, -5); ctx.quadraticCurveTo(-11, -1 - w * 2, -15, -5); ctx.closePath();
      ctx.fillStyle = o.flash ? '#ffffff' : '#5c3f8e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.stroke();
      ell(ctx, -6, -27, 4, 6, 'rgba(255,255,255,.18)', 0, -.3);
      ctx.fillStyle = '#fff'; poly(ctx, [[-4, -12], [-2.5, -8.5], [-1, -12]], '#fff', 0); poly(ctx, [[1, -12], [2.5, -8.5], [4, -12]], '#fff', 0);
    },
  });
  K.define('od.sprout', {
    w: 24, h: 20, tags: ['nature'], states: {}, defaults: {},
    desc: 'Tiny sprout (decor).',
    draw(ctx) { leaf(ctx, 0, 0, -.6, 9, 3, P.leaf); leaf(ctx, 0, 0, .6, 9, 3, P.leafLight); },
  });
  K.define('od.drop', {
    w: 30, h: 30, tags: ['loot'], states: {}, defaults: {},
    desc: 'Little cloth bundle marking dropped items.',
    draw(ctx) { shadow(ctx, 0, 0, 10, 3); blob(ctx, [[0, -9, 9], [-6, -6, 6], [6, -6, 6]], '#f5d7a1'); line(ctx, -3, -15, 3, -15, OL, 2); star(ctx, 9, -18, 4, P.sunLight); },
  });
})(window.MinikArt);
