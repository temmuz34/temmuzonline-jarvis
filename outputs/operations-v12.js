(async () => {
  'use strict';
  const M=window.OperationsModel,$=id=>document.getElementById(id),KEY='temmuz.operations.v12';
  let volatile=M.initial(),state,selectedReport=null,selectedView='overview',toastTimer;
  let growthUI;
  let recognition=null,voiceMode='idle',recognitionToken=0,speakingToken=0,voiceTimeout=0;
  let serverOnline=false,configRevision=0,pendingSync=0,syncQueue=Promise.resolve(),polling=false;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel=d=>new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(d));
  function read(){try{const raw=localStorage.getItem(KEY);return raw?M.hydrate(JSON.parse(raw)):volatile;}catch{return volatile;}}
  function saveLocal(){volatile=state;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('Tarayıcı kaydına erişilemiyor. Değişiklikler bu oturumda tutulacak.');}}
  function change(fn){state=read();const before=JSON.stringify({experts:state.experts,settings:state.settings,growth:state.growth}),ids=new Set(state.reports.map(r=>r.id));fn(state);saveLocal();if(serverOnline){const config={experts:state.experts,settings:state.settings,growth:state.growth},reports=state.reports.filter(r=>!ids.has(r.id));if(before!==JSON.stringify(config)||reports.length)enqueueSync({config:before!==JSON.stringify(config)?structuredClone(config):undefined,reports:structuredClone(reports)});}return state;}
  function schedulerNote(){ $('scheduler-note').textContent=serverOnline?'Yerel rapor sunucusu bağlı. Tarayıcı kapalı olsa da bilgisayar ve sunucu açıkken raporlar hazırlanır. Bilgisayar uyuduğunda kaçırılan bugünkü raporlar sunucu tekrar çalıştığında tamamlanır.':'Rapor sunucusu bağlı değil. Raporlar yalnızca bu sayfa açıkken hazırlanır; bugünkü kaçırılan saatler sayfa yeniden açıldığında tamamlanır.';}
  function ingestServer(data,includeConfig=true){
    if(data.service!=='temmuz-operations-v12')throw new Error('Yanlış servis');
    configRevision=data.configRevision;const remote=M.hydrate(data.state);state=read();
    if(includeConfig){state.experts=remote.experts;state.settings=remote.settings;state.growth=remote.growth;}
    const reports=new Map(state.reports.map(r=>[r.id,r]));remote.reports.forEach(r=>reports.set(r.id,r));state.reports=[...reports.values()].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)).slice(-60);saveLocal();
  }
  function enqueueSync(payload){
    pendingSync++;
    syncQueue=syncQueue.then(async()=>{
      const response=await fetch('/api/operations',{method:'POST',headers:{'Content-Type':'application/json','X-Temmuz-Client':'operations-v12'},body:JSON.stringify({...payload,configRevision}),signal:AbortSignal.timeout(5000)});
      const data=await response.json();
      if(response.status===409){ingestServer(data,true);toast('Ayarlar başka sekmede değişmiş. Güncel ayarlar yüklendi; değişikliğini tekrar kaydet.');return;}
      if(!response.ok)throw new Error(data.error||'Kayıt başarısız');
      ingestServer(data,pendingSync===1);
    }).catch(()=>{serverOnline=false;schedulerNote();toast('Sunucu kaydı tamamlanamadı. Bu oturumdaki değişiklikler tarayıcıda tutuluyor.');}).finally(()=>{pendingSync--;if(!pendingSync){refresh();updateSpeechButton();}});
  }
  async function pollServer(){
    if(polling||pendingSync)return;polling=true;
    try{const response=await fetch('/api/operations',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Sunucu erişilemiyor');const data=await response.json();if(!pendingSync){ingestServer(data);refresh();updateSpeechButton();}}
    catch{serverOnline=false;schedulerNote();toast('Rapor sunucusuyla bağlantı kesildi. Sayfa açıkken yerel rapor planı devam eder.');}finally{polling=false;}
  }
  function icons(){if(window.lucide)window.lucide.createIcons();}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);$('audit').textContent=text;}
  function initials(name){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('tr-TR');}
  function expertCards(managed,group='all'){return state.experts.filter(e=>group==='all'||(window.GrowthModel.roles.some(r=>r[0]===e.id)?'growth':'operations')===group).map(e=>`<button class="expert" data-expert="${esc(e.id)}" style="--accent:${e.color}"><div class="expert-top"><span class="avatar">${esc(initials(e.name))}</span><div><h3>${esc(e.name)}</h3><span class="role">${esc(e.role)}</span></div></div><p>${esc(e.task)}</p><div class="expert-foot"><span>${e.active?'● RAPORA DAHİL':'○ DURAKLATILDI'}</span><span>${managed?'Düzenle ↗':e.note?'Not mevcut':'Veri bekleniyor'}</span></div></button>`).join('')||'<p class="empty-state">Henüz uzman eklenmedi.</p>';}
  function renderSales(){
    const {revenue,orders}=M.totals();
    $('brief-revenue').textContent=M.currency(revenue);
    $('brief-orders').textContent=new Intl.NumberFormat('tr-TR').format(orders);
    $('brief-basket').textContent=M.currency(orders?revenue/orders:0);
    $('platforms').innerHTML=M.channels.map(c=>`<tr><td><span class="channel-dot" style="--accent:${c.color}"></span>${c.name}</td><td>${M.currency(c.revenue)}</td><td>${c.orders}</td><td>${M.currency(c.revenue/c.orders)}</td><td>%${(c.revenue/revenue*100).toFixed(1).replace('.',',')}</td></tr>`).join('');
    $('sales-mix').innerHTML=M.channels.map(c=>`<span style="--accent:${c.color};width:${c.revenue/revenue*100}%" title="${c.name}"></span>`).join('');
  }
  function reportSummary(r){return `${r.entries.length} uzmanın raporu hazır.\nÖrnek satış: ${M.currency(r.sales.revenue)} / ${r.sales.orders} sipariş.\n${r.late?'Kaçırılan saat için açılışta hazırlandı.':'Notlar ve bağlantı durumları raporlandı.'}`;}
  function renderReports(){
    const reports=[...state.reports].reverse(),latest=reports[0];
    $('latest-title').textContent=latest?latest.title:'Henüz rapor yok';$('latest-summary').textContent=latest?`${dateLabel(latest.createdAt)}\n${reportSummary(latest)}`:'Planlanan ekip raporları burada görünecek.';
    if(!reports.some(r=>r.id===selectedReport))selectedReport=latest?.id||null;
    $('report-list').innerHTML=reports.map(r=>`<button class="report-item${r.id===selectedReport?' selected':''}" data-report="${esc(r.id)}" aria-pressed="${r.id===selectedReport}"><strong>${esc(r.title)}</strong><span>${dateLabel(r.createdAt)} · ${r.entries.length} uzman</span></button>`).join('')||'<p class="empty-state">Rapor arşivi boş.</p>';
    const r=reports.find(x=>x.id===selectedReport);$('download-report').disabled=!r;
    $('report-detail').innerHTML=r?`<div class="report-detail-head"><span class="section-kicker">KONSEY / ${r.scheduledAt?'ZAMANLANMIŞ':'ANLIK'}</span><h3>${esc(r.title)}</h3><p>${dateLabel(r.createdAt)} · ${r.entries.length} uzman${r.late?' · Kaçırılan rapor':''}</p><p>Örnek satış verisi ve kayıtlı ekip notları. Canlı tarama yapılmadı.</p></div><div class="report-entry"><h4>Satış özeti</h4><p>${M.currency(r.sales.revenue)} ciro · ${r.sales.orders} sipariş · ${M.currency(r.sales.revenue/r.sales.orders)} ortalama sepet</p></div>${r.entries.map(e=>`<div class="report-entry"><h4>${esc(e.name)} <span class="muted">/ ${esc(e.role)}</span></h4><p>${esc(e.text)}</p><small>${esc(e.source)} · Sorumluluk: ${esc(e.task)}</small></div>`).join('')||'<p class="empty-state">Rapora dahil edilmiş uzman yok.</p>'}`:'<p class="empty-state">Bir konsey raporu hazırlayarak başlayabilirsin.</p>';
  }
  function refresh(){state=read();renderSales();$('overview-team').innerHTML=expertCards(false);$('managed-team').innerHTML=expertCards(true,'operations');$('managed-growth-team').innerHTML=expertCards(true,'growth');$('active-team').textContent=`${state.experts.filter(e=>e.active).length} / ${state.experts.length} uzman`;$('plan-label').textContent=state.settings.enabled?state.settings.times.join(' / '):'Kapalı';renderReports();growthUI?.render();clock();icons();}
  function switchView(view){
    if(!['overview','team','reports','settings','content','insights'].includes(view))return;
    selectedView=view;document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==`view-${view}`);
    document.querySelectorAll('.nav-button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(view==='settings')renderSettings();
    if(window.innerWidth>760){$('main-content').scrollTop=0;return;}
    const top=$('main-content').getBoundingClientRect().top+window.scrollY;
    const cover=window.innerWidth<=760?310:document.querySelector('.topbar').offsetHeight+document.querySelector('.command-deck').offsetHeight;
    window.scrollTo({top:Math.max(0,top-cover),behavior:'auto'});
  }
  function renderSettings(){state=read();$('schedule-enabled').checked=state.settings.enabled;$('morning-time').value=state.settings.times[0];$('afternoon-time').value=state.settings.times[1];$('speech-enabled').checked=state.settings.speech;updateSpeechButton();}
  function clock(){
    const now=Date.now();$('clock').textContent=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now);
    const next=M.nextSlot(state,now);$('next-report').textContent=next?`${M.localDay(now)===next.day?'Bugün':'Yarın'} / ${next.time}`:'Otomatik rapor kapalı';
    if(next){const min=Math.ceil((next.at-now)/60000);$('countdown').textContent=`${Math.floor(min/60)} sa ${min%60} dk kaldı`;}else $('countdown').textContent='Raporlar elle hazırlanabilir.';
  }
  function runManual(){
    let report;change(s=>{report=M.makeReport(s,{id:`manual:${crypto.randomUUID()}`});s.reports.push(report);s.reports=s.reports.slice(-60);});selectedReport=report.id;refresh();toast(`${report.entries.length} uzmanın raporu hazır.`);return report;
  }
  function scheduledRun(){
    if(serverOnline){pollServer();return;}
    const execute=()=>{
      const due=M.dueSlots(read());if(!due.length)return;
      let count=0;
      change(s=>{for(const slot of M.dueSlots(s)){s.reports.push(M.makeReport(s,{slot}));count++;}s.reports=s.reports.slice(-60);});
      if(count){refresh();toast(`${count} planlı konsey raporu hazırlandı.`);}
    };
    if(navigator.locks)navigator.locks.request('temmuz-v12-reports',{ifAvailable:true},lock=>{if(lock)execute();}).catch(execute);else execute();
  }
  function openExpert(id){
    const e=read().experts.find(x=>x.id===id);$('expert-dialog-title').textContent=e?'Uzman bilgileri':'Yeni uzman';$('expert-id').value=e?.id||'';$('expert-name').value=e?.name||'';$('expert-role').value=e?.role||'';$('expert-task').value=e?.task||'';$('expert-note').value=e?.note||'';$('expert-active').checked=e?.active!==false;$('delete-expert').hidden=!e;$('delete-confirm').hidden=true;$('expert-error').textContent='';$('expert-dialog').showModal();
  }
  function addMessage(text,role='assistant'){
    change(s=>{s.messages.push({text,role});s.messages=s.messages.slice(-80);});
    renderMessages();
  }
  function renderMessages(){
    $('conversation').replaceChildren();
    for(const m of state.messages){const el=document.createElement('div');el.className=`message ${m.role}`;const name=document.createElement('strong');name.textContent=m.role==='user'?'TEMMUZONLINE':'JARVIS';el.append(name,document.createTextNode(m.text));$('conversation').append(el);}
    $('conversation').scrollTop=$('conversation').scrollHeight;
  }
  function stopSpeaking(){speakingToken++;if(window.speechSynthesis)window.speechSynthesis.cancel();}
  function speak(text){
    if(!state.settings.speech||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
    stopSpeaking();const token=speakingToken;const chunks=text.match(/[^.!?\n]+[.!?]?/g)||[text];let index=0;
    function next(){if(token!==speakingToken||index>=chunks.length)return;const u=new SpeechSynthesisUtterance(chunks[index++]);u.lang='tr-TR';u.rate=1;const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('tr'));if(voice)u.voice=voice;u.onend=next;u.onerror=()=>{$('voice-status').textContent='Sesli yanıt oynatılamadı. Yanıt sohbet alanında.';};speechSynthesis.speak(u);}
    next();
  }
  function answer(text){
    const q=M.normalize(text);state=read();const {revenue,orders}=M.totals();
    if(/icerik|instagram|linkedin|influencer|reels|hikaye/.test(q)){switchView('content');const g=state.growth;return `TemmuzOnline içerik ekibi hazır: Duru strateji, Can Reels/hikâye, İlay tasarım, Selma LinkedIn, Elif influencer ve topluluk. ${g.posts.length} kayıtlı taslak var. İçerik stüdyosunda ürün ve hedef kitleyle günlük, haftalık veya aylık plan oluşturabilirsin. Medya üretimi ve yayın API bağlantısı henüz yok; hiçbir paylaşım yapılmadı.`;}
    if(/ga4|analytics|search console|analiz rapor/.test(q))return window.GrowthModel.analytics(state.growth).join('\n\n');
    if(/site rapor|site durum|acil|duzeltme|site denetim/.test(q))return window.GrowthModel.siteReport(state.growth).join('\n\n');
    if(q.includes('rapor')&&(q.includes('ekip')||q.includes('tum')||q.includes('hazirla')||q.includes('ver'))){const r=runManual();return `Konsey raporu hazır. ${r.entries.length} uzman rapor verdi.\n\n${r.entries.map(e=>`${e.name} / ${e.role}\n${e.text}`).join('\n\n')}\n\nRapor arşive kaydedildi.`;}
    if(q.includes('rapor')&&(q.includes('saat')||q.includes('ne zaman')||q.includes('plan'))){return `Rapor planı ${state.settings.enabled?'açık':'kapalı'}. Türkiye saatiyle her gün ${state.settings.times.join(' ve ')}. ${serverOnline?'Bilgisayar ve yerel sunucu açıkken tarayıcı kapalı olsa da hazırlanır.':'Sayfa açıkken hazırlanır; kaçırılan bugünkü raporlar yeniden açılışta tamamlanır.'}`;}
    if(q.includes('son rapor')){const r=state.reports.at(-1);return r?`${r.title}\n${reportSummary(r)}\n${r.entries.map(e=>`${e.name}: ${e.text}`).join('\n\n')}`:'Henüz rapor yok. Tüm ekip rapor versin diyerek hazırlayabilirsin.';}
    const member=state.experts.find(e=>q.includes(M.normalize(e.name))||q.includes(M.normalize(e.name.split(' ')[0]))||q.includes(M.normalize(e.role)));
    if(member)return `${member.name} / ${member.role}\n${M.expertFinding(member,state).text}\nSorumluluk: ${member.task}`;
    const channel=M.channels.find(c=>q.includes(M.normalize(c.name)));
    if(channel)return `Örnek veride ${channel.name}: ${M.currency(channel.revenue)} ciro, ${channel.orders} sipariş ve ${M.currency(channel.revenue/channel.orders)} ortalama sepet. Canlı satış bağlantısı henüz yok.`;
    if(['satis','ciro','siparis','durum','bugun','sepet'].some(k=>q.includes(k)))return `Örnek satış özeti: ${M.currency(revenue)} ciro, ${orders} sipariş, ${M.currency(revenue/orders)} ortalama sepet.\n${M.channels.map(c=>`${c.name}: ${M.currency(c.revenue)} / ${c.orders} sipariş`).join('\n')}\nBunlar canlı satış rakamları değil.`;
    if(q.includes('ekip')||q.includes('uzman'))return `Konseyde ${state.experts.length} uzman var; ${state.experts.filter(e=>e.active).length} uzman rapora dahil.\n${state.experts.map(e=>`${e.name}: ${e.role}`).join('\n')}`;
    if(/reddet|red ver|onayla/.test(q))return 'Bu sürümde bekleyen bir işlem veya bağlı reklam hesabı yok. Herhangi bir bütçe değişikliği yapmadım.';
    if(/merhaba|selam|hazir misin/.test(q))return 'Merhaba TemmuzOnline. Hazırım. Satış özetini, konsey raporlarını ve ekip notlarını konuşabiliriz.';
    return 'Şu an satış özeti, ekip notları ve rapor komutlarıyla çalışıyorum. Serbest yapay zekâ sohbeti için bir model servisi bağlantısı gerekli. Örneğin “Tüm ekip rapor versin” veya “Mira son durum” diyebilirsin.';
  }
  function submit(text){text=String(text||'').trim().slice(0,1200);if(!text)return;addMessage(text,'user');$('chat-input').value='';const response=answer(text);addMessage(response);speak(response);}
  function voiceState(mode,message){voiceMode=mode;document.body.dataset.voice=mode;$('voice-label').textContent=mode==='listening'?'DİNLİYOR':mode==='starting'?'MİKROFON':'HAZIR';if(message)$('voice-status').textContent=message;const active=['starting','listening'].includes(mode);$('face-talk').setAttribute('aria-pressed',String(active));$('mic-button').setAttribute('aria-pressed',String(active));$('mic-button').setAttribute('aria-label',active?'Mikrofonu durdur':'Mikrofonu aç');}
  function toggleMicrophone(){
    stopSpeaking();
    if(['starting','listening'].includes(voiceMode)){clearTimeout(voiceTimeout);recognition?.stop();voiceState('idle','Dinleme durduruldu.');return;}
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){voiceState('error','Bu tarayıcı ses tanımayı desteklemiyor. Mikrofon için sayfayı Chrome veya Edge’de açabilirsin. Yazılı sohbet kullanılabilir.');$('chat-input').focus();return;}
    if(!window.isSecureContext){voiceState('error','Mikrofon için sayfayı localhost veya HTTPS adresinden aç.');return;}
    recognition?.abort();const token=++recognitionToken;
    try{recognition=new Recognition();recognition.lang='tr-TR';recognition.interimResults=true;recognition.continuous=false;
      voiceState('starting','Mikrofon izni bekleniyor…');
      voiceTimeout=setTimeout(()=>{if(token===recognitionToken&&voiceMode==='starting'){recognition.abort();voiceState('error','Mikrofon izni zaman aşımına uğradı. Tarayıcı site izinlerinden mikrofon erişimini aç.');}},6500);
      recognition.onstart=()=>{if(token===recognitionToken)voiceState('listening','Dinliyorum…');};
      recognition.onresult=e=>{if(token!==recognitionToken)return;let final='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)final+=e.results[i][0].transcript;else interim+=e.results[i][0].transcript;}
        if(interim)$('voice-status').textContent=interim;
        if(final.trim()){recognition.stop();voiceState('idle','Mesaj alındı.');submit(final);}
      };
      recognition.onerror=e=>{if(token!==recognitionToken)return;clearTimeout(voiceTimeout);const errors={'not-allowed':'Mikrofon izni kapalı. Tarayıcının site izinlerinden mikrofon erişimini aç.','service-not-allowed':'Tarayıcı ses tanıma hizmetine izin vermiyor. Chrome veya Edge ile deneyebilirsin.','audio-capture':'Mikrofon bulunamadı veya başka bir uygulama kullanıyor.','network':'Ses tanıma servisine bağlanılamadı. İnternet bağlantısını kontrol et.','no-speech':'Ses algılanmadı. Tekrar mikrofonu açabilirsin.','aborted':'Dinleme durduruldu.'};voiceState('error',errors[e.error]||'Ses tanıma başlatılamadı. Yazılı sohbet kullanılabilir.');};
      recognition.onend=()=>{if(token===recognitionToken&&voiceMode!=='error')voiceState('idle','Mikrofon hazır.');};recognition.start();
    }catch{voiceState('error','Mikrofon başlatılamadı. Tarayıcı izinlerini kontrol et.');}
  }
  function updateSpeechButton(){const enabled=state.settings.speech;$('voice-output').setAttribute('aria-pressed',String(enabled));$('voice-output').innerHTML=`<i data-lucide="${enabled?'volume-2':'volume-x'}">♪</i>`;icons();}
  function placeFace(){const canvas=$('aiHumanoid'),w=canvas.clientWidth,h=canvas.clientHeight,s=Math.min(w/1000,h/1000);const face=$('face-talk');Object.assign(face.style,{left:`${(w-1000*s)/2+345*s}px`,top:`${(h-1000*s)/2+190*s}px`,width:`${310*s}px`,height:`${380*s}px`});document.documentElement.style.scrollPaddingTop=`${window.innerWidth<=760?326:document.querySelector('.topbar').offsetHeight+document.querySelector('.command-deck').offsetHeight+16}px`;}
  document.addEventListener('click',e=>{const view=e.target.closest('[data-view]');if(view)switchView(view.dataset.view);const expert=e.target.closest('[data-expert]');if(expert)openExpert(expert.dataset.expert);const report=e.target.closest('[data-report]');if(report){selectedReport=report.dataset.report;renderReports();}const quick=e.target.closest('[data-command]');if(quick)submit(quick.dataset.command);});
  $('chat-form').addEventListener('submit',e=>{e.preventDefault();submit($('chat-input').value);});
  $('face-talk').onclick=toggleMicrophone;$('mic-button').onclick=toggleMicrophone;
  $('voice-output').onclick=()=>{change(s=>s.settings.speech=!s.settings.speech);if(!state.settings.speech)stopSpeaking();updateSpeechButton();toast(state.settings.speech?'Sesli yanıt açık.':'Sesli yanıt kapalı.');};
  $('run-report').onclick=()=>submit('Tüm ekip rapor versin');$('report-now').onclick=()=>{runManual();switchView('reports');};
  $('add-expert').onclick=()=>openExpert(null);$('close-expert').onclick=()=>$('expert-dialog').close();
  $('delete-expert').onclick=()=>$('delete-confirm').hidden=false;
  $('confirm-delete').onclick=()=>{const id=$('expert-id').value;change(s=>s.experts=s.experts.filter(e=>e.id!==id));$('expert-dialog').close();refresh();toast('Uzman ekipten kaldırıldı.');};
  $('expert-form').onsubmit=e=>{e.preventDefault();const name=$('expert-name').value.trim(),role=$('expert-role').value.trim(),task=$('expert-task').value.trim();if(!name||!role||!task){$('expert-error').textContent='İsim, uzmanlık ve sorumluluk boş olamaz.';return;}change(s=>{const existing=s.experts.find(x=>x.id===$('expert-id').value);const item={id:existing?.id||crypto.randomUUID(),name,role,task,note:$('expert-note').value.trim(),active:$('expert-active').checked,color:existing?.color||'#35cfee'};if(existing)Object.assign(existing,item);else s.experts.push(item);});$('expert-dialog').close();refresh();toast('Uzman bilgileri kaydedildi.');};
  $('settings-form').onsubmit=e=>{e.preventDefault();const times=[$('morning-time').value,$('afternoon-time').value];if(!M.validTimes(times)){$('settings-error').textContent='İki farklı, geçerli rapor saati seç.';return;}$('settings-error').textContent='';change(s=>s.settings={enabled:$('schedule-enabled').checked,times:times.sort(),speech:$('speech-enabled').checked});if(!state.settings.speech)stopSpeaking();refresh();updateSpeechButton();scheduledRun();toast('Rapor ve ses ayarları kaydedildi.');};
  $('download-report').onclick=()=>{const r=read().reports.find(x=>x.id===selectedReport);if(!r)return;const body=`TEMMUZONLINE / ${r.title}\n${dateLabel(r.createdAt)}\nÖrnek satış verisi ve kayıtlı ekip notları.\n\n${reportSummary(r)}\n\n${r.entries.map(e=>`${e.name} / ${e.role}\n${e.text}\nKaynak: ${e.source}`).join('\n\n')}`;const url=URL.createObjectURL(new Blob(['\ufeff'+body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`temmuz-rapor-${M.localDay(Date.parse(r.createdAt))}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  window.addEventListener('storage',e=>{if(e.key===KEY){refresh();renderMessages();if(selectedView==='settings'&&!$('settings-form').contains(document.activeElement))renderSettings();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();scheduledRun();}});
  window.addEventListener('pagehide',()=>{recognitionToken++;recognition?.abort();stopSpeaking();});
  state=read();
  try{const response=await fetch('/api/operations',{cache:'no-store',signal:AbortSignal.timeout(2000)});if(response.ok){const data=await response.json();if(data.service==='temmuz-operations-v12'){serverOnline=true;ingestServer(data);}}}catch{}
  schedulerNote();
  growthUI=window.createGrowthUI({read,change,refresh,toast,audit:async()=>{
    if(!serverOnline)throw new Error('Erişim kontrolü için yerel rapor sunucusu gerekli.');
    await syncQueue;
    const response=await fetch('/api/site-audit',{method:'POST',headers:{'X-Temmuz-Client':'operations-v12'},signal:AbortSignal.timeout(95000)});
    if(!response.ok)throw new Error('Erişim kontrolü tamamlanamadı. Sunucu bağlantısını kontrol et.');
    const data=await response.json();await syncQueue;ingestServer(data,false);state=read();state.growth.checks=data.state.growth.checks;saveLocal();refresh();
  }});
  if(!state.messages.length)addMessage('Merhaba TemmuzOnline. Satış özetini, ekip notlarını ve konsey raporlarını burada konuşabiliriz. Satış verileri şu an örnek; canlı servis bağlantısı yok.');
  refresh();renderMessages();renderSettings();
  if(!(window.SpeechRecognition||window.webkitSpeechRecognition))$('voice-status').textContent='Ses tanıma bu tarayıcıda yok. Mikrofon için Chrome veya Edge kullan.';
  if(!window.speechSynthesis){$('voice-output').disabled=true;$('voice-output').title='Bu tarayıcı sesli yanıtı desteklemiyor';}
  new ResizeObserver(placeFace).observe($('scene-shell'));placeFace();scheduledRun();setInterval(clock,1000);setInterval(scheduledRun,15000);
})();
