(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CouncilReport=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const missing='Bu kaynak henüz bağlı değil.';
 const unique=rows=>[...new Map(rows.map(r=>[JSON.stringify([r.source||'',r.url||'',r.code||r.type||'',r.title||r.message||'']),r])).values()];
 function seo(sc){
  const rows=sc?.breakdowns?.queryPage||sc?.breakdowns?.query||[];
  return rows.filter(r=>Number.isFinite(r.position)&&r.impressions>0).map(r=>{
   const reasons=[];if(r.position>=4&&r.position<=10)reasons.push('Hızlı kazanım');if(r.position>=11&&r.position<=20)reasons.push('Near-winner');if(r.impressions>=1000&&r.clicks/r.impressions<0.02)reasons.push('Yüksek gösterim, düşük CTR');if(r.impressions>=1000&&r.clicks===0)reasons.push('Gösterim var, tıklama yok');
   return {keyword:r.keys?.[0]||r.keyword,page:r.page||r.keys?.[1]||null,position:r.position,impressions:r.impressions,clicks:r.clicks,reasons,recommendedAction:reasons.some(x=>x.includes('CTR')||x.includes('tıklama'))?'Başlık ve açıklamayı sorgunun arama niyetine göre gözden geçir.':'İlgili içerikte sorguyu yanıtlayan bölümleri ve iç bağlantıları geliştir.'};
  }).filter(r=>r.keyword&&r.reasons.length).sort((a,b)=>b.impressions-a.impressions).filter((r,i,all)=>all.findIndex(x=>x.keyword===r.keyword&&x.page===r.page)===i).slice(0,5);
 }
 function snapshot(state,sales,now){
  const g=state.growth||{},google=g.google||{};
  return JSON.parse(JSON.stringify({at:new Date(now).toISOString(),googleStatus:{...(state.serviceHealth?.google||{}),analytics:!!google.analytics?.current,searchConsole:!!google.searchConsole?.current},google,audit:g.checks?.at(-1)||null,sales,issues:g.issues||[],contentCalendar:g.posts||[],socialDrafts:(g.posts||[]).filter(p=>p.status==='draft'),integrations:g.integrations||state.integrations||{}}));
 }
 function entry(expert,s){
  const ga=s.google.analytics,sc=s.google.searchConsole,opps=seo(sc),audit=unique(s.audit?.issues||[]).sort((a,b)=>['critical','high','normal'].indexOf(a.severity)-['critical','high','normal'].indexOf(b.severity)),posts=s.contentCalendar,topic=opps[0]?.keyword||posts[0]?.product||posts[0]?.title;
  let summary=missing,findings=[],actions=[];
  const metric=(key,label)=>Number.isFinite(ga?.current?.[key])?`${label}: ${ga.current[key]}`:null;
  const numbers=()=>[metric('sessions','Oturum'),metric('ecommercePurchases','Satın alma'),sc?.current?`Organik tıklama: ${sc.current.clicks}; gösterim: ${sc.current.impressions}`:null].filter(Boolean);
  switch(expert.id){
   case 'lara':if(ga?.current){summary='GA4 büyüme ve kanal özeti';findings=numbers().slice(0,2);const channel=ga.breakdowns?.sessionDefaultChannelGroup?.slice().sort((a,b)=>b.sessions-a.sessions)[0];if(channel)findings.push(`En yüksek oturumlu kanal: ${channel.name} (${channel.sessions})`);actions=['Kanal bazında satın alma/oturum oranlarını karşılaştır.'];}break;
   case 'arda':if(ga?.current||sc?.current){summary='Doğrulanmış GA4 / Search Console sayısal analizi';findings=numbers();actions=['Dönem ve veri tarihlerini koruyarak trafik ile satın alma değişimini karşılaştır.'];}break;
   case 'ece':if(ga?.current){summary='GA4 alışveriş ve cihaz deneyimi';findings=[metric('addToCarts','Sepete ekleme'),metric('checkouts','Checkout'),metric('ecommercePurchases','Satın alma')].filter(Boolean);if(!findings.length)findings=[metric('sessions','Oturum')].filter(Boolean);const mobile=ga.breakdowns?.deviceCategory?.find(x=>x.name==='mobile');if(mobile)findings.push(`Mobil: ${mobile.sessions} oturum, ${mobile.ecommercePurchases} satın alma`);actions=['Mobil ve masaüstü satın alma oranlarını karşılaştır; hunideki düşüşün nedenini ödeme akışında doğrula.'];}break;
   case 'atlas':if(sc?.current||s.audit){summary='Arama görünürlüğü ve SEO etkisi';findings=opps.slice(0,3).map(o=>`${o.keyword}: ${o.reasons.join(', ')}; konum ${o.position}, ${o.impressions} gösterim, ${o.clicks} tıklama; sayfa: ${o.page||'sorgu-sayfa eşleşmesi yok'}`);if(!findings.length&&sc?.current)findings=[`${sc.current.clicks} organik tıklama / ${sc.current.impressions} gösterim`];actions=opps.slice(0,3).map(o=>`${o.keyword}: ${o.recommendedAction}`);if(audit.some(i=>/h1/i.test(i.code+' '+i.title)))actions.push('Başlık hiyerarşisinin arama niyetini desteklediğini doğrula; teknik düzeltme Bora sorumluluğunda.');}break;
   case 'bora':if(s.audit){summary='Site teknik öncelikleri';findings=audit.filter(i=>i.code!=='image-alt').slice(0,3).map(i=>`${i.severity}: ${i.title} (${i.url||'URL belirtilmedi'})`);actions=audit.filter(i=>i.code!=='image-alt').slice(0,3).map(i=>`${i.url||''}: ${i.action||'Bulguyu doğrula ve düzelt.'}`);}break;
   case 'mira':if(s.audit){summary='Site görsel erişilebilirliği';findings=audit.filter(i=>i.code==='image-alt').slice(0,3).map(i=>`${i.title} (${i.url||'URL belirtilmedi'})`);actions=findings.length?['Ürün görsellerinin alternatif metinlerini ürün içeriğine göre tamamla.']:[];}break;
   case 'duru':if(topic){summary='Arama talebinden sosyal medya içerik fırsatı';findings=[`Önerilen içerik konusu: ${topic}`];actions=[`${topic} için haftalık Instagram konu dizisi planla; erişim ve kaydetmeyi yayın sonrasında ölç.`];}break;
   case 'can':if(topic){summary='Reels ve hikâye prodüksiyon önerisi';findings=[`${topic} için soru-cevap formatı uygun bir taslak konusu.`];actions=[`İlk 3 saniyede ${topic} sorusunu göster; üç adımlı dikey video ve anket hikâyesi taslağı hazırla.`];}break;
   case 'ilay':if(topic){summary='Sosyal görsel tasarım önerisi';findings=[`${topic} karusel taslağında tek ana mesaj kullanılabilir.`];actions=['Kapak, açıklama ve eylem çağrısından oluşan üç görsellik tasarım brifi hazırla.'];}break;
   case 'selma':if(topic){summary='LinkedIn editoryal önerisi';findings=[`${topic} konusunu sektör deneyimiyle ilişkilendiren içerik önerisi.`];actions=['Bir uzmanlık yazısı taslağı oluştur; doğrulanmış veri ve marka örneğini editör onayına sun.'];}break;
   case 'ada':if(posts.length){summary='İçerik ve marka takvimi';findings=posts.slice(0,3).map(p=>`${p.date}: ${p.title} (${p.status})`);actions=['Yayın öncesinde ürün iddiaları ve marka dilini kontrol et.'];}break;
   case 'elif':if(s.socialDrafts.length){summary='Topluluk ve işbirliği hazırlığı';findings=[`${s.socialDrafts.length} içerik taslağı mevcut.`];actions=['Taslak konularıyla uyumlu üretici adaylarını değerlendir; izin ve marka uygunluğunu doğrula.'];}break;
   case 'mert':summary='ÖRNEK SATIŞ VERİSİ';findings=s.sales.channels.slice(0,3).map(c=>`ÖRNEK SATIŞ VERİSİ: ${c.name}, ${c.revenue} TL, ${c.orders} sipariş`);break;
   default:break;
  }
  if(expert.note?.trim()){if(summary===missing)summary='Kayıtlı ekip notu';findings.push(expert.note.trim());}
  findings=[...new Set(findings)].slice(0,3);actions=[...new Set(actions)].slice(0,3);
  return {summary,findings,actions,source:`Ortak snapshot: ${s.at}`,text:[summary,...findings.map(x=>`Bulgu: ${x}`),...actions.map(x=>`Aksiyon: ${x}`)].join('\n')};
 }
 return {snapshot,entry,seo,unique};
});
