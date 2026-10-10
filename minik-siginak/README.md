# Minik Sığınak

Yandan kesit (2.5D) görünümlü, tatlı ve renkli bir hayatta kalma oyunu. Büyük kar fırtınasından sonra
yarı yıkık bir apartmanda üç arkadaş (ve kedi Pamuk) bahar gelene kadar birlikte dayanıyor.
This War of Mine'ın "bebek evi" kesit fikrinden ilham alır ama karamsar değildir: pastel renkler,
sıcak lamba ışığı, sevimli karakterler.

## Nasıl oynanır

- **Dokun ve yaptır**: bir işe (moloz, atölye, ocak, dolap...) dokun, en yakın boştaki arkadaş gider.
  Önce soldan birini seçersen o yapar. Bir kişiye en fazla 3 iş sıralanır.
- **Molozları temizle**: odun, parça ve kumaş çıkar, yeni odalar ve içlerindeki eşyalar açılır.
- **Üret (Atölye)**: Yer Yatağı, Ocak, Su Toplayıcı, Yatak, Soba, Kürek, Levye, Kapı güçlendirme,
  Atölye 2. Atölye 2 ile: Saksı Bahçe, Koltuk, Radyo, Gitar, Büyük Çanta, Çelik Kapı.
- **Ocak**: yemek pişir (1 erzak + 1 su), kar erit (1 odun → 2 su), herkese kakao (moral).
- **Gece planı (20:00)**: herkes için Uyu / Nöbet / Keşif seç. Keşfe çıkan kişiyi kendin oynatabilir
  ya da "Hızlı keşif" ile tek dokunuşta geçebilirsin.
- **Keşif**: Market, Okul, Hırdavatçı, Eczane, Kafe, Park. Eşyalara dokun, çantayı doldur.
  Rakunlar çantadan eşya kapar: yaklaşınca üstlerine dokun, "Kışşt!".
- **Sabah**: gece raporu ve küçük bir hikâye olayı (komşu Nermin Teyze, tüccar kedi Bay Bıyık,
  kayıp yavru köpek, doğum günü, kardan adam yarışması...). Seçimlerin sonuçları var.
- **Hedef**: 12. günün sabahına kadar herkesi tok, dinlenmiş, sıcak ve mutlu tut.
- Hız: duraklat / 1× / 2× / 3×. Akşamüstü "Geceye geç" ile beklemeden geceye geçilir.
  Otomatik yemek açıkken acıkan arkadaşlar kendiliğinden yer.

## Android

- **APK**: her push'ta GitHub Actions (`.github/workflows/minik-siginak-apk.yml`) oyunu derler ve
  `minik-siginak-latest` adlı sürüme `minik-siginak.apk` olarak koyar. Telefonda Releases sayfasından
  indirip kurman yeterli ("bilinmeyen kaynaklara izin ver" demen gerekebilir).
- Uygulama tam ekran ve yatay açılır, geri tuşu menüleri kapatır, oyun her 20 saniyede ve uygulama
  arka plana geçince kaydedilir. Yazı tipi gömülüdür, internet gerekmez.
- Android projesi: `android/` (Java WebView, minSdk 24, targetSdk 34). Yerelde derlemek için:
  `node build.mjs --android` sonra `cd android && gradle assembleDebug`.

## Geliştirme

```
node build.mjs                      # dist/index.html (tek dosya) + dist/artifact.html
node build.mjs --android            # ayrıca android/app/src/main/assets/index.html
node ../minik-art/tools/render-gallery.mjs "" galeri.png   # tüm çizimlerin önizlemesi
node tools/make-android-icons.mjs   # uygulama ikonları
```

Kaynak: `src/` (oyun), `../minik-art/` (ortak MinikArt çizim kiti), `assets/` (yazı tipi, ikon).

## Çizimler: MinikArt

Tüm görseller bu projeye özel, kodla çizilmiş orijinal çizimlerdir (`../minik-art/`). Hiçbir oyundan,
markadan ya da hazır paketten alıntı yoktur. Başka oyunlarda da kullanılabilir: ayrıntılar
`../minik-art/README.md` ve `../minik-art/STYLE.md` dosyalarında. Yazı tipi Baloo 2, SIL Open Font License 1.1
(`assets/fonts/OFL.txt`).
