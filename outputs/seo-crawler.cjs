'use strict';
const cheerio=require('cheerio');
const {XMLParser}=require('fast-xml-parser');
const robotsParser=require('robots-parser');
const allowed=new Set(['temmuzonline.com','www.temmuzonline.com']);
const targets=['https://temmuzonline.com/','https://temmuzonline.com/robots.txt','https://temmuzonline.com/sitemap.xml'];
const agent='TemmuzOnlineAudit';
function safe(url){try{const u=new URL(url);return u.protocol==='https:'&&allowed.has(u.hostname)&&!u.port&&!u.username&&!u.password;}catch{return false;}}
async function inspect(url,fetcher=fetch,body=false,deadline=Date.now()+15000){
 const start=performance.now();let next=url;
 try{
  if(!safe(next))throw new Error('Alan dışı adres izlenmedi');
  for(let redirect=0;redirect<4;redirect++){
   if(Date.now()>=deadline)throw new Error('Tarama süre sınırı');
   const response=await fetcher(next,{redirect:'manual',signal:AbortSignal.timeout(Math.max(1,Math.min(7000,deadline-Date.now()))),headers:{'User-Agent':agent+'/2.0'}});
   if([301,302,303,307,308].includes(response.status)){
    await response.body?.cancel();const location=response.headers.get('location');if(!location)throw new Error('Yönlendirme adresi yok');
    const dest=new URL(location,next);if(!safe(dest.href))throw new Error('Alan dışı yönlendirme izlenmedi');next=dest.href;continue;
   }
   let text='';if(body&&response.body){const reader=response.body.getReader();let bytes=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2*1024*1024)throw new Error('Sayfa boyutu sınırı');chunks.push(Buffer.from(value));}text=Buffer.concat(chunks).toString('utf8');}finally{await reader.cancel().catch(()=>{});}}else await response.body?.cancel();
   return {url,finalUrl:next,status:response.status,ms:Math.round(performance.now()-start),error:'',...(body?{body:text,contentType:response.headers.get('content-type')||'',xRobots:response.headers.get('x-robots-tag')||''}:{})};
  }throw new Error('Yönlendirme sınırı');
 }catch(e){return {url,status:0,ms:Math.round(performance.now()-start),error:e.name==='TimeoutError'?'Zaman aşımı':String(e.message).slice(0,250)};}
}
function pageData(result){
 const $=cheerio.load(result.body||''),url=result.finalUrl||result.url;
 const links=[...new Set($('a[href]').map((_,e)=>{try{const u=new URL($(e).attr('href'),url);u.hash='';return safe(u.href)?u.href:null;}catch{return null;}}).get())].slice(0,300);
 return {url:result.url,finalUrl:url,status:result.status,ms:result.ms,error:result.error,title:$('title').first().text().trim(),description:$('meta[name="description" i]').attr('content')?.trim()||'',h1:$('h1').length,canonical:$('link[rel~="canonical" i]').attr('href')||'',robots:[$('meta[name="robots" i]').attr('content')||'',result.xRobots||''].join(' '),images:$('img').length,missingAlt:$('img').filter((_,e)=>!$(e).attr('alt')?.trim()).length,links,html:!!result.body&&(/text\/html/i.test(result.contentType)||/<html[\s>]/i.test(result.body))};
}
async function audit(fetcher=fetch){
 const deadline=Date.now()+75000,results=[],pages=[],issues=[],sitemaps=new Set(),urls=new Set([targets[0]]),skipped=[];
 const add=(code,severity,title,action,url)=>issues.push({code,severity,title,action,url,impact:severity==='critical'?'Sayfa erişimi ve indeksleme etkilenebilir.':severity==='high'?'Organik görünürlük ve sayfanın anlaşılması etkilenebilir.':'İçerik kalitesi ve erişilebilirlik açısından inceleme önerisi.'});
 const robot=await inspect(targets[1],fetcher,true,deadline);results.push({...robot,body:undefined});
 const rules=robotsParser(targets[1],robot.body||'');
 const canCrawl=u=>!(robot.status===0||robot.status>=500)&&rules.isAllowed(u,agent)!==false;
 sitemaps.add(targets[2]);for(const u of rules.getSitemaps())if(safe(u))sitemaps.add(u);
 const parser=new XMLParser({ignoreAttributes:false,processEntities:false});let mapCount=0;
 for(const url of sitemaps){if(mapCount++>=5||Date.now()>=deadline)break;const r=await inspect(url,fetcher,true,deadline);results.push({...r,body:undefined});
  if(r.status===200){try{const data=parser.parse(r.body);for(const item of [].concat(data.sitemapindex?.sitemap||[])){if(safe(item.loc))sitemaps.add(item.loc);}for(const item of [].concat(data.urlset?.url||[])){if(urls.size>=30)break;if(safe(item.loc))urls.add(item.loc);}}catch{add('sitemap-xml','high','Sitemap XML okunamadı.','Geçerli bir sitemap XML belgesi yayınlayın.',url);}}
  else add('sitemap-status','high',`Sitemap erişimi: ${r.status||'başarısız'}`,'Sitemap adresini ve sunucu yanıtını kontrol edin.',url);
 }
 if(robot.status!==200)add('robots-status',robot.status>=500?'high':'normal',`robots.txt erişimi: ${robot.status||'başarısız'}`,'robots.txt yanıtını ve tarama izinlerini kontrol edin.',targets[1]);
 for(const url of urls){if(Date.now()>=deadline){skipped.push(url);continue;}if(!canCrawl(url)){skipped.push(url);continue;}
  const r=await inspect(url,fetcher,true,deadline),p=pageData(r);pages.push(p);
  if(r.status===0||r.status>=400){add('http','critical',`Sayfa erişimi: ${r.status||'başarısız'}`,'Sunucu yanıtını, URL ve yönlendirmeleri düzeltin.',url);continue;}
  if(!p.html)continue;
  if(!p.title)add('title','high','Sayfa başlığı eksik.','Sayfaya özgü açıklayıcı title ekleyin.',url);else if(p.title.length<20||p.title.length>65)add('title-length','normal',`Başlık ${p.title.length} karakter.`,'Arama niyetine uygun, kesilmeyen bir başlık değerlendirin; uzunluk tek başına sıralama hatası değildir.',url);
  if(!p.description)add('description','high','Meta açıklaması eksik.','Sayfaya özgü meta description ekleyin.',url);else if(p.description.length<70||p.description.length>165)add('description-length','normal',`Meta açıklaması ${p.description.length} karakter.`,'Arama sonucunda açık bir değer önerisi sunacak şekilde gözden geçirin.',url);
  if(p.h1!==1)add('h1',p.h1===0?'high':'normal',`${p.h1} H1 bulundu.`,'Ana başlık hiyerarşisini kontrol edin.',url);
  if(!p.canonical)add('canonical','normal','Canonical belirtilmemiş.','Tekrarlanan URL varyasyonları varsa tercih edilen HTTPS adresini belirtin.',url);
  if(/noindex/i.test(p.robots))add('noindex','high','Noindex yönergesi bulundu.','Bu sayfanın aramada görünmesi isteniyorsa noindex tercihini kontrol edin.',url);
  if(p.missingAlt)add('image-alt','normal',`${p.missingAlt} görselin alt metni eksik veya boş.`,'Bilgi taşıyan görsellere alt metin ekleyin. Dekoratif görsellerde boş alt metin doğrudur.',url);
  if(p.ms>3000)add('response-time','normal',`Yanıt ${p.ms} ms sürdü.`,'Sunucu gecikmesini tekrar ölçün; bu ölçüm Core Web Vitals değildir.',url);
  if(p.canonical.startsWith('http:'))add('https','high','Canonical HTTP kullanıyor.','Canonical adresinde HTTPS kullanın.',url);
 }
 for(const key of ['title','description']){const groups=new Map();for(const p of pages){if(!p[key])continue;const group=groups.get(p[key])||[];group.push(p.url);groups.set(p[key],group);}for(const group of groups.values())if(group.length>1)add('duplicate-'+key,'high',`${group.length} sayfada aynı ${key==='title'?'başlık':'meta açıklaması'}.`,'Her sayfayı özgünleştirin: '+group.join(', '),group[0]);}
 const status=new Map(pages.flatMap(p=>[[p.url,p.status],[p.finalUrl,p.status]]));
 for(const p of pages)for(const link of p.links)if(status.has(link)&&status.get(link)>=400)add('broken-link','high','Kırık iç bağlantı: '+link,'Bağlantı hedefini düzeltin veya kaldırın.',p.url);
 issues.sort((a,b)=>['critical','high','normal'].indexOf(a.severity)-['critical','high','normal'].indexOf(b.severity));
 const counts=Object.fromEntries(['critical','high','normal'].map(s=>[s,issues.filter(i=>i.severity===s).length]));
 return {at:new Date().toISOString(),results,pages:pages.map(({links,html,...page})=>page),issues,counts,score:pages.length?Math.max(0,100-Math.round((counts.critical*25+counts.high*10+counts.normal*2)/pages.length)):null,scanned:pages.length,skipped,scope:'En fazla 30 sitemap URL; en fazla 5 sitemap. Kırık linkler yalnız taranan hedeflerde doğrulanır. JavaScript render edilmez. Sağlık puanı bu örneklem için kural tabanlıdır.'};
}
module.exports={audit,inspect,pageData,safe};
