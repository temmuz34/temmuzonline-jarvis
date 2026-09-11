# TemmuzOnline Jarvis v14

## Mevcut sürümün durumu
GitHub → Render Node.js → JSON fallback veya PostgreSQL → dış scheduler → Google salt okunur servisleri. Render PORT/0.0.0.0, Basic Auth, site denetimi, ekip, içerik ve rapor akışı korunur. Ekip kartları yazılım rolleridir; insan uzman veya sürekli çalışan model ajanı değildir. Satışlar bağlantı kurulmadıkça örnek veridir.

## Bu güncellemede yapılanlar
- JSON fallback korunarak PostgreSQL adapteri, JSONB singleton tablo, Pool (max 5), health ve güvenli hatalar eklendi.
- `outputs/migrate-storage.cjs` JSON’u boş PostgreSQL’e taşır; dolu kaydın üzerine yazmaz, JSON’u silmez.
- Executive Brief son 30 kaydı, 5 KPI, 3 aksiyon, 2 risk, 2 fırsat ve Türkçe ses metni üretir; örnek/verified güven seviyesini ayırır.
- Executive Brief paneli ve mevcut sesli okuma düğmesi Dashboard’a eklendi.
- Eski geçiş notları `HISTORY.md` dosyasına taşındı.

## Halen eksik olanlar
Neon ve gerçek DATABASE_URL bağlanmadı. Google credentials olmadan gerçek GA4/Search Console çağrısı yapılamaz. Sosyal medya, pazaryeri, reklam API’leri ve genel AI provider bağlı değildir. JSON fallback Render geçici diskinde çalışır; kalıcılık garantisi vermez.

## Render / Neon kurulum adımları
1. Neon PostgreSQL oluştur ve SSL’li bağlantı dizesini al.
2. Render Environment’a `DATABASE_URL` ekle.
3. JSON yedeği al; `STORAGE_MODE=json` ile doğrula.
4. Render Shell’de `npm run migrate:storage` çalıştır.
5. `STORAGE_MODE=postgres` yapıp deploy et.
6. Storage health’i kontrol et; kayıt oluşturup yeniden deploy sonrası veriyi doğrula.

## Gerekli Environment Variables
`STORAGE_MODE`, `DATABASE_URL`, `TEMMUZ_AUTH_USER`, `TEMMUZ_AUTH_PASSWORD`, `SCHEDULE_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GA4_PROPERTY_ID`, `SEARCH_CONSOLE_SITE_URL`. Gerçek değerler repoya konmaz.

Render Build Command: `npm install`  
Render Start Command: `npm start`  
Bu repository'de `package-lock.json` bulunmadığı için `npm ci` kullanılmaz.

## Test sonuçları
Storage, migration, Executive Brief, eski state, Google cache/fallback/hata kodları, crawler/robots/SEO, PORT, Basic Auth, scheduler idempotency, origin POST, secret sızıntısı, desktop/mobile ve Brief akışı testleri geçti. Gerçek Neon/Google testi credentials verilmediği için çalıştırılmadı.

## Sonraki sürüm planı
Neon ve Google hesabı canlıda doğrulanacak; dış scheduler 08:00/13:00 UTC+3 çağrılarını tetikleyecek. Sosyal ve pazaryeri yayın entegrasyonları ayrı izinlerle ele alınacak.
