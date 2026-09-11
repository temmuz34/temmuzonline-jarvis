'use strict';
const fs=require('node:fs'),path=require('node:path'),{isDeepStrictEqual}=require('node:util');
const G=require('./growth-model.js');
const {makePool,schema}=require('./postgres-storage.cjs');
function validate(value){
 const s=value?.state;
 if(!Number.isInteger(value?.configRevision)||value.configRevision<0||value.configRevision>2147483647||!s||s.version!==12||!Array.isArray(s.experts)||!Array.isArray(s.reports)||!s.settings||!Array.isArray(s.settings.times)||(s.growth&&!G.valid(s.growth))||(s.briefs&&!Array.isArray(s.briefs)))throw new Error('JSON verisi geçersiz: state ve configRevision kontrol edilmeli.');
 return value;
}
async function migrate(env=process.env,options={}){
 const source=path.join(env.TEMMUZ_DATA_DIR||path.resolve(__dirname,'../work/v12-runtime'),'operations.json');let value;
 try{value=validate(JSON.parse(fs.readFileSync(source,'utf8')));}catch{throw new Error('Kaynak JSON okunamadı veya geçersiz. Migration yapılmadı.');}
 const pool=makePool(env,options.Pool);let client;
 try{
  client=await pool.connect();await client.query('BEGIN');await client.query(schema);
  const existing=await client.query("SELECT config_revision,state FROM operations_state WHERE id='singleton'");
  if(existing.rows.length){await client.query('ROLLBACK');return {migrated:false,message:'PostgreSQL kaydı zaten var; üzerine yazılmadı.'};}
  const inserted=await client.query("INSERT INTO operations_state (id,config_revision,state,updated_at) VALUES ('singleton',$1,$2::jsonb,NOW()) ON CONFLICT (id) DO NOTHING RETURNING id",[value.configRevision,JSON.stringify(value.state)]);
  if(!inserted.rows.length){await client.query('ROLLBACK');return {migrated:false,message:'PostgreSQL kaydı zaten var; üzerine yazılmadı.'};}
  const check=await client.query("SELECT config_revision,state FROM operations_state WHERE id='singleton'");
  if(check.rows[0]?.config_revision!==value.configRevision||!isDeepStrictEqual(check.rows[0]?.state,value.state))throw new Error('verification');
  await client.query('COMMIT');return {migrated:true,message:'JSON → PostgreSQL migration tamamlandı.'};
 }catch{if(client)await client.query('ROLLBACK').catch(()=>{});throw new Error('Migration tamamlanamadı. PostgreSQL erişimini kontrol edin; kaynak JSON korunuyor.');}
 finally{client?.release();await pool.end();}
}
if(require.main===module)migrate().then(r=>console.log(r.message)).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={migrate,validate};
