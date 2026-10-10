// ===== 70-input: taps, drag-to-pan, pinch-zoom, keyboard =====
const ptrs = new Map();
let gest = null, lastTap = { t: 0, x: 0, y: 0 };

cvs.addEventListener('pointerdown', e => {
  initAudio();
  e.preventDefault();
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  try { cvs.setPointerCapture(e.pointerId); } catch (_) {}
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    gest = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, u0: cam.user, w: s2w(mx, my) };
  } else if (ptrs.size === 1) gest = { type: 'tap' };
}, { passive: false });

cvs.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  e.preventDefault();
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (!gest) return;
  if (gest.type === 'pinch' && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    setZoom(gest.u0 * d / gest.d0, gest.w, mx, my);
  } else if (gest.type === 'tap' && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 10) gest.type = 'pan';
  if (gest.type === 'pan') { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); }
}, { passive: false });

function endPtr(e) {
  const p = ptrs.get(e.pointerId); if (!p) return;
  ptrs.delete(e.pointerId);
  if (gest && gest.type === 'tap' && ptrs.size === 0 && e.type === 'pointerup') handleTap(e.clientX, e.clientY);
  if (ptrs.size === 0) gest = null;
  else if (gest && gest.type === 'pinch') gest = { type: 'pan' };
}
cvs.addEventListener('pointerup', endPtr);
cvs.addEventListener('pointercancel', endPtr);
cvs.addEventListener('wheel', e => { e.preventDefault(); setZoom(cam.user * (e.deltaY < 0 ? 1.12 : 1 / 1.12), s2w(e.clientX, e.clientY), e.clientX, e.clientY); }, { passive: false });

function setZoom(u, worldPt, sx, sy) {
  cam.user = clamp(u, 1, 2.6); cam.z = cam.fitZ * cam.user;
  cam.x = worldPt[0] - (sx - VW / 2 - cam.offX) / cam.z;
  cam.y = worldPt[1] - (sy - VH / 2) / cam.z;
  clampCam();
}

function hitTest(s, wx, wy) {
  const home = s.kind === 'home';
  if (home) {
    let best = null, bd = 1e9;
    for (const ch of G.chars) {
      if (ch.away) continue;
      const p = charDrawPos(ch);
      const dx = Math.abs(wx - p.x);
      const inY = p.pose === 'sleep' ? wy > p.y - 30 && wy < p.y + 6 : wy > p.y - 74 && wy < p.y + 6;
      if (inY && dx < (p.pose === 'sleep' ? 36 : 20) && dx < bd) { bd = dx; best = { k: 'char', ch }; }
    }
    if (best) return best;
    for (let i = 0; i < G.pets.length; i++) { const p = G.pets[i], y = floorY(p.row); if (Math.abs(wx - p.x) < 22 && wy > y - 36 && wy < y + 6) return { k: 'pet', i }; }
  } else if (G.scav) {
    for (const c of G.scav.coons) { if (c.state === 'gone' || c.state === 'flee') continue; const y = floorY(c.row); if (Math.abs(wx - c.x) < 28 && wy > y - 46 && wy < y + 8) return { k: 'coon', c }; }
  }
  // objects (smallest first so a crate in front of a shelf wins)
  const objs = s.objs.slice().sort((a, b) => a.w - b.w);
  for (const o of objs) {
    const room = roomOf(s, o.row, o.x);
    if (!room || room.rubble > 0 || !room.revealed) continue;
    const d = K.get(o.t === 'station' ? ST_ART[o.kind] : CONT_ART[o.t]);
    const h = d ? d.h : 60, y = floorY(o.row);
    if (Math.abs(wx - o.x) < o.w / 2 + 6 && wy > y - h - 6 && wy < y + 6) return { k: 'obj', o };
  }
  const dy = floorY(s.door.row);
  if (Math.abs(wx - s.door.x) < 28 && wy > dy - 96 && wy < dy + 4) return { k: home ? 'door' : 'exit' };
  for (let r = 0; r < s.rows; r++) {
    if (wy < ceilY(r) || wy > floorY(r) + SLAB) continue;
    const c = Math.floor(wx / ROOM_W); if (c < 0 || c >= s.cols) continue;
    const room = s.rooms[r][c];
    if (!room.revealed) return null;
    if (room.rubble > 0) return { k: 'room', room };
    return { k: 'floor', row: r, x: clamp(wx, 14, siteW(s) - 14) };
  }
  return null;
}

function handleTap(sx, sy) {
  if (!G || state !== 'play' || !$('modal').hidden || craftOpen) return;
  const now = performance.now();
  const dbl = now - lastTap.t < 320 && Math.hypot(sx - lastTap.x, sy - lastTap.y) < 30;
  lastTap = { t: now, x: sx, y: sy };
  const hadBubble = !$('bubble').hidden;
  closeBubble();
  const s = curSite();
  const [wx, wy] = s2w(sx, sy);
  const hit = hitTest(s, wx, wy);
  if (G.phase === 'scav') {
    if (!hit) { if (dbl) toggleZoom(sx, sy); return; }
    if (hit.k === 'exit') { toast('Eve dönmek için sağ üstteki düğmeye bas', 'icon.home'); scavAct({ k: 'floor', row: s.door.row, x: s.door.x + 10 }); return; }
    scavAct(hit); return;
  }
  if (G.phase !== 'day') return;
  if (!hit) { if (dbl) toggleZoom(sx, sy); else if (!hadBubble && G.sel) { G.sel = null; cardSig = {}; } return; }
  if (hit.k === 'char') {
    if (G.sel === hit.ch.id) { const p = charDrawPos(hit.ch); const [bx, by] = w2s(p.x, p.y - 80); openBubble(hit, bx, by); }
    else { G.sel = hit.ch.id; G.tut = Math.max(G.tut, 1); cardSig = {}; sfx('tap'); }
    return;
  }
  if (hit.k === 'floor') {
    if (dbl) { toggleZoom(sx, sy); return; }
    const ch = G.chars.find(c => c.id === G.sel && !c.away);
    if (ch) { cancelTasks(ch); startTask(ch, { type: 'walk', row: hit.row, x: hit.x }); sfx('tap'); }
    return;
  }
  let ay = sy - 30;
  if (hit.k === 'obj') { const d = K.get(hit.o.t === 'station' ? ST_ART[hit.o.kind] : CONT_ART[hit.o.t]); ay = w2s(hit.o.x, floorY(hit.o.row) - (d ? d.h : 60))[1] - 6; sx = w2s(hit.o.x, 0)[0]; }
  openBubble(hit, sx, Math.max(ay, 120));
  sfx('tap');
}
function toggleZoom(sx, sy) { setZoom(cam.user > 1.3 ? 1 : 1.9, s2w(sx, sy), sx, sy); }

addEventListener('keydown', e => {
  if (!G || state !== 'play') return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (!$('bubble').hidden) closeBubble(); else if (craftOpen) closeCraft(); else if ($('modal').hidden) openMenu(); return; }
  if (!$('modal').hidden) return;
  if (k === ' ') { G.speed = G.speed ? 0 : 1; setSpeedUI(); e.preventDefault(); }
  else if (k === '1' || k === '2' || k === '3') { G.speed = +k; setSpeedUI(); }
  else if (k === 'c') craftOpen ? closeCraft() : openCraft();
});
