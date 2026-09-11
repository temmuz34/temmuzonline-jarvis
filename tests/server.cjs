'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const M=require('../outputs/operations-model.js');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'temmuz-tests-')),state=M.initial();state.settings.times=['00:00','00:01'];
 state.growth.checks=[{at:new Date().toISOString(),results:[]}];
 const expectedReports=M.dueSlots(state).length;
 fs.writeFileSync(path.join(dir,'operations.json'),JSON.stringify({state,configRevision:0}));
 const child=spawn(process.execPath,[path.resolve(__dirname,'../outputs/operations-server.cjs')],{env:{...process.env,PORT:'8892',TEMMUZ_DATA_DIR:dir,TEMMUZ_AUTH_USER:'test-user',TEMMUZ_AUTH_PASSWORD:'test-pass',SCHEDULE_SECRET:'test-schedule',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',GOOGLE_REFRESH_TOKEN:''},stdio:'ignore',windowsHide:true});
 const exit=new Promise(r=>child.once('exit',r));
 try{
  const base='http://localhost:8892',headers={Authorization:'Basic '+Buffer.from('test-user:test-pass').toString('base64'),'X-Temmuz-Client':'operations-v12','Content-Type':'application/json'};
  for(let i=0;i<50;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert.equal((await fetch(base)).status,401);assert.equal((await fetch(base,{headers})).status,200);
  const status=await(await fetch(base+'/api/google/status',{headers})).json();assert.equal(status.analytics,false);assert.equal(status.storage.persistent,false);assert.ok(status.authEnabled);
  const ga=await fetch(base+'/api/google/analytics/summary',{headers});assert.equal(ga.status,503);assert.match((await ga.json()).error,/GA4 mülk/);
  assert.equal((await fetch(base+'/api/scheduler/run',{method:'POST',headers})).status,401);
  const run=()=>fetch(base+'/api/scheduler/run',{method:'POST',headers:{Authorization:'Bearer test-schedule'}}).then(r=>r.json());
  const a=await run(),b=await run();assert.equal(a.ok,true);assert.equal(a.reports,b.reports);assert.equal(a.reports,expectedReports);
  const config={experts:state.experts,settings:state.settings,growth:state.growth};config.experts[0].note='Persist this note';
  const save=await fetch(base+'/api/operations',{method:'POST',headers:{...headers,Origin:'https://temmuzonline-jarvis.onrender.com'},body:JSON.stringify({configRevision:0,config})});assert.equal(save.status,200);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'operations.json'))).state.experts[0].note,'Persist this note');
  assert.equal((await fetch(base+'/api/operations',{method:'POST',headers,body:JSON.stringify({configRevision:0,config})})).status,409);
  assert.equal((await fetch(base+'/google-auth.cjs',{headers})).status,404);
  console.log('PASS: PORT, authentication, scheduler secret and active report idempotency, persistence, live-origin POST, revision conflicts, server source blocked.');
 }finally{child.kill();await exit;fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
