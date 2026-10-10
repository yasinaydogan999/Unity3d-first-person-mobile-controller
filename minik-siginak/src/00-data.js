// ===== 00-data: constants, recipes, places, story =====
const K = window.MinikArt;
const TAU = Math.PI * 2;
const ROOM_W = 220, ROOM_H = 130, SLAB = 16, WALLW = 18;
const HOUR_SEC = 7;            // real seconds per in-game hour at 1x
const DAY_START = 6, NIGHT_AT = 20;
const WIN_DAY = 12;            // survive until the morning of this day
const SCAV_SECONDS = 70;       // night scavenging length at 1x
const SAVE_KEY = 'minik-siginak-save-v1', BEST_KEY = 'minik-siginak-best-v1', OPT_KEY = 'minik-siginak-opts-v1';

const ITEMS = {
  wood: { name: 'Odun', icon: 'icon.wood' },
  parts: { name: 'Parça', icon: 'icon.parts' },
  cloth: { name: 'Kumaş', icon: 'icon.cloth' },
  water: { name: 'Su', icon: 'icon.water' },
  food: { name: 'Erzak', icon: 'icon.food' },
  meal: { name: 'Yemek', icon: 'icon.meal' },
  meds: { name: 'İlaç', icon: 'icon.meds' },
  cocoa: { name: 'Kakao', icon: 'icon.cocoa' },
  seeds: { name: 'Tohum', icon: 'icon.seeds' },
};
const ITEM_KEYS = Object.keys(ITEMS);

const SURVIVORS = {
  ece: { name: 'Ece', art: 'char.ece', trait: 'cook', traitName: 'Aşçı', traitDesc: 'İki kat hızlı pişirir, bazen bir porsiyon fazla çıkarır.' },
  mert: { name: 'Mert', art: 'char.mert', trait: 'handy', traitName: 'Usta', traitDesc: 'Üretimde ve moloz temizlerken %50 daha hızlı.' },
  lale: { name: 'Lale', art: 'char.lale', trait: 'runner', traitName: 'Koşucu', traitDesc: 'Keşifte hızlı koşar, çantasına 3 eşya fazla sığar.' },
  deniz: { name: 'Deniz', art: 'char.deniz', trait: 'cheer', traitName: 'Neşeli', traitDesc: 'Evdeyken herkesin morali daha yavaş düşer.' },
};

// Crafting at the workbench. lv = workbench level needed.
const RECIPES = [
  { id: 'floorbed', max: 4, name: 'Yer Yatağı', icon: 'icon.bed', station: 'st.floorbed', w: 80, cost: { cloth: 2 }, time: 3, lv: 1, desc: 'Basit bir döşek. Yerde uyumaktan iyidir.' },
  { id: 'stove', max: 1, name: 'Ocak', icon: 'icon.stove', station: 'st.stove', w: 62, cost: { parts: 3, wood: 2 }, time: 6, lv: 1, desc: 'Erzak ve sudan sıcak yemek pişir.' },
  { id: 'water', max: 2, name: 'Su Toplayıcı', icon: 'icon.watercollector', station: 'st.water', w: 50, cost: { parts: 2, wood: 3 }, time: 6, lv: 1, desc: 'Kar suyunu biriktirir, her gün dolar.' },
  { id: 'bed', max: 4, name: 'Yatak', icon: 'icon.bed', station: 'st.bed', w: 104, cost: { wood: 4, cloth: 2 }, time: 6, lv: 1, desc: 'Gerçek yatak: en dinlendirici uyku.' },
  { id: 'heater', max: 1, name: 'Soba', icon: 'icon.heater', station: 'st.heater', w: 56, cost: { parts: 4, wood: 3 }, time: 7, lv: 1, desc: 'Geceleri evi ısıtır, her gece 1 odun yakar.' },
  { id: 'shovel', name: 'Kürek', icon: 'icon.shovel', tool: 'shovel', cost: { wood: 2, parts: 1 }, time: 4, lv: 1, desc: 'Molozu iki kat hızlı temizle.' },
  { id: 'crowbar', name: 'Levye', icon: 'icon.crowbar', tool: 'crowbar', cost: { parts: 3 }, time: 4, lv: 1, desc: 'Kilitli dolapları açar.' },
  { id: 'door1', name: 'Kapıyı Güçlendir', icon: 'icon.door', door: 1, cost: { wood: 4 }, time: 5, lv: 1, desc: 'Rakunlar gece daha zor girer.' },
  { id: 'wb2', name: 'Atölye 2', icon: 'icon.workbench', upgrade: true, cost: { parts: 4, wood: 3 }, time: 7, lv: 1, desc: 'Yeni tarifler açılır.' },
  { id: 'garden', max: 2, name: 'Saksı Bahçe', icon: 'icon.garden', station: 'st.garden', w: 96, cost: { wood: 3, seeds: 1 }, time: 5, lv: 2, desc: 'Tohum ek, sula, iki günde sebze topla.' },
  { id: 'armchair', max: 2, name: 'Koltuk', icon: 'icon.armchair', station: 'st.armchair', w: 66, cost: { cloth: 3, wood: 2 }, time: 5, lv: 2, desc: 'Otur, dinlen: moral artar.' },
  { id: 'radio', max: 1, name: 'Radyo', icon: 'icon.radio', station: 'st.radio', w: 56, cost: { parts: 4, cloth: 1 }, time: 6, lv: 2, desc: 'Haberler ve müzik: moral ve ipuçları.' },
  { id: 'guitar', max: 1, name: 'Gitar', icon: 'icon.guitar', station: 'st.guitar', w: 30, cost: { wood: 3, parts: 1 }, time: 5, lv: 2, desc: 'Çal: evdeki herkesin morali yükselir.' },
  { id: 'backpack', name: 'Büyük Çanta', icon: 'icon.backpack', tool: 'backpack', cost: { cloth: 4 }, time: 5, lv: 2, desc: 'Keşifte çantaya 4 eşya fazla sığar.' },
  { id: 'door2', name: 'Çelik Kapı', icon: 'icon.door', door: 2, cost: { parts: 4, wood: 2 }, time: 6, lv: 2, desc: 'Rakunlar neredeyse hiç giremez.' },
];

// Home cross-section: 4 columns x 3 floors. Row 0 = attic, row 2 = ground floor.
// x values are relative to the room's left edge (room is ROOM_W wide).
const HOME = {
  cols: 4, rows: 3,
  ladders: [{ low: 2, high: 1, x: 36 }, { low: 1, high: 0, x: 3 * ROOM_W + 186 }],
  door: { row: 2, x: 104 },
  rooms: [
    [ // attic
      { style: 'plank', color: '#f3dcbc', rubble: 7, hole: true, items: [{ t: 'crate', x: 160, loot: { cloth: 3 } }], decor: [{ a: 'deco.cobweb', x: 2, y: 2 }] },
      { style: 'plank', color: '#efd6c5', rubble: 6, items: [{ t: 'station', kind: 'guitar', x: 176 }], decor: [{ a: 'st.window', x: 92, y: 74 }] },
      { style: 'stripes', color: '#ddd0f4', rubble: 8, items: [{ t: 'cabinet', x: 150, loot: { parts: 3, seeds: 2 } }], decor: [{ a: 'st.picture', x: 70, y: 62, kind: 2 }] },
      { style: 'plank', color: '#f6e3c3', rubble: 0, bulb: true, items: [{ t: 'lootpile', kind: 'parts', x: 100, loot: { parts: 2, wood: 2 } }], decor: [{ a: 'st.window', x: 120, y: 74 }] },
    ],
    [ // first floor
      { style: 'dots', color: '#ffdcd3', rubble: 0, bulb: true, items: [{ t: 'station', kind: 'bookshelf', x: 168 }], decor: [{ a: 'st.picture', x: 104, y: 66, kind: 0 }, { a: 'st.window', x: 112, y: 76, hideIf: 'never' }] },
      { style: 'stripes', color: '#cde8f5', rubble: 5, items: [{ t: 'station', kind: 'bed', x: 116 }], decor: [{ a: 'st.window', x: 60, y: 76 }, { a: 'st.clock', x: 180, y: 50 }] },
      { style: 'tiles', color: '#d7f0e2', rubble: 7, bulb: true, items: [{ t: 'cabinet', x: 150, loot: { meds: 1, cloth: 2 } }], decor: [{ a: 'st.picture', x: 70, y: 64, kind: 3 }] },
      { style: 'brick', color: '#f3cbab', rubble: 8, items: [{ t: 'crate', x: 96, loot: { wood: 3, cocoa: 1 } }], decor: [] },
    ],
    [ // ground floor
      { style: 'brick', color: '#f3cbab', rubble: 0, bulb: true, items: [], decor: [{ a: 'st.window', x: 176, y: 76 }] },
      { style: 'plank', color: '#f6e3c3', rubble: 0, bulb: true, items: [{ t: 'station', kind: 'workbench', x: 112 }], decor: [{ a: 'st.toolwall', x: 112, y: 70 }] },
      { style: 'tiles', color: '#fbe5ad', rubble: 5, items: [{ t: 'fridge', x: 176, loot: { food: 2, water: 1 } }], decor: [{ a: 'st.window', x: 80, y: 76 }] },
      { style: 'dots', color: '#d9f1d3', rubble: 7, bulb: true, items: [{ t: 'crate', x: 66, loot: { wood: 2, parts: 2 } }, { t: 'cabinet', x: 168, locked: true, loot: { meds: 1, cocoa: 1 } }], decor: [] },
    ],
  ],
};
const START_INV = { wood: 3, parts: 2, cloth: 2, water: 3, food: 4, meal: 2, meds: 0, cocoa: 0, seeds: 0 };

// Night scavenging destinations.
const LOCS = [
  { id: 'market', name: 'Market', art: 'map.market', danger: 1, walls: ['tiles', 'stripes'], wallColor: ['#fbe5ad', '#d7f0e2'], props: ['st.shelf', 'st.counter', 'st.fridge'], pool: { food: 12, water: 4, cocoa: 2, seeds: 2 }, blurb: 'Raflarda erzak, belki kakao.' },
  { id: 'school', name: 'Okul', art: 'map.school', danger: 1, walls: ['dots', 'plank'], wallColor: ['#cde8f5', '#f6e3c3'], props: ['st.chalkboard', 'st.bookshelf', 'st.table'], pool: { cloth: 6, wood: 6, parts: 2, food: 3 }, blurb: 'Kumaş ve odun dolu sınıflar.' },
  { id: 'hardware', name: 'Hırdavatçı', art: 'map.hardware', danger: 2, walls: ['brick', 'plank'], wallColor: ['#f3cbab', '#efd6c5'], props: ['st.shelf', 'st.toolwall', 'st.crate'], pool: { parts: 10, wood: 4 }, blurb: 'Bol parça, ama rakun çetesinin yeri.' },
  { id: 'pharmacy', name: 'Eczane', art: 'map.pharmacy', danger: 2, walls: ['tiles', 'plain'], wallColor: ['#e3f3ff', '#e9f7ea'], props: ['st.shelf', 'st.counter', 'st.cabinet'], pool: { meds: 4, cloth: 3, water: 2, food: 1 }, blurb: 'İlaç bulabileceğin tek yer.' },
  { id: 'cafe', name: 'Kafe', art: 'map.cafe', danger: 1, walls: ['stripes', 'dots'], wallColor: ['#ffdcd3', '#fbe5ad'], props: ['st.counter', 'st.table', 'st.chair'], pool: { cocoa: 4, food: 7, water: 3 }, blurb: 'Kakao kokusu hâlâ havada.' },
  { id: 'park', name: 'Park', art: 'map.park', danger: 0, walls: ['plank', 'plain'], wallColor: ['#e6f3d8', '#f6e3c3'], props: ['st.crate', 'st.sled', 'st.snowman'], pool: { wood: 8, seeds: 3, food: 2 }, blurb: 'Kırık dallar ve bahçıvan kulübesi. Güvenli.' },
];

// Story events. `when(G)` decides if it can happen; `choices` return report lines via apply(G).
const EVENTS = [
  {
    id: 'note', day: 2, art: 'char.nermin', title: 'Kapının altında bir not',
    text: '"Hırdavatçıda hâlâ levye ve parça kalmış olabilir. Dikkat edin, rakunlar orayı sever. — Nermin Teyze, karşı komşu"',
    choices: [{ label: 'Teşekkürler Nermin Teyze!', fx: [{ k: 'mood', v: 5 }] }],
  },
  {
    id: 'nermin_meds', minDay: 3, art: 'char.nermin', title: 'Nermin Teyze kapıda',
    text: 'Karşı komşu Nermin Teyze öksürüyor. "Evladım, bir kutu ilacınız var mı? Sobam da söndü..."',
    choices: [
      { label: 'İlaç ver', need: { meds: 1 }, fx: [{ k: 'meds', v: -1 }, { k: 'mood', v: 15 }], flag: 'nerminHelped' },
      { label: 'Sıcak bir yemek ver', need: { meal: 1 }, fx: [{ k: 'meal', v: -1 }, { k: 'mood', v: 10 }], flag: 'nerminHelped' },
      { label: 'Üzgünüz, bizde de yok', fx: [{ k: 'mood', v: -6 }] },
    ],
  },
  {
    id: 'nermin_pie', after: 'nerminHelped', delay: 2, art: 'char.nermin', title: 'Bir tepsi börek!',
    text: 'Nermin Teyze iyileşmiş. Kapıya kocaman bir tepsi börek bıraktı: "İyiliğinizi unutmam!"',
    choices: [{ label: 'Afiyet olsun!', fx: [{ k: 'meal', v: 3 }, { k: 'mood', v: 10 }] }],
  },
  {
    id: 'puppy', minDay: 3, art: 'critter.dog', title: 'Kapıda titreyen bir yavru',
    text: 'Karın içinde küçük bir köpek yavrusu kuyruğunu sallıyor. Gözleri kocaman.',
    choices: [
      { label: 'İçeri al, adı Fındık olsun', fx: [{ k: 'mood', v: 12 }], flag: 'dog', note: 'Her gün moral verir, ara sıra erzak yer.' },
      { label: 'Battaniyeye sar, barınağa götür', need: { cloth: 1 }, fx: [{ k: 'cloth', v: -1 }, { k: 'mood', v: 6 }] },
    ],
  },
  {
    id: 'trader', days: [4, 8, 11], art: 'npc.trader', title: 'Gezgin tüccar Bay Bıyık',
    text: '"Miyav! Kızağımda güzel şeyler var. Takas yapalım mı?"', trade: true,
    choices: [{ label: 'Takasa bak', trade: true }, { label: 'Bugün değil', fx: [] }],
  },
  {
    id: 'leak', minDay: 3, art: 'icon.water', title: 'Çatı damlıyor!',
    text: 'Gece eriyen kar çatıdan içeri damlamaya başladı.',
    choices: [
      { label: 'Tamir et', need: { wood: 2 }, fx: [{ k: 'wood', v: -2 }, { k: 'mood', v: 4 }] },
      { label: 'Kova koy, suyu biriktir', fx: [{ k: 'water', v: 2 }, { k: 'mood', v: -4 }] },
    ],
  },
  {
    id: 'birthday', day: 5, art: 'char.mert', who: 'mert', title: 'Bugün Mert\'in doğum günü!',
    text: 'Mert bunu kimseye söylemedi ama Ece hatırladı.',
    choices: [
      { label: 'Kakao partisi', need: { cocoa: 1 }, fx: [{ k: 'cocoa', v: -1 }, { k: 'mood', v: 25 }] },
      { label: 'Yemekli kutlama', need: { meal: 2 }, fx: [{ k: 'meal', v: -2 }, { k: 'mood', v: 18 }] },
      { label: 'Kumaştan bir atkı ör', need: { cloth: 1 }, fx: [{ k: 'cloth', v: -1 }, { k: 'mood', v: 12 }] },
    ],
  },
  {
    id: 'deniz', minDay: 5, maxDay: 8, art: 'char.deniz', title: 'Kayıp bir çocuk',
    text: 'Deniz adında bir çocuk ailesini fırtınada kaybetmiş. "Biraz ısınabilir miyim?"',
    choices: [
      { label: 'Bize katıl Deniz!', fx: [{ k: 'mood', v: 10 }], recruit: 'deniz', note: 'Yeni bir arkadaş: neşesi herkese iyi gelir.' },
      { label: 'Yemek ver, kurtarma çadırını göster', need: { meal: 1 }, fx: [{ k: 'meal', v: -1 }, { k: 'mood', v: 4 }] },
    ],
  },
  {
    id: 'snowman', day: 6, art: 'st.snowman', title: 'Sokakta kardan adam yarışması',
    text: 'Komşu çocuklar dev bir kardan adam yapıyor. Davet ediyorlar!',
    choices: [
      { label: 'Hep beraber katılalım', fx: [{ k: 'mood', v: 18 }, { k: 'energy', v: -15 }] },
      { label: 'Pencereden el salla', fx: [{ k: 'mood', v: 5 }] },
    ],
  },
  {
    id: 'raccoon_deal', minDay: 5, needFlag: 'raided', art: 'critter.raccoon', title: 'Rakun çetesinin elçisi',
    text: 'Bir rakun kapıya beyaz bir mendil bağlamış: "2 erzak verin, üç gece sizi rahat bırakalım. Söz! Belki."',
    choices: [
      { label: 'Anlaştık', need: { food: 2 }, fx: [{ k: 'food', v: -2 }], flag: 'truce' },
      { label: 'Asla! Kapımız sağlam', fx: [{ k: 'mood', v: 3 }] },
    ],
  },
  {
    id: 'power', minDay: 4, art: 'st.bulb', title: 'Elektrik geldi!',
    text: 'Bir saatliğine elektrik geldi. Herkes telefonunu şarj etti, ailelerine mesaj attı.',
    choices: [{ label: 'Ne güzel!', fx: [{ k: 'mood', v: 14 }] }],
  },
  {
    id: 'storm', day: 7, art: 'icon.snow', title: 'Fırtına uyarısı',
    text: 'Radyo uyarıyor: bu gece çok soğuk olacak. Soba iki odun yakacak.',
    choices: [{ label: 'Hazırlanalım', fx: [], flag: 'storm' }],
  },
  {
    id: 'letter', day: 9, art: 'char.nermin', title: 'Belediyeden mektup',
    text: '"Yollar açılıyor. Üç gün sonra kurtarma ekipleri mahallenize ulaşacak. Dayanın!"',
    choices: [{ label: 'Az kaldı!', fx: [{ k: 'mood', v: 15 }] }],
  },
  {
    id: 'aid', minDay: 3, needStation: 'radio', art: 'st.radio', title: 'Radyoda anons',
    text: '"Parka yardım kolileri bırakıldı. Bu gece gidenler bol erzak bulabilir."',
    choices: [{ label: 'Not alındı', fx: [], flag: 'aidPark' }],
  },
];

const TRADES = [
  { give: { parts: 3 }, get: { meds: 1 } },
  { give: { wood: 4 }, get: { food: 2 } },
  { give: { cloth: 2 }, get: { cocoa: 1, seeds: 1 } },
  { give: { food: 2 }, get: { parts: 2 } },
  { give: { water: 3 }, get: { meal: 2 } },
];
