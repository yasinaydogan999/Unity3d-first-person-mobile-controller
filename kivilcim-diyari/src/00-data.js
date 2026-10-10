// ===== 00-data: constants, items, recipes, crops, quests =====
const K = window.MinikArt;
const TAU = Math.PI * 2;
const T = 48, CH = 16, WALL_H = 40;
const DAY_LEN = 300;          // real seconds per in-game day at 1x
const NIGHT_AT = .6;          // fraction of the day when night starts (t=0 is 06:00)
const SAVE_KEY = 'kivilcim-diyari-save-v1', OPT_KEY = 'kivilcim-diyari-opts-v1', BEST_KEY = 'kivilcim-diyari-best-v1';

// ground tiles
const TL = { GRASS: 0, FOREST: 1, MEADOW: 2, SAND: 3, WATER: 4, DEEP: 5, STONE: 6, SOIL: 7, WSOIL: 8, FLOOR: 9 };
const WATERY = t => t === TL.WATER || t === TL.DEEP;

const ITEMS = {
  wood: { n: 'Odun', ic: 'icon.wood' }, stone: { n: 'Taş', ic: 'icon.stone' }, fiber: { n: 'Lif', ic: 'icon.fiber' },
  scrap: { n: 'Hurda', ic: 'icon.scrap' }, cloth: { n: 'Kumaş', ic: 'icon.cloth' }, part: { n: 'Telsiz Parçası', ic: 'icon.part' },
  berry: { n: 'Meyve', ic: 'icon.berry', food: 10 }, mush: { n: 'Mantar', ic: 'icon.mush', food: 12 },
  fish: { n: 'Çiğ Balık', ic: 'icon.fish', food: 8 }, fishc: { n: 'Izgara Balık', ic: 'icon.fishcooked', food: 32, hp: 4 },
  wheat: { n: 'Buğday', ic: 'icon.wheat' }, carrot: { n: 'Havuç', ic: 'icon.carrot', food: 14 }, pumpkin: { n: 'Balkabağı', ic: 'icon.pumpkin', food: 18 },
  bread: { n: 'Ekmek', ic: 'icon.bread', food: 40 }, soup: { n: 'Havuç Çorbası', ic: 'icon.soup', food: 50, hp: 8 },
  mealm: { n: 'Mantar Çorbası', ic: 'icon.meal', food: 45, hp: 6 }, pie: { n: 'Balkabağı Turtası', ic: 'icon.pie', food: 70, hp: 15 },
  meds: { n: 'Bandaj', ic: 'icon.meds', heal: 35 }, fert: { n: 'Gübre', ic: 'icon.seeds', use: 'fert' },
  s_wheat: { n: 'Buğday Tohumu', ic: 'icon.seeds_wheat', seed: 'wheat' }, s_carrot: { n: 'Havuç Tohumu', ic: 'icon.seeds_carrot', seed: 'carrot' }, s_pumpkin: { n: 'Balkabağı Tohumu', ic: 'icon.seeds_pumpkin', seed: 'pumpkin' },
  // tools
  axe: { n: 'Balta', ic: 'icon.axe', tool: 1 }, pick: { n: 'Kazma', ic: 'icon.pickaxe', tool: 1 }, hoe: { n: 'Çapa', ic: 'icon.hoe', tool: 1 },
  can: { n: 'Sulama Kabı', ic: 'icon.can', tool: 1 }, spear: { n: 'Mızrak', ic: 'icon.spear', tool: 1 }, rod: { n: 'Olta', ic: 'icon.rod', tool: 1 },
  hammer: { n: 'Çekiç', ic: 'icon.hammer', tool: 1 }, lantern: { n: 'Fener', ic: 'icon.lantern', tool: 1 },
  // placeables: block (wall-like), floor, small (one tile objects), wide (two tiles)
  wall: { n: 'Ahşap Duvar', art: 'bd.wall', ao: { mat: 'wood' }, place: 'block', mat: 'wood' },
  wall_s: { n: 'Taş Duvar', art: 'bd.wall', ao: { mat: 'stone' }, place: 'block', mat: 'stone' },
  window: { n: 'Pencereli Duvar', art: 'bd.window', ao: { mat: 'wood' }, place: 'block', mat: 'wood', kind: 'window' },
  door: { n: 'Kapı', art: 'bd.door', ao: { mat: 'wood' }, place: 'block', mat: 'wood', kind: 'door' },
  floor: { n: 'Ahşap Zemin', ic: 'icon.build', place: 'floor' },
  fence: { n: 'Çit', art: 'bd.fence', place: 'fence' },
  hut: { n: 'Hazır Kulübe', ic: 'icon.home', place: 'hut' },
  fire: { n: 'Kamp Ateşi', art: 'od.fire', ao: { lit: false }, place: 'thing', thing: 'fire' },
  torch: { n: 'Meşale', art: 'od.torch', ao: { lit: false }, place: 'thing', thing: 'torch' },
  tent: { n: 'Çadır', art: 'od.tent', place: 'thing', thing: 'tent', fw: 2 },
  bench: { n: 'Atölye', art: 'st.workbench', place: 'thing', thing: 'furn', fw: 2 },
  stove: { n: 'Ocak', art: 'st.stove', place: 'thing', thing: 'furn' },
  bed: { n: 'Yatak', art: 'st.bed', place: 'thing', thing: 'furn', fw: 2 },
  chest: { n: 'Sandık', art: 'od.chest', place: 'thing', thing: 'furn' },
  heater: { n: 'Soba', art: 'st.heater', place: 'thing', thing: 'furn' },
  barrel: { n: 'Su Fıçısı', art: 'st.water', ao: { fill: .8 }, place: 'thing', thing: 'furn' },
  table: { n: 'Masa', art: 'st.table', place: 'thing', thing: 'furn', fw: 2 },
  chair: { n: 'Sandalye', art: 'st.chair', place: 'thing', thing: 'furn' },
  lamp: { n: 'Lamba', art: 'st.lamp', ao: { on: true }, place: 'thing', thing: 'furn' },
  rug: { n: 'Halı', art: 'st.rug', place: 'thing', thing: 'furn', fw: 2, flat: true },
  plant: { n: 'Saksı Çiçek', art: 'st.plant', place: 'thing', thing: 'furn' },
  shelf: { n: 'Kitaplık', art: 'st.bookshelf', place: 'thing', thing: 'furn' },
  armchair: { n: 'Koltuk', art: 'st.armchair', place: 'thing', thing: 'furn' },
  guitar: { n: 'Gitar', art: 'st.guitar', place: 'thing', thing: 'furn' },
};
const SOLID_THINGS = { fire: 1, tent: 1, furn: 1, torch: 1 };

// what interactive furniture does
const FURN_USE = { bench: 'craft', stove: 'cook', bed: 'sleep', tent: 'sleep', heater: 'warm', barrel: 'fill', armchair: 'rest', guitar: 'music', shelf: 'read', chest: 'rest' };

// cat: tools | build | home | farm | food
const RECIPES = [
  { id: 'axe', cat: 'tool', cost: { wood: 3, stone: 2 }, d: 'Ağaçları iki kat hızlı keser.' },
  { id: 'pick', cat: 'tool', cost: { wood: 3, stone: 3 }, d: 'Taşları iki kat hızlı kırar.' },
  { id: 'hoe', cat: 'tool', cost: { wood: 3, stone: 1 }, d: 'Çimeni tarlaya çevirir.' },
  { id: 'hammer', cat: 'tool', cost: { wood: 2, stone: 2 }, d: 'Elindeyken yapıları söküp geri alırsın.' },
  { id: 'rod', cat: 'tool', cost: { wood: 2, fiber: 3 }, d: 'Suya dönüp balık tut.' },
  { id: 'spear', cat: 'tool', cost: { wood: 3, stone: 2, fiber: 1 }, need: 'bench', d: 'Gölgeciklere iki kat etkili.' },
  { id: 'can', cat: 'tool', cost: { scrap: 2, wood: 1 }, need: 'bench', d: 'Ekinleri sula: iki kat hızlı büyür.' },
  { id: 'lantern', cat: 'tool', cost: { scrap: 2, fiber: 1 }, need: 'bench', d: 'Gece etrafın aydınlık olur.' },
  { id: 'wall', n: 2, cat: 'build', cost: { wood: 2 }, d: 'Duvar bloğu. Gölgecikler geçemez.' },
  { id: 'door', cat: 'build', cost: { wood: 3 }, d: 'Sen geçersin, gölgecikler geçemez.' },
  { id: 'window', cat: 'build', cost: { wood: 2, scrap: 1 }, d: 'Pencereli duvar bloğu.' },
  { id: 'floor', n: 4, cat: 'build', cost: { wood: 2 }, d: 'Ahşap zemin. Üstünde ev sıcak tutar.' },
  { id: 'wall_s', n: 2, cat: 'build', cost: { stone: 3 }, need: 'bench', d: 'Sağlam taş duvar.' },
  { id: 'fence', n: 2, cat: 'build', cost: { wood: 2 }, d: 'Tarlanın etrafına çit.' },
  { id: 'hut', cat: 'build', cost: { wood: 24, stone: 6, fiber: 4 }, need: 'bench', d: 'Tek dokunuşla duvarlı, kapılı, pencereli, zeminli kulübe (7×5).' },
  { id: 'torch', n: 2, cat: 'build', cost: { wood: 1, fiber: 1 }, d: 'Gece ışık verir, gölgecikleri kaçırır.' },
  { id: 'fire', cat: 'build', cost: { wood: 4, stone: 2 }, d: 'Isıtır, pişirir. Odun atarak beslenir.' },
  { id: 'tent', cat: 'build', cost: { wood: 4, fiber: 6 }, d: 'Gece uyuyup sabahı getir.' },
  { id: 'bench', cat: 'home', cost: { wood: 6, stone: 2 }, d: 'Yeni tarifleri açar.' },
  { id: 'stove', cat: 'home', cost: { stone: 6, scrap: 2 }, need: 'bench', d: 'Ekmek, çorba ve turta pişir.' },
  { id: 'bed', cat: 'home', cost: { wood: 6, fiber: 6 }, d: 'Uyu, sabahı getir, burada uyan.' },
  { id: 'heater', cat: 'home', cost: { stone: 6, scrap: 3 }, need: 'bench', d: 'Evi gece boyu ısıtır.' },
  { id: 'barrel', cat: 'home', cost: { wood: 4, scrap: 1 }, d: 'Sulama kabını doldurur.' },
  { id: 'chest', cat: 'home', cost: { wood: 6 }, d: 'Güzel bir sandık (dekor).' },
  { id: 'table', cat: 'home', cost: { wood: 4 }, d: 'Masa (dekor).' },
  { id: 'chair', cat: 'home', cost: { wood: 2 }, d: 'Sandalye (dekor).' },
  { id: 'lamp', cat: 'home', cost: { wood: 2, scrap: 1, fiber: 1 }, need: 'bench', d: 'Evin içini aydınlatır.' },
  { id: 'rug', cat: 'home', cost: { fiber: 6 }, d: 'Yumuşak halı (dekor).' },
  { id: 'plant', cat: 'home', cost: { stone: 2, berry: 1 }, d: 'Saksıda çiçek (dekor).' },
  { id: 'shelf', cat: 'home', cost: { wood: 6 }, need: 'bench', d: 'Kitaplık: oku, moralin düzelsin.' },
  { id: 'armchair', cat: 'home', cost: { wood: 3, cloth: 2 }, need: 'bench', d: 'Otur, dinlen: can yenilenir.' },
  { id: 'guitar', cat: 'home', cost: { wood: 3, fiber: 2, scrap: 1 }, need: 'bench', d: 'Çal: Pamuk dans eder.' },
  { id: 's_wheat', n: 2, cat: 'farm', cost: { wheat: 1 }, d: 'Buğdaydan tohum ayır.' },
  { id: 's_carrot', n: 2, cat: 'farm', cost: { carrot: 1 }, d: 'Havuçtan tohum ayır.' },
  { id: 's_pumpkin', n: 3, cat: 'farm', cost: { pumpkin: 1 }, d: 'Balkabağından tohum ayır.' },
  { id: 'fert', n: 2, cat: 'farm', cost: { mush: 2, fiber: 1 }, d: 'Bir ekine at: hemen bir evre büyür.' },
  { id: 'fishc', cat: 'food', cost: { fish: 1 }, need: 'heat', d: 'Ateş ya da ocak yanında ızgara.' },
  { id: 'bread', cat: 'food', cost: { wheat: 3 }, need: 'stove', d: 'Doyurucu ekmek.' },
  { id: 'soup', cat: 'food', cost: { carrot: 2, mush: 1 }, need: 'stove', d: 'Sıcak havuç çorbası, can verir.' },
  { id: 'mealm', cat: 'food', cost: { mush: 3 }, need: 'heat', d: 'Mantar çorbası.' },
  { id: 'pie', cat: 'food', cost: { pumpkin: 1, wheat: 2, berry: 2 }, need: 'stove', d: 'Bayram gibi turta!' },
  { id: 'meds', cat: 'food', cost: { fiber: 3, berry: 1 }, d: 'Bandaj: canı yeniler.' },
];
const CATS = [['tool', 'Aletler', 'icon.axe'], ['build', 'Yapı', 'icon.build'], ['home', 'Ev', 'icon.home'], ['farm', 'Tarım', 'icon.seeds_wheat'], ['food', 'Yemek', 'icon.meal'], ['bag', 'Çanta', 'icon.bag']];
const NEED_NAME = { bench: 'Atölye yakınında', stove: 'Ocak yakınında', heat: 'Ateş ya da ocak yakınında' };

// crops: growth hours (in-game), harvest yields
const CROPS = {
  wheat: { art: 'cr.wheat', hours: 20, yield: ['wheat', 2, 3], seed: ['s_wheat', 1, 2] },
  carrot: { art: 'cr.carrot', hours: 26, yield: ['carrot', 2, 3], seed: ['s_carrot', 1, 2] },
  pumpkin: { art: 'cr.pumpkin', hours: 36, yield: ['pumpkin', 1, 2], seed: ['s_pumpkin', 1, 3] },
};

const SURV = {
  ece: { n: 'Ece', art: 'char.ece', perk: 'Aşçı: yemekler %50 daha doyurur.' },
  mert: { n: 'Mert', art: 'char.mert', perk: 'Usta: ağaç ve taşı iki kat hızlı toplar.' },
  lale: { n: 'Lale', art: 'char.lale', perk: 'Koşucu: %25 daha hızlı koşar.' },
  deniz: { n: 'Deniz', art: 'char.deniz', perk: 'Çiftçi: ekinleri %50 hızlı büyür.' },
};

// Quest chain: check(G) -> [have, need]
const QUESTS = [
  { id: 'wood', t: 'Ağaç kes: 6 odun topla', r: { stone: 2, fiber: 2 }, c: g => [g.stat.got.wood || 0, 6] },
  { id: 'bench', t: 'Çantadan bir Atölye yap ve yerleştir', r: { berry: 3 }, c: g => [g.stat.placed.bench ? 1 : 0, 1] },
  { id: 'hoe', t: 'Çapa yap', r: { s_wheat: 2 }, c: g => [g.inv.hoe ? 1 : 0, 1] },
  { id: 'till', t: 'Çapayla 4 kare tarla aç', r: { s_carrot: 2 }, c: g => [g.stat.tilled || 0, 4] },
  { id: 'plant', t: 'Tarlaya 3 tohum ek', r: { fiber: 3 }, c: g => [g.stat.planted || 0, 3] },
  { id: 'fire', t: 'Kamp ateşi yak', r: { wood: 3 }, c: g => [g.stat.placed.fire ? 1 : 0, 1] },
  { id: 'night', t: 'İlk geceyi atlat', r: { meds: 1 }, c: g => [g.day > 1 ? 1 : 0, 1] },
  { id: 'walls', t: 'Ev kur: 10 duvar ya da bir Hazır Kulübe', r: { scrap: 2 }, c: g => [Math.min(10, (g.stat.placed.block || 0) + (g.stat.placed.hut ? 10 : 0)), 10] },
  { id: 'bed', t: 'Yatak yap ve içinde uyu', r: { cloth: 2 }, c: g => [g.stat.slept ? 1 : 0, 1] },
  { id: 'harvest', t: 'İlk hasadını topla', r: { s_pumpkin: 2 }, c: g => [g.stat.harvested || 0, 1] },
  { id: 'stove', t: 'Ocak kur ve yemek pişir', r: { scrap: 2 }, c: g => [g.stat.cooked || 0, 1] },
  { id: 'decor', t: 'Evine 5 eşya yerleştir', r: { cloth: 2 }, c: g => [Math.min(5, g.stat.placed.furn || 0), 5] },
  { id: 'explore', t: 'Kamptan 120 m uzağa keşfe çık', r: { scrap: 2 }, c: g => [Math.min(120, Math.floor(g.stat.far || 0)), 120] },
  { id: 'ruin', t: 'Bir harabede sandık aç', r: { s_pumpkin: 2 }, c: g => [g.stat.crates || 0, 1] },
  { id: 'shadows', t: '3 gölgeciği kovala', r: { meds: 2 }, c: g => [g.stat.kills || 0, 3] },
  { id: 'radio', t: '5 telsiz parçası bul ve kamptaki telsizi onar', r: { pie: 2 }, c: g => [Math.min(5, (g.radioParts || 0)), 5] },
];

const TRADES = [
  { give: { wood: 6 }, get: { scrap: 2 } }, { give: { stone: 6 }, get: { cloth: 2 } }, { give: { berry: 6 }, get: { s_pumpkin: 2 } },
  { give: { fiber: 6 }, get: { s_carrot: 3 } }, { give: { bread: 1 }, get: { part: 1 } }, { give: { fish: 3 }, get: { meds: 2 } },
  { give: { wheat: 5 }, get: { scrap: 3 } }, { give: { pumpkin: 1 }, get: { part: 1 } }, { give: { scrap: 3 }, get: { lantern: 1 } },
];
