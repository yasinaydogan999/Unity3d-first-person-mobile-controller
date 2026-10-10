# MinikArt style and asset contract

MinikArt is an original vector art kit drawn entirely in code on HTML canvas. It is made for
**Minik Sığınak** (a cosy side-view shelter survival game, This War of Mine's cross-section
idea but cute, pastel and warm) and is meant to be reused by other games. No images, no
fonts, no third-party art, no references to existing franchises.

## Look

- Cute, warm, hopeful. A snowy winter town after a big storm, never grim. Pastel colours,
  warm lamplight, soft rounded shapes, big friendly faces.
- **Outline**: every solid shape gets an ink outline `P.ink` (`#3d2b45`), width `LW` (2.5),
  round joins and caps. Small inner details (planks, seams, cracks) use thinner lines
  (1.2–1.8) in `P.inkSoft` or a darker shade of the fill.
- **Shading**: flat base fill, plus ONE lighter highlight shape toward the top-left and,
  optionally, a darker band toward the bottom/right. No gradients except light glows.
- **Corners**: rounded everywhere (radius 3–10). No sharp, aggressive silhouettes.
- **Faces**: anything with a face uses `MinikArt.face()` so every character matches.
- **Palette**: use `MinikArt.P` tokens (or `MinikArt.shade(c, k)` / `mix`) instead of random
  hex values, so the whole kit stays in one family. Wood, metal, stone and fabric each have
  tokens. Accent colours: coral, sun, leaf, mint/teal, lilac/plum, pink/rose, sky.

## Scale (1 art unit = 1 px at scale 1)

| Thing | Size |
| --- | --- |
| Room interior, floor to ceiling | 130 |
| Floor slab thickness | 16 |
| Standing character (to top of head, hats extra) | 60–66 |
| Door | 52 × 96 |
| Bed | 104 × 48 |
| Workbench | 100 × 70 |
| Icon box | 64 × 64 |

## Anchors

- Props and characters: anchor = **bottom-centre on the floor**, drawn at negative y.
  Register with `w`, `h` (bounding box) and the default `ax = w/2`, `ay = h`.
- Wall-mounted things (window, picture, clock, toolwall, chalkboard): anchor = bottom-centre
  of the object; the game places them on the wall at a chosen height.
- Ceiling things (`st.bulb`): anchor = top-centre at the ceiling (`ay: 0`).
- Icons and fx: anchor = centre (`ax: 32, ay: 32` for 64 × 64).
- Parametric backgrounds tagged `sized`: anchor = **top-left**, size from `o.w`, `o.h`
  (register `ax: 0, ay: 0`).

## Module shape

Each file adds assets to the global registry and nothing else:

```js
(function (K) {
  'use strict';
  const { P, OL, LW, TAU, orr, circ, ell, blob, line, stick, poly, smoothPath, star, flame, shadow, glow, face, shade, mix, rgba, rng, hash2 } = K;
  K.define('st.bed', {
    w: 104, h: 48, tags: ['prop', 'station', 'home'],
    states: { used: [false, true] },      // values the gallery/export will render
    defaults: { used: false },
    desc: 'Cosy bed. used=true shows a rumpled blanket.',
    draw(ctx, o) { /* draw around (0,0), standing things at negative y; o.t = seconds */ },
  });
})(window.MinikArt);
```

Rules:

- `draw` must be **deterministic**: no `Math.random()`. Use `o.seed` with `rng(seed)` /
  `hash2` for variation, and `o.t` (seconds) for animation (idle bob, flicker, snow, steam).
- `draw` must be **cheap**: it may run every frame for dozens of objects. No per-frame
  `createPattern`/offscreen canvases, keep loops small, gradients only for glows.
- Never change `globalCompositeOperation` without restoring it. `MinikArt.draw` already
  wraps every call in `save()/restore()`, applies scale/flip and sets round joins.
- Draw facing **right**. The engine flips with `flip: true`.
- Do not draw darkness or night tint over props; the game applies lighting. Glowing things
  (lamps, fire, lit windows) should look bright on their own.
- Every value listed in `states` must render correctly; the gallery renders every
  combination (up to 8 per asset).

## Asset list the game depends on

Names, sizes and states are a contract: the game calls exactly these. Extra assets are welcome.

### characters.js
- `K.character(ctx, spec, o)`: parametric chibi survivor drawn at the anchor.
  `spec = {skin, hair, hairStyle: 'bob'|'bun'|'spiky'|'long'|'curly'|'short', hat: null|'beanie'|'cap'|'earmuffs'|'bandana', top, topStyle: 'hoodie'|'coat'|'sweater'|'overalls', bottom, shoes, scarf: null|colour, glasses: bool, apron: null|colour, beard: bool, age: 'kid'|'adult'|'old'}`.
  `o = {pose, t, mood, carry}`. Poses: `idle, walk, work, search, climb, sleep, sit, eat, carry, happy, sad, wave`.
  `walk` cycles legs/arms from `o.t`; `work` swings a hammer arm; `search` reaches forward/down;
  `climb` is seen from behind-ish on a ladder; `sleep` lies flat (anchor = centre of the
  bottom of the lying body, width about 70) with closed eyes; `carry` holds a box overhead.
- Presets registered as assets, `w: 50, h: 80` (sleep pose may extend wider):
  `char.ece` (cook: warm brown skin, dark curly hair in a bun, mustard sweater + coral apron),
  `char.mert` (handyman: light skin, short red hair, beard, teal overalls, beanie),
  `char.lale` (runner: light-tan skin, long pink-dyed hair, lilac hoodie, earmuffs),
  `char.deniz` (joins later: kid, dark skin, cap, sky coat, yellow scarf),
  `char.nermin` (elderly neighbour NPC: grey bun, glasses, plum coat).
  States: `pose` (all poses), `mood` (`happy`, `sad`, `sleep`).
- Critters, bottom-centre anchor: `critter.cat` (Pamuk: cream with ginger patches; poses
  `idle, walk, sit, sleep`), `critter.dog` (puppy; same poses), `critter.raccoon` (cute
  mischief-maker with a mask and striped tail; poses `idle, walk, sneak, run, steal` where
  steal carries a little sack), `npc.trader` (Bay Bıyık: a travelling cat merchant standing
  upright with a hat, scarf and big backpack; poses `idle, wave`).

### furniture.js (home)
`st.workbench {level:1|2, active}` 100×70 · `st.bed {used}` 104×48 · `st.floorbed {used}` 80×22 ·
`st.stove {lit, cooking}` 62×74 · `st.heater {lit}` 56×110 (little wood stove + pipe) ·
`st.water {fill:0..1}` 50×90 (rain/snow-melt barrel with funnel) · `st.garden {growth:0..1, planted}` 96×46 ·
`st.radio {on}` 56×62 (radio on a small table) · `st.armchair` 66×60 · `st.guitar` 30×64 ·
`st.bookshelf {full:0..1}` 70×100 · `st.table` 80×44 · `st.chair` 30×52 · `st.lamp {on}` 30×96 ·
`st.bulb {on}` 20×40 (ceiling anchor) · `st.rug {color}` 110×10 · `st.plant` 30×44 ·
`st.toolwall` 70×50 (wall) · `st.picture {kind:0..3}` 36×30 (wall) · `st.clock` 28×28 (wall) ·
`st.window {boarded:0|1|2, night, snow}` 60×58 (wall) · `st.door {open:0..1, level:0|1|2}` 52×96 ·
`st.ladder {h}` 36×(o.h, default 146).

### props.js (loot, debris, outdoor, places)
`st.fridge {open}` 50×96 · `st.cabinet {open, locked}` 60×80 · `st.crate {open}` 44×36 ·
`st.lootpile {kind:'wood'|'parts'|'cloth'|'food'|'mixed', amount:0..1}` 80×40 ·
`st.rubble {amount:0..1, seed}` 200×100 (bricks, planks, dust blocking a room; shrinks with amount) ·
`st.shelf {full:0..1}` 90×100 (shop shelf) · `st.counter` 100×50 · `st.chalkboard` 90×60 (wall) ·
`st.snowman` 50×80 · `st.sled` 60×24 · `st.mailbox` 26×56 ·
Map illustrations (bottom-centre, about 90×80): `map.home`, `map.market`, `map.school`,
`map.hardware`, `map.pharmacy`, `map.park`, `map.cafe`.

### environment.js (tag `sized`, top-left anchor, size from o.w/o.h)
`env.sky {w,h,time:0..1,snowing,t}` (time 0 = 06:00 dawn, .5 = 18:00 dusk, .7+ night; pastel
gradient, sun/moon, stars, a distant cute snowy town silhouette with lit windows at night) ·
`env.ground {w,h}` (snowy ground, top edge = surface) · `room.wall {w,h,style:'dots'|'stripes'|'brick'|'plank'|'tiles'|'plain', color, dirt:0..1}` ·
`room.floor {w,h=16,style:'wood'|'tile'|'concrete'}` (slab cross-section, top = walking surface) ·
`room.hole {w,h,seed}` (broken wall showing outside) · `room.fog {w,h,t}` (soft dusty cloud
cover for unexplored rooms with a small "?") · `bld.wallside {w=18,h}` (outer wall cross-section) ·
`bld.roof {w,h=84,snow,chimney,smoke,t}` (bottom edge rests on the top ceiling) ·
`bld.foundation {w,h}` · `deco.icicles {w}` · `deco.stringlights {w,on,t}` · `deco.snowcap {w}` ·
`deco.cobweb` · `deco.crack {seed}`.

### icons.js (64×64, centre anchor, tag `icon`)
Resources: `icon.wood, icon.parts, icon.cloth, icon.water, icon.food, icon.meal, icon.meds, icon.cocoa, icon.seeds`.
Tools: `icon.shovel, icon.crowbar, icon.backpack, icon.hammer`.
Stats: `icon.hunger, icon.energy, icon.mood, icon.health, icon.cold, icon.warm, icon.sick`.
Stations (craft menu): `icon.bed, icon.stove, icon.heater, icon.watercollector, icon.garden, icon.armchair, icon.radio, icon.guitar, icon.door, icon.workbench, icon.bookshelf`.
UI: `icon.sun, icon.moon, icon.snow, icon.clock, icon.map, icon.home, icon.lock, icon.check, icon.cross, icon.star, icon.pause, icon.play, icon.fast, icon.guard, icon.sleep, icon.search, icon.hand, icon.book, icon.music, icon.gift, icon.paw, icon.raccoon, icon.trade, icon.settings, icon.sound, icon.mute, icon.walk, icon.exit`.
Small fx (24×24, centre anchor, `o.t` 0..1 = life): `fx.zzz, fx.heart, fx.sparkle, fx.note, fx.steam, fx.smoke, fx.dust`.
