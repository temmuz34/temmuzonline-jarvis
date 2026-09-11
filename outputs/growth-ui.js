'use strict';
window.createGrowthUI=function({read,change,refresh,toast,audit}){
  const G=window.GrowthModel,M=window.OperationsModel,$=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status={draft:'Taslak',review:'İncelemede',approved:'Onaylandı',published:'Yayınlandı · manuel kayıt'};
  let period=7,editingPost=null,editingIssue=null;
  const today=M.localDay(Date.now());
  $('plan-form').elements.start.value=today;$('calendar-date').value=today;
  $('analytics-form').elements.from.value=G.addDays(today,-7);$('analytics-form').elements.to.value=G.addDays(today,-1);
  const dialog=document.createElement('dialog');dialog.id='growth-dialog';document.body.append(dialog);
  function visiblePosts(){
    const start=$('calendar-date').value||today,end=G.addDays(start,period),channel=$('calendar-channel').value;
    return read().growth.posts.filter(p=>p.date>=start&&p.date<end&&(channel==='all'||p.platform===channel)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  }
  function render(){
    const g=read().growth,posts=visiblePosts();
    $('plan-count').textContent=`${posts.length} içerik · Türkiye saati · Plan saatleri öneridir`;
    $('content-list').innerHTML=posts.map(p=>`<button class="content-row" data-post="${esc(p.id)}"><span class="content-date">${esc(p.date)}<small>${p.time}</small></span><span><strong>${esc(p.title)}</strong><small>${p.platform} / ${p.format} · ${esc(p.owner)}</small></span><span class="content-status ${p.status}">${status[p.status]}</span><i data-lucide="pencil"></i></button>`).join('')||'<p class="empty-state">Bu dönemde içerik planı yok.</p>';
    $('analytics-result').textContent=G.analytics(g).join('\n\n');
    const check=g.checks.at(-1);
    $('site-check').innerHTML=check?`<h3>Site denetimi <small>${esc(new Date(check.at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}))}</small></h3><p>${esc(G.siteReport(g).join('\n\n'))}</p><details><summary>Taranan sayfalar</summary><div class="table-wrap"><table><thead><tr><th>URL</th><th>HTTP</th><th>ms</th><th>Title</th><th>Meta</th><th>H1</th><th>Eksik alt</th></tr></thead><tbody>${(check.pages||check.results).map(p=>`<tr><td>${esc(p.url)}</td><td>${p.status}</td><td>${p.ms}</td><td>${esc(p.title)}</td><td>${esc(p.description)}</td><td>${p.h1??'—'}</td><td>${p.missingAlt??'—'}</td></tr>`).join('')}</tbody></table></div></details>`:'<p class="empty-state">Henüz site denetimi yapılmadı.</p>';
    $('issues-list').innerHTML=g.issues.slice().sort((a,b)=>['critical','high','normal'].indexOf(a.severity)-['critical','high','normal'].indexOf(b.severity)).map(i=>`<button class="issue-row" data-issue="${esc(i.id)}"><span class="priority ${i.severity}">${{critical:'ACİL',high:'YÜKSEK',normal:'NORMAL'}[i.severity]}</span><span><strong>${esc(i.title)}</strong><small>${esc(i.owner)} · ${esc(i.due)}</small><small>${esc(i.action)}</small></span><span>${{open:'Açık',doing:'Çalışılıyor',done:'Tamamlandı'}[i.status]}</span><i data-lucide="pencil"></i></button>`).join('')||'<p class="empty-state">Kayıtlı bulgu yok. Site henüz kapsamlı denetlenmedi; sorun olmadığı doğrulanmış değil.</p>';
  }
  function saveGrowth(fn){change(s=>fn(s.growth));refresh();}
  $('plan-form').onsubmit=e=>{
    e.preventDefault();const f=e.currentTarget.elements;
    try{const generated=G.plan({start:f.start.value,days:Number(f.days.value),topic:f.topic.value.trim(),audience:f.audience.value.trim()}).map(p=>window.ContentService.enrich(p,f.brand.value.trim(),f.topic.value.trim()));const ids=new Set(read().growth.posts.map(p=>p.id)),added=generated.filter(p=>!ids.has(p.id));
      if(read().growth.posts.length+added.length>300)throw new Error('Takvim 300 kayıtla sınırlı. Eski taslakları kaldır.');
      saveGrowth(g=>g.posts.push(...added));$('calendar-date').value=f.start.value;period=Number(f.days.value);updatePeriod();render();toast(`${added.length} yeni taslak eklendi. Mevcut kayıtlar korunuyor.`);
    }catch(err){toast(err.message);}
  };
  function updatePeriod(){document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.period)===period)));}
  document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=Number(b.dataset.period);updatePeriod();render();});
  $('calendar-date').onchange=render;$('calendar-channel').onchange=render;
  $('export-plan').onclick=()=>{
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({account:'TemmuzOnline',timezone:'Europe/Istanbul',mode:'drafts-not-published',posts:visiblePosts()},null,2)],{type:'application/json'}));a.href=url;a.download='temmuz-icerik-plani.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  function heading(title){return `<div class="dialog-heading"><h2>${title}</h2><button type="button" class="icon-button" id="growth-close" aria-label="Kapat">×</button></div>`;}
  function bindClose(){$('growth-close').onclick=()=>dialog.close();}
  function postDialog(id){
    const p=read().growth.posts.find(p=>p.id===id);if(!p)return;editingPost=JSON.stringify(p);
    dialog.innerHTML=`<form id="post-form">${heading('İçerik taslağı')}<label>Başlık<input name="title" maxlength="180" required></label><div class="growth-form"><label>Tarih<input name="date" type="date" required></label><label>Saat<input name="time" type="time" required></label></div><label>Sorumlu<input name="owner" maxlength="100" required></label><label>Paylaşım metni<textarea name="caption" maxlength="4000" rows="5" required></textarea></label><label>Çekim / tasarım brifi<textarea name="brief" maxlength="4000" rows="4" required></textarea></label><label>Medya adresi (HTTPS)<input name="asset" type="url" maxlength="2000" placeholder="https://…"></label><label>Durum<select name="status"><option value="draft">Taslak</option><option value="review">İncelemede</option><option value="approved">Onaylı · yayınlanmadı</option></select></label><p class="muted">Onay için medya adresi gerekir. Adresin içeriği otomatik doğrulanmaz; ürün, telif ve içerik kontrolü sende. Onay sosyal medyada paylaşım yapmaz.</p><p id="post-error" class="form-error" role="alert"></p><div class="dialog-actions"><button class="danger-button" type="button" id="remove-post">Taslağı kaldır</button><button class="command-button" type="submit">Kaydet</button></div></form>`;
    const extra=['brand','product','cta','imagePrompt','videoScript','voiceover','publishedUrl'];
    const form=$('post-form');
    form.insertAdjacentHTML('afterbegin',extra.map((k,i)=>`<label>${['Marka','Ürün','CTA','Görsel promptu','Video senaryosu','Seslendirme metni','Yayın URL (manuel doğrulama)'][i]}<textarea name="${k}" maxlength="2000"></textarea></label>`).join('')+'<label>Hashtag (en fazla 5, virgülle ayır)<input name="hashtags" maxlength="300"></label>');
    form.elements.status.insertAdjacentHTML('beforeend','<option value="published">Yayınlandı · manuel kayıt</option>');
    for(const k of [...extra,'title','date','time','owner','caption','brief','asset','status'])form.elements[k].value=p[k]||'';form.elements.hashtags.value=(p.hashtags||[]).join(', ');bindClose();
    form.onsubmit=e=>{e.preventDefault();const current=read().growth.posts.find(p=>p.id===id);if(JSON.stringify(current)!==editingPost){$('post-error').textContent='Kayıt başka bir yerde değişmiş. Kapatıp yeniden aç.';return;}
      const updated={...current};for(const k of [...extra,'title','date','time','owner','caption','brief','asset','status'])updated[k]=form.elements[k].value.trim();
      updated.hashtags=form.elements.hashtags.value.split(',').map(x=>x.trim()).filter(Boolean);
      if(updated.hashtags.length>5){$('post-error').textContent='En fazla 5 hashtag ekleyebilirsin.';return;}
      if(updated.status==='published'&&!/^https:\/\//.test(updated.publishedUrl)){$('post-error').textContent='Yayınlandı kaydı için gerçek paylaşım URL adresi gerekli.';return;}
      const proposed={...read().growth,posts:read().growth.posts.map(p=>p.id===id?updated:p)};
      if(!G.valid(proposed)){$('post-error').textContent='Geçerli bir tarih/HTTPS adresi gerekli. Onay için medya adresini ekle.';return;}
      saveGrowth(g=>g.posts=g.posts.map(p=>p.id===id?updated:p));dialog.close();toast('İçerik kaydedildi; yayınlanmadı.');
    };
    $('remove-post').onclick=()=>{if(!confirm('Bu içerik taslağı kaldırılsın mı?'))return;saveGrowth(g=>g.posts=g.posts.filter(p=>p.id!==id));dialog.close();};dialog.showModal();
  }
  $('analytics-form').onsubmit=e=>{
    e.preventDefault();const f=e.currentTarget.elements,s={};
    for(const k of ['from','to','property','site','source'])s[k]=f[k].value.trim();
    for(const k of ['sessions','purchases','revenue','clicks','impressions','position'])s[k]=Number(f[k].value);
    for(const k of ['prevSessions','prevRevenue','prevClicks'])s[k]=f[k].value===''?null:Number(f[k].value);
    if(!G.valid({...read().growth,snapshots:[s]})){$('analytics-error').textContent='Tarih aralığını ve değerleri kontrol et. Tıklama gösterimden büyük olamaz.';return;}
    saveGrowth(g=>g.snapshots=[...g.snapshots,s].slice(-30));$('analytics-error').textContent='';toast('Dönem verisi kaydedildi. Arda raporlarına eklenecek.');
  };
  function issueDialog(id){
    const i=read().growth.issues.find(i=>i.id===id)||{id:crypto.randomUUID(),title:'',url:'https://temmuzonline.com/',severity:'normal',status:'open',evidence:'',action:'',owner:'Bora Işık',due:today};editingIssue=id?JSON.stringify(i):null;
    dialog.innerHTML=`<form id="issue-form">${heading('Site bulgusu')}<label>Bulgu<input name="title" maxlength="180" required></label><label>Sayfa URL<input name="url" type="url" maxlength="2000" required></label><div class="growth-form"><label>Öncelik<select name="severity"><option value="critical">Acil</option><option value="high">Yüksek</option><option value="normal">Normal</option></select></label><label>Durum<select name="status"><option value="open">Açık</option><option value="doing">Çalışılıyor</option><option value="done">Tamamlandı</option></select></label></div><label>Kanıt / doğrulama notu<textarea name="evidence" maxlength="2000" required></textarea></label><label>Yapılacak düzeltme<textarea name="action" maxlength="2000" required></textarea></label><label>Sorumlu<input name="owner" maxlength="100" required></label><label>Son tarih<input name="due" type="date" required></label><p id="issue-error" class="form-error" role="alert"></p><button class="command-button" type="submit">Kaydet</button></form>`;
    const form=$('issue-form');for(const k of ['title','url','severity','status','evidence','action','owner','due'])form.elements[k].value=i[k];bindClose();
    form.onsubmit=e=>{e.preventDefault();if(id&&JSON.stringify(read().growth.issues.find(i=>i.id===id))!==editingIssue){$('issue-error').textContent='Kayıt değişmiş; kapatıp yeniden aç.';return;}
      const updated={...i};for(const k of ['title','url','severity','status','evidence','action','owner','due'])updated[k]=form.elements[k].value.trim();
      const issues=id?read().growth.issues.map(i=>i.id===id?updated:i):[...read().growth.issues,updated];
      if(!G.valid({...read().growth,issues})){$('issue-error').textContent='HTTPS adresini, tarihi ve alanları kontrol et. En fazla 100 bulgu kaydedilebilir.';return;}
      saveGrowth(g=>g.issues=issues);dialog.close();toast('Bulgu kaydedildi. Canlı sitede değişiklik yapılmadı.');
    };dialog.showModal();
  }
  $('add-issue').onclick=()=>issueDialog(null);
  $('audit-site').onclick=async()=>{const b=$('audit-site'),label=b.textContent;b.disabled=true;b.textContent='Taranıyor…';try{await audit(true);toast('Site taraması tamamlandı. Sonuçlar kaydedildi.');}catch(e){toast('Site taraması tamamlanamadı. Sunucu bağlantısını kontrol edin.');}finally{b.disabled=false;b.textContent=label;}};
  $('content-list').onclick=e=>{const b=e.target.closest('[data-post]');if(b)postDialog(b.dataset.post);};
  $('issues-list').onclick=e=>{const b=e.target.closest('[data-issue]');if(b)issueDialog(b.dataset.issue);};
  return {render};
};
