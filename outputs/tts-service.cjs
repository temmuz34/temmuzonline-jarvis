'use strict';
const DEFAULT_STYLE='Türkçe konuş. Sakin, kontrollü, kendinden emin ve doğal bir yapay zekâ operasyon asistanı gibi konuş. Aşırı dramatik veya mekanik olma. Cümleleri net, orta tempoda ve kısa doğal duraklamalarla oku. Sayıları, yüzdeleri ve para birimlerini açık telaffuz et.';
function createTTS(env=process.env,fetcher=fetch){
 const configured=()=>env.VOICE_JARVIS_ENABLED==='true'&&env.TTS_PROVIDER==='openai'&&!!env.TTS_MODEL&&!!env.TTS_VOICE&&!!env.AI_API_KEY;
 const instructionCapable=()=>/gpt-4o.*tts/i.test(String(env.TTS_MODEL||''));
 return {
  status:()=>({status:configured()?'CONFIGURED_UNVERIFIED':'SETUP_REQUIRED',fallback:'Browser TTS',model:env.TTS_MODEL||null,voice:env.TTS_VOICE||null,style:instructionCapable()?'PROMPTED':'MODEL_DEFAULT'}),
  async speak({text}){
   if(!configured())throw new Error('Kaliteli AI TTS sağlayıcısı bağlı değil.');
   if(!String(text||'').trim()||text.length>4000)throw new Error('Ses metni 1-4000 karakter olmalı.');
   const body={model:env.TTS_MODEL,voice:env.TTS_VOICE,input:text,response_format:'mp3'};
   if(instructionCapable())body.instructions=String(env.TTS_INSTRUCTIONS||DEFAULT_STYLE).slice(0,1200);
   const r=await fetcher('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${env.AI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
   if(!r.ok)throw new Error(`TTS başarısız (${r.status}).`);
   return {audio:Buffer.from(await r.arrayBuffer()).toString('base64'),mime:'audio/mpeg',provider:'openai'};
  }
 };
}
module.exports={createTTS};
