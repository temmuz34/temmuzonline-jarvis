(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ContentService=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function enrich(post,brand,product){return {...post,brand,product,cta:'Ürün detaylarını incele',hashtags:['TemmuzOnline'],imagePrompt:`${brand} için ${product} ürününün gerçek özelliklerini koruyan dikey ürün çekimi.`,videoScript:post.brief,voiceover:`${product} hakkında doğrulanmış ürün bilgilerini buraya ekleyin.`,publishedUrl:''};}
 // Optional provider adapter must be supplied by a server integration; no keys in browser code.
 async function generate(adapter,input){if(!adapter?.generate)throw new Error('Serbest içerik üretimi için model servisi bağlantısı gerekli.');return adapter.generate(input);}
 return {enrich,generate};
});
