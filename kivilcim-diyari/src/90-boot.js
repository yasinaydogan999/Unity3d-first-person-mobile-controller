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
  tap() { tone(660, .05, 'sine', .04, 880); }, deny() { tone(220, .12, 'square', .03, 170); }, swing() { noise(.07, .15, 1500); },
  chop() { noise(.08, .45, 700); tone(170, .07, 'triangle', .07, 110); }, rock() { noise(.06, .35, 2200); tone(330, .05, 'square', .03, 210); },
  fall() { tone(300, .3, 'triangle', .08, 90); }, pick() { tone(700, .07, 'sine', .07, 1000); }, knock() { noise(.06, .35, 500); tone(140, .07, 'triangle', .07, 100); },
  loot() { [523, 659, 784].forEach((f, i) => tone(f, .12, 'sine', .07, 0, i * .06)); }, fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .2, 'triangle', .07, 0, i * .09)); },
  build() { [392, 523].forEach((f, i) => tone(f, .1, 'triangle', .06, 0, i * .06)); noise(.05, .2, 900); }, dig() { noise(.09, .35, 600); tone(150, .07, 'triangle', .05, 100); },
  water() { tone(900, .08, 'sine', .05, 500); tone(700, .08, 'sine', .04, 400, .09); }, splash() { noise(.18, .25, 1200); tone(500, .1, 'sine', .04, 300); },
  hit() { tone(220, .1, 'square', .05, 140); noise(.06, .3, 900); }, hurt() { tone(210, .25, 'sawtooth', .06, 90); }, poof() { tone(520, .18, 'sine', .05, 200); },
  eat() { tone(440, .06, 'sine', .06, 520); tone(520, .06, 'sine', .06, 620, .09); }, fire() { noise(.25, .25, 420); }, happy() { [587, 784].forEach((f, i) => tone(f, .14, 'sine', .06, 0, i * .08)); },
  music() { [392, 494, 587, 494, 659, 784].forEach((f, i) => tone(f, .18, 'triangle', .05, 0, i * .14)); }, purr() { tone(90, .4, 'sawtooth', .02, 80); },
  night() { tone(220, .9, 'sine', .06, 147); tone(330, .9, 'sine', .04, 220, .15); }, morning() { [392, 494, 587, 784].forEach((f, i) => tone(f, .25, 'sine', .05, 0, i * .11)); },
};
function sfx(n) { const f = SFX[n]; if (f) try { f(); } catch (e) {} }
function vibrate(p) { try { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

// ----- save / load -----
function save() { if (!G || state !== 'play') return; try { const s = Object.assign({}, G, { mobs: [], sleep: null }); localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }
function readSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1 && s.p && s.mods) return s; } catch (e) {} return null; }

// ----- flow -----
function showHud(on) { $('hud').hidden = !on; }
function demoWorld() {
  chunks.clear();
  newGame('lale'); G.seed = 20261010; G.t = .56;
  const p = G.p; p.x = T * .5; p.y = T * 4.9; p.flip = true;
  // a small cosy demo homestead: hut, a field below it, fire and cat by the door
  clearArea(-8, 4, 2, 7);
  for (let j = 5; j <= 6; j++) for (let i = -6; i <= -3; i++) setTile(i, j, TL.SOIL);
  const crops = ['wheat', 'carrot', 'pumpkin', 'carrot'];
  for (let i = -6; i <= -3; i++) { addObj({ k: 'crop', kind: crops[i + 6], tx: i, ty: 5, g: .45 + (i + 6) * .17, lt: G.wt }); addObj({ k: 'crop', kind: 'wheat', tx: i, ty: 6, g: 1, lt: G.wt }); }
  buildHutAt(-2, 3);
  addObj({ k: 'thing', thing: 'fire', item: 'fire', tx: 1, ty: 5, fw: 1, until: 999 });
  addObj({ k: 'thing', thing: 'torch', item: 'torch', tx: -7, ty: 4, fw: 1, until: 999 });
  G.cat.x = T * 2.1; G.cat.y = T * 5.9; G.cat.pose = 'sit';
  cam.x = T * 2; cam.y = T * 3.2;
}
function clearArea(x0, y0, x1, y1) { for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { const o = objAtTile(i, j); if (o) removeObj(o); if (WATERY(tileAt(i, j))) setTile(i, j, TL.GRASS); } }
function buildHutAt(dx, dy) { clearArea(dx - HUT_HW, dy - HUT_H + 1, dx + HUT_HW, dy); G.inv.hut = 1; QUIET = true; buildHut(dx, dy); QUIET = false; G.inv.hut = 0; }
function showTitle() {
  state = 'title'; paused = false; closeModal(); closeSheet(); showHud(false);
  demoWorld();
  $('title').hidden = false;
  const s = readSave();
  $('contBtn').hidden = !s;
  if (s) $('contInfo').textContent = `${s.day}. gün · ${SURV[s.char] ? SURV[s.char].n : ''}`;
}
function enterPlay() {
  state = 'play'; paused = false; $('title').hidden = true; showHud(true);
  hudDirty(); for (const k in sig) delete sig[k];
  cam.x = G.p.x; cam.y = G.p.y - 30;
  goFullscreen();
}
function startNew() {
  initAudio();
  chooseCharacter(ch => {
    chunks.clear(); newGame(ch); enterPlay(); save();
    banner('1. Gün', `${SURV[ch].n} sonsuz diyarda uyandı. Pamuk da yanında!`);
    setTimeout(() => toast('İpucu: ağaçlara yaklaş ve turuncu tuşa bas', 'icon.hand'), 1600);
  });
}
function continueGame() {
  const s = readSave(); if (!s) { startNew(); return; }
  initAudio(); chunks.clear(); G = s; G.mobs = []; G.sleep = null; enterPlay();
  banner(`${G.day}. Gün`, 'Kaldığın yerden devam.');
}
function goFullscreen() {
  if (/KivilcimApp/.test(navigator.userAgent)) return;
  try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement && /Android/i.test(navigator.userAgent)) el.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {}); } catch (e) {}
}
window.minikBack = function () {
  if (sheetTab) { closeSheet(); return true; }
  if (!$('modal').hidden) { closeModal(); paused = false; return true; }
  if (state === 'play') { openMenu(); return true; }
  return false;
};
window.minikPause = function () { if (G && state === 'play') { save(); if ($('modal').hidden) openMenu(); } };
$('newBtn').addEventListener('click', () => { sfx('tap'); startNew(); });
$('contBtn').addEventListener('click', () => { sfx('tap'); continueGame(); });
$('portraitAnyway').addEventListener('click', () => document.body.classList.add('allow-portrait'));
addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden) window.minikPause(); });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

// ----- loop -----
let lastT = 0, hudT = 0, perfN = 0, perfSum = 0;
/** First seconds of play: if frames are slow and the player never chose, switch to the light renderer. */
function autoQuality(dt) {
  if (OPTS.lite !== undefined || perfN >= 240) return;
  perfN++; if (perfN > 60) perfSum += dt;
  if (perfN === 240 && perfSum / 180 > 1 / 40) { OPTS.lite = true; saveOpts(); K.clearSprites(); resize(); toast('Oyun akıcı olsun diye grafik hafifletildi (Menü › Grafik)', 'icon.settings'); }
}
function loop(ts) {
  const t = ts / 1000, dt = Math.min(.05, Math.max(0, t - lastT)); lastT = t;
  if (G) {
    if (state === 'play') {
      const blocked = paused || !$('modal').hidden || !!sheetTab;
      if (!blocked) {
        const inp = readInput(), cd0 = G.p.cd;
        simulate(dt, inp);
        if (inp.act && G.p.cd > cd0) input.queued = false;
        // a quick tap releases before the frame that acts on it: keep the tapped tile until then
        if (input.dropAim && !input.queued) { aim = null; input.dropAim = false; }
      }
      const lk = 1 - Math.pow(.003, dt);
      cam.x += (G.p.x - cam.x) * lk; cam.y += (G.p.y - 30 - cam.y) * lk;
      hudT += dt; if (hudT > .1) { hudT = 0; updateHUD(); }
      if (!blocked) autoQuality(dt);
      updateMini(dt);
    } else if (state === 'title') {
      G.cat.t += dt; streamChunks(cam.x, cam.y); collectLights();
      cam.x = T * 2 + Math.sin(t * .1) * 30;
    }
    for (const c of chunks.values()) for (const o of c.objs) if (o.shake > 0) o.shake -= dt;
    cam.shake = Math.max(0, cam.shake - dt * 2.5);
  }
  updateFX(dt);
  render(t);
  requestAnimationFrame(loop);
}
function boot(data) {
  resize(); applyIcons();
  if (document.fonts && document.fonts.load) document.fonts.load('800 16px "Baloo 2"').catch(() => {});
  showTitle();
  if (data && data.G && data.G.v === 1) { chunks.clear(); G = data.G; G.mobs = []; enterPlay(); }
  requestAnimationFrame(loop);
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => (state === 'play' && G) ? { G: Object.assign({}, G, { mobs: [], sleep: null }) } : {}); } catch (e) {}
const HOT = window.claude && window.claude.hot;
if (HOT && HOT.ready) HOT.ready(boot); else boot((HOT && HOT.data) || {});
