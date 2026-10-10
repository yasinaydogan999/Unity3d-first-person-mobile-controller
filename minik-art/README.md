# MinikArt

An original, reusable art kit for cute 2.5D canvas games, drawn entirely in code.
It has no image files, no third-party art and nothing copied from existing games or brands.
The kit is used by **Kıvılcım Diyarı** (`../kivilcim-diyari`) and **Minik Sığınak** (`../minik-siginak`),
and is meant to be dropped into any other game.

## Use it

Load the scripts in this order (each one adds to `window.MinikArt`):

```html
<script src="minik-art/core.js"></script>
<script src="minik-art/characters.js"></script>
<script src="minik-art/furniture.js"></script>
<script src="minik-art/nature.js"></script>
<script src="minik-art/outdoor.js"></script>
<script src="minik-art/icons.js"></script>
<script src="minik-art/sketch.js"></script>   <!-- optional pencil look -->
```

```js
const K = window.MinikArt;
K.draw(ctx, 'nt.tree', x, y, { kind: 1, s: 1.05 });                 // clean vector, anchored bottom-centre
K.draw(ctx, 'char.lale', x, y, { pose: 'walk', t: seconds, flip: true });
const c = K.toCanvas('st.bed', { used: true }, 2);                    // HTMLCanvasElement at 2×
K.drawSprite(ctx, 'bd.wall', x, y, { mat: 'stone' }, pixelScale);     // cached, pencil-sketched sprite
K.list('icon.');                                                      // names of every icon
```

- Coordinates are art units (1 unit = 1 px at scale 1). Most assets anchor at the **bottom centre**
  (their feet / base). Icons are 64×64 and anchor at the centre.
- `opts.t` (seconds) drives animation, `opts.scale` and `opts.flip` transform the asset. Other
  options are listed in each asset's `states` / `defaults` (see `gallery.html`).
- Palette tokens are in `K.P` (ink `#3d2b45`, wood, stone, leaf, coral, sun...). Drawing helpers
  (`orr`, `circ`, `ell`, `blob`, `poly`, `star`, `face`, `shade`, `mix`, `rng`...) are exported too,
  so new assets match the rest.

## What is inside

| Module | Assets |
| --- | --- |
| `characters.js` | `char.ece`, `char.mert`, `char.lale`, `char.deniz`, `char.nermin` (poses: idle, walk, work, search, climb, sleep, sit, eat, carry, happy, sad, wave), `critter.cat`, `critter.dog`, `critter.raccoon`, `npc.trader` |
| `furniture.js` | `st.workbench`, `st.bed`, `st.floorbed`, `st.stove`, `st.heater`, `st.water`, `st.garden`, `st.radio`, `st.armchair`, `st.chair`, `st.table`, `st.guitar`, `st.bookshelf`, `st.lamp`, `st.bulb`, `st.rug`, `st.plant`, `st.toolwall`, `st.picture`, `st.clock`, `st.window`, `st.door`, `st.ladder` |
| `nature.js` | `nt.tree` (4 kinds), `nt.stump`, `nt.rock`, `nt.bush` (with berries), `nt.mush`, `nt.grass`, `nt.reeds`, `nt.log`, `nt.flowers` |
| `outdoor.js` | 2.5D building blocks `bd.wall` (wood, stone, brick, ruin), `bd.window`, `bd.door`, `bd.fence` with neighbour joins; crops `cr.wheat`, `cr.carrot`, `cr.pumpkin` (4 growth stages); `od.fire`, `od.torch`, `od.tent`, `od.crate`, `od.chest`, `od.cart`, `od.radio`, `od.sprout`, `od.drop`, `mob.shadow`; live flames via `K.campFlame` |
| `icons.js` | 60+ UI icons (`icon.wood`, `icon.axe`, `icon.seeds_wheat`, `icon.home`, ...) and small effects (`fx.heart`, `fx.note`, `fx.sparkle`, `fx.zzz`, `fx.dust`) |
| `sketch.js` | pencil look: `K.sketchify(canvas)`, cached `K.sprite` / `K.drawSprite`, paper and cross-hatch patterns (`K.paperPattern`, `K.hatchPattern`) |

## Look at everything

Open `gallery.html` in a browser (add `?sketch=1` for the pencil style), or render it to a PNG:

```
node tools/render-gallery.mjs "" gallery.png
node tools/render-gallery.mjs "" gallery-sketch.png --sketch
```

`STYLE.md` describes the visual rules (outlines, shading, scale, anchors, module shape) for anyone
adding new assets.

## Licence

Made for this repository. Free to reuse in your own games.
