'use strict';
const fs=require('node:fs');const path=require('node:path');
function createStorage(env=process.env,options={}){
 const mode=env.STORAGE_MODE||'json';
 if(mode==='postgres')return require('./postgres-storage.cjs').postgresStorage(env,options.Pool);
 if(mode==='d1')throw new Error('STORAGE_MODE=d1 henüz desteklenmiyor.');
 if(mode!=='json')throw new Error(`Desteklenmeyen STORAGE_MODE: ${mode}`);
 const dir=env.TEMMUZ_DATA_DIR||path.resolve(__dirname,'../work/v12-runtime');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'operations.json');
 return {load(){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;},save(value){const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value));fs.renameSync(temp,file);},health(){return {mode,persistent:false,message:'Yerel/geçici veri depolama kullanılıyor. Harici kalıcı veritabanı bağlı değil.'};}};
}
module.exports={createStorage};
