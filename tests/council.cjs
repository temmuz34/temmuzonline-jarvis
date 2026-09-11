'use strict';
const assert=require('node:assert/strict');
const M=require('../outputs/operations-model.js');
const C=require('../outputs/council-report.js');
const {insights}=require('../outputs/insight-engine.js');
const now=Date.parse('2026-09-11T08:00:00+03:00'),state=M.initial();
state.growth.google={
 analytics:{source:'Google Analytics Data API',at:new Date(now).toISOString(),current:{sessions:1234,addToCarts:120,checkouts:80,ecommercePurchases:40},changes:{sessions:-25},breakdowns:{deviceCategory:[{name:'mobile',sessions:700,ecommercePurchases:10}],sessionDefaultChannelGroup:[{name:'Organic Search',sessions:900}]}},
 searchConsole:{source:'Google Search Console API',at:new Date(now).toISOString(),current:{clicks:120,impressions:7000},changes:{clicks:0},breakdowns:{queryPage:[{keys:['ürün A','https://temmuzonline.com/a'],position:5,impressions:5000,clicks:0},{keys:['ürün B','https://temmuzonline.com/b'],position:15,impressions:2000,clicks:10}],query:[]}}
};
const issue={code:'h1',severity:'critical',title:'0 H1 bulundu',url:'https://temmuzonline.com/a',action:'Sayfaya açıklayıcı ana başlık ekle.'};
state.growth.checks=[{at:new Date(now).toISOString(),score:60,counts:{critical:1},issues:[issue,{...issue}]}];
const report=M.makeReport(state,{now,id:'council-test'}),get=id=>report.entries.find(e=>e.id===id);
assert.equal(report.entries.length,16);
assert.ok(report.entries.every(e=>e.findings.length<=3&&e.actions.length<=3));
assert.ok(report.entries.every(e=>e.source.endsWith(report.snapshot.at)));
for(const id of ['lara','arda','ece'])assert.doesNotMatch(get(id).text,/bekleniyor|bağlı değil/);
assert.match(get('ece').text,/Checkout: 80/);
assert.equal(report.snapshot.googleStatus.analytics,true);assert.equal(report.snapshot.googleStatus.searchConsole,true);
assert.equal(report.entries.map(e=>e.text).join('\n').split('0 H1 bulundu').length-1,1);
assert.notEqual(get('atlas').text,get('bora').text);
assert.equal(new Set(['duru','can','ilay','selma'].map(id=>get(id).text)).size,4);
assert.equal(report.sales.label,'ÖRNEK SATIŞ VERİSİ');assert.match(get('mert').text,/ÖRNEK SATIŞ VERİSİ/);
assert.equal(report.seoOpportunities.length,2);assert.equal(report.seoOpportunities[0].page,'https://temmuzonline.com/a');
assert.ok(report.seoOpportunities[0].reasons.includes('Hızlı kazanım'));assert.ok(report.seoOpportunities[1].reasons.includes('Near-winner'));
assert.ok(report.seoOpportunities[0].reasons.includes('Gösterim var, tıklama yok'));
assert.ok(report.seoOpportunities[0].reasons.includes('Yüksek gösterim, düşük CTR'));
assert.ok(C.seo({breakdowns:{query:Array.from({length:10},(_,i)=>({keys:['q'+i],position:6,impressions:1000,clicks:3}))}}).length<=5);
assert.equal(insights(state.growth.google,state.growth.checks[0]).filter(n=>n.title===issue.title).length,1);
state.growth.google.analytics.current.sessions=9999;
const brief=M.makeExecutiveBrief(state,report,now);
assert.equal(brief.kpis.find(k=>k.label==='Oturum').value,'1234');assert.equal(brief.kpis.find(k=>k.label==='Organik tıklama').value,'120');
assert.match(brief.actions[0].text,/0 H1/);assert.match(brief.actions[1].text,/Oturum/);assert.match(brief.actions[2].text,/ürün A/);
assert.equal(report.snapshot.google.analytics.current.sessions,1234);
assert.equal(M.hydrate({...state,reports:[report]}).reports[0].snapshot.google.analytics.current.sessions,1234);
console.log('PASS: shared snapshot, Google consistency, deduplication, roles, SEO opportunities and brief priority.');
