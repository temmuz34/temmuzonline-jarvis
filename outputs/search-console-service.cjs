'use strict';
const {periods,delta}=require('./google-periods.cjs');
async function searchConsole(auth,property){
 if(!property||!(property.startsWith('sc-domain:')||/^https?:\/\//.test(property)))throw new Error('Search Console mülküne erişilemiyor. SEARCH_CONSOLE_SITE_URL ayarını kontrol edin.');
 const dates=periods(new Date(),3),endpoint=`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
 const query=(date,dimensions=[])=>auth.request(endpoint,{...date,dimensions,rowLimit:1000,dataState:'final',type:'web'},'Search Console');
 const empty={clicks:0,impressions:0,ctr:0,position:0};
 const current=(await query(dates.current)).rows?.[0]||{...empty},previous=(await query(dates.previous)).rows?.[0]||{...empty};
 const breakdowns={},previousBreakdowns={};
 breakdowns.queryPage=(await query(dates.current,['query','page'])).rows||[];
 for(const dimension of ['query','page','device','country']){
  breakdowns[dimension]=(await query(dates.current,[dimension])).rows||[];
  if(dimension==='query'||dimension==='page')previousBreakdowns[dimension]=(await query(dates.previous,[dimension])).rows||[];
 }
 return {source:'Google Search Console API',at:new Date().toISOString(),dates,current,previous,changes:Object.fromEntries(Object.keys(empty).map(m=>[m,delta(current[m],previous[m])])),breakdowns,previousBreakdowns,note:'Kesinleşmiş veri için dönem üç gün geriden başlar. Sorgu/sayfa listeleri en fazla 1000 satırdır; anonim sorgular dahil olmayabilir.'};
}
module.exports={searchConsole};
