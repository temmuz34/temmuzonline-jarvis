# TemmuzOnline Jarvis v14.1

Render üzerinde çalışan TemmuzOnline operasyon asistanı. Node.js sunucusu `process.env.PORT` ve `0.0.0.0` kullanır; JSON fallback veya PostgreSQL/Neon storage desteklenir.

## Çalıştırma

```bash
npm ci
npm start
```

Render Build Command: `npm ci`  
Render Start Command: `npm start`

## Environment

Gerekli ve opsiyonel değişkenlerin tamamı `.env.example` içindedir. `.env` dosyası commit edilmez. Google, AI, ses, görsel ve sosyal OAuth değerleri yalnızca Render Environment Variables alanında tutulur.

## Rotalar

`/` dashboard, `/report-intelligence.html` rapor zekâsı, `/actions.html` aksiyon merkezi, `/jarvis.html` tam ekran Jarvis, `/publishing.html` yayın merkezi, `/activity.html` aktivite ve `/business-settings.html` ayar çalışma alanıdır.

Yayın varsayılan olarak onay gerektirir; resmi OAuth bağlantısı olmadan Instagram veya LinkedIn için başarılı yayın üretilmez.


## Humanoid Core (v14.1)

Dashboard merkezindeki JARVIS artık `outputs/orb-engine.js` içinde bağımsız WebGL2 particle-humanoid olarak çalışır. Görsel motor mevcut `jarvis-state` ve `jarvis-level` event sözleşmelerini kullanır; AI/backend katmanına doğrudan erişmez. WebGL2 yoksa kontrollü 2D fallback devreye girer. Kompakt `jarvis-orb` ekranı korunmuştur.

Durumlar: `ASSEMBLING`, `IDLE`, `WAITING_WAKE_WORD`, `LISTENING`, `THINKING`, `SPEAKING`, `ERROR`. `SPEAKING` ve `LISTENING` enerji seviyesi gerçek Web Audio analyser verisiyle beslenir.

AI TTS için `TTS_MODEL=gpt-4o-mini-tts` kullanılıyorsa `TTS_INSTRUCTIONS` ile Türkçe konuşma stili yönlendirilebilir. Kullanıcı arayüzünde AI tarafından üretilen ses açıklaması bulunur.

Bu görsel motor APEX'in ücretli humanoid kaynak paketini içermez; TemmuzOnline için sıfırdan yazılmış özgün uygulamadır.


### Humanoid Stage 1 (v14.2)
Use the **HUMANOID** button in the command deck to open the full-screen reference-check view. This stage deliberately does not add particle animation yet. See `V14.2-ARTWORK-DRIVEN-STAGE1.md`.
