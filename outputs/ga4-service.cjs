'use strict';
const {periods,delta}=require('./google-periods.cjs');
const metrics=['activeUsers','totalUsers','sessions','engagedSessions','engagementRate','screenPageViews','addToCarts','checkouts','ecommercePurchases','purchaseRevenue'];
async function analytics(auth,property){
 if(!/^\d+$/.test(property||''))throw new Error('GA4 mülküne erişilemiyor. GA4_PROPERTY_ID ayarını kontrol edin.');
 const dates=periods(),endpoint=`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,warnings=[];
 const report=(date,names,dimensions=[])=>auth.request(endpoint,{dateRanges:[date],metrics:names.map(name=>({name})),dimensions:dimensions.map(name=>({name})),limit:100},'GA4');
 const unpack=(data,names)=>Object.fromEntries(names.map((m,i)=>[m,data.rows?.[0]?Number(data.rows[0].metricValues[i].value):0]));
 async function totals(date){
  try{return unpack(await report(date,metrics),metrics);}catch(e){if(e.status!==400)throw e;}
  const values={};
  for(const m of metrics){try{Object.assign(values,unpack(await report(date,[m]),[m]));}catch(e){if(e.status!==400)throw e;values[m]=null;if(!warnings.includes(m))warnings.push(m);}}
  if(Object.values(values).every(v=>v===null))throw new Error('GA4 mülküne erişilemiyor.');return values;
 }
 const current=await totals(dates.current),previous=await totals(dates.previous),breakdowns={};
 for(const dimension of ['sessionDefaultChannelGroup','sessionSourceMedium','landingPagePlusQueryString','deviceCategory']){
  try{const names=['sessions','ecommercePurchases','purchaseRevenue','engagementRate'];const d=await report(dates.current,names,[dimension]);breakdowns[dimension]=(d.rows||[]).map(r=>({name:r.dimensionValues[0].value,...Object.fromEntries(names.map((m,i)=>[m,Number(r.metricValues[i].value)]))}));}
  catch(e){if([401,403,429].includes(e.status))throw e;warnings.push(dimension);breakdowns[dimension]=null;}
 }
 return {source:'Google Analytics Data API',at:new Date().toISOString(),dates,current,previous,changes:Object.fromEntries(metrics.map(m=>[m,current[m]===null||previous[m]===null?null:delta(current[m],previous[m])])),breakdowns,warnings};
}
module.exports={analytics};
