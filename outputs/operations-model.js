(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./growth-model.js'):root.GrowthModel,typeof module==='object'&&module.exports?require('./council-report.js'):root.CouncilReport);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OperationsModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(G,C){
  'use strict';
  const channels=[
    {id:'trendyol',name:'Trendyol',revenue:82400,orders:142,color:'#ff923e'},
    {id:'hepsiburada',name:'Hepsiburada',revenue:51300,orders:79,color:'#ffc960'},
    {id:'amazon',name:'Amazon',revenue:31200,orders:42,color:'#71b8ff'},
    {id:'temmuz',name:'TemmuzOnline',revenue:19620,orders:24,color:'#43d8b5'}
  ];
  const templates=[
    ['lara','Lara Demir','Dijital büyüme','Dönüşüm hunisi ve büyüme fırsatları','#ff983e'],
    ['atlas','Atlas Kaya','SEO','Organik trafik, arama görünürlüğü ve teknik SEO','#35cfee'],
    ['mert','Mert Arslan','Pazaryerleri','Platform satışları, ürün görünürlüğü ve Buy Box','#ffc857'],
    ['selin','Selin Aksoy','Reklam performansı','Kampanya harcaması, dönüşüm ve ROAS','#ff697b'],
    ['ece','Ece Yalın','Müşteri deneyimi','Mobil alışveriş ve ödeme deneyimi','#b59aff'],
    ['kerem','Kerem Tan','Fiyat ve kârlılık','Ürün marjı, komisyon ve fiyat takibi','#49dca3'],
    ['deniz','Deniz Acar','Stok ve operasyon','Stok yeterliliği, sipariş ve sevkiyat','#ee789b'],
    ['ada','Ada Ersoy','İçerik ve marka','Ürün dili, içerik planı ve marka tutarlılığı','#7ce0be'],
    ['mira','Mira Şahin','Grafik tasarım','TemmuzOnline görsel kimliği, banner ve ürün görselleri','#ffb05b']
  ];
  const currency=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(n);
  const totals=()=>({revenue:channels.reduce((s,c)=>s+c.revenue,0),orders:channels.reduce((s,c)=>s+c.orders,0)});
  const normalize=s=>String(s).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
  function initial(){return {version:12,experts:[...templates,...G.roles].map(([id,name,role,task,color])=>({id,name,role,task,color,note:'',active:true})),settings:{enabled:true,times:['08:00','13:00'],speech:true,wakeWord:false},growth:G.initial(),reports:[],briefs:[],messages:[]};}
  function validTimes(times){return Array.isArray(times)&&times.length===2&&times.every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))&&times[0]!==times[1];}
  function hydrate(raw){
    const state=initial();if(!raw||raw.version!==12)return state;
    // Business state is JSON-compatible; keep it during browser hydration too.
    // The server applies the stricter business-engine validation before persistence.
    if(raw.business&&typeof raw.business==='object')state.business=JSON.parse(JSON.stringify(raw.business));
    if(Array.isArray(raw.experts))state.experts=raw.experts.filter(e=>e&&typeof e.id==='string'&&typeof e.name==='string'&&typeof e.role==='string').map(e=>({...e,task:String(e.task||''),note:String(e.note||''),active:e.active!==false,color:/^#[0-9a-f]{6}$/i.test(e.color)?e.color:'#35cfee'}));
    if(raw.settings){state.settings.enabled=raw.settings.enabled!==false;state.settings.speech=raw.settings.speech===true;state.settings.wakeWord=raw.settings.wakeWord===true;if(validTimes(raw.settings.times))state.settings.times=[...raw.settings.times].sort();}
    state.growth=G.hydrate(raw.growth);
    if(!raw.growth){for(const [id,name,role,task,color] of G.roles)if(!state.experts.some(e=>e.id===id))state.experts.push({id,name,role,task,color,note:'',active:true});}
    if(Array.isArray(raw.reports))state.reports=raw.reports.filter(r=>r&&typeof r.id==='string'&&Array.isArray(r.entries)&&r.sales&&Number.isFinite(Date.parse(r.createdAt))).slice(-60);
    if(Array.isArray(raw.briefs))state.briefs=[...new Map(raw.briefs.filter(b=>b&&typeof b.id==='string'&&typeof b.reportId==='string'&&typeof b.voiceScript==='string'&&Array.isArray(b.kpis)&&Array.isArray(b.actions)&&Array.isArray(b.risks)&&Array.isArray(b.opportunities)).map(b=>[b.id,b])).values()].slice(-30);
    if(Array.isArray(raw.messages))state.messages=raw.messages.filter(m=>m&&typeof m.text==='string'&&['user','assistant'].includes(m.role)).slice(-80);
    return state;
  }
  function localDay(now){
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)).map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function slotAt(day,time){return Date.parse(`${day}T${time}:00+03:00`);}
  function dueSlots(state,now=Date.now()){
    if(!state.settings.enabled)return [];
    const day=localDay(now);
    return state.settings.times.map(time=>({id:`scheduled:${day}:${time}`,time,day,at:slotAt(day,time)})).filter(slot=>slot.at<=now&&!state.reports.some(r=>r.id===slot.id));
  }
  function nextSlot(state,now=Date.now()){
    if(!state.settings.enabled)return null;
    for(let offset=0;offset<=1;offset++){
      const day=localDay(now+offset*86400000);
      for(const time of [...state.settings.times].sort()){
        const at=slotAt(day,time);if(at>now)return {day,time,at};
      }
    }
    return null;
  }
  function expertFinding(expert,state){
    return C.entry(expert,C.snapshot(state,{...totals(),channels,mode:'example'},Date.now()));
  }
  function makeReport(state,{now=Date.now(),slot=null,id}={}){
    const sales={...totals(),channels:channels.map(c=>({...c})),mode:'example',label:'ÖRNEK SATIŞ VERİSİ'};
    const snapshot=C.snapshot(state,sales,now);
    const entries=state.experts.filter(e=>e.active).map(e=>({id:e.id,name:e.name,role:e.role,task:e.task,...C.entry(e,snapshot)}));
    return {id:slot?slot.id:id||`manual:${now}`,createdAt:new Date(now).toISOString(),scheduledAt:slot?new Date(slot.at).toISOString():null,late:!!slot&&now-slot.at>60000,title:slot?`${slot.time} Konsey raporu`:'Anlık konsey raporu',sales,snapshot,seoOpportunities:C.seo(snapshot.google.searchConsole),entries};
  }
  function makeExecutiveBrief(state,report,now=Date.now()){const E=typeof module==='object'&&module.exports?require('./executive-brief.js'):globalThis.ExecutiveBrief;return E.make(state,report,now);}
  function appendReport(state,report,now=Date.now(),runtimeHealth=null){if(state.reports.some(r=>r.id===report.id))return;state.reports.push(report);state.reports=state.reports.slice(-60);const briefState=runtimeHealth?{...state,serviceHealth:runtimeHealth}:state;state.briefs=[...(state.briefs||[]).filter(b=>b.reportId!==report.id),makeExecutiveBrief(briefState,report,now)].slice(-30);}
  return {makeExecutiveBrief,appendReport,channels,currency,totals,normalize,initial,hydrate,validTimes,localDay,slotAt,dueSlots,nextSlot,expertFinding,makeReport};
});
