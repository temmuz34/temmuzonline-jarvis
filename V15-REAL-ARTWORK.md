# TemmuzOnline JARVIS v15.0 — Real Artwork Humanoid

## Amaç
Merkez humanoid artık procedural çizim değil, onaylı gerçek artwork (`humanoid-figure-transparent.png`) tabanlıdır.

## Davranış
- Sayfa her açıldığında artwork yüklendikten sonra 6.0 sn yeniden-inşa başlar.
- Parçacıklar artwork piksellerinden örneklenir, alttaki görünür kaynaktan yay çizerek hedeflerine taşınır.
- Figür soldan sağa tamamlanır.
- Son fazda amber yüz ateşlenir, ardından 2.5 sn shockwave gelir.
- Idle durumda gerçek artwork kullanılır.
- Mouse yalnız kafa bölgesindeyken dönüşü sürer; dışarıda ön görünüme geri döner.
- Uzak taraf kararır, önde kalan noktalar artwork renklerini korur, profil cyan parlar.
- Ana kontrol şeridi: tekrar / ENERJİ AKIŞI / mikrofon.
- Chat, LLM, voice, mic ve backend akışlarına dokunulmamıştır.

## Referanslar
`outputs/assets/humanoid-references/` yalnız görsel referans klasörüdür; runtime texture swap olarak kullanılmaz.
