
## v14.3.2 — Inline Assembly + Voice Preview Fix
- Ana dashboard humanoid artık ilk yüklemede sabit gelmiyor; 5.6 sn assembly + 2.5 sn shockwave akışı var.
- Assembly chat/LLM/voice akışını bloklamıyor.
- Ana humanoid LISTENING / THINKING / SPEAKING state ve jarvis-level olaylarına tepki veriyor.
- Preview/mock API boş başarılı cevap verip `undefined` üretmeyecek şekilde düzenlendi.
- Production chat yanıtında boş `result.text` artık geçerli cevap sayılmıyor.
- Standalone preview gerçek paid TTS kullanmaz; TTS endpoint yoksa mevcut browser speechSynthesis fallback ile ses test edilir.
- Mikrofon HTTPS/localhost/izin şartlarına bağlı kalır.
# TemmuzOnline Jarvis v14.2 — Build Log

## Stage 0 — Safety / recovery
- Recoverable copy created: `archive/stage-backups/v14.1-before-artwork-driven-stage1.zip`.
- Existing chat, LLM/API routes, voice provider, microphone controls, Google integrations and business backend were not replaced.
- No key, token or secret was added to browser code or logs.

## Stage 1 — Approved-artwork workflow shell
### Changed
- Restored the compact reactive JARVIS orb in the main command deck.
- Added a dedicated **Humanoid** button.
- Added a full-screen Humanoid view that does not reload the page or clear the conversation.
- Added a visible Exit control.
- Added visible Idle / Listening / Thinking / Speaking preview controls outside Technical details.
- Added a Technical details panel collapsed by default.
- Added an effects-off baseline and a comparison control placeholder.
- Added a manual diagnostics button; diagnostics do not run continuously.
- Added the supplied `shockwave.webp` as an **Idle reference candidate only**. It is not silently treated as final approved artwork.
- Stored the other supplied artwork candidates unchanged and unassigned: `mountains.webp` and `083b9aa6-71b8-4661-87ca-08ac0364946f.png`.
- Removed the procedural humanoid from the active main view so it no longer competes with the artwork-driven path.

### Checked
- Full-screen view is an in-page overlay, so chat state and active audio are not intentionally stopped on open/exit.
- Real `jarvis-state` events still drive the compact orb and are displayed in the Humanoid view.
- No paid service was enabled.
- Reduced-motion is respected by the new view.

### Unfinished by design
The user's workflow says to work one visible stage at a time. Therefore these are intentionally **not implemented yet**:
- Three.js artwork-sampled particle renderer.
- Comparison renderer and image-difference numbers.
- Approved Listening / Thinking / Speaking artworks and radial transitions.
- Output-audio-driven face brightness migration.
- Assembly animation and timing.
- Mouse head turn.
- Webcam finger tracking.
- Approved backdrop effects.
- Chest breathing.

These should begin only after the Stage 1 reference image is visibly checked and the artwork mapping is confirmed.

## Validation run
- `node --check outputs/orb-engine.js` — PASS.
- `node --check outputs/humanoid-view.js` — PASS.
- `node --check outputs/operations-v12.js` — PASS.
- `node --check outputs/voice-client.js` — PASS.
- `node tests/v14.cjs` — PASS.
- `node tests/council.cjs` — PASS.
- `node tests/business.cjs` — PASS.
- Full `npm test` was attempted but cannot run in this extracted ZIP environment because dependencies are not installed (`cheerio` missing) and this package does not include the production `package-lock.json`. No dependency installation was invented or forced. Run the full suite in the real repo after restoring the existing lockfile and using `npm ci`.


## Stage 2 — Integrated full-screen Humanoid preview (v14.3)
### Safety
- Recovery copy created: `archive/stage-backups/v14.2-before-integrated-humanoid.zip`.
- Existing chat, LLM routes, voice provider, microphone controls and compact ORB were preserved.
- No paid service and no publishing action was enabled.

### Changed
- Replaced the Stage 1 static Humanoid reference overlay with the approved full-screen visual preview.
- Removed the large translucent face-surrounding halo by clipping the supplied artwork to the humanoid body/head silhouette.
- Added the supplied `mountains.webp` behind the figure and added cyan/amber reactive energy traces over it.
- Added Idle / Listening / Thinking / Speaking preview controls.
- Real `jarvis-state` events immediately update the Humanoid when the assistant is actually listening, waiting, speaking or errors.
- Real `jarvis-level` values are used for speaking brightness when available; otherwise speaking uses a playback-status fallback effect.
- Added mouse-driven soft head turn, subtle chest breathing, Effects On/Off, Compare, Replay, Skip and reduced-motion behavior.
- Added a silent 2.5-second shockwave after assembly completion. No assembly sound was supplied, so no audio was invented.
- Replay cancels previous assembly/shockwave before restarting; Skip cancels both and returns to the latest real assistant state.
- Technical details remain collapsed by default and diagnostics only run on request.

### Still not claimed as production-final
- The integrated visual preview currently uses the approved artwork + SVG/canvas composition. It is not claimed to be the final Three.js particle migration.
- Webcam index-finger tracking is not enabled.
- No deployment to Render has been performed.

## v14.3.1 — Inline Humanoid Core
- Changed: Main dashboard core now shows the approved humanoid artwork instead of the visible legacy orb.
- Preserved: Legacy orb canvas remains invisible for compatibility with existing state/audio code.
- Changed: mountains.webp + clipped shockwave.webp are rendered directly in the dashboard core.
- Changed: jarvis-state also updates the inline humanoid core intensity.
- Preserved: Full-screen Humanoid view remains available from the HUMANOID button.
- Checked: humanoid-view.js syntax, orb-engine.js syntax, v14/council/business tests.
- Rollback: archive/stage-backups/v14.3-before-inline-humanoid.zip
- Unfinished: production npm ci / full npm test still require the production package-lock and dependency environment.

## Stage v14.4 — APEX-UI review + humanoid motion rebuild
- Rollback: `archive/stage-backups/v14.3.2-before-apex-motion.zip`
- Reviewed public APEX-UI README/package architecture and live demo behavior. Public repo includes orb, 3D particle core, reasoning graph, status bar, shader background and world composition; it explicitly excludes the Humanoid source.
- Reviewed user-supplied `humanoid-demo.mp4` frame-by-frame. Reference behavior: lower-center source, arcing particle stream, progressive body/head assembly, amber face ignition, final wave/backdrop reaction, then idle.
- Approved timing: assembly 6.0 s; shockwave 2.5 s.
- Approved artwork: `shockwave.webp` / derived transparent figure, `mountains.webp`, user-supplied demo video as motion reference.
- Rebuilt `outputs/humanoid-view.js` around one artwork-sampled render engine shared by inline and fullscreen modes.
- Head turn no longer rotates a flat image layer; sampled head dots receive pseudo-depth and preserve their artwork color patches while turning.
- Effects-off / reduced-motion return immediately to the neutral artwork.
- No paid service added. No deploy performed.
- Remaining production gate: restore production package-lock, run npm ci + complete npm test in the real repo, verify Render voice/microphone endpoints over HTTPS before deploy.


## v15.0 — Real Artwork Humanoid
- Rollback: `archive/stage-backups/v14.4-before-v15-real-artwork.zip`
- package version: 15.0.0
- gerçek şeffaf humanoid artwork authoritative renderer yapıldı
- 6s assembly image-load sonrasında sıfırdan başlar
- mouse head turn yalnız kafa hitbox içinde çalışır
- temiz görüntü için reasoning/agent constellation kapatıldı
- ENERGY FLOW ana kontrol şeridi restore edildi
- assembly helper reference images proje içine eklendi
- Render deploy yapılmadı
