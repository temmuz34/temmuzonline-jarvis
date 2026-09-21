'use strict';
const B=require('./business-engine.cjs');
async function body(req){let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>1024*1024)throw new Error('İstek çok büyük.');}return JSON.parse(data||'{}');}
function createBusinessAPI({getState,persist,runAudit,providers}){
 let queue=Promise.resolve();
 function transaction(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}
 return async function handle(req,res,pathname,json){
 if(!pathname.startsWith('/api/business/'))return false;
 try{
 const state=getState(),b=B.ensure(state),name=pathname.slice('/api/business/'.length);
 if(req.method==='GET'){
  const url=new URL(req.url,'http://localhost');
  if(name==='state'){const safe={...b,oauthConnections:(b.oauthConnections||[]).map(({accessToken,refreshToken,...meta})=>meta)};json(res,200,{business:safe,reports:state.reports.map(r=>({id:r.id,title:r.title,createdAt:r.createdAt})),daily:B.daily(state),integrations:providers.status(),google:state.growth.google});return true;}
  if(name==='daily-brief'){const d=B.daily(state);json(res,200,{day:d.day,summary:{events:d.events.length,activities:d.activities.length,openActions:d.waiting.length,blockedProcesses:d.blocked.length},completed:d.completed,waiting:d.waiting,blocked:d.blocked,nextActions:d.nextActions,criticalFindings:b.findings.filter(f=>['critical','high'].includes(f.severity)&&f.status!=='RESOLVED').slice(-10)});return true;}
  if(name==='findings'){json(res,200,{findings:b.findings.slice(-200)});return true;}
  if(name==='actions'){json(res,200,{actions:b.actions.slice(-200)});return true;}
  if(name==='processes'){json(res,200,{processes:b.processes.slice(-100)});return true;}
  if(name==='content'){json(res,200,{content:b.content.slice(-200)});return true;}
  if(name==='activity'){json(res,200,{activities:b.activities.slice(-300)});return true;}
  if(name==='report'){const report=state.reports.find(r=>r.id===url.searchParams.get('id'))||state.reports.at(-1);json(res,200,{report:report||null,brief:state.briefs?.find(x=>x.reportId===report?.id)||null,findings:b.findings.filter(f=>f.reportId===report?.id)});return true;}
  json(res,404,{error:'Bulunamadı.'});return true;
 }
 if(req.method!=='POST'||req.headers['x-temmuz-client']!=='operations-v12'||!String(req.headers['content-type']).startsWith('application/json')){json(res,403,{error:'İstek reddedildi.'});return true;}
 const input=await body(req);
 const result=await transaction(async()=>{
  const state=getState(),b=B.ensure(state);
  let result;
  switch(name){
   case 'actions/create':result=B.createAction(state,input);break;
   case 'actions/update':result=B.updateAction(state,input.actionId,input);break;
   case 'actions/recheck':{const a=b.actions.find(x=>x.actionId===input.actionId);if(!a)throw new Error('Görev bulunamadı.');B.updateAction(state,a.actionId,{status:'RECHECK_REQUIRED'});await persist();const audit=await runAudit(true);B.verifyActions(getState(),audit);await persist();result=getState().business.actions.find(x=>x.actionId===input.actionId);break;}
   case 'processes/create':result=B.createProcess(state,input);break;
   case 'processes/advance':{const p=b.processes.find(x=>x.processId===input.processId);if(!p)throw new Error('Süreç bulunamadı.');B.processState(state,p);if(p.status==='BLOCKED')throw new Error(p.nextAction);const stage=p.stages.find(x=>x.stageId===p.currentStage);if(stage)stage.status='DONE';result=B.processState(state,p);B.activity(state,'process_advance',p.nextAction||'Süreç tamamlandı.',p.processId);break;}
   case 'notifications/read':{const n=b.notifications.find(x=>x.notificationId===input.notificationId);if(n)n.readAt=B.iso();result={ok:true};break;}
   case 'settings':b.preferences={...b.preferences,notifications:input.notifications!==false,motion:input.motion!==false,voice:input.voice===true,wakeWord:input.wakeWord===true};result=b.preferences;break;
   case 'content/create':{if(!input.title||!['Instagram','LinkedIn'].includes(input.platform))throw new Error('Başlık ve platform gerekli.');const c={contentId:B.id('content'),platform:input.platform,format:String(input.format||'text').slice(0,30),brand:'TemmuzOnline',product:String(input.product||'').slice(0,200),title:String(input.title).slice(0,200),caption:String(input.caption||'').slice(0,5000),cta:String(input.cta||'').slice(0,500),visual:null,videoScript:'',voiceover:'',hashtags:[],scheduledAt:null,status:'DRAFT',publishedUrl:null,publishingResult:null,createdAt:B.iso(),updatedAt:B.iso()};b.content.push(c);B.event(state,'CONTENT_CREATED','content',c.contentId,c.title);B.activity(state,'draftContent','İçerik taslağı oluşturuldu.',c.contentId);result=c;break;}
   case 'content/edit':{const c=b.content.find(x=>x.contentId===input.contentId);if(!c||!['DRAFT','VISUAL_REQUIRED','VISUAL_READY'].includes(c.status))throw new Error('Bu içerik düzenlenemez.');for(const key of ['title','caption','cta','videoScript','voiceover','visual'])if(typeof input[key]==='string')c[key]=input[key].slice(0,5000);if(c.visual){const u=new URL(c.visual);if(u.protocol!=='https:')throw new Error('Görsel HTTPS adresi olmalı.');}c.updatedAt=B.iso();result=c;break;}
   case 'content/status':result=B.contentStatus(state,input.contentId,input.status,input);break;
   case 'content/publish':result=await providers.publish(state,input);break;
   case 'content/image':{const asset=await providers.image(input);b.assets.push(asset);const c=b.content.find(x=>x.contentId===input.contentId);if(c)c.visual=asset.url||`data:image/png;base64,${asset.b64||''}`;result=asset;break;}
   case 'chat':result=await providers.chat(state,input);break;
   case 'memory/import':{if(!String(input.text||'').trim())throw new Error('Konuşma özeti gerekli.');const raw=String(input.text).slice(0,15000),extraction=providers.memoryExtract?await providers.memoryExtract(raw):{decisions:[],requests:[],pendingActions:[],approvedIdeas:[],businessRules:[],followUps:[]};const item={instructionId:B.id('instruction'),sourceRef:String(input.sourceRef||'manual').slice(0,200),text:raw,createdAt:B.iso(),status:'REVIEW_REQUIRED',...extraction};b.instructions.push(item);B.event(state,'USER_INSTRUCTION','memory',item.instructionId,'Konuşma özeti inceleme için kaydedildi.',{sourceRef:item.sourceRef});result=item;break;}
   case 'memory/action':{const source=b.instructions.find(x=>x.instructionId===input.instructionId);if(!source)throw new Error('Özet bulunamadı.');result=B.createAction(state,{title:input.title,why:source.text.slice(0,2000),exactStep:input.exactStep});break;}
   case 'approvals/decide':{const a=b.approvals.find(x=>x.approvalId===input.approvalId);if(!a||a.status!=='WAITING_APPROVAL')throw new Error('Bekleyen onay bulunamadı.');if(input.approve!==true){a.status='DISMISSED';result=a;break;}if(a.tool==='createAction')result=B.createAction(state,a.args);else if(a.tool==='updateAction')result=B.updateAction(state,a.args.actionId,a.args);else if(a.tool==='draftContent'){const x=a.args||{};if(!x.title||!['Instagram','LinkedIn'].includes(x.platform))throw new Error('Taslak için başlık ve platform gerekli.');const c={contentId:B.id('content'),platform:x.platform,format:String(x.format||'text'),brand:'TemmuzOnline',product:String(x.product||''),title:String(x.title).slice(0,200),caption:String(x.caption||'').slice(0,5000),cta:String(x.cta||''),visual:null,videoScript:'',voiceover:'',hashtags:[],scheduledAt:null,status:'DRAFT',publishedUrl:null,publishingResult:null,createdAt:B.iso(),updatedAt:B.iso()};b.content.push(c);B.event(state,'CONTENT_CREATED','content',c.contentId,c.title);result=c;}else if(a.tool==='preparePublish')result=await providers.publish(state,{contentId:a.args.contentId,approved:true});else throw new Error('Bu öneri için desteklenen onay işlemi yok.');a.status='APPROVED';a.decidedAt=B.iso();B.activity(state,'approval','Kullanıcı öneriyi onayladı.',a.approvalId,'DONE',a.approvalId);break;}
   case 'tts':result=await providers.tts(input);break;
   case 'stt':result=await providers.stt(input);break;
   default:throw new Error('İşlem desteklenmiyor.');
  }
  await persist();return result;
 });json(res,200,result);return true;
 }catch(e){json(res,400,{error:e.publicMessage||e.message||'İşlem tamamlanamadı.'});return true;}
 };
}
module.exports={createBusinessAPI};
