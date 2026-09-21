# TemmuzOnline Jarvis v14.1

## Mevcut sürümün durumu
GitHub → Render Node.js → Neon PostgreSQL (JSON fallback) → dış 08:00/13:00 scheduler → gerçek GA4 ve Search Console salt okunur servisleri. Render PORT/0.0.0.0, Basic Auth, site denetimi, ekip, içerik ve rapor akışı korunur. Ekip kartları yazılım rolleridir; insan uzman veya sürekli çalışan model ajanı değildir. Satışlar ayrı bağlantı kurulmadıkça örnek veridir.

## Bu güncellemede yapılanlar
- Ana merkez görseli özgün WebGL2 particle humanoid motoruna yükseltildi; mevcut iş mantığı ve API sözleşmeleri değiştirilmedi.
- Humanoid state machine; wake-word, dinleme, düşünme ve gerçek TTS/mikrofon audio-level akışına bağlandı.
- AI TTS için opsiyonel `TTS_INSTRUCTIONS` eklendi; varsayılan stil sakin, kontrollü ve doğal Türkçe operasyon asistanıdır.
- WebGL2 olmayan cihazlar için 2D fallback ve `prefers-reduced-motion` desteği korunur.
- JSON fallback korunarak PostgreSQL adapteri, JSONB singleton tablo, Pool (max 5), health ve güvenli hatalar eklendi.
- `outputs/migrate-storage.cjs` JSON’u boş PostgreSQL’e taşır; dolu kaydın üzerine yazmaz, JSON’u silmez.
- Executive Brief son 30 kaydı, 5 KPI, 3 aksiyon, 2 risk, 2 fırsat ve Türkçe ses metni üretir; örnek/verified güven seviyesini ayırır.
- Executive Brief paneli ve mevcut sesli okuma düğmesi Dashboard’a eklendi.
- Eski geçiş notları `HISTORY.md` dosyasına taşındı.
- Ortak council snapshot, rol bazlı 16 uzman çıktısı, SEO fırsatları ve bulgu fingerprint dedup akışı eklendi.
- Report Intelligence, Action Center, süreç izleme, günlük brief, aktivite ve sistem içi bildirim API’leri eklendi.
- Jarvis çalışma alanı (`/jarvis.html`), aksiyonlar, yayın merkezi, içerik ve ayarlar rotaları mevcut dashboard tasarımını bozmadan eklendi.
- Server-side AI/STT/TTS/image-provider soyutlamaları ve resmi Instagram/LinkedIn OAuth yayın adaptörleri eklendi; yapılandırılmadan tümü kontrollü kurulum durumu döndürür.
- İş olayları, onay kayıtları, DONE/VERIFIED ayrımı, yeniden kontrol doğrulaması ve JSONB içinde geriye dönük uyumlu business state eklendi.

## Halen eksik olanlar
Production Neon, GA4, Search Console ve dış scheduler bağlantıları mevcut kabul edilir. Bu yerel test ortamında production secret’ları bulunmadığından canlı çağrılar çalıştırılmadı. Sosyal OAuth, AI, STT/TTS ve görsel sağlayıcılar environment variable ile ayrıca etkinleştirilmelidir. JSON fallback Render geçici diskinde çalışır; kalıcılık garantisi vermez.

## Render / Neon kurulum adımları
1. Neon PostgreSQL oluştur ve SSL’li bağlantı dizesini al.
2. Render Environment’a `DATABASE_URL` ekle.
3. JSON yedeği al; `STORAGE_MODE=json` ile doğrula.
4. Render Shell’de `npm run migrate:storage` çalıştır.
5. `STORAGE_MODE=postgres` yapıp deploy et.
6. Storage health’i kontrol et; kayıt oluşturup yeniden deploy sonrası veriyi doğrula.

## Gerekli Environment Variables
`STORAGE_MODE`, `DATABASE_URL`, `TEMMUZ_AUTH_USER`, `TEMMUZ_AUTH_PASSWORD`, `SCHEDULE_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GA4_PROPERTY_ID`, `SEARCH_CONSOLE_SITE_URL`, `AI_CHAT_ENABLED`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`, `VOICE_JARVIS_ENABLED`, `STT_PROVIDER`, `STT_MODEL`, `TTS_PROVIDER`, `TTS_MODEL`, `TTS_VOICE`, `TTS_INSTRUCTIONS`, `IMAGE_GENERATION_ENABLED`, `IMAGE_PROVIDER`, `IMAGE_API_KEY`, `INSTAGRAM_ENABLED`, `LINKEDIN_ENABLED`, `AUTO_PUBLISH_APPROVED_CONTENT`, `NOTIFICATIONS_ENABLED`, `PROCESS_AUTOMATION_ENABLED`. Gerçek değerler repoya konmaz.

Render Build Command: `npm ci`  
Render Start Command: `npm start`  
Production repository package-lock.json dosyasını korur; lock dosyası olmadan Render’da npm ci çalıştırılmamalıdır.

## Test sonuçları
Storage, migration, Executive Brief, eski state, Google status/partial failure, crawler/robots/SEO, PORT, Basic Auth, scheduler idempotency, origin POST, shared snapshot, rol bazlı council, action/process lifecycle, provider safety, memory extraction, configured image adapter ve server route testleri geçti. Gerçek production Neon/Google/OAuth çağrısı bu ortamda secret olmadan çalıştırılmadı.

## Sonraki sürüm planı
Neon ve Google hesabı canlıda doğrulanacak; dış scheduler 08:00/13:00 UTC+3 çağrılarını tetikleyecek. Sosyal ve pazaryeri yayın entegrasyonları ayrı izinlerle ele alınacak.


## v14.2 Stage 1 note
The humanoid path is now artwork-driven and gated. `shockwave.webp` is only a supplied reference candidate. Do not treat Listening/Thinking/Speaking/backdrop as configured until explicitly assigned. See `BUILD-LOG.md`.
