## v15.0.0 — Real Artwork Humanoid
- Gerçek artwork tabanlı humanoid ana renderer.
- 6 saniye reconstruction + 2.5 saniye shockwave.
- Head-turn sadece kafa bölgesinde; idle front image korunur.
- Ana kontrol şeridi ENERJİ AKIŞI görünümüne döndü.
- Mevcut chat/voice/mic/LLM akışı korunur.


## v14.3.2 — Inline Assembly + Voice Preview Fix
- Ana dashboard humanoid artık ilk yüklemede sabit gelmiyor; 5.6 sn assembly + 2.5 sn shockwave akışı var.
- Assembly chat/LLM/voice akışını bloklamıyor.
- Ana humanoid LISTENING / THINKING / SPEAKING state ve jarvis-level olaylarına tepki veriyor.
- Preview/mock API boş başarılı cevap verip `undefined` üretmeyecek şekilde düzenlendi.
- Production chat yanıtında boş `result.text` artık geçerli cevap sayılmıyor.
- Standalone preview gerçek paid TTS kullanmaz; TTS endpoint yoksa mevcut browser speechSynthesis fallback ile ses test edilir.
- Mikrofon HTTPS/localhost/izin şartlarına bağlı kalır.
# Tarihçe

## v13
Google Analytics/Search Console servisleri, sınırlı teknik SEO crawler’ı, komut router’ı, içerik adapter sınırı ve Render testleri eklendi. JSON fallback korunarak PostgreSQL adapter sınırı oluşturuldu.

## Önceki geçiş notları
Eski sürümlerde localhost, geçici JSON ve Cloudflare Workers/D1 pilotu önerileri vardı. Bunlar tarihsel kararlardır; güncel işletim yolu Render, hedef kalıcı storage Neon PostgreSQL’dir. Git geçmişi korunur.

## v14.1 — Humanoid Core / Voice Reactive UI
- Ana dashboard merkez görseli, mevcut backend ve iş mantığı korunarak özgün WebGL2 particle-humanoid motoruna yükseltildi.
- `ASSEMBLING / IDLE / WAITING_WAKE_WORD / LISTENING / THINKING / SPEAKING / ERROR` durumları gerçek `jarvis-state` olaylarına bağlandı.
- Humanoid; baş, boyun, omuz-göğüs enerji ağı, amber çekirdek, nöral damarlar, dinleme halkaları ve ambient parçacık alanından oluşur. APEX ücretli humanoid kaynak kodu kullanılmadı veya kopyalanmadı.
- Mikrofon ve AI TTS ses seviyesi yumuşatılarak `jarvis-level` üzerinden görsele bağlandı; browser TTS yedeği için yaklaşık konuşma enerjisi üretildi.
- Wake-word modu, yanıt tamamlandıktan sonra ayar açıksa yeniden dinleme durumuna dönebilecek şekilde iyileştirildi.
- OpenAI `gpt-4o-mini-tts` kullanıldığında opsiyonel `TTS_INSTRUCTIONS` ile özgün Türkçe JARVIS konuşma stili eklendi. Gerçek secret/token eklenmedi.
- WebGL2 desteklenmeyen cihazlarda 2D humanoid fallback; kompakt `/jarvis` orb kullanımında mevcut orb davranışı korundu.


## 14.2.0 — Artwork-driven Humanoid Stage 1
- Replaced active procedural center humanoid with the compact JARVIS orb in the command deck.
- Added dedicated full-screen Humanoid view and visible approval gate.
- Added collapsed Technical details and manual-only diagnostics.
- No Three.js migration or new paid service yet; waiting for visible artwork approval.

## 14.4.0 — Artwork reconstruction + APEX-inspired reasoning motion
- Reviewed the public MIT APEX-UI architecture (orb/core/reasoning/status/shader composition); the private APEX Humanoid source remains excluded and was not copied.
- Replaced the previous fixed/clipped humanoid presentation with an artwork-sampled particle renderer driven by the approved JARVIS figure.
- Every page load rebuilds the inline humanoid; every Humanoid-view open rebuilds the full-screen humanoid.
- Assembly duration fixed at 6.0 seconds, followed by a 2.5 second shockwave.
- Particles stream from a visible lower-center source on curved paths and settle left-to-right; the amber face ignites near completion.
- Mouse head tracking now uses sampled artwork dots with rounded-head depth, far-side darkening, profile glow, gap-cover point growth and smooth return to the untouched front artwork.
- Added an APEX-inspired low-opacity specialist reasoning constellation during active states, adapted to Temmuz Online roles.
- Preserved existing chat, LLM, voice, microphone and jarvis-state/jarvis-level interfaces.
