# Kıvılcım Diyarı

Tepeden bakışlı (2.5D), yatay ekranda oynanan, tatlı ve renkli bir hayatta kalma oyunu.
Çizgiler This War of Mine'ın karakalem/tarama hissinden ilham alır, ama dünya karamsar değil:
pastel renkler, sıcak ateş ışığı, sevimli karakterler ve kedi Pamuk.

Dünya **sonsuz**: yürüdükçe yeni ormanlar, çayırlar, göller, taşlık tepeler ve harabeler
kendiliğinden oluşur. Her dünya bir tohumla üretilir. Yaptığın her değişiklik (kesilen ağaç,
kurulan duvar, açılan tarla) kaydedilir.

## Nasıl oynanır

- **Yürü**: ekranın sol tarafında parmağını sürükle (klavyede WASD / oklar).
- **Turuncu tuş** önündeki şeye göre değişir: ağaç kes, taş kır, çalı topla, sandık aç,
  hasat et, gölgecik kovala. Basılı tutarsan art arda yapar (klavyede Boşluk / E).
- **Çanta** (B / Tab): Aletler, Yapı, Ev, Tarım ve Yemek tarifleri. Yaptığın eşya alttaki
  8'li çubuğa gelir ve eline alınır. Bazı tarifler Atölye, Ocak ya da ateş yanında açılır.
- **Ev yapma (Minecraft gibi)**: Ahşap/Taş Duvar, Pencereli Duvar, Kapı, Çit, Ahşap Zemin.
  Elinde yapı varken ekranda yakındaki bir kareye **dokun ve sürükle**: duvarlar sıra sıra dizilir.
  Ya da önündeki kareye turuncu/yeşil tuşla koy. Kapılardan sen geçersin, gölgecikler geçemez.
- **Hazır Kulübe**: tek dokunuşla duvarlı, kapılı, pencereli, zeminli 7×5 kulübe kurar.
  Yer yoksa engel olan kareler kırmızı çarpıyla gösterilir.
- **Eşyalar**: Yatak (uyu, sabah olur, ev noktan olur), Ocak (yemek pişir), Soba (ısıt),
  Sandık, Su Fıçısı, Masa, Sandalye, Lamba, Halı, Saksı, Kitaplık, Koltuk, Gitar.
- **Tarla**: Çapa ile çim toprağı sür, tohum ek (buğday, havuç, balkabağı), Sulama Kabı ile sula
  (göl ya da Su Fıçısı doldurur). Sulanan ya da yağmur alan ekin iki kat hızlı büyür.
  Gübre büyümeyi hızlandırır. Tohumlar çimlerden, çalılardan ve harabe sandıklarından çıkar.
- **Gece**: gölgecikler çıkar. Işıktan (ateş, meşale, lamba, fener) korkarlar, duvarlardan ve
  kapılardan geçemezler. Kapalı bir evin içinde sıcak ve güvendesin.
- **Değerler**: can, tokluk, sıcaklık. Ye (en iyi yemeği otomatik seçer), ateş başında ısın.
  Bayılırsan Pamuk seni evine sürükler; eşyaların kaybolmaz.
- **Keşif**: harabelerdeki sandıklarda hurda, kumaş, tohum ve **telsiz parçaları** var.
  5 parçayı kamptaki telsize tak. Her 4 günde bir gezgin tüccar Bay Bıyık evinin yanına gelir.
- **Görevler**: 16 adımlık rehber görev zinciri, her adımda ödül.
- **Karakterler**: Ece (yemekler ×1.5 doyurur), Mert (toplama ×2), Lale (hızlı yürür),
  Deniz (ekinler ×1.5 hızlı büyür).
- Menü › **Grafik: Keskin / Hızlı**. Yavaş telefonlarda oyun ilk saniyelerde kendiliğinden
  Hızlı moda geçer.

## Android

- **APK**: her push'ta GitHub Actions (`.github/workflows/kivilcim-diyari-apk.yml`) oyunu derler ve
  `kivilcim-diyari-latest` adlı sürüme `kivilcim-diyari.apk` olarak koyar. Telefonda Releases
  sayfasından indirip kurman yeterli ("bilinmeyen kaynaklara izin ver" demen gerekebilir).
- Uygulama tam ekran ve yatay açılır, geri tuşu menüleri kapatır, oyun 20 saniyede bir ve uygulama
  arka plana geçince kaydedilir. Yazı tipi gömülüdür, internet gerekmez.
- Android projesi: `android/` (Java WebView, `com.kivilcim.diyari`, minSdk 24, targetSdk 34).
  Yerelde: `node build.mjs --android` sonra `cd android && gradle assembleDebug`.

## Geliştirme

```
node build.mjs                      # dist/index.html (tek dosya) + dist/artifact.html
node build.mjs --android            # ayrıca android/app/src/main/assets/index.html
node tools/make-android-icons.mjs   # uygulama ikonları + assets/app-icon-512.png
```

Kaynak dosyalar `src/` içinde, sırayla birleştirilir:

| Dosya | İçerik |
| --- | --- |
| `00-data.js` | sabitler, eşyalar, tarifler, ekinler, karakterler, görevler, takaslar |
| `10-world.js` | gürültü tabanlı sonsuz dünya, 16×16 parçalar, kayıt farkları, çarpışma |
| `20-sim.js` | oyuncu, hedef seçimi, eylemler, inşa, tarla, uyku, gölgecikler, gün döngüsü |
| `50-render.js` | zemin, y-sıralı nesneler, ışık ve taralı karanlık, yağmur, efektler |
| `60-ui.js` | HUD, çanta, pencereler, mini harita |
| `70-input.js` | joystick, dokun-sürükle inşa, klavye |
| `90-boot.js` | ses, kayıt, başlık ekranı, ana döngü, Android köprüsü |
| `shell.html` | sayfa iskeleti ve CSS |

## Çizimler

Tüm görseller bu depoya özel, kodla çizilmiş orijinal çizimlerdir: `../minik-art/`
(MinikArt kiti). Hiçbir oyundan, markadan ya da hazır paketten alıntı yoktur ve başka oyunlarda
da kullanılabilir. Yazı tipi Baloo 2, SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
