// ===== 90-boot: audio, save/load, title, main loop, Android glue =====
let AC = null;
function initAudio() { if (!OPTS.sound) return; if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return; } try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
function tone(f, d, type, v, f2, delay) {
  if (!AC || !OPTS.sound) return;
  const t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v || .08, t0 + .012); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + d + .03);
}
const NB = {};
function noise(d, v, freq) {
  if (!AC || !OPTS.sound) return;
  const key = Math.round(d * 100); let b = NB[key];
  if (!b) { const len = Math.max(1, Math.floor(AC.sampleRate * d)); b = AC.createBuffer(1, len, AC.sampleRate); const ch = b.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len); NB[key] = b; }
  const s = AC.createBufferSource(); s.buffer = b; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; const g = AC.createGain(); g.gain.value = v;
  s.connect(f); f.connect(g); g.connect(AC.destination); s.start();
}
const SFX = {
  tap() { tone(660, .05, 'sine', .05, 880); },
  deny() { tone(220, .12, 'square', .03, 170); },
  dig() { noise(.09, .35, 600); tone(150, .07, 'triangle', .06, 100); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .2, 'triangle', .07, 0, i * .09)); },
  cook() { noise(.3, .12, 1800); tone(520, .12, 'sine', .06, 700, .2); },
  happy() { [587, 784].forEach((f, i) => tone(f, .14, 'sine', .07, 0, i * .08)); },
  water() { tone(900, .08, 'sine', .06, 500); tone(700, .08, 'sine', .05, 400, .09); },
  pick() { tone(700, .07, 'sine', .07, 1000); },
  loot() { [523, 659, 784].forEach((f, i) => tone(f, .12, 'sine', .07, 0, i * .06)); },
  music() { [392, 494, 587, 494, 659].forEach((f, i) => tone(f, .18, 'triangle', .05, 0, i * .14)); },
  purr() { tone(90, .4, 'sawtooth', .025, 80); },
  eat() { tone(440, .06, 'sine', .06, 520); tone(520, .06, 'sine', .06, 620, .09); },
  build() { [392, 523, 659].forEach((f, i) => tone(f, .12, 'triangle', .07, 0, i * .07)); noise(.06, .2, 900); },
  night() { tone(220, .9, 'sine', .06, 147); tone(330, .9, 'sine', .04, 220, .15); },
  morning() { [392, 494, 587, 784].forEach((f, i) => tone(f, .25, 'sine', .05, 0, i * .11)); },
  door() { noise(.12, .3, 300); tone(180, .12, 'triangle', .05, 120); },
  shoo() { noise(.25, .3, 2500); },
  steal() { [700, 600, 900].forEach((f, i) => tone(f, .08, 'square', .03, 0, i * .07)); },
};
function sfx(n) { const f = SFX[n]; if (f) try { f(); } catch (e) {} }
function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

// ----- save -----
function save() { if (!G || state !== 'play') return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {} }
function readSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1 && s.home && Array.isArray(s.chars) && s.chars.length) return s; } catch (e) {} return null; }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
function readBest() { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } }

// ----- flow -----
function showHud(on) { $('top').hidden = !on; $('cards').hidden = !on; $('acts').hidden = !on; if (!on) { $('scav').hidden = true; $('hint').textContent = ''; } }
function setupDemo() {
  newGame();
  const s = G.home;
  for (const row of s.rooms.slice(1)) for (const room of row) room.rubble = 0;
  s.rooms[0][3].rubble = 0; bumpSite(s); updateReveal(s);
  addStation(s, 'stove', 2, 2 * ROOM_W + 70).lit = true;
  addStation(s, 'heater', 2, 3 * ROOM_W + 120).lit = true;
  addStation(s, 'water', 2, 2 * ROOM_W + 130).fill = 3;
  addStation(s, 'armchair', 1, 2 * ROOM_W + 60);
  addStation(s, 'garden', 1, 3 * ROOM_W + 110, { planted: true, growth: .8 });
  for (const o of s.objs) if (o.t !== 'station') { o.searched = true; o.open = true; }
  G.chars[0].row = 2; G.chars[0].x = 2 * ROOM_W + 60; G.chars[0].task = { type: 'cook', obj: s.objs.find(o => o.kind === 'stove').id, prog: 0, dur: 999 }; G.chars[0].pose = 'work';
  G.chars[1].row = 2; G.chars[1].x = ROOM_W + 112; G.chars[1].task = { type: 'craft', recipe: 'shovel', obj: 0, prog: 0, dur: 999 };
  G.chars[2].row = 1; G.chars[2].x = 2 * ROOM_W + 60;
  G.clock = 18.6; invalidateRooms();
}
function showTitle() {
  state = 'title'; closeModal(); closeCraft(); closeBubble(); showHud(false);
  setupDemo(); fitCamera(true);
  $('title').hidden = false;
  const s = readSave();
  $('contBtn').hidden = !s;
  if (s) $('contInfo').textContent = `${s.day}. gün · ${s.chars.map(c => c.name).join(', ')}`;
  const best = readBest(); $('bestLbl').textContent = best ? `En uzun dayanış: ${best} gün` : '';
}
function enterPlay() {
  state = 'play'; $('title').hidden = true; showHud(true);
  buildRes(); rebuildCards(); setSpeedUI(); hudDirty(); invalidateRooms(); fitCamera(true);
  goFullscreen();
}
function startNew() {
  initAudio(); newGame(); enterPlay(); save();
  const intro = `<div class="mbox panel"><div class="split"><canvas width="300" height="300" id="evArt"></canvas><div style="display:grid;gap:8px"><h2>Fırtınanın ertesi sabahı</h2>
    <p>Ece, Mert ve Lale yarı yıkılmış apartmanda uyandı. Yollar karla kapalı, belediye "12 gün dayanın" diyor. Kedi Pamuk da yanlarında.</p>
    <p style="font-size:14px;color:var(--muted)">Molozları temizle, atölyede üret, geceleri keşfe çık. Hepsi birkaç dokunuş.</p>
    <div class="row"><button class="btn pri" id="introGo">Haydi başlayalım</button><button class="btn" id="introHelp">${icImg('icon.book')}Nasıl oynanır</button></div></div></div></div>`;
  openModal(intro);
  const c = $('evArt'), x = c.getContext('2d'); x.fillStyle = '#ffe8c7'; x.fillRect(0, 0, 300, 300);
  K.draw(x, 'char.mert', 100, 262, { scale: 2.3, pose: 'wave', t: .2, mood: 'happy' });
  K.draw(x, 'char.lale', 205, 262, { scale: 2.3, pose: 'happy', t: .4, mood: 'happy', flip: true });
  K.draw(x, 'critter.cat', 152, 280, { scale: 2, pose: 'sit', t: .1 });
  $('introGo').addEventListener('click', () => { closeModal(); sfx('fanfare'); });
  $('introHelp').addEventListener('click', () => showHelp());
}
function continueGame() {
  const s = readSave(); if (!s) { startNew(); return; }
  initAudio(); G = s; enterPlay();
  if (G.phase === 'plan' || (G.phase === 'scav' && !G.scav)) { G.phase = 'plan'; G.plan = G.plan || { roles: Object.fromEntries(G.chars.map(c => [c.id, 'sleep'])), loc: null, mode: 'play' }; openNightPlan(); }
  else if (G.phase === 'scav') { showScavHud(true); fitCamera(true); }
  else if (G.phase === 'morning') G.phase = 'day';
  toast(`${G.day}. gün, kaldığın yerden`, 'icon.home');
}
function goFullscreen() {
  if (/MinikSiginakApp/.test(navigator.userAgent)) return;
  const el = document.documentElement;
  try {
    if (el.requestFullscreen && !document.fullscreenElement && /Android/i.test(navigator.userAgent))
      el.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
  } catch (e) {}
}
// Android hardware back button (called by the APK wrapper). Returns true if handled.
window.minikBack = function () {
  if (!$('bubble').hidden) { closeBubble(); return true; }
  if (craftOpen) { closeCraft(); return true; }
  if (state === 'play' && $('modal').hidden && G && G.phase === 'day') { openMenu(); return true; }
  return false;
};
window.minikPause = function () { if (G && state === 'play') { save(); if (G.phase === 'day' && $('modal').hidden) openMenu(); } };

$('newBtn').addEventListener('click', () => { sfx('tap'); startNew(); });
$('contBtn').addEventListener('click', () => { sfx('tap'); continueGame(); });
$('portraitAnyway').addEventListener('click', () => document.body.classList.add('allow-portrait'));
addEventListener('resize', () => { resize(); invalidateRooms(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) window.minikPause(); });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

// ----- loop -----
let lastT = 0, hudT = 0, autoT = 0;
function loop(ts) {
  const t = ts / 1000, dt = Math.min(.05, Math.max(0, t - lastT)); lastT = t;
  if (G) {
    if (state === 'play') {
      const blocked = !$('modal').hidden || craftOpen;
      const sp = blocked ? 0 : G.speed;
      if (sp > 0) { if (G.phase === 'day') simDay(dt * sp); else if (G.phase === 'scav') updateScav(dt * sp); }
      if (G.phase === 'scav' && G.scav) $('tbar').style.transform = `scaleX(${(G.scav.t / G.scav.limit).toFixed(3)})`;
      hudT += dt; if (hudT > .12) { hudT = 0; updateHUD(); }
      autoT += dt; if (autoT > 20) { autoT = 0; save(); }
      if (G.doorAnim) G.doorAnim = Math.max(0, G.doorAnim - dt);
    } else if (state === 'title') {
      for (const ch of G.chars) ch.anim += dt;
      for (const p of G.pets) updatePet(p, dt);
      cam.x = (cam.minX + cam.maxX) / 2 + Math.sin(t * .1) * 20;
    }
  }
  updateFX(dt);
  render(t);
  requestAnimationFrame(loop);
}

function defineFallbackIcons() {
  if (!K.has('icon.phone')) K.define('icon.phone', { w: 64, h: 64, ax: 32, ay: 32, tags: ['icon'], draw(c) { K.orr(c, -14, -25, 28, 50, 7, '#fff7ea'); K.orr(c, -9.5, -19, 19, 34, 3, '#7ed0ea', 2); K.circ(c, 0, 20, 2.4, K.P.ink, 0); } });
}
function boot(data) {
  defineFallbackIcons();
  resize(); applyIcons();
  if (document.fonts && document.fonts.load) document.fonts.load('800 16px "Baloo 2"').catch(() => {});
  showTitle();
  if (data && data.G && data.G.v === 1) { G = data.G; state = 'play'; $('title').hidden = true; enterPlay(); if (G.phase === 'plan') openNightPlan(); else if (G.phase === 'scav' && G.scav) showScavHud(true); }
  requestAnimationFrame(loop);
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => (state === 'play' && G) ? { G } : {}); } catch (e) {}
const HOT = window.claude && window.claude.hot;
if (HOT && HOT.ready) HOT.ready(boot); else boot((HOT && HOT.data) || {});
