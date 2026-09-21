'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const M=require('./operations-model.js');
const G=require('./growth-model.js');
const B=require('./business-engine.cjs');
const {audit}=require('./site-audit.cjs');
const {createStorage}=require('./storage.cjs');
const {createGoogleService}=require('./google-service.cjs');
const {makeExecutiveBrief,appendReport}=M;
const google=createGoogleService(),storage=createStorage();
const crypto=require('node:crypto');
const port=Number(process.env.PORT||process.env.TEMMUZ_PORT||8766);
const host=process.env.HOST||'0.0.0.0';
const authUser=process.env.TEMMUZ_AUTH_USER||'';
const authPassword=process.env.TEMMUZ_AUTH_PASSWORD||'';
const authEnabled=Boolean(authUser&&authPassword);
const root=__dirname;
let state=M.initial(),configRevision=0,storageHealth=null,storageReady=Promise.resolve();
storageReady=Promise.resolve(storage.load()).then(stored=>{if(stored){state=M.hydrate(stored.state);configRevision=stored.configRevision||0;}return Promise.resolve(storage.health()).then(h=>{storageHealth=h;});});
let saveQueue=Promise.resolve();
async function persist(){for(const report of state.reports)B.ingestReport(state,report);const value=structuredClone({configRevision,state});const saving=saveQueue.then(()=>storage.save(value));saveQueue=saving.catch(()=>{});await saving;try{storageHealth=await storage.health();}catch{}}
let pendingAudit=null,pendingSchedule=null,lastAuditAttempt=Date.parse(state.growth.checks.at(-1)?.at)||0;
async function runAudit(force=false){
  if(pendingAudit)return pendingAudit;
  if(!force&&Date.now()-lastAuditAttempt<12*60000&&state.growth.checks.length)return state.growth.checks.at(-1);
  lastAuditAttempt=Date.now();
  pendingAudit=(async()=>{const result=await audit();const old=state;state={...state,growth:{...state.growth,checks:[...state.growth.checks,result].slice(-30)}};try{await persist();}catch(e){state=old;throw e;}return result;})();
  try{return await pendingAudit;}finally{pendingAudit=null;}
}
async function schedule(now=Date.now()){
  if(pendingSchedule)return pendingSchedule;
  if(!M.dueSlots(state,now).length)return;
  pendingSchedule=(async()=>{
  await runAudit();
  await Promise.allSettled(['analytics','searchConsole'].map(kind=>syncGoogle(kind)));
  const googleStatus=google.status();
  const due=M.dueSlots(state,now);if(!due.length)return;
  storageHealth=await storage.health();
  const next={...state,reports:[...state.reports]};
  for(const slot of due)appendReport(next,M.makeReport(state,{now,slot}),now,{storage:storageHealth,google:googleStatus,googleError:Boolean(googleStatus.lastError)});
  next.reports=next.reports.slice(-60);const old=state;state=next;
  try{await persist();}catch(e){state=old;throw e;}
  })();
  try{return await pendingSchedule;}finally{pendingSchedule=null;}
}
function publicState(){const safeBusiness=state.business?{...state.business,oauthConnections:(state.business.oauthConnections||[]).map(({accessToken,refreshToken,...meta})=>meta)}:state.business;return {service:'temmuz-operations-v12',timeZone:'Europe/Istanbul',configRevision,state:{...state,business:safeBusiness,messages:[],serviceHealth:{storage:storageHealth,google:google.status()}}};}
async function syncGoogle(kind,force=false){
 const data=await google.get(kind,force);state.growth.google={...state.growth.google,[kind]:data};
 B.event(state,'INTEGRATION_RECOVERED',kind,kind,`${kind} verisi alındı.`,{at:data.at});
 for(const key of kind==='analytics'?['sessions','ecommercePurchases']:['clicks'])if(Number.isFinite(data.changes?.[key])&&Math.abs(data.changes[key])>=20)B.event(state,kind==='analytics'?(key==='sessions'?'GA4_TRAFFIC_CHANGE':'GA4_PURCHASE_CHANGE'):'SEARCH_POSITION_CHANGE',kind,key,`${key}: %${data.changes[key]} değişim`,{at:data.at,change:data.changes[key]},'high');
 const history=state.growth.googleHistory||[];
 if(!history.some(x=>x.kind===kind&&x.at===data.at))state.growth.googleHistory=[...history,{kind,at:data.at,current:data.current}].slice(-30);
 await persist();return data;
}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
function authorized(req,res){
  if(!authEnabled)return true;
  const header=String(req.headers.authorization||'');
  if(header.startsWith('Basic ')){
    try{const decoded=Buffer.from(header.slice(6),'base64').toString('utf8');const split=decoded.indexOf(':');if(split>=0&&decoded.slice(0,split)===authUser&&decoded.slice(split+1)===authPassword)return true;}catch{}
  }
  res.writeHead(401,{'WWW-Authenticate':'Basic realm="TemmuzOnline Operations", charset="UTF-8"','Cache-Control':'no-store'});res.end('Authentication required');return false;
}
function validConfig(c){return c&&M.validTimes(c.settings?.times)&&typeof c.settings.enabled==='boolean'&&typeof c.settings.speech==='boolean'&&Array.isArray(c.experts)&&c.experts.length<=100&&new Set(c.experts.map(e=>e.id)).size===c.experts.length&&c.experts.every(e=>e&&typeof e.id==='string'&&e.id.length<=100&&typeof e.name==='string'&&e.name.trim()&&e.name.length<=60&&typeof e.role==='string'&&e.role.trim()&&e.role.length<=80&&typeof e.task==='string'&&e.task.trim()&&e.task.length<=180&&typeof e.note==='string'&&e.note.length<=1500&&typeof e.active==='boolean'&&/^#[a-f0-9]{6}$/i.test(e.color));}
const providers=require('./business-providers.cjs').createProviders(process.env,fetch,storage);
const businessAPI=require('./business-api.cjs').createBusinessAPI({getState:()=>state,persist,runAudit,providers});
const monitor=require('./background-jobs.cjs').runner({getState:()=>state,persist,syncGoogle,runAudit,googleStatus:()=>google.status(),providers});
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.webm':'audio/webm','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return json(res,400,{error:'Geçersiz adres'});}
  if(pathname==='/api/scheduler/run'){
    const expected=process.env.SCHEDULE_SECRET||'',provided=String(req.headers.authorization||'').replace(/^Bearer /,'');
    const equal=expected&&crypto.timingSafeEqual(crypto.createHash('sha256').update(expected).digest(),crypto.createHash('sha256').update(provided).digest());
    if(req.method!=='POST'||!equal)return json(res,401,{error:'Zamanlayıcı yetkilendirmesi gerekli.'});
    try{await schedule();await monitor();return json(res,200,{ok:true,reports:state.reports.length});}catch{return json(res,503,{error:'Planlı rapor kaydedilemedi.'});}
  }
  if(!authorized(req,res))return;
  if(pathname.startsWith('/api/oauth/')){const parts=pathname.split('/').filter(Boolean),provider=providers.adapters?.[parts[2]];if(!provider)return json(res,404,{error:'OAuth sağlayıcısı bulunamadı.'});if(req.method!=='GET')return json(res,405,{error:'Yöntem desteklenmiyor'});if(parts[3]==='authorize')return json(res,200,{url:provider.getAuthorizationUrl?.()||null,status:provider.getConnectionStatus()});if(parts[3]==='callback'){const q=new URL(req.url,'http://localhost').searchParams;try{const result=await provider.handleCallback({code:q.get('code')});const meta=provider.getTokenMetadata?.();if(meta){const b=B.ensure(state);b.oauthConnections=b.oauthConnections||[];b.oauthConnections=b.oauthConnections.filter(x=>x.provider!==meta.provider);b.oauthConnections.push({...meta,accessToken:undefined,accessTokenCipher:meta.accessToken?Buffer.from(meta.accessToken).toString('base64'):null});await persist();}return json(res,200,result);}catch(e){return json(res,400,{error:e.message});}}if(parts[3]==='status')return json(res,200,provider.getConnectionStatus());return json(res,404,{error:'OAuth rotası bulunamadı.'});}
  if(await businessAPI(req,res,pathname,json))return;
  if(pathname==='/api/google/status'&&req.method==='GET'){try{const storageStatus=await storage.health();storageHealth=storageStatus;return json(res,200,{...google.status(),storage:storageStatus,authEnabled,schedulerConfigured:!!process.env.SCHEDULE_SECRET,server:'Sunucu bağlantısı aktif'});}catch{return json(res,503,{error:'Storage health alınamadı.',...google.status(),storage:storageHealth});}}
  if(['/api/google/analytics/summary','/api/google/search-console/summary'].includes(pathname)){
    if(req.method!=='GET')return json(res,405,{error:'Yöntem desteklenmiyor'});
    try{const force=new URL(req.url,'http://localhost').searchParams.get('refresh')==='1';const data=await syncGoogle(pathname.includes('/analytics/')?'analytics':'searchConsole',force);return json(res,200,data);}catch(e){return json(res,[401,403,429].includes(e.status)?e.status:503,{error:e.message});}
  }
  if(pathname==='/api/operations'){
    if(req.method==='GET')return json(res,200,publicState());
    if(req.method!=='POST')return json(res,405,{error:'Yöntem desteklenmiyor'});
    if(req.headers['x-temmuz-client']!=='operations-v12'||!String(req.headers['content-type']).startsWith('application/json'))return json(res,403,{error:'İstek kaynağı reddedildi'});
    let body='',bytes=0;
    req.on('data',chunk=>{bytes+=chunk.length;if(bytes>2*1024*1024){req.destroy();return;}body+=chunk;});
    req.on('end',async()=>{
      try{
        const input=JSON.parse(body);
        if(input.config&&!validConfig(input.config))return json(res,400,{error:'Ekip veya rapor ayarları geçersiz.'});
        if(input.config?.growth&&!G.valid(input.config.growth))return json(res,400,{error:'İçerik veya analiz kaydı geçersiz.'});
        if(input.config&&input.configRevision!==configRevision)return json(res,409,{error:'Ayarlar başka bir sekmede güncellendi.',...publicState()});
        const oldState=state,oldRevision=configRevision;
        let next={...state,reports:[...state.reports],briefs:[...(state.briefs||[])]};
        if(input.config){next.experts=input.config.experts;next.settings=input.config.settings;B.ensure(next).preferences.wakeWord=next.settings.wakeWord===true;if(input.config.growth)next.growth={...input.config.growth,checks:state.growth.checks,google:state.growth.google,googleHistory:state.growth.googleHistory};configRevision++;}
        if(Array.isArray(input.reports)){
          const reports=M.hydrate({version:12,reports:input.reports}).reports;
          const runtimeHealth={storage:storageHealth,google:google.status(),googleError:Boolean(google.status().lastError)};
          for(const r of reports)appendReport(next,r,Date.parse(r.createdAt)||Date.now(),runtimeHealth);
          next.reports.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));next.reports=next.reports.slice(-60);
        }
        state=next;
        await persist();
        await schedule();
        return json(res,200,publicState());
      }catch{return json(res,400,{error:'Kayıt işlenemedi.'});}
    });return;
  }
  if(pathname==='/api/site-audit'){
    if(req.method!=='POST'||req.headers['x-temmuz-client']!=='operations-v12')return json(res,403,{error:'İstek kaynağı reddedildi'});
    try{await runAudit(new URL(req.url,'http://localhost').searchParams.get('refresh')==='1');return json(res,200,publicState());}catch{return json(res,500,{error:'Site taraması kaydedilemedi.'});}
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Yöntem desteklenmiyor'});
  if(pathname==='/')pathname='/temmuz_jarvis_v12_operations.html';
  if(['/report-intelligence.html','/actions.html','/jarvis.html','/publishing.html','/activity.html','/business-settings.html'].includes(pathname))pathname='/business-workspace.html';
  const target=path.resolve(root,'.'+pathname),relative=path.relative(root,target),type=mime[path.extname(target)];
  if(relative.startsWith('..')||path.isAbsolute(relative)||!type)return json(res,404,{error:'Bulunamadı'});
  fs.stat(target,(err,stat)=>{
    if(err||!stat.isFile())return json(res,404,{error:'Bulunamadı'});
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(target);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;clearInterval(timer);});
storageReady.then(()=>{persist().then(()=>schedule()).catch(e=>console.error('Startup:',e.message));server.listen(port,host,()=>console.log(`TemmuzOnline: http://localhost:${port}/temmuz_jarvis_v12_operations.html`));}).catch(e=>{console.error(e.message);process.exitCode=1;});
const timer=setInterval(()=>{schedule().then(()=>monitor()).catch(e=>console.error('Schedule:',e.message));},15000);
function close(){clearInterval(timer);server.close();}
process.on('SIGTERM',close);process.on('SIGINT',close);
