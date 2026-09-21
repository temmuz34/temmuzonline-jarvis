'use strict';
const messages={400:'Google isteği reddedildi. Refresh token veya parametre geçersiz olabilir.',401:'Google yetkilendirmesi gerekli.',403:'Bu Google hesabında gerekli erişim bulunamadı.',429:'Google API kullanım kotası geçici olarak doldu.'};
function createGoogleAuth(env=process.env,fetcher=fetch){
 let token=null,expires=0,pending;
 const configured=()=>Boolean(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.GOOGLE_REFRESH_TOKEN);
 async function access(){
  if(!configured())throw Object.assign(new Error(messages[401]),{status:401});
  if(token&&Date.now()<expires)return token;
  if(pending)return pending;
  pending=(async()=>{
   const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,refresh_token:env.GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});
   if(!r.ok){
    const detail=await r.text().catch(()=>'');
    console.error('[google] token refresh failed',r.status,detail.slice(0,600));
    throw Object.assign(new Error(`${messages[r.status]||messages[401]} (token yenileme HTTP ${r.status})`),{status:r.status});
   }
   const data=await r.json();if(!data.access_token)throw new Error(messages[401]);
   // Teşhis için kritik: token hangi scope'lara sahip? Eksik scope en sık görülen sebep.
   console.log('[google] token refreshed, scopes:',data.scope||'(scope alanı dönmedi)');
   token=data.access_token;expires=Date.now()+Math.max(0,Number(data.expires_in||3600)-60)*1000;return token;
  })();try{return await pending;}finally{pending=null;}
 }
 async function request(url,body,propertyLabel){
  try{
   const r=await fetcher(url,{method:'POST',headers:{Authorization:`Bearer ${await access()}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
   if(!r.ok){
    if(r.status===401){token=null;expires=0;}
    const detail=await r.text().catch(()=>'');
    console.error('[google] API error',r.status,propertyLabel,detail.slice(0,600));
    throw Object.assign(new Error(`${messages[r.status]||`${propertyLabel} mülküne erişilemiyor.`} (HTTP ${r.status})`),{status:r.status});
   }
   return await r.json();
  }catch(e){if(e.status)throw e;throw new Error('Google servisine ulaşılamadı. Bağlantıyı tekrar deneyin.');}
 }
 return {configured,request};
}
module.exports={createGoogleAuth};
