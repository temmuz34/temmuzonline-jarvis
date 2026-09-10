(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.GrowthModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const roles=[
    ['duru','Duru Aydın','Sosyal medya stratejisi','Instagram büyümesi, günlük/haftalık/aylık yayın planı; gerçek erişim ve kaydetme ölçümü','#4cdaa3'],
    ['can','Can Eren','Reels ve hikâye prodüksiyonu','Çekim senaryosu, ilk 3 saniye, kurgu, altyazı ve dikey video brifi','#35d3f4'],
    ['ilay','İlay Aras','Sosyal medya tasarımı','Instagram görselleri, karusel, hikâye ve LinkedIn tasarım brifleri','#f5be69'],
    ['selma','Selma Deniz','LinkedIn editörü','Uzmanlık içeriği, marka anlatısı, editoryal takvim ve nitelikli etkileşim','#90b9ff'],
    ['elif','Elif Aksu','Influencer ve topluluk','İçerik üreticisi adayları, marka uyumu, izinli işbirlikleri ve topluluk geri bildirimleri','#ee8fae'],
    ['arda','Arda Ekin','GA4 ve Search Console analisti','Dönem karşılaştırması, trafik ve gelir değişimi, organik görünürlük ve ölçülebilir aksiyonlar','#76d7ca'],
    ['bora','Bora Işık','Site kalite ve aksiyon sorumlusu','Günlük erişim kontrolü; mobil, SEO, ödeme ve görsel bulgularını önceliklendirip düzeltme takibi','#ffac72']
  ];
  const initial=()=>({version:1,posts:[],snapshots:[],issues:[],checks:[]});
  const str=(s,n)=>typeof s==='string'&&s.length<=n;
  const day=s=>str(s,10)&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
  const num=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e15;
  const url=s=>{try{return str(s,2000)&&new URL(s).protocol==='https:';}catch{return false;}};
  const enums={platform:['Instagram','LinkedIn'],format:['Reels','Hikâye','Karusel','Görsel'],status:['draft','review','approved'],severity:['critical','high','normal'],issueStatus:['open','doing','done']};
  function valid(g){
    return !!g&&g.version===1&&Array.isArray(g.posts)&&g.posts.length<=300&&new Set(g.posts.map(p=>p?.id)).size===g.posts.length&&g.posts.every(p=>p&&str(p.id,200)&&day(p.date)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)&&enums.platform.includes(p.platform)&&enums.format.includes(p.format)&&enums.status.includes(p.status)&&str(p.title,180)&&str(p.caption,4000)&&str(p.brief,4000)&&str(p.owner,100)&&str(p.asset,2000)&&(!p.asset||url(p.asset))&&(p.status!=='approved'||!!p.asset))&&
      Array.isArray(g.snapshots)&&g.snapshots.length<=30&&g.snapshots.every(s=>s&&day(s.from)&&day(s.to)&&s.from<=s.to&&str(s.source,250)&&str(s.property,120)&&str(s.site,200)&&['sessions','purchases','revenue','clicks','impressions','position'].every(k=>num(s[k]))&&s.clicks<=s.impressions&&['prevSessions','prevRevenue','prevClicks'].every(k=>s[k]===null||num(s[k])))&&
      Array.isArray(g.issues)&&g.issues.length<=100&&g.issues.every(i=>i&&str(i.id,100)&&str(i.title,180)&&url(i.url)&&str(i.evidence,2000)&&str(i.action,2000)&&str(i.owner,100)&&enums.severity.includes(i.severity)&&enums.issueStatus.includes(i.status)&&day(i.due))&&
      Array.isArray(g.checks)&&g.checks.length<=30&&g.checks.every(c=>c&&Number.isFinite(Date.parse(c.at))&&Array.isArray(c.results)&&c.results.length<=3&&c.results.every(r=>r&&url(r.url)&&Number.isInteger(r.status)&&r.status>=0&&r.status<=599&&num(r.ms)&&str(r.error,300)));
  }
  const hydrate=g=>valid(g)?JSON.parse(JSON.stringify(g)):initial();
  const addDays=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  function plan({start,days,topic,audience}){
    if(!day(start)||![1,7,30].includes(days)||!topic.trim()||!audience.trim())throw new Error('Tarih, konu ve hedef kitle gerekli.');
    const hooks=['Seçerken nelere bakmalı?','Bir kullanım, üç fayda','Sık sorulan bir soruyu yanıtlıyoruz','Detaylara yakından bakış','Karar vermeden önce karşılaştır','Ürünün arkasındaki süreç','Haftanın soruları'];
    const items=[];
    function push(i,platform,format,time,owner){
      const date=addDays(start,i),title=`${topic}: ${hooks[i%7]}`.slice(0,180);
      const caption=platform==='LinkedIn'?`${topic} hakkında ${audience} için bir not.\n\n[Gerçek deneyim veya doğrulanmış bir örnek ekleyin.]\n\nSizin için seçimde en önemli kriter ne?\n#TemmuzOnline`:`${hooks[i%7]}\n\n${topic} için [doğrulanmış ürün bilgisi] ve [kullanım örneği].\n\nSorunu yorumlarda paylaş; ayrıntılar için TemmuzOnline'ı incele.\n#TemmuzOnline`;
      const brief=format==='Reels'?'9:16 çekim. 0–3 sn: soru ve ürün yakın planı. 3–12 sn: gerçek kullanım. 12–22 sn: iki doğrulanmış özellik. Son: tek eylem çağrısı. Altyazı, lisanslı ses, ürün doğruluğu kontrolü.':format==='Hikâye'?'9:16, üç kare: soru/anket; gerçek ürün detayı; bağlantı ve tek eylem çağrısı. Yalnızca doğrulanmış fiyat/stok kullan.':format==='Karusel'?'Dikey karusel: kapak sorusu; üç fayda/karşılaştırma; doğrulanmış ürün görseli; son karede tek eylem çağrısı.':'LinkedIn görseli: özgün ürün/süreç fotoğrafı, tek ana mesaj ve kaynaklı bulgu. Marka renkleri, okunur tipografi ve alternatif metin.';
      items.push({id:`${date}:${platform}:${format}`,date,time,platform,format,title,caption,brief,owner,status:'draft',asset:''});
    }
    for(let i=0;i<days;i++){push(i,'Instagram',i%2===0?'Reels':'Karusel','18:30',i%2===0?'Can Eren':'İlay Aras');push(i,'Instagram','Hikâye','12:00','Can Eren');if(i%7===0||i%7===2||i%7===4)push(i,'LinkedIn','Görsel','10:00','Selma Deniz');}
    return items;
  }
  function analytics(g){
    const s=g.snapshots.at(-1);if(!s)return ['GA4 ve Search Console verisi bekleniyor. Henüz doğrulanmış trafik veya gelir bulgusu yok.'];
    const rows=[`${s.from} / ${s.to} · Kaynak: ${s.source}. ${s.sessions} oturum, ${s.purchases} satın alma, ${s.revenue.toLocaleString('tr-TR')} TL gelir.`,`${s.clicks} organik tıklama / ${s.impressions} gösterim. CTR: ${s.impressions?(100*s.clicks/s.impressions).toFixed(2):'hesaplanamaz'}%. Ortalama konum: ${s.position}.`];
    for(const [current,previous,label,action] of [['sessions','prevSessions','Oturum','Kanal ve cihaz kırılımını incele.'],['revenue','prevRevenue','Gelir','Ürün, trafik ve ödeme adımlarını kontrol et.'],['clicks','prevClicks','Organik tıklama','Sorgu ve açılış sayfası kırılımını Search Console’dan incele.']]){
      if(s[previous]===null)continue;
      if(!s[previous]){rows.push(`${label}: önceki dönem sıfır; yüzde değişim hesaplanamaz.`);continue;}
      const delta=100*(s[current]-s[previous])/s[previous];rows.push(`${label}: eşit uzunluktaki önceki döneme göre %${delta.toFixed(1)}. ${delta<=-10?'Öncelikli inceleme: '+action:'İzlemeye devam et.'}`);
    }
    if(s.impressions>=1000&&s.clicks/s.impressions<0.02)rows.push('İnceleme adayı: CTR %2 altında. Bu tek başına hata değildir; konum, sorgu niyeti ve marka sorgularını ayırmadan başlık değiştirme.');
    rows.push('Toplam verilerden neden veya sayfa bazlı hata doğrulanamaz. Öneriler kontrol görevidir; sitede değişiklik yapılmadı.');return rows;
  }
  function siteReport(g){
    const c=g.checks.at(-1),open=g.issues.filter(i=>i.status!=='done');
    const rows=[c?`Son erişim kontrolü: ${c.at}. ${c.results.map(r=>`${r.url}: ${r.status||'erişilemedi'}${r.error?' ('+r.error+')':''}`).join('; ')}`:'Site erişim kontrolü henüz yapılmadı.'];
    rows.push(...open.sort((a,b)=>enums.severity.indexOf(a.severity)-enums.severity.indexOf(b.severity)).map(i=>`${i.severity==='critical'?'ACİL':i.severity==='high'?'YÜKSEK':'NORMAL'}: ${i.title}\nKanıt: ${i.evidence}\nAksiyon: ${i.action}\nSorumlu: ${i.owner} · Son tarih: ${i.due}`));
    if(!open.length)rows.push('Kayıtlı açık bulgu yok. Bu, sitenin hatasız olduğu anlamına gelmez.');
    rows.push('Erişim kontrolü yalnızca ana sayfa/robots/sitemap HTTP durumunu ölçer; mobil görünüm, ödeme ve tüm sayfalar otomatik denetlenmedi.');return rows;
  }
  function finding(expert,g){
    if(expert.id==='arda')return {text:analytics(g).join('\n'),source:'Kullanıcının girdiği dönem verisi / kural tabanlı analiz'};
    if(expert.id==='bora')return {text:siteReport(g).join('\n'),source:'HTTP erişim kontrolü + kayıtlı site bulguları'};
    if(expert.id==='mira'){
      const issues=g.issues.filter(i=>i.owner===expert.name&&i.status!=='done');
      return {text:issues.length?issues.map(i=>`${i.title}: ${i.evidence}\nDüzeltme: ${i.action} · ${i.due}`).join('\n'):'Görsel denetim için güncel sayfa görüntüsü veya doğrulanmış bulgu bekleniyor. Mobil yerleşim, ürün görselleri, banner, okunabilirlik ve marka tutarlılığı incelenecek. Bu rapor bir görsel tarama sonucu değildir.',source:'Kayıtlı görsel bulgular / veri bekleniyor'};
    }
    if(roles.slice(0,5).some(r=>r[0]===expert.id)){
      const own=g.posts.filter(p=>p.owner===expert.name||expert.id==='duru'),approved=own.filter(p=>p.status==='approved').length;
      return {text:`${own.length} içerik taslağı; ${approved} onaylı. Instagram/LinkedIn yayın bağlantısı ve medya üretim servisi bağlı değil. Taslaklar yayınlanmadı. ${expert.id==='elif'?'İşbirliği için hedef kitle uyumu, gerçek erişim, içerik hakları ve onaylı bütçe bekleniyor. Takipçi satın alma veya izinsiz toplu mesaj yok.':'Sıradaki kayıtlar: '+(own.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3).map(p=>p.date+' '+p.format+': '+p.title).join('; ')||'Plan bekleniyor.')}`,source:'Kayıtlı içerik takvimi / bağlantı durumu'};
    }
    return null;
  }
  return {roles,initial,hydrate,valid,day,addDays,plan,analytics,siteReport,finding};
});
