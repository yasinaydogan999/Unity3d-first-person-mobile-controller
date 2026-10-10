/*
 * MinikArt sketch style — gives any asset a hand-drawn pencil look:
 * wobbly doubled pencil lines, cross-hatched shading on the shadow side,
 * paper grain and a warm paper wash. Inspired by the charcoal-sketch look of
 * war-diary games, but kept cute and colourful.
 *
 * Every asset is rendered once into a cached sprite, so the effect is free at runtime:
 *   MinikArt.drawSprite(ctx, 'st.bed', x, y, {used:true}, pixelScale)
 */
(function (K) {
  'use strict';
  const INK = [61, 43, 69];
  const spriteCache = new Map();
  const tileCache = new Map();
  const patCache = new WeakMap();
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

  /** Seamless paper texture tile (warm cream with fibres and speckles). */
  function paper(size, seed) {
    size = size || 256; seed = seed || 11;
    const key = 'paper' + size + ':' + seed;
    if (tileCache.has(key)) return tileCache.get(key);
    const c = mk(size, size), x = c.getContext('2d'), r = K.rng(seed);
    x.fillStyle = '#f7eedd'; x.fillRect(0, 0, size, size);
    const wrap = (fn) => { for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) fn(ox, oy); };
    for (let i = 0; i < 46; i++) {
      const px = r() * size, py = r() * size, rx = 12 + r() * 40, ry = 8 + r() * 26, a = .018 + r() * .03;
      wrap((ox, oy) => { x.fillStyle = `rgba(150,118,86,${a})`; x.beginPath(); x.ellipse(px + ox, py + oy, rx, ry, r() * 3, 0, Math.PI * 2); x.fill(); });
    }
    x.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const px = r() * size, py = r() * size, len = 5 + r() * 16, ang = r() * Math.PI, a = .05 + r() * .09, bend = (r() - .5) * 6;
      wrap((ox, oy) => {
        x.strokeStyle = `rgba(118,92,70,${a})`; x.lineWidth = .5 + r() * .5; x.beginPath();
        x.moveTo(px + ox, py + oy); x.quadraticCurveTo(px + ox + Math.cos(ang) * len / 2 + bend, py + oy + Math.sin(ang) * len / 2 - bend, px + ox + Math.cos(ang) * len, py + oy + Math.sin(ang) * len); x.stroke();
      });
    }
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(90,70,60,${.05 + r() * .16})`; x.fillRect(r() * size, r() * size, r() < .85 ? 1 : 1.6, r() < .85 ? 1 : 1.6); }
    tileCache.set(key, c);
    return c;
  }

  /** Seamless diagonal hatch tile; cross=true adds the other diagonal. */
  function hatchTile(spacing, lw, cross, seed) {
    spacing = Math.max(3, Math.round(spacing)); lw = lw || 1;
    const key = `hatch${spacing}:${lw}:${cross ? 1 : 0}:${seed || 0}`;
    if (tileCache.has(key)) return tileCache.get(key);
    const size = spacing * 8, c = mk(size, size), x = c.getContext('2d'), r = K.rng(seed || 5);
    x.strokeStyle = `rgb(${INK})`; x.lineCap = 'round';
    const draw = (dir) => {
      for (let k = -size; k <= size * 2; k += spacing) {
        x.lineWidth = lw * (.7 + r() * .6); x.globalAlpha = .55 + r() * .45;
        x.beginPath();
        if (dir > 0) { x.moveTo(k, 0); x.lineTo(k - size, size); } else { x.moveTo(k - size, 0); x.lineTo(k, size); }
        x.stroke();
      }
    };
    draw(1); if (cross) draw(-1);
    x.globalAlpha = 1;
    tileCache.set(key, c);
    return c;
  }
  /** CanvasPattern (cached per context) for paper or hatch tiles. */
  function pattern(ctx, tile) {
    let m = patCache.get(ctx); if (!m) { m = new Map(); patCache.set(ctx, m); }
    let p = m.get(tile); if (!p) { p = ctx.createPattern(tile, 'repeat'); m.set(tile, p); }
    return p;
  }
  function hatchPattern(ctx, spacing, lw, cross, seed) { return pattern(ctx, hatchTile(spacing, lw, cross, seed)); }
  function paperPattern(ctx, size, seed) { return pattern(ctx, paper(size, seed)); }

  /**
   * Turn a rendered asset canvas into a pencil sketch, in place.
   * o: {scale, hatch (0..1), grain (0..1), wobble (px), seed, shadeAngle}
   */
  function sketchify(c, o) {
    o = o || {};
    const w = c.width, h = c.height, s = o.scale || 1, seed = o.seed || 1;
    if (w < 2 || h < 2) return c;
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    // 1) charcoal texture on the original outline + collect an ink mask for extra pencil strokes
    const img = x.getImageData(0, 0, w, h), d = img.data;
    const inkC = mk(w, h), ix = inkC.getContext('2d'), ink = ix.createImageData(w, h), m = ink.data;
    const grainK = Math.max(1, Math.round(s * 1.3)), R = Math.max(1, Math.round(1.6 * s));
    const alphaAt = (px, py) => (px < 0 || py < 0 || px >= w || py >= h) ? 0 : d[(py * w + px) * 4 + 3];
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const a = d[i + 3]; if (a < 40) continue;
      const lum = .3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2];
      if (lum >= 92) continue;
      const px = p % w, py = (p / w) | 0;
      d[i + 3] = a * (.78 + .22 * K.hash2((px / grainK) | 0, (py / grainK) | 0, seed));
      // only the silhouette contour gets extra pencil strokes (keeps faces clean)
      if (alphaAt(px - R, py) < 40 || alphaAt(px + R, py) < 40 || alphaAt(px, py - R) < 40 || alphaAt(px, py + R) < 40) {
        m[i] = INK[0]; m[i + 1] = INK[1]; m[i + 2] = INK[2]; m[i + 3] = a * (.45 + .55 * K.hash2(px >> 1, py >> 1, seed + 3));
      }
    }
    x.putImageData(img, 0, 0);
    ix.putImageData(ink, 0, 0);
    const src = mk(w, h); src.getContext('2d').drawImage(c, 0, 0);
    // 2) hatching on the shadow side, cross-hatching in the deepest shade
    const hatchLayer = (cross, from, to, alpha) => {
      const L = mk(w, h), lx = L.getContext('2d');
      lx.fillStyle = hatchPattern(lx, 3.4 * s, Math.max(.55, .7 * s), cross, seed + (cross ? 7 : 0));
      lx.fillRect(0, 0, w, h);
      lx.globalCompositeOperation = 'destination-in';
      const g = lx.createLinearGradient(w * .05, h * .02, w * .98, h * .98);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(from, 'rgba(0,0,0,0)'); g.addColorStop(to, `rgba(0,0,0,${alpha})`); g.addColorStop(1, `rgba(0,0,0,${alpha})`);
      lx.fillStyle = g; lx.fillRect(0, 0, w, h);
      lx.drawImage(src, 0, 0);
      return L;
    };
    const hatch = hatchLayer(false, .4, .8, 1), cross = hatchLayer(true, .72, .97, .8);
    // 3) paper grain + a soft desaturating wash inside the silhouette
    const gr = mk(w, h), gx = gr.getContext('2d');
    gx.fillStyle = paperPattern(gx, 256, seed % 3 + 11); gx.fillRect(0, 0, w, h);
    gx.globalCompositeOperation = 'destination-in'; gx.drawImage(src, 0, 0);
    const gray = mk(w, h), gy = gray.getContext('2d');
    gy.fillStyle = '#8a7f86'; gy.fillRect(0, 0, w, h); gy.globalCompositeOperation = 'destination-in'; gy.drawImage(src, 0, 0);
    x.save();
    x.globalCompositeOperation = 'saturation'; x.globalAlpha = o.desat == null ? .16 : o.desat; x.drawImage(gray, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = o.grain == null ? .6 : o.grain; x.drawImage(gr, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .08; x.fillStyle = '#f3e3c4'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    const ha = o.hatch == null ? .42 : o.hatch;
    x.globalAlpha = ha; x.drawImage(hatch, 0, 0);
    x.globalAlpha = ha * .8; x.drawImage(cross, 0, 0);
    // 4) loose, slightly wobbly extra pencil strokes over the outline
    const off = (o.wobble == null ? 1 : o.wobble) * s, strip = Math.max(2, Math.round(3 * s));
    x.globalAlpha = .5;
    for (let y = 0; y < h; y += strip) {
      const dx = off * .9 + Math.sin(y / s * .21 + seed) * off * .7;
      x.drawImage(inkC, 0, y, w, strip, dx, y - off * .7, w, strip);
    }
    x.globalAlpha = .22;
    for (let y = 0; y < h; y += strip) {
      const dx = -off * .7 + Math.sin(y / s * .17 + seed * 2) * off * .6;
      x.drawImage(inkC, 0, y, w, strip, dx, y + off * .7, w, strip);
    }
    x.restore();
    return c;
  }

  /** Cached sketch sprite of an asset at a pixel scale. Quantise opts.t yourself for animation. */
  function sprite(name, opts, scale, sketch) {
    const q = Math.max(.25, Math.round((scale || 1) * 8) / 8);
    const key = name + '|' + (opts ? JSON.stringify(opts) : '') + '|' + q + '|' + (sketch === false ? 0 : 1);
    let e = spriteCache.get(key);
    if (e) return e;
    const d = K.get(name); if (!d) return null;
    const pad = 8;
    const c = K.toCanvas(name, opts, q, pad);
    if (!c) return null;
    if (sketch !== false) sketchify(c, { scale: q, seed: (name.length * 7 + (opts && opts.seed || 0)) % 97 + 1 });
    const sized = d.tags.includes('sized');
    e = { c, ax: ((sized ? 0 : d.ax) + pad) * q, ay: ((sized ? 0 : d.ay) + pad) * q, q };
    if (spriteCache.size > 2500) spriteCache.clear();
    spriteCache.set(key, e);
    return e;
  }
  /** Draw a cached sketch sprite with its anchor at (x,y) in the current transform. */
  function drawSprite(ctx, name, x, y, opts, pixelScale, sketch) {
    const o = opts ? Object.assign({}, opts) : {};
    const flip = o.flip, sc = o.scale || 1, alpha = o.alpha;
    delete o.flip; delete o.scale; delete o.alpha;
    const e = sprite(name, o, (pixelScale || 1) * sc, sketch);
    if (!e) { K.draw(ctx, name, x, y, opts); return; }
    const k = e.q / sc;
    if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; }
    if (flip) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(e.c, -e.ax / k, -e.ay / k, e.c.width / k, e.c.height / k); ctx.restore(); }
    else ctx.drawImage(e.c, x - e.ax / k, y - e.ay / k, e.c.width / k, e.c.height / k);
    if (alpha != null) ctx.restore();
  }
  function clearSprites() { spriteCache.clear(); }

  Object.assign(K, { paper, hatchTile, hatchPattern, paperPattern, sketchify, sprite, drawSprite, clearSprites });
})(window.MinikArt);
