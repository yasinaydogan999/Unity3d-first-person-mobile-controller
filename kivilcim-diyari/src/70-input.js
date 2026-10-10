// ===== 70-input: joystick, action button, keyboard =====
const input = { dropAim: false, jid: null, jx: 0, jy: 0, ox: 0, oy: 0, actPid: null, actTap: false, btn: false, queued: false, keys: new Set() };
const JR = 54;
let paused = false;

cvs.addEventListener('pointerdown', e => {
  initAudio();
  if (state !== 'play' || paused || !G) return;
  e.preventDefault();
  // with a building/farming item, taps close to the hero aim at tiles even on the joystick side
  const [hx, hy] = w2s(G.p.x, G.p.y - 20), nearHero = usesTile(held()) && Math.hypot(e.clientX - hx, e.clientY - hy) < AIM_REACH * SC + 12;
  if (input.jid === null && e.clientX < VW * .45 && !nearHero) { input.jid = e.pointerId; input.ox = e.clientX; input.oy = e.clientY; input.jx = input.jy = 0; }
  else if (input.actPid === null) { input.actPid = e.pointerId; input.actTap = true; input.queued = true; input.dropAim = false; aimAt(e); }
  try { cvs.setPointerCapture(e.pointerId); } catch (_) {}
}, { passive: false });
/** With a building/farming item in hand, the tapped tile becomes the target; dragging paints a line of them. */
function aimAt(e) {
  if (!usesTile(held())) { aim = null; return false; }
  const [wx, wy] = s2w(e.clientX, e.clientY), tx = Math.floor(wx / T); let ty = Math.floor(wy / T);
  // the raised face of a block covers most of the tile above it
  const below = objAtTile(tx, ty + 1);
  if (below && BLOCKS[below.k] && below.k !== 'fence' && !objAtTile(tx, ty) && wy > (ty + 1) * T - K.WALL_H) ty++;
  const changed = !aim || aim.tx !== tx || aim.ty !== ty;
  aim = { tx, ty }; return changed;
}
cvs.addEventListener('pointermove', e => {
  if (e.pointerId === input.actPid) { if (aim && aimAt(e)) input.queued = true; return; }
  if (e.pointerId !== input.jid) return;
  e.preventDefault();
  let dx = e.clientX - input.ox, dy = e.clientY - input.oy; const d = Math.hypot(dx, dy);
  if (d > JR) { input.ox += dx * (1 - JR / d); input.oy += dy * (1 - JR / d); dx = e.clientX - input.ox; dy = e.clientY - input.oy; }
  input.jx = dx / JR; input.jy = dy / JR;
  if (Math.hypot(input.jx, input.jy) < .12) input.jx = input.jy = 0;
}, { passive: false });
const endPtr = e => { if (e.pointerId === input.jid) { input.jid = null; input.jx = input.jy = 0; } if (e.pointerId === input.actPid) { input.actPid = null; input.actTap = false; if (input.queued) input.dropAim = true; else aim = null; } };
cvs.addEventListener('pointerup', endPtr); cvs.addEventListener('pointercancel', endPtr);

const actBtn = $('actBtn');
actBtn.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); aim = null; input.dropAim = false; input.btn = true; input.queued = true; actBtn.classList.add('down'); try { actBtn.setPointerCapture(e.pointerId); } catch (_) {} });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) actBtn.addEventListener(ev, () => { input.btn = false; actBtn.classList.remove('down'); });
actBtn.addEventListener('contextmenu', e => e.preventDefault());
$('eatBtn').addEventListener('click', () => { initAudio(); if (G && state === 'play') eatBest(); });
$('bagBtn').addEventListener('click', () => { initAudio(); openSheet(sheetTab || 'tool'); });
$('menuBtn').addEventListener('click', openMenu);
$('mapWrap').addEventListener('click', () => { if (G) toast(`Evine uzaklık: ${Math.round(Math.hypot(G.p.x - G.home.x, G.p.y - G.home.y) / T)} m · Gün ${G.day}`, 'icon.map'); });

addEventListener('keydown', e => {
  if (!G || state !== 'play') return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (sheetTab) closeSheet(); else if (!$('modal').hidden) { closeModal(); paused = false; } else openMenu(); return; }
  if (!$('modal').hidden) return;
  if (k === 'b' || k === 'c' || k === 'tab') { e.preventDefault(); sheetTab ? closeSheet() : openSheet('tool'); return; }
  if (k === 'f') { eatBest(); return; }
  if (/^[1-8]$/.test(k)) { selectHot(+k - 1); hudDirty(); return; }
  if ((k === ' ' || k === 'e') && !e.repeat) input.queued = true;
  input.keys.add(k);
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
});
addEventListener('keyup', e => input.keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => { input.keys.clear(); input.btn = false; input.actTap = false; aim = null; });

function readInput() {
  let mx = input.jx, my = input.jy; const K2 = input.keys;
  if (K2.size) { if (K2.has('a') || K2.has('arrowleft')) mx -= 1; if (K2.has('d') || K2.has('arrowright')) mx += 1; if (K2.has('w') || K2.has('arrowup')) my -= 1; if (K2.has('s') || K2.has('arrowdown')) my += 1; }
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  const act = input.queued || input.btn || input.actTap || K2.has(' ') || K2.has('e');
  return { mx, my, act };
}

function drawJoystick() {
  if (input.jid !== null) {
    ctx.beginPath(); ctx.arc(input.ox, input.oy, JR, 0, TAU); ctx.fillStyle = 'rgba(255,247,234,.25)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(61,43,69,.55)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(input.ox + input.jx * JR, input.oy + input.jy * JR, 24, 0, TAU); ctx.fillStyle = 'rgba(255,247,234,.95)'; ctx.fill(); ctx.strokeStyle = K.P.ink; ctx.stroke();
  } else if (G && G.day <= 1 && G.q < 2 && !input.keys.size) {
    const x = 96, y = VH - 104;
    ctx.save(); ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.arc(x, y, 44, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(61,43,69,.45)'; ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, 20, 0, TAU); ctx.fillStyle = 'rgba(255,247,234,.6)'; ctx.fill();
    ctx.font = '700 14px "Baloo 2", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,247,234,.9)'; ctx.strokeText('sürükle, yürü', x, y + 62); ctx.fillStyle = K.P.ink; ctx.fillText('sürükle, yürü', x, y + 62);
  }
}
