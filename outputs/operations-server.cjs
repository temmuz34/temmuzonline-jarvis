'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const M=require('./operations-model.js');
const G=require('./growth-model.js');
const {audit}=require('./site-audit.cjs');
const port=Number(process.env.PORT||process.env.TEMMUZ_PORT||8766);
const host=process.env.HOST||'0.0.0.0';
const authUser=process.env.TEMMUZ_AUTH_USER||'';
const authPassword=process.env.TEMMUZ_AUTH_PASSWORD||'';
const authEnabled=Boolean(authUser&&authPassword);
const root=__dirname,dataDir=process.env.TEMMUZ_DATA_DIR||path.resolve(root,'../work/v12-runtime');
fs.mkdirSync(dataDir,{recursive:true});
const file=path.join(dataDir,'operations.json');
let state=M.initial(),configRevision=0;
if(fs.existsSync(file)){
  const stored=JSON.parse(fs.readFileSync(file,'utf8'));
  state=M.hydrate(stored.state);configRevision=stored.configRevision||0;
}
function persist(){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify({configRevision,state},null,2),'utf8');fs.renameSync(tmp,file);}
let pendingAudit=null,pendingSchedule=null,lastAuditAttempt=0;
async function runAudit(){
  if(pendingAudit)return pendingAudit;
  if(Date.now()-lastAuditAttempt<60000&&state.growth.checks.length)return state.growth.checks.at(-1);
  lastAuditAttempt=Date.now();
  pendingAudit=(async()=>{const result=await audit();const old=state;state={...state,growth:{...state.growth,checks:[...state.growth.checks,result].slice(-30)}};try{persist();}catch(e){state=old;throw e;}return result;})();
  try{return await pendingAudit;}finally{pendingAudit=null;}
}
async function schedule(now=Date.now()){
  if(pendingSchedule)return pendingSchedule;
  if(!M.dueSlots(state,now).length)return;
  pendingSchedule=(async()=>{
  await runAudit();
  const due=M.dueSlots(state,now);if(!due.length)return;
  const next={...state,reports:[...state.reports]};
  for(const slot of due)next.reports.push(M.makeReport(state,{now,slot}));
  next.reports=next.reports.slice(-60);const old=state;state=next;
  try{persist();}catch(e){state=old;throw e;}
  })();
  try{return await pendingSchedule;}finally{pendingSchedule=null;}
}
function publicState(){return {service:'temmuz-operations-v12',timeZone:'Europe/Istanbul',configRevision,state:{...state,messages:[]}};}
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
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
persist();
const server=http.createServer(async(req,res)=>{
  if(!authorized(req,res))return;
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return json(res,400,{error:'Geçersiz adres'});}
  if(pathname==='/api/operations'){
    if(req.method==='GET')return json(res,200,publicState());
    if(req.method!=='POST')return json(res,405,{error:'Yöntem desteklenmiyor'});
    if(req.headers['x-temmuz-client']!=='operations-v12'||!String(req.headers['content-type']).startsWith('application/json'))return json(res,403,{error:'İstek kaynağı reddedildi'});
    let body='',bytes=0;
    req.on('data',chunk=>{bytes+=chunk.length;if(bytes>2*1024*1024){req.destroy();return;}body+=chunk;});
    req.on('end',()=>{
      try{
        const input=JSON.parse(body);
        if(input.config&&!validConfig(input.config))return json(res,400,{error:'Ekip veya rapor ayarları geçersiz.'});
        if(input.config?.growth&&!G.valid(input.config.growth))return json(res,400,{error:'İçerik veya analiz kaydı geçersiz.'});
        if(input.config&&input.configRevision!==configRevision)return json(res,409,{error:'Ayarlar başka bir sekmede güncellendi.',...publicState()});
        const oldState=state,oldRevision=configRevision;
        let next={...state,reports:[...state.reports]};
        if(input.config){next.experts=input.config.experts;next.settings=input.config.settings;if(input.config.growth)next.growth={...input.config.growth,checks:state.growth.checks};configRevision++;}
        if(Array.isArray(input.reports)){
          const reports=M.hydrate({version:12,reports:input.reports}).reports;
          const known=new Set(next.reports.map(r=>r.id));
          for(const r of reports)if(!known.has(r.id)){next.reports.push(r);known.add(r.id);}
          next.reports.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));next.reports=next.reports.slice(-60);
        }
        state=next;
        try{persist();schedule().catch(e=>console.error('Schedule:',e.message));}catch(e){state=oldState;configRevision=oldRevision;throw e;}
        return json(res,200,publicState());
      }catch{return json(res,400,{error:'Kayıt işlenemedi.'});}
    });return;
  }
  if(pathname==='/api/site-audit'){
    if(req.method!=='POST'||req.headers['x-temmuz-client']!=='operations-v12')return json(res,403,{error:'İstek kaynağı reddedildi'});
    try{await runAudit();return json(res,200,publicState());}catch{return json(res,500,{error:'Kontrol kaydedilemedi.'});}
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Yöntem desteklenmiyor'});
  if(pathname==='/')pathname='/temmuz_jarvis_v12_operations.html';
  const target=path.resolve(root,'.'+pathname),relative=path.relative(root,target),type=mime[path.extname(target)];
  if(relative.startsWith('..')||path.isAbsolute(relative)||!type)return json(res,404,{error:'Bulunamadı'});
  fs.stat(target,(err,stat)=>{
    if(err||!stat.isFile())return json(res,404,{error:'Bulunamadı'});
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(target);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;clearInterval(timer);});
server.listen(port,host,()=>{schedule().catch(e=>console.error('Schedule:',e.message));console.log(`TemmuzOnline: http://localhost:${port}/temmuz_jarvis_v12_operations.html`);});
const timer=setInterval(()=>{schedule().catch(e=>console.error('Schedule:',e.message));},15000);
function close(){clearInterval(timer);server.close();}
process.on('SIGTERM',close);process.on('SIGINT',close);
