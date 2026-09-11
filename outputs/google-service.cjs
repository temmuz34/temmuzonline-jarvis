'use strict';
const {createGoogleAuth}=require('./google-auth.cjs');
const {analytics}=require('./ga4-service.cjs');
const {searchConsole}=require('./search-console-service.cjs');
function createGoogleService(env=process.env,fetcher=fetch){
 const auth=createGoogleAuth(env,fetcher),cache={},pending={},errors={};
 const synced={analytics:false,searchConsole:false};let lastSync=null;
 async function get(kind,force=false){
  if(!force&&!errors[kind]&&cache[kind]&&Date.now()-Date.parse(cache[kind].at)<12*60000)return cache[kind];
  if(pending[kind])return pending[kind];
  pending[kind]=(async()=>{try{const data=await(kind==='analytics'?analytics(auth,env.GA4_PROPERTY_ID):searchConsole(auth,env.SEARCH_CONSOLE_SITE_URL));cache[kind]=data;errors[kind]=null;synced[kind]=true;lastSync=new Date().toISOString();return data;}catch(e){synced[kind]=false;errors[kind]=e.message;throw e;}})();
  try{return await pending[kind];}finally{delete pending[kind];}
 }
 function status(){return {...synced,configured:{analytics:auth.configured()&&!!env.GA4_PROPERTY_ID,searchConsole:auth.configured()&&!!env.SEARCH_CONSOLE_SITE_URL},ga4Property:env.GA4_PROPERTY_ID||null,searchConsoleProperty:env.SEARCH_CONSOLE_SITE_URL||null,lastSync,lastError:Object.values(errors).filter(Boolean).join(' ')||null};}
 return {get,status};
}
module.exports={createGoogleService};
