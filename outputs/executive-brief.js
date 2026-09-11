(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./insight-engine.js'):root.InsightEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.ExecutiveBrief=api;})(typeof globalThis!=='undefined'?globalThis:this,function(engine){
 const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(n);
 function make(state,report,now=Date.now()){
  const g=state.growth||{},ga=g.google?.analytics,sc=g.google?.searchConsole,audit=g.checks?.at(-1),sales=report.sales||{},kpis=[],actions=[],risks=[],opportunities=[];
  const example=sales.mode!=='verified'&&sales.mode!=='live',salesConfidence=example?'example':'verified';
  function kpi(label,value,source,confidence,change=null){kpis.push({label,value,source,confidence,change:typeof change==='number'&&Number.isFinite(change)?`${change>=0?'+':''}${change.toFixed(1)}%`:null,tone:typeof change==='number'?(change>0?'up':change<0?'down':'neutral'):'neutral'});}
  if(Number.isFinite(sales.revenue))kpi('Ciro',money(sales.revenue),example?'Örnek satış verisi':'Rapor satış kaydı',salesConfidence,sales.revenueChange??null);
  if(Number.isFinite(sales.orders))kpi('Sipariş',String(sales.orders),example?'Örnek satış verisi':'Rapor satış kaydı',salesConfidence);
  if(sc)kpi('Organik tıklama',String(sc.current.clicks),sc.source,'verified',sc.changes?.clicks);
  if(Number.isFinite(audit?.score))kpi('Site puanı',`${audit.score}/100`,'Sınırlı URL örneklemi / teknik denetim','partial');
  if(Number.isFinite(ga?.current?.sessions))kpi('Oturum',String(ga.current.sessions),ga.source,'verified',ga.changes?.sessions);
  const findings=engine?.insights(g.google,audit)||[];
  const seen=new Set();const addAction=(priority,text,owner,source)=>{if(seen.has(text))return;seen.add(text);actions.push({priority,text,owner:owner||null,source});};
  for(const n of findings){if(['critical','high'].includes(n.severity))addAction('high',`${n.title} ${n.action}`,n.owner,n.source);if(n.severity==='opportunity')opportunities.push(n.title);}
  for(const i of [...(g.issues||[])].filter(i=>i.status!=='done').sort((a,b)=>['critical','high','normal'].indexOf(a.severity)-['critical','high','normal'].indexOf(b.severity)))addAction(i.severity==='normal'?'normal':'high',`${i.title}: ${i.action}`,i.owner,'Kayıtlı operasyon bulgusu');
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),tomorrow=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now+86400000);
  for(const p of g.posts||[])if(p.status==='approved'&&[day,tomorrow].includes(p.date)){addAction('normal',`${p.date}: ${p.title} için yayın hazırlığını kontrol et.`,p.owner,'Onaylı içerik takvimi');opportunities.push(`${p.date} için onaylı içerik: ${p.title}`);}
  if(!example&&Number.isFinite(sales.revenueChange)&&sales.revenueChange<=-15)risks.push('Doğrulanmış satış geliri %15 veya daha fazla düştü.');
  if(Number.isFinite(ga?.changes?.sessions)&&ga.changes.sessions<=-15)risks.push(`GA4 oturum sayısı %${Math.abs(ga.changes.sessions).toFixed(1)} düştü.`);
  if(audit?.counts?.critical>0)risks.push(`${audit.counts.critical} kritik site denetimi bulgusu var.`);
  if(state.serviceHealth?.googleError)risks.push('Google bağlantısı son kontrolde hata verdi.');
  if(state.serviceHealth?.storage?.persistent===false)risks.push('Kalıcı depolama aktif değil; veri kaybı riski var.');
  if(Number.isFinite(ga?.changes?.sessions)&&ga.changes.sessions>=15)opportunities.push(`GA4 oturumları %${ga.changes.sessions.toFixed(1)} arttı.`);
  const selected=actions.slice(0,3),confidence=kpis.length&&kpis.every(k=>k.confidence==='example')?'example':kpis.length&&kpis.every(k=>k.confidence==='verified')?'verified':'partial';
  const headline=selected.length?`${selected.length} öncelikli konu değerlendirme bekliyor.`:'Şu anda yüksek öncelikli aksiyon bulunmuyor.';
  const script=['Günaydın. Bugünkü özet hazır.',...(Number.isFinite(sales.revenue)?[`${example?'Örnek satış verisinde':'Satış tarafında'} ciro ${money(sales.revenue)}.`]:[]),...(ga?[`Google Analytics tarafında ${ga.current.sessions??'ölçülemeyen'} oturum var.`]:[]),...(sc?[`Search Console tarafında ${sc.current.clicks} tıklama var.`]:[]),headline,...selected.map((a,i)=>`${['Birinci','İkinci','Üçüncü'][i]}: ${a.text.slice(0,160)}`),'Detaylar panelde.'].join(' ');
  const title=report.scheduledAt?(report.title?.startsWith('08:00')?'08:00 Günlük Özet':report.title?.startsWith('13:00')?'13:00 Ara Durum':'Yönetici Özeti'):report.title?.startsWith('Anlık')?'Manuel Yönetici Özeti':'Yönetici Özeti';
  return {id:`brief:${report.id}`,createdAt:new Date(now).toISOString(),reportId:report.id,title,headline,kpis:kpis.slice(0,5),actions:selected,risks:[...new Set(risks)].slice(0,2),opportunities:[...new Set(opportunities)].slice(0,2),voiceScript:script,sources:[...new Set(kpis.map(k=>k.source).concat(selected.map(a=>a.source)))],dataFreshness:{sales:example?null:report.createdAt||null,ga4:ga?.at||null,searchConsole:sc?.at||null,siteAudit:audit?.at||null},confidence};
 }
 return {make};
});
