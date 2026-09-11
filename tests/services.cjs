'use strict';
const assert=require('node:assert/strict');
const {audit,inspect}=require('../outputs/site-audit.cjs');
const {createGoogleService}=require('../outputs/google-service.cjs');
const {route}=require('../outputs/jarvis-router.js');
const {insights}=require('../outputs/insight-engine.js');
const G=require('../outputs/growth-model.js');
async function main(){
 for(const q of ['son durum','son durum nedir','bugün durum nedir','bugünkü durum','satış durumu','şu an durum ne'])assert.equal(route(q).kind,'sales',q);
 for(const q of ['siteyi tara','site tara','temmuzonline sitesini tara',"temmuzonline.com’u tara",'web sitesini tara','site kontrolü','siteyi kontrol et','seo tara','teknik seo tara'])assert.equal(route(q).kind,'audit',q);
 for(const q of ['Google son durum','Google raporlarını tara','analytics tara','search console tara','organik trafik neden düştü',"Google’da yükselen kelimeler",'pozisyon 8-20 fırsatları'])assert.equal(route(q).kind,'google',q);
 assert.equal(route('Instagram son durum').kind,'content');assert.equal(route('reklam son durum').kind,'ads');
 assert.deepEqual(insights(),[]);assert.equal(route('siteyi tekrar tara').force,true);
 let called=0;await inspect('http://localhost/',async()=>{called++;});assert.equal(called,0);
 const visited=[];const result=await audit(async url=>{visited.push(url);if(url.endsWith('/robots.txt'))return new Response('User-agent: *\nDisallow: /private');if(url.endsWith('.xml'))return new Response('<urlset>'+['https://evil.example/','https://temmuzonline.com/private',...Array.from({length:50},(_,i)=>`https://temmuzonline.com/p${i}`)].map(u=>`<url><loc>${u}</loc></url>`).join('')+'</urlset>');if(url.endsWith('/p0'))return new Response('missing',{status:404});return new Response('<html><title>Duplicate title for testing</title><h1>Product</h1><img src="a.jpg"><a href="/p0">Broken</a></html>',{headers:{'Content-Type':'text/html'}});});
 assert.ok(result.pages.length<=30);assert.ok(!visited.some(x=>x.includes('evil')||x.endsWith('/private')));assert.ok(result.issues.some(i=>i.code==='duplicate-title'));assert.ok(result.issues.some(i=>i.code==='broken-link'));assert.ok(result.issues.some(i=>i.code==='image-alt'));assert.ok(G.valid({...G.initial(),checks:[result]}));
 const env={GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture-secret',GOOGLE_REFRESH_TOKEN:'fixture-token',GA4_PROPERTY_ID:'123',SEARCH_CONSOLE_SITE_URL:'sc-domain:temmuzonline.com'};let tokens=0,requests=0;
 const mock=async(url,options)=>{requests++;if(url.includes('oauth2')){tokens++;return Response.json({access_token:'fixture-access',expires_in:3600});}const body=JSON.parse(options.body);if(url.includes('analyticsdata')){
  if(body.metrics.length>1&&!body.dimensions.length)return Response.json({}, {status:400});
  if(body.metrics.some(m=>m.name==='addToCarts'))return Response.json({}, {status:400});
  return Response.json({rows:[{dimensionValues:[{value:'mobile'}],metricValues:body.metrics.map(()=>({value:body.dateRanges[0].startDate<new Date(Date.now()-8*86400000).toISOString().slice(0,10)?'200':'100'}))}]});
 }return Response.json({rows:[{keys:body.dimensions.length?['test']:[],clicks:20,impressions:2000,ctr:0.01,position:12}]});};
 const google=createGoogleService(env,mock);const [a,s]=await Promise.all([google.get('analytics'),google.get('searchConsole')]);assert.equal(tokens,1);assert.equal(a.current.addToCarts,null);assert.equal(s.current.clicks,20);const before=requests;await google.get('analytics');assert.equal(requests,before);await google.get('analytics',true);assert.ok(requests>before);assert.ok(google.status().analytics);assert.ok(insights({analytics:a,searchConsole:s}).length);
 await assert.rejects(createGoogleService({},mock).get('analytics'),/GA4 mülk/);
 let failing=null;
 const tracked=createGoogleService(env,(url,options)=>url.includes(failing||'never-match')?Response.json({}, {status:403}):mock(url,options));
 assert.deepEqual(tracked.status().configured,{analytics:true,searchConsole:true});
 assert.equal(tracked.status().analytics,false);assert.equal(tracked.status().lastSync,null);
 await tracked.get('analytics');assert.equal(tracked.status().analytics,true);assert.equal(tracked.status().searchConsole,false);assert.ok(Number.isFinite(Date.parse(tracked.status().lastSync)));
 await tracked.get('searchConsole');assert.equal(tracked.status().searchConsole,true);assert.equal(tracked.status().lastError,null);
 for(const [kind,urlPart,other] of [['analytics','analyticsdata','searchConsole'],['searchConsole','webmasters','analytics']]){
  failing=urlPart;await assert.rejects(tracked.get(kind,true));assert.equal(tracked.status()[kind],false);assert.equal(tracked.status()[other],true);assert.ok(tracked.status().lastError);assert.deepEqual(tracked.status().configured,{analytics:true,searchConsole:true});
  await tracked.get(other,true);assert.ok(tracked.status().lastError);
  failing=null;await tracked.get(kind);assert.equal(tracked.status()[kind],true);assert.equal(tracked.status().lastError,null);
 }
 console.log('PASS: Google individual sync status, lastSync, partial failure, recovery and independent configuration.');
 for(const code of [401,403,429]){const service=createGoogleService(env,async u=>u.includes('oauth2')?Response.json({access_token:'fixture',expires_in:3600}):Response.json({}, {status:code}));await assert.rejects(service.get('analytics'),e=>e.status===code&&!e.message.includes('fixture-secret'));}
 console.log('PASS: router, real-data-only insights, crawler limits/robots/redirects/SEO, Google refresh/cache/fallback/error mappings.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
