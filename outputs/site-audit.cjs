'use strict';
const allowed=new Set(['temmuzonline.com','www.temmuzonline.com']);
const targets=['https://temmuzonline.com/','https://temmuzonline.com/robots.txt','https://temmuzonline.com/sitemap.xml'];
async function inspect(url,fetcher=fetch){
  const start=performance.now();let next=url;
  try{
    for(let redirect=0;redirect<4;redirect++){
      const response=await fetcher(next,{redirect:'manual',signal:AbortSignal.timeout(7000),headers:{'User-Agent':'TemmuzOnline-Operations/1.0 (site availability check)'}});
      await response.body?.cancel();
      if([301,302,303,307,308].includes(response.status)){
        const location=response.headers.get('location');if(!location)throw new Error('Yönlendirme adresi yok');
        const dest=new URL(location,next);
        if(dest.protocol!=='https:'||!allowed.has(dest.hostname)||dest.port||dest.username||dest.password)throw new Error('Alan dışı yönlendirme izlenmedi');
        next=dest.href;continue;
      }
      return {url,status:response.status,ms:Math.round(performance.now()-start),error:''};
    }
    throw new Error('Yönlendirme sınırı');
  }catch(e){return {url,status:0,ms:Math.round(performance.now()-start),error:e.name==='TimeoutError'?'Zaman aşımı':String(e.message+(e.cause?.code?' / '+e.cause.code:'')).slice(0,250)};}
}
async function audit(fetcher){const results=[];for(const url of targets)results.push(await inspect(url,fetcher));return {at:new Date().toISOString(),results};}
module.exports={audit,inspect};
