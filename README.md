# henoxdev

**[portfolio.henox.dev](https://portfolio.henox.dev)**

Bir masaya oturuyorsun ve ekranlar canlı. Sıradan bir portfolyo sayfası yerine
3D bir oda.

- **Sol monitör:** Hakkımda, kullandığım teknolojiler, bağlantılar ve gerçek commit'lerden oluşan katkı tablosu.
- **Orta monitör:** R10.net profilimin ekran görüntüsü; tıklayınca profile gider.
- **Sağ monitör:** Spotify'da o an ne dinliyorsam o.

Oda İstanbul saatiyle yaşıyor. Güneşin o günkü gerçek doğuş ve batış saatleri
pencereden gelen ışığı ve masa lambasını belirliyor; hava yağmurluysa camda
damlalar oluyor.

Pencereden 15 Temmuz Şehitler Köprüsü görünüyor. Köprünün ışıkları yazın
20.00–20.30, kışın 17.00–17.30 arasında, her gün kendi dakikasında yanıyor;
rengi her gün değişiyor, 15 Temmuz ve milli bayramlarda kırmızı-beyaz. Karşı
yakadaki evlerin ışıkları da her gece farklı yanıp sönüyor.

WebGL olmayan cihazlarda ya da hareket azaltma açıksa aynı içerik sade bir
sayfa olarak açılır.

## Teknolojiler

Next.js 16 · React 19 · TypeScript · Tailwind 4 · react-three-fiber · three ·
zustand · Netlify

## Çalıştırma

```sh
npm install
npm run dev
```

### Spotify

1. [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   adresinde bir uygulama oluştur. Redirect URI olarak
   `http://127.0.0.1:8888/callback` ekle.
2. `.env.example` dosyasını `.env.local` olarak kopyala, Client ID ve
   Client Secret değerlerini yaz.
3. `npm run spotify:auth` komutunu çalıştır ve tarayıcıda onay ver.

Refresh token `.env.local` dosyasına yazılır. Klasör `netlify link` ile siteye
bağlıysa Netlify'a da gizli değişken olarak kaydedilir. Hiçbir anahtar kodda
yer almaz; `.env.local` git'e girmez.

### Commit akışı

`.github/workflows/activity.yml` her 20 dakikada bir commit'leri toplayıp
`public/data/activity.json` dosyasına yazar. Bunun için repo ayarlarında
**Actions secret** olarak `PERSONAL_GITHUB_TOKEN` gerekir. Token yalnızca
GitHub Action içinde kullanılır, siteye hiç ulaşmaz.

## Komutlar

```sh
npm run dev            # geliştirme sunucusu
npm run build          # production build
npm test               # testler
npm run spotify:auth   # Spotify bağlantısı
```

`?t=21:30` gibi bir parametre odanın saatini sabitler; gece ve gündüz halini
beklemeden görmek için.
