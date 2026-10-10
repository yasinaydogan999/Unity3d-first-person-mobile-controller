/* MinikArt icons: 64x64, centre anchor. Drawn in a 0..64 box (translated), chunky and readable at 24px. */
(function (K) {
  'use strict';
  const { P, OL, TAU, orr, circ, ell, blob, line, stick, poly, flame, star, smoothPath } = K;
  const icon = (name, desc, fn) => K.define(name, { w: 64, h: 64, ax: 32, ay: 32, tags: ['icon'], desc, draw(ctx, o) { ctx.translate(-32, -32); fn(ctx, o); } });
  const rot = (ctx, x, y, a, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); fn(); ctx.restore(); };
  const leafI = (ctx, x, y, a, l, w, c) => rot(ctx, x, y, a, () => ell(ctx, 0, -l / 2, w, l / 2, c, 2.5));

  // ---- resources ----
  icon('icon.wood', 'Wood logs', c => {
    rot(c, 30, 24, -.35, () => { orr(c, -18, -7, 34, 14, 7, '#c98a5d', 3); ell(c, 16, 0, 5.5, 7, '#f0c48f', 2.5); });
    rot(c, 32, 38, -.35, () => { orr(c, -24, -9, 46, 18, 9, '#b5774f', 3); ell(c, 22, 0, 7, 9, '#f0c48f', 2.5); c.beginPath(); c.ellipse(22, 0, 3, 4, 0, 0, TAU); c.strokeStyle = '#c99567'; c.lineWidth = 2; c.stroke(); });
  });
  icon('icon.stone', 'Stone', c => { smoothPath(c, [[11, 44], [13, 30], [24, 18], [41, 16], [53, 28], [51, 42], [32, 46]]); c.fillStyle = P.stone; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); ell(c, 25, 25, 6, 4, P.stoneLight); line(c, 36, 30, 42, 38, P.stoneDark, 2); });
  icon('icon.fiber', 'Plant fibre bundle', c => {
    for (const [x, a, col] of [[22, -.35, '#7fc46a'], [32, 0, '#9ad57d'], [42, .35, '#7fc46a']]) rot(c, x, 54, a, () => { c.beginPath(); c.moveTo(-3, 0); c.quadraticCurveTo(-4, -22, 0, -44); c.quadraticCurveTo(4, -22, 3, 0); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke(); });
    orr(c, 20, 36, 24, 8, 3, '#e0b36b', 2.5);
  });
  icon('icon.berry', 'Berries', c => { leafI(c, 40, 18, .9, 14, 5, P.leaf); circ(c, 24, 40, 10, P.berry, 3); circ(c, 42, 40, 10, P.berry, 3); circ(c, 33, 25, 10, '#ff5d80', 3); for (const [x, y] of [[21, 37], [39, 37], [30, 22]]) circ(c, x, y, 2.5, '#fff', 0); });
  icon('icon.mush', 'Mushroom', c => { orr(c, 25, 30, 14, 22, 6, '#fff1dc', 3); c.beginPath(); c.moveTo(8, 34); c.quadraticCurveTo(8, 9, 32, 9); c.quadraticCurveTo(56, 9, 56, 34); c.closePath(); c.fillStyle = '#ff5d6c'; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); for (const [x, y, r] of [[22, 22, 4], [38, 17, 3.5], [45, 28, 3], [30, 29, 2.5]]) circ(c, x, y, r, '#fff', 0); });
  const fish = (c, body, fin) => {
    poly(c, [[44, 32], [58, 20], [58, 44]], fin, 3);
    ell(c, 28, 32, 20, 12, body, 3);
    circ(c, 16, 29, 3, '#fff', 2); circ(c, 16, 29, 1.2, OL, 0);
    c.strokeStyle = 'rgba(61,43,69,.35)'; c.lineWidth = 2; c.beginPath(); c.arc(30, 32, 7, -1.2, 1.2); c.stroke();
  };
  icon('icon.fish', 'Raw fish', c => fish(c, '#8fd0e8', '#6db6d6'));
  icon('icon.fishcooked', 'Grilled fish', c => { fish(c, '#e0a066', '#c98a5d'); for (const x of [24, 32]) line(c, x, 24, x - 4, 40, '#8a5a3c', 2.5); });
  icon('icon.scrap', 'Scrap gear', c => {
    c.save(); c.translate(32, 32);
    c.fillStyle = OL; for (let i = 0; i < 8; i++) { c.save(); c.rotate(i / 8 * TAU); K.rr(c, -6, -25, 12, 12, 3); c.fill(); c.restore(); }
    c.fillStyle = P.metal; for (let i = 0; i < 8; i++) { c.save(); c.rotate(i / 8 * TAU); K.rr(c, -4, -23, 8, 10, 2); c.fill(); c.restore(); }
    circ(c, 0, 0, 17, P.metal, 3); circ(c, 0, 0, 6, P.cream, 2.5); c.restore();
  });
  icon('icon.part', 'Radio part (circuit board)', c => { stick(c, 44, 22, 52, 6, '#9aa3c7', 2.5); circ(c, 52, 6, 4, P.sun, 2.5); orr(c, 9, 20, 44, 32, 7, '#5fcf8f', 3); c.fillStyle = OL; K.rr(c, 22, 28, 18, 15, 3); c.fill(); c.fillStyle = P.sun; for (let i = 0; i < 3; i++) { c.fillRect(25 + i * 5, 25, 2.5, 3); c.fillRect(25 + i * 5, 43, 2.5, 3); } });
  icon('icon.cloth', 'Folded cloth', c => { orr(c, 10, 34, 44, 14, 5, '#9fc6ea', 3); orr(c, 12, 22, 40, 14, 5, '#f59cc4', 3); orr(c, 14, 12, 36, 12, 5, '#ffe08a', 3); line(c, 18, 18, 46, 18, 'rgba(61,43,69,.3)', 1.6); });
  icon('icon.wheat', 'Wheat sheaf', c => { for (const [x, a] of [[24, -.3], [32, 0], [40, .3]]) rot(c, x, 56, a, () => { stick(c, 0, 0, 0, -34, '#e8c35a', 2.5); ell(c, 0, -40, 5, 10, '#f4cf5e', 2.5); }); orr(c, 21, 38, 22, 6, 3, '#c98a5d', 2.5); });
  icon('icon.carrot', 'Carrot', c => { for (const a of [-.5, 0, .5]) leafI(c, 40, 20, a, 16, 4, P.leaf); poly(c, [[22, 54], [34, 18], [48, 26]], '#ff9a3d', 3); line(c, 31, 34, 37, 36, 'rgba(61,43,69,.4)', 2); line(c, 28, 43, 33, 45, 'rgba(61,43,69,.4)', 2); });
  icon('icon.pumpkin', 'Pumpkin', c => { blob(c, [[22, 38, 15], [42, 38, 15], [32, 38, 17]], '#ff9a3d', 3); stick(c, 32, 22, 35, 13, '#6b8f3a', 3.5); c.strokeStyle = 'rgba(61,43,69,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(26, 24); c.quadraticCurveTo(22, 38, 26, 52); c.moveTo(38, 24); c.quadraticCurveTo(42, 38, 38, 52); c.stroke(); ell(c, 24, 30, 4, 3, 'rgba(255,255,255,.45)'); });
  const packet = (c, col, seedCol) => { poly(c, [[14, 14], [20, 8], [26, 14], [32, 8], [38, 14], [44, 8], [50, 14], [50, 56], [14, 56]], '#f7e3c0', 3); circ(c, 32, 30, 11, col, 2.5); leafI(c, 32, 26, -.6, 10, 3, P.leaf); leafI(c, 32, 26, .6, 10, 3, P.leafLight); for (const [x, y] of [[24, 48], [32, 50], [40, 47]]) ell(c, x, y, 3, 2, seedCol, 1.6); };
  icon('icon.seeds', 'Seed pouch', c => { blob(c, [[32, 38, 16], [24, 42, 10], [40, 42, 10]], '#d9b07a', 3); stick(c, 26, 22, 38, 22, '#8a5a3c', 3); for (const [x, y] of [[26, 38], [34, 42], [38, 35]]) ell(c, x, y, 2.6, 1.8, '#6b4a2f', 0); });
  icon('icon.seeds_wheat', 'Wheat seeds', c => packet(c, '#f4cf5e', '#c9a14a'));
  icon('icon.seeds_carrot', 'Carrot seeds', c => packet(c, '#ff9a3d', '#8a5a3c'));
  icon('icon.seeds_pumpkin', 'Pumpkin seeds', c => packet(c, '#ffb46a', '#f3e2b8'));
  const bowl = (c, soup, bits) => {
    c.strokeStyle = 'rgba(61,43,69,.5)'; c.lineWidth = 2.5; for (const sx of [24, 34, 44]) { c.beginPath(); c.moveTo(sx, 24); c.quadraticCurveTo(sx - 5, 18, sx, 13); c.quadraticCurveTo(sx + 5, 8, sx, 3); c.stroke(); }
    c.beginPath(); c.moveTo(10, 33); c.lineTo(54, 33); c.quadraticCurveTo(54, 56, 32, 56); c.quadraticCurveTo(10, 56, 10, 33); c.closePath(); c.fillStyle = '#f08a5d'; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
    ell(c, 32, 33, 22, 6, soup, 3); for (const [x, y, col] of bits) circ(c, x, y, 2.6, col, 0);
  };
  icon('icon.meal', 'Mushroom soup', c => bowl(c, '#ffcf6b', [[26, 33, '#ff5d6c'], [38, 32, '#7ccf6b']]));
  icon('icon.soup', 'Carrot soup', c => bowl(c, '#ffa45c', [[25, 33, '#ff7f3d'], [37, 32, '#5fbf6e'], [31, 34, '#fff1c2']]));
  icon('icon.bread', 'Bread loaf', c => { ell(c, 32, 38, 23, 14, '#e0a066', 3); for (const x of [22, 32, 42]) line(c, x - 3, 30, x + 3, 40, '#b5774f', 2.5); ell(c, 24, 31, 6, 3, 'rgba(255,255,255,.4)'); });
  icon('icon.pie', 'Pumpkin pie', c => { ell(c, 32, 40, 24, 11, '#e0a066', 3); ell(c, 32, 36, 20, 8, '#ff9a3d', 2.5); for (const a of [0, 1.2, 2.4, 3.6, 4.8]) circ(c, 32 + Math.cos(a) * 14, 36 + Math.sin(a) * 5, 2, '#fff1c2', 0); });
  icon('icon.meds', 'Bandage', c => { rot(c, 32, 32, -.6, () => { orr(c, -24, -10, 48, 20, 10, '#ffe9d6', 3); orr(c, -8, -10, 16, 20, 3, '#f7c9b0', 2.5); for (const [x, y] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) circ(c, x, y, 1.3, '#d9967a', 0); }); });
  icon('icon.cocoa', 'Hot cocoa', c => { orr(c, 14, 22, 30, 32, 7, '#8b9be0', 3); c.beginPath(); c.arc(46, 36, 8, -1.3, 1.3); c.lineWidth = 6; c.strokeStyle = OL; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#8b9be0'; c.stroke(); ell(c, 29, 23, 14, 4, '#8a5a3c', 2.5); orr(c, 22, 16, 9, 8, 3, '#fff', 2); });

  // ---- tools ----
  const handle = (c, x1, y1, x2, y2) => stick(c, x1, y1, x2, y2, '#b5774f', 5);
  icon('icon.axe', 'Axe', c => { handle(c, 18, 54, 44, 12); c.beginPath(); c.moveTo(36, 10); c.quadraticCurveTo(54, 8, 56, 24); c.lineTo(44, 26); c.lineTo(38, 20); c.closePath(); c.fillStyle = '#cfd3ea'; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); });
  icon('icon.pickaxe', 'Pickaxe', c => { handle(c, 20, 56, 40, 18); c.beginPath(); c.moveTo(12, 20); c.quadraticCurveTo(38, 2, 58, 24); c.quadraticCurveTo(40, 14, 14, 26); c.closePath(); c.fillStyle = '#cfd3ea'; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); });
  icon('icon.hoe', 'Hoe', c => { handle(c, 16, 56, 44, 14); poly(c, [[38, 10], [56, 14], [54, 24], [42, 20]], '#cfd3ea', 3); });
  icon('icon.spear', 'Spear', c => { stick(c, 12, 54, 46, 18, '#b5774f', 3.5); poly(c, [[42, 14], [58, 6], [50, 22]], '#cfd3ea', 3); orr(c, 38, 20, 9, 6, 2, P.sun, 2); });
  icon('icon.rod', 'Fishing rod', c => { stick(c, 12, 56, 50, 10, '#b5774f', 3); c.beginPath(); c.moveTo(50, 10); c.quadraticCurveTo(56, 30, 48, 46); c.strokeStyle = OL; c.lineWidth = 1.6; c.stroke(); circ(c, 48, 48, 4, P.coral, 2); circ(c, 18, 48, 5, P.metal, 2.5); });
  icon('icon.can', 'Watering can', c => { orr(c, 16, 26, 28, 26, 6, '#7fd3c7', 3); c.beginPath(); c.arc(30, 26, 10, Math.PI, 0); c.lineWidth = 6; c.strokeStyle = OL; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#7fd3c7'; c.stroke(); poly(c, [[44, 34], [58, 22], [60, 26], [46, 42]], '#7fd3c7', 3); for (const [x, y] of [[58, 32], [54, 38]]) circ(c, x, y, 2, P.sky, 0); });
  icon('icon.hammer', 'Hammer (build / dismantle)', c => { handle(c, 20, 54, 40, 22); rot(c, 41, 20, .55, () => orr(c, -16, -8, 32, 15, 4, '#9aa3c7', 3)); });
  icon('icon.lantern', 'Lantern', c => { c.beginPath(); c.arc(32, 18, 9, Math.PI, 0); c.strokeStyle = OL; c.lineWidth = 3; c.stroke(); orr(c, 18, 16, 28, 8, 3, '#8b6bd1', 3); orr(c, 20, 23, 24, 26, 6, P.sun, 3); orr(c, 25, 27, 14, 17, 4, '#fff3a8', 2.5); flame(c, 32, 41, 11, 4, '#ff8a3d'); orr(c, 17, 48, 30, 7, 3, '#8b6bd1', 3); });
  icon('icon.backpack', 'Backpack', c => { orr(c, 14, 16, 36, 40, 10, P.plum, 3); orr(c, 20, 32, 24, 16, 5, '#a98be6', 2.5); c.beginPath(); c.arc(32, 16, 8, Math.PI, 0); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); orr(c, 28, 30, 8, 5, 2, P.sun, 2); });

  // ---- stats ----
  icon('icon.heart', 'Health', c => { c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(6, 38, 6, 14, 22, 12); c.bezierCurveTo(28, 11, 31, 15, 32, 19); c.bezierCurveTo(33, 15, 36, 11, 42, 12); c.bezierCurveTo(58, 14, 58, 38, 32, 54); c.closePath(); c.fillStyle = '#ff6b7f'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = OL; c.stroke(); ell(c, 21, 24, 5, 3.5, 'rgba(255,255,255,.7)'); });
  icon('icon.hunger', 'Fullness', c => { rot(c, 30, 30, -.7, () => { orr(c, -4, 8, 8, 20, 4, P.cream, 3); circ(c, -5, 29, 5, P.cream, 3); circ(c, 5, 29, 5, P.cream, 3); }); rot(c, 28, 28, -.7, () => { ell(c, 0, -4, 15, 19, '#e0874c', 3); ell(c, -5, -10, 5, 7, 'rgba(255,255,255,.35)'); }); });
  icon('icon.warm', 'Warmth', c => { flame(c, 32, 54, 46, 17, '#ff8457', true); flame(c, 32, 54, 30, 10, P.sun); circ(c, 32, 47, 5, '#fff6c2', 0); });
  icon('icon.cold', 'Cold', c => { c.strokeStyle = OL; c.lineCap = 'round'; for (let i = 0; i < 3; i++) rot(c, 32, 32, i * Math.PI / 3, () => { c.lineWidth = 7; c.beginPath(); c.moveTo(0, -22); c.lineTo(0, 22); c.stroke(); c.lineWidth = 3.5; c.strokeStyle = '#bfe8f7'; c.stroke(); c.strokeStyle = OL; }); circ(c, 32, 32, 5, '#fff', 2.5); });
  icon('icon.energy', 'Energy', c => poly(c, [[36, 6], [16, 36], [30, 36], [26, 58], [48, 26], [34, 26]], P.sun, 3));

  // ---- ui ----
  icon('icon.hand', 'Hand / interact', c => { orr(c, 16, 22, 32, 28, 12, '#ffdcc0', 3); orr(c, 10, 30, 12, 12, 6, '#ffdcc0', 3); c.strokeStyle = 'rgba(61,43,69,.5)'; c.lineWidth = 2.5; for (const x of [26, 33, 40]) { c.beginPath(); c.moveTo(x, 22); c.lineTo(x, 32); c.stroke(); } orr(c, 18, 46, 28, 10, 4, P.coral, 3); });
  icon('icon.sleep', 'Sleep', c => { circ(c, 28, 36, 18, P.sun, 3); c.globalCompositeOperation = 'destination-out'; circ(c, 38, 28, 15, '#000', 0); c.globalCompositeOperation = 'source-over'; c.save(); c.beginPath(); c.arc(28, 36, 18, 0, TAU); c.clip(); c.beginPath(); c.arc(38, 28, 15, 0, TAU); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); c.restore(); c.fillStyle = OL; c.font = '800 16px sans-serif'; c.fillText('z', 44, 24); c.font = '800 12px sans-serif'; c.fillText('z', 52, 12); });
  icon('icon.sun', 'Day', c => { for (let i = 0; i < 8; i++) rot(c, 32, 32, i / 8 * TAU, () => orr(c, -3, -28, 6, 10, 3, P.sun, 2)); circ(c, 32, 32, 14, P.sun, 3); circ(c, 27, 28, 3, '#fff6c2', 0); });
  icon('icon.moon', 'Night', c => { circ(c, 30, 34, 20, '#ffe9a8', 3); c.globalCompositeOperation = 'destination-out'; circ(c, 42, 26, 16, '#000', 0); c.globalCompositeOperation = 'source-over'; c.save(); c.beginPath(); c.arc(30, 34, 20, 0, TAU); c.clip(); c.beginPath(); c.arc(42, 26, 16, 0, TAU); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); c.restore(); star(c, 48, 46, 5, P.sunLight); });
  icon('icon.map', 'Map', c => { poly(c, [[8, 16], [24, 10], [40, 16], [56, 10], [56, 48], [40, 54], [24, 48], [8, 54]], '#f7e3c0', 3); line(c, 24, 10, 24, 48, 'rgba(61,43,69,.4)', 2); line(c, 40, 16, 40, 54, 'rgba(61,43,69,.4)', 2); c.setLineDash([3, 3]); line(c, 14, 40, 34, 28, P.coral, 2.5); c.setLineDash([]); line(c, 44, 30, 50, 36, P.berry, 3); line(c, 50, 30, 44, 36, P.berry, 3); });
  icon('icon.quest', 'Quest scroll', c => { orr(c, 14, 12, 36, 42, 5, '#f7e3c0', 3); orr(c, 10, 8, 44, 8, 4, '#e0b36b', 2.5); orr(c, 10, 50, 44, 8, 4, '#e0b36b', 2.5); for (const y of [24, 32, 40]) line(c, 20, y, 44, y, 'rgba(61,43,69,.4)', 2); circ(c, 44, 44, 6, P.coral, 2); });
  icon('icon.check', 'Done', c => { circ(c, 32, 32, 22, P.leaf, 3); c.beginPath(); c.moveTo(21, 33); c.lineTo(29, 41); c.lineTo(44, 24); c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke(); });
  icon('icon.cross', 'No / close', c => { circ(c, 32, 32, 22, P.rose, 3); c.lineWidth = 6; c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(23, 23); c.lineTo(41, 41); c.moveTo(41, 23); c.lineTo(23, 41); c.stroke(); });
  icon('icon.lock', 'Locked', c => { c.beginPath(); c.arc(32, 28, 11, Math.PI, 0); c.lineWidth = 7; c.strokeStyle = OL; c.stroke(); c.lineWidth = 3.5; c.strokeStyle = P.metal; c.stroke(); orr(c, 16, 28, 32, 26, 6, P.sun, 3); circ(c, 32, 39, 3.5, OL, 0); });
  icon('icon.star', 'Star', c => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 10 : 24; c.lineTo(32 + Math.cos(a) * r, 33 + Math.sin(a) * r); } c.closePath(); c.fillStyle = P.sun; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); });
  icon('icon.trade', 'Trade', c => { orr(c, 10, 18, 40, 10, 5, P.mint, 3); poly(c, [[46, 12], [58, 23], [46, 34]], P.mint, 3); orr(c, 14, 38, 40, 10, 5, P.coral, 3); poly(c, [[18, 32], [6, 43], [18, 54]], P.coral, 3); });
  icon('icon.pause', 'Pause', c => { orr(c, 16, 14, 11, 36, 4, P.cream, 3); orr(c, 37, 14, 11, 36, 4, P.cream, 3); });
  icon('icon.settings', 'Menu', c => { c.save(); c.translate(32, 32); c.fillStyle = OL; for (let i = 0; i < 8; i++) { c.save(); c.rotate(i / 8 * TAU); K.rr(c, -6, -24, 12, 12, 3); c.fill(); c.restore(); } c.fillStyle = '#d9def0'; for (let i = 0; i < 8; i++) { c.save(); c.rotate(i / 8 * TAU); K.rr(c, -4, -22, 8, 9, 2); c.fill(); c.restore(); } circ(c, 0, 0, 15, '#d9def0', 3); circ(c, 0, 0, 5, P.cream, 2.5); c.restore(); });
  icon('icon.sound', 'Sound on', c => { poly(c, [[10, 26], [20, 26], [32, 14], [32, 50], [20, 38], [10, 38]], P.cream, 3); c.lineWidth = 3.5; c.strokeStyle = OL; c.beginPath(); c.arc(32, 32, 12, -.8, .8); c.stroke(); c.beginPath(); c.arc(32, 32, 21, -.8, .8); c.stroke(); });
  icon('icon.mute', 'Sound off', c => { poly(c, [[10, 26], [20, 26], [32, 14], [32, 50], [20, 38], [10, 38]], P.cream, 3); c.lineWidth = 4; c.strokeStyle = P.rose; c.beginPath(); c.moveTo(40, 24); c.lineTo(54, 40); c.moveTo(54, 24); c.lineTo(40, 40); c.stroke(); });
  icon('icon.home', 'Home', c => { poly(c, [[8, 32], [32, 10], [56, 32]], P.coral, 3); orr(c, 14, 30, 36, 26, 4, P.paper, 3); orr(c, 27, 38, 10, 18, 3, P.woodDark, 2.5); orr(c, 40, 36, 7, 7, 2, P.sun, 2); });
  icon('icon.phone', 'Phone (rotate hint)', c => { orr(c, 18, 7, 28, 50, 7, P.cream, 3); orr(c, 22.5, 13, 19, 34, 3, P.sky, 2); circ(c, 32, 52, 2.4, OL, 0); });
  icon('icon.paw', 'Pet', c => { circ(c, 32, 40, 11, '#f5d7a1', 3); for (const [x, y] of [[18, 26], [27, 18], [37, 18], [46, 26]]) circ(c, x, y, 5.5, '#f5d7a1', 3); });
  icon('icon.bag', 'Bag / inventory', c => { orr(c, 12, 22, 40, 34, 10, '#e0a066', 3); c.beginPath(); c.arc(32, 22, 10, Math.PI, 0); c.lineWidth = 6; c.strokeStyle = OL; c.stroke(); c.lineWidth = 3; c.strokeStyle = '#c98a5d'; c.stroke(); orr(c, 20, 32, 24, 10, 4, '#f5c58a', 2.5); circ(c, 32, 37, 2.5, P.sun, 1.5); });
  icon('icon.build', 'Build', c => { orr(c, 8, 30, 22, 22, 3, '#e48f6c', 3); orr(c, 30, 30, 22, 22, 3, '#c98a5d', 3); orr(c, 19, 12, 22, 20, 3, '#eaae73', 3); handle(c, 40, 56, 54, 34); rot(c, 55, 32, .6, () => orr(c, -9, -5, 18, 9, 3, '#9aa3c7', 2.5)); });
  icon('icon.craft', 'Craft', c => { orr(c, 8, 30, 48, 10, 3, P.wood, 3); stick(c, 14, 40, 14, 56, P.woodDark, 4); stick(c, 50, 40, 50, 56, P.woodDark, 4); handle(c, 22, 28, 40, 10); rot(c, 41, 10, .55, () => orr(c, -10, -5, 20, 10, 3, '#9aa3c7', 2.5)); });
  icon('icon.eat', 'Eat', c => { bowl(c, '#ffcf6b', [[26, 33, '#ff5d6c']]); });
  icon('icon.water', 'Water', c => { c.beginPath(); c.moveTo(32, 8); c.quadraticCurveTo(52, 34, 46, 46); c.quadraticCurveTo(32, 62, 18, 46); c.quadraticCurveTo(12, 34, 32, 8); c.closePath(); c.fillStyle = P.sky; c.fill(); c.lineWidth = 3; c.strokeStyle = OL; c.stroke(); ell(c, 25, 38, 4, 7, 'rgba(255,255,255,.6)', 0, .3); });
  icon('icon.book', 'Help', c => { orr(c, 10, 14, 22, 38, 4, '#8b9be0', 3); orr(c, 32, 14, 22, 38, 4, '#a3b0ec', 3); for (const y of [24, 31, 38]) { line(c, 15, y, 27, y, 'rgba(255,255,255,.7)', 2); line(c, 37, y, 49, y, 'rgba(255,255,255,.7)', 2); } });

  // ---- small fx (24x24, centre anchor, o.t = 0..1 life) ----
  const fx = (name, desc, fn) => K.define(name, { w: 24, h: 24, ax: 12, ay: 12, tags: ['fx'], states: { t: [.1, .5, .9] }, defaults: { t: .3 }, desc, draw(ctx, o) { const t = o.t || 0; ctx.globalAlpha *= t < .7 ? 1 : 1 - (t - .7) / .3; fn(ctx, t); } });
  fx('fx.heart', 'Floating heart', (c, t) => { const s = .6 + Math.min(1, t * 4) * .4; c.scale(s, s); c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-11, 1, -9, -9, -3, -8); c.quadraticCurveTo(-1, -8, 0, -5); c.quadraticCurveTo(1, -8, 3, -8); c.bezierCurveTo(9, -9, 11, 1, 0, 8); c.closePath(); c.fillStyle = '#ff6b7f'; c.fill(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke(); });
  fx('fx.note', 'Music note', (c, t) => { c.rotate(Math.sin(t * 12) * .2); circ(c, -3, 5, 4, P.plum, 2); stick(c, 1, 5, 1, -9, OL, 1); line(c, 1, -9, 7, -6, OL, 3); });
  fx('fx.sparkle', 'Sparkle', (c, t) => { star(c, 0, 0, 7 + Math.sin(t * 20) * 2, P.sunLight); star(c, 8, -6, 3, '#fff'); star(c, -7, 6, 2.5, '#fff'); });
  fx('fx.zzz', 'Sleep zzz', (c, t) => { c.fillStyle = P.cream; c.strokeStyle = OL; c.lineWidth = 3; c.font = '800 12px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeText('z', -4, 6 - t * 6); c.fillText('z', -4, 6 - t * 6); c.font = '800 9px sans-serif'; c.strokeText('z', 5, -2 - t * 6); c.fillText('z', 5, -2 - t * 6); });
  fx('fx.dust', 'Dust puff', (c, t) => { blob(c, [[-4, 2, 5 + t * 4], [4, 0, 4 + t * 4], [0, -4, 4 + t * 3]], 'rgba(230,214,190,.9)', 0); });
})(window.MinikArt);
