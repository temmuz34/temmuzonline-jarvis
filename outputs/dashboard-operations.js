(() => {
  const channels=[{name:'Trendyol',revenue:82400,orders:142,color:'#ff903b'},{name:'Hepsiburada',revenue:51300,orders:79,color:'#ffcb61'},{name:'Amazon',revenue:31200,orders:42,color:'#81baff'},{name:'TemmuzOnline',revenue:19620,orders:24,color:'#30dcc1'}];
  const experts=[['LD','Lara Demir','Dijital büyüme'],['AK','Atlas Kaya','SEO'],['MA','Mert Arslan','Pazaryerleri'],['SA','Selin Aksoy','Reklam performansı'],['EY','Ece Yalın','Müşteri deneyimi'],['KT','Kerem Tan','Fiyat ve kârlılık'],['DA','Deniz Acar','Stok ve operasyon'],['AE','Ada Ersoy','İçerik ve marka'],['MŞ','Mira Şahin','Grafik tasarım']];
  const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(n);
  const total=channels.reduce((s,c)=>s+c.revenue,0),orders=channels.reduce((s,c)=>s+c.orders,0);
  document.querySelector('.brand small').textContent='Satış ve ekip operasyon merkezi';
  document.querySelector('.system b').textContent='ÖRNEK VERİ / BAĞLANTI BEKLİYOR';
  document.getElementById('fps').textContent='Canlı senkronizasyon yok';
  document.querySelector('.panel.left').innerHTML=`<h2>Satış özeti</h2><div class="item"><small>Toplam ciro</small><strong>${money(total)}</strong><span>Örnek veri</span></div><div class="item"><small>Sipariş</small><strong>${orders}</strong><span>4 platform</span></div><div class="item"><small>Ortalama sepet</small><strong>${money(total/orders)}</strong><span>Ciro / sipariş</span></div>`;
  document.querySelector('.panel.right').innerHTML=`<h2>Platform satışları</h2><p class="data-note">Önceki tasarımdaki örnek rakamlar. Güncel satış bağlantısı henüz kurulmadı.</p>${channels.map(c=>`<section class="channel"><header><span>${c.name}</span><strong>${money(c.revenue)}</strong></header><p>${c.orders} sipariş · Ort. sepet ${money(c.revenue/c.orders)}</p><div class="bar" style="--color:${c.color};--share:${c.revenue/total*100}%"><i></i></div></section>`).join('')}<h2>Uzman ekibi · ${experts.length}</h2><p class="data-note">Tanımlı AI rolleri · canlı görev bağlantısı yok</p>${experts.map(e=>`<div class="team-row"><span class="team-avatar">${e[0]}</span><div><strong>${e[1]}</strong><small>${e[2]} · Beklemede</small></div></div>`).join('')}`;
  document.querySelector('.status small').textContent='TemmuzOnline · JARVIS';
})();
