(()=>{'use strict';
let recognition=null,audio=null,micStream=null,meterContext=null,meterRaf=0,fxContext=null,listening=false,wakeWaiting=false,stopping=false,lastState='IDLE',lastLevel=0;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const emit=(state,level=lastLevel)=>{lastState=state;window.dispatchEvent(new CustomEvent('jarvis-state',{detail:{state,level}}));};
const emitLevel=level=>{lastLevel=clamp(level);window.dispatchEvent(new CustomEvent('jarvis-level',{detail:{level:lastLevel}}));};
const wake=t=>/^(?:hey\s+)?(?:jarvis|carvis|jarvıs)[\s,.:!?]*/i.test(String(t||'').trim());
const stripWake=t=>String(t||'').trim().replace(/^(?:hey\s+)?(?:jarvis|carvis|jarvıs)[\s,.:!?]*/i,'').trim();
function getFxContext(){if(!navigator.userActivation?.hasBeenActive)return null;try{fxContext=fxContext||new (window.AudioContext||window.webkitAudioContext)();if(fxContext.state==='suspended')fxContext.resume().catch(()=>{});return fxContext;}catch{return null;}}
function fx(type){const c=getFxContext();if(!c)return;const now=c.currentTime,master=c.createGain(),osc=c.createOscillator(),osc2=c.createOscillator();master.connect(c.destination);osc.connect(master);osc2.connect(master);const cfg={LISTENING:[520,780,.055,.09],THINKING:[210,420,.038,.075],SPEAKING:[340,680,.032,.065],WAKE:[620,930,.05,.11],ERROR:[160,110,.045,.12]}[type];if(!cfg)return;osc.type='sine';osc2.type='triangle';osc.frequency.setValueAtTime(cfg[0],now);osc2.frequency.setValueAtTime(cfg[1],now);master.gain.setValueAtTime(0.0001,now);master.gain.exponentialRampToValueAtTime(cfg[2],now+.012);master.gain.exponentialRampToValueAtTime(.0001,now+cfg[3]);osc.start(now);osc2.start(now);osc.stop(now+cfg[3]+.02);osc2.stop(now+cfg[3]+.02);}
function state(next){if(next!==lastState){if(next==='LISTENING')fx('LISTENING');else if(next==='THINKING')fx('THINKING');else if(next==='SPEAKING')fx('SPEAKING');else if(next==='ERROR')fx('ERROR');}emit(next);}
function stopMeter(){cancelAnimationFrame(meterRaf);meterRaf=0;try{meterContext?.close();}catch{}meterContext=null;emitLevel(0);}
function stopMic(){try{micStream?.getTracks().forEach(t=>t.stop());}catch{}micStream=null;}
function stopRecognition(){if(!recognition)return;const r=recognition;recognition=null;try{r.onend=r.onerror=r.onresult=r.onstart=null;r.abort();}catch{}}
function stopAudio(){if(audio){try{audio.onended=audio.onerror=audio.onplay=null;audio.pause();audio.removeAttribute('src');audio.load();}catch{}audio=null;}if(window.speechSynthesis)window.speechSynthesis.cancel();}
function stop({silent=false}={}){stopping=true;stopRecognition();stopAudio();stopMic();stopMeter();listening=false;wakeWaiting=false;stopping=false;if(!silent)state('IDLE');}
function meter(source,{destination=false}={}){const Ctx=source.context;const analyser=Ctx.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.72;source.connect(analyser);if(destination)analyser.connect(Ctx.destination);const data=new Uint8Array(analyser.frequencyBinCount);let smoothed=0;function tick(){analyser.getByteFrequencyData(data);let sum=0,weighted=0;for(let i=2;i<data.length;i++){const w=i<80?1.25:i<150?.75:.35;sum+=data[i]*w;weighted+=w;}const raw=weighted?sum/weighted/155:0;const target=clamp((raw-.025)*1.22);smoothed+= (target-smoothed)*(target>smoothed?.28:.10);emitLevel(smoothed);meterRaf=requestAnimationFrame(tick);}tick();return analyser;}
async function openMicMeter(){micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});meterContext=new (window.AudioContext||window.webkitAudioContext)();if(meterContext.state==='suspended')await meterContext.resume();meter(meterContext.createMediaStreamSource(micStream));}
async function listen(onText,onStatus,wakeMode=false){
 stop({silent:true});wakeWaiting=!!wakeMode;const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){state('ERROR');onStatus?.('Tarayıcı ses tanımayı desteklemiyor. Chrome/Edge veya sunucu STT kullanın.');return false;}
 if(!window.isSecureContext){state('ERROR');onStatus?.('Mikrofon için HTTPS veya localhost gerekli.');return false;}
 try{await openMicMeter();recognition=new Recognition();recognition.lang='tr-TR';recognition.continuous=!!wakeMode;recognition.interimResults=true;listening=true;const local=recognition;
  local.onstart=()=>{if(local!==recognition)return;if(wakeMode){emit('WAITING_WAKE_WORD');onStatus?.('Mikrofon açık · “Jarvis” çağrısı bekleniyor.');}else{state('LISTENING');onStatus?.('Mikrofon açık · Dinliyorum.');}};
  local.onresult=e=>{if(local!==recognition)return;let final='';let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)final+=t;else interim+=t;}
   if(wakeMode&&wakeWaiting){const sample=(final||interim).trim();if(!wake(sample))return;wakeWaiting=false;state('LISTENING');fx('WAKE');const clean=stripWake(final||sample);onStatus?.(clean?'Jarvis duydu. Komut alındı.':'Jarvis duydu · Komutunuzu söyleyin.');if(clean){finishListen();onText?.(clean);}return;}
   if(interim)onStatus?.(interim);
   if(final.trim()){const text=wakeMode?stripWake(final)||final.trim():final.trim();finishListen();onStatus?.('Mesaj alındı.');onText?.(text);}
  };
  local.onerror=e=>{if(local!==recognition||stopping)return;const errors={'not-allowed':'Mikrofon izni kapalı.','service-not-allowed':'Tarayıcı ses tanıma hizmetine izin vermiyor.','audio-capture':'Mikrofon bulunamadı veya kullanımda.','network':'Ses tanıma ağına bağlanılamadı.','no-speech':wakeMode?'Jarvis çağrısı bekleniyor.':'Ses algılanmadı.','aborted':'Dinleme durduruldu.'};if(e.error==='no-speech'&&wakeMode)return;finishListen(true);state('ERROR');onStatus?.(errors[e.error]||'Ses tanıma başlatılamadı.');};
  local.onend=()=>{if(local!==recognition||stopping)return;if(wakeMode&&listening){try{local.start();return;}catch{}}finishListen(true);if(lastState!=='ERROR'){state('IDLE');onStatus?.('Mikrofon kapalı.');}};
  local.start();return true;
 }catch(e){stop({silent:true});state('ERROR');onStatus?.('Mikrofon izni veya ses aygıtı kullanılamıyor.');return false;}
}
function finishListen(keepState=false){const r=recognition;recognition=null;listening=false;try{if(r){r.onend=null;r.abort();}}catch{}stopMic();stopMeter();if(!keepState&&lastState==='WAITING_WAKE_WORD')state('IDLE');}
async function speak(text,post,onStatus){
 stop({silent:true});const clean=String(text||'').trim();if(!clean){state('IDLE');return;}
 try{const result=await post('tts',{text:clean.slice(0,4000)});audio=new Audio(`data:${result.mime};base64,${result.audio}`);meterContext=new (window.AudioContext||window.webkitAudioContext)();if(meterContext.state==='suspended')await meterContext.resume();const source=meterContext.createMediaElementSource(audio);meter(source,{destination:true});await new Promise((resolve,reject)=>{audio.onplay=()=>{state('SPEAKING');onStatus?.('JARVIS konuşuyor · AI tarafından üretilen ses.');};audio.onended=()=>resolve();audio.onerror=()=>reject(new Error('audio playback'));audio.play().catch(reject);});stop({silent:true});state('IDLE');onStatus?.('Sesli yanıt tamamlandı.');return;
 }catch{stop({silent:true});onStatus?.('AI TTS bağlı değil; tarayıcı sesi kullanılıyor.');}
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){state('IDLE');return;}
 await new Promise(resolve=>{const u=new SpeechSynthesisUtterance(clean);u.lang='tr-TR';u.rate=.96;u.pitch=.92;let timer=0;u.onstart=()=>{state('SPEAKING');onStatus?.('JARVIS konuşuyor · tarayıcı TTS yedeği.');timer=setInterval(()=>{const pulse=.12+Math.random()*.42;emitLevel(pulse);},90);};u.onboundary=()=>emitLevel(.35+Math.random()*.35);u.onend=()=>{clearInterval(timer);emitLevel(0);resolve();};u.onerror=()=>{clearInterval(timer);emitLevel(0);resolve();};speechSynthesis.speak(u);});state('IDLE');
}
window.JarvisVoice={listen,speak,stop,wake,stripWake,fx,isListening:()=>listening,state:()=>lastState};window.addEventListener('pagehide',()=>stop({silent:true}));
})();
