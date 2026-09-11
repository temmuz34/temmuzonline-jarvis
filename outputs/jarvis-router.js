(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JarvisRouter=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function route(text){
  const q=String(text).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[?!.,’']/g,' ').replace(/\s+/g,' ').trim();
  const force=/yenile|tekrar|yeniden/.test(q);
  if(/instagram|icerik|linkedin|reels|story|hikaye|influencer/.test(q))return {kind:'content',force};
  if(/reklam|ads|roas/.test(q))return {kind:'ads',force};
  if(/google|analytics|ga4|search console|organik trafik|kelimeler|en cok tiklanan|seo firsat|pozisyon 8/.test(q))return {kind:'google',services:/analytics|ga4/.test(q)?['analytics']:/search console|organik|kelimeler|tiklanan|seo firsat|pozisyon/.test(q)?['searchConsole']:['analytics','searchConsole'],force};
  if(/(site|web|seo|temmuzonline).*(tara|kontrol|denetle)|^(tekrar tara|yeniden kontrol et)$/.test(q))return {kind:'audit',force};
  if(/^(son durum( nedir| ne)?|bugun durum nedir|bugunku durum|satis durumu|su an durum ne|ne durumdayiz|guncel durum)$/.test(q))return {kind:'sales',force};
  return {kind:'other',force};
 }
 return {route};
});
