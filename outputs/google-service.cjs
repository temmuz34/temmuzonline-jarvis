'use strict';
const {createGoogleAuth}=require('./google-auth.cjs');
const {analytics}=require('./ga4-service.cjs');
const {searchConsole}=require('./search-console-service.cjs');
function createGoogleService(env=process.env,fetcher=fetch){
 const auth=createGoogleAuth(env,fetcher),cache={},pending={},errors={};
 async function get(kind,force=false){
  if(!force&&cache[kind]&&Date.now()-Date.parse(cache[kind].at)<12*60000)return cache[kind];
  if(pending[kind])return pending[kind];
  pending[kind]=(async()=>{try{const data=await(kind==='analytics'?analytics(auth,env.GA4_PROPERTY_ID):searchConsole(auth,env.SEARCH_CONSOLE_SITE_URL));cache[kind]=data;errors[kind]=null;return data;}catch(e){errors[kind]=e.message;throw e;}})();
  try{return await pending[kind];}finally{delete pending[kind];}
 }
 function status(){return {analytics:!!cache.analytics&&!errors.analytics,searchConsole:!!cache.searchConsole&&!errors.searchConsole,configured:{analytics:auth.configured()&&!!env.GA4_PROPERTY_ID,searchConsole:auth.configured()&&!!env.SEARCH_CONSOLE_SITE_URL},ga4Property:env.GA4_PROPERTY_ID||null,searchConsoleProperty:env.SEARCH_CONSOLE_SITE_URL||null,lastSync:Object.values(cache).map(x=>x.at).sort().at(-1)||null,lastError:Object.values(errors).filter(Boolean).join(' ')||null};}
 return {get,status};
}
module.exports={createGoogleService};
