(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InsightEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const rules={drop:-20,impressions:1000,ctr:0.02,positionMin:8,positionMax:20,positionChange:3};
 function insights(data={},audit=null){
  const notes=[],add=(owner,severity,title,action,source)=>notes.push({owner,severity,title,action,source});
  const ga=data.analytics,sc=data.searchConsole;
  if(ga){for(const [key,label] of [['activeUsers','Kullanıcı'],['sessions','Oturum'],['ecommercePurchases','Satın alma'],['purchaseRevenue','Gelir'],['engagementRate','Etkileşim']]){const d=ga.changes[key];if(d!==null&&Number.isFinite(d)&&d<=rules.drop)add('Arda','high',`${label} %${Math.abs(d).toFixed(1)} düştü.`, 'Kanal, cihaz ve açılış sayfası dağılımını karşılaştırın; bu değişim tek başına neden belirtmez.',ga.at);}
   const devices=ga.breakdowns.deviceCategory||[],mobile=devices.find(d=>d.name==='mobile'),desktop=devices.find(d=>d.name==='desktop');
   if(mobile?.sessions>=100&&desktop?.sessions>=100&&mobile.ecommercePurchases/mobile.sessions<desktop.ecommercePurchases/desktop.sessions*0.7)add('Arda','normal','Mobil satın alma oranı masaüstünün altında.','Cihazların trafik kaynağı ve ödeme akışını karşılaştırın.',ga.at);
  }
  if(sc){if(sc.changes.clicks!==null&&sc.changes.clicks<=rules.drop)add('Bora','high',`Organik tıklama %${Math.abs(sc.changes.clicks).toFixed(1)} düştü.`,'Kaybeden sorgu ve sayfaları inceleyin; algoritma veya teknik hata nedeni henüz doğrulanmadı.',sc.at);
   const old=new Map((sc.previousBreakdowns?.query||[]).map(r=>[r.keys[0],r]));
   for(const r of sc.breakdowns.query||[]){const q=r.keys[0];if(r.impressions>=rules.impressions&&r.position>=rules.positionMin&&r.position<=rules.positionMax)add('Bora','opportunity',`${q}: konum ${r.position.toFixed(1)}`,'8–20 konum fırsatı: arama niyetini ve ilgili sayfanın içeriğini geliştirmeyi değerlendirin.',sc.at);
    if(r.impressions>=rules.impressions&&r.ctr<rules.ctr)add('Bora','opportunity',`${q}: CTR %${(r.ctr*100).toFixed(2)}`,'Başlık/meta ve sorgu niyetini inceleyin.',sc.at);
    const p=old.get(q);if(p?.impressions>=100&&r.impressions>=100&&Math.abs(r.position-p.position)>=rules.positionChange)add('Bora',r.position>p.position?'high':'opportunity',`${q}: konum ${p.position.toFixed(1)} → ${r.position.toFixed(1)}`,'Dönemlerin sorgu/sayfa dağılımını karşılaştırın.',sc.at);
   }
  }
  for(const i of audit?.issues||[])add(i.code==='image-alt'?'Mira':'Bora',i.severity,i.title,i.action,audit.at);
  return notes.sort((a,b)=>['critical','high','normal','opportunity'].indexOf(a.severity)-['critical','high','normal','opportunity'].indexOf(b.severity));
 }
 return {rules,insights};
});
