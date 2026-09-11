'use strict';
const schema=`CREATE TABLE IF NOT EXISTS operations_state (
 id TEXT PRIMARY KEY DEFAULT 'singleton',
 config_revision INTEGER NOT NULL DEFAULT 0,
 state JSONB NOT NULL DEFAULT '{}',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
function makePool(env,PoolClass){
 if(!env.DATABASE_URL)throw new Error('DATABASE_URL tanımlı değil.');
 try{const Pool=PoolClass||require('pg').Pool;const pool=new Pool({connectionString:env.DATABASE_URL,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,query_timeout:15000,statement_timeout:15000});
 pool.on('error',()=>{});return pool;}catch{throw new Error('PostgreSQL bağlantısı kurulamadı');}
}
function postgresStorage(env,Pool){
 const pool=makePool(env,Pool);let initialized=null;
 async function ready(){if(!initialized)initialized=pool.query(schema).catch(()=>{initialized=null;throw new Error('PostgreSQL bağlantısı kurulamadı');});await initialized;}
 return {
  async load(){try{await ready();const r=await pool.query("SELECT config_revision, state FROM operations_state WHERE id='singleton'");return r.rows.length?{configRevision:r.rows[0].config_revision,state:r.rows[0].state}:null;}catch{throw new Error('PostgreSQL verisi okunamadı');}},
  async save(value){try{await ready();await pool.query("INSERT INTO operations_state (id,config_revision,state,updated_at) VALUES ('singleton',$1,$2::jsonb,NOW()) ON CONFLICT (id) DO UPDATE SET config_revision=EXCLUDED.config_revision,state=EXCLUDED.state,updated_at=NOW()",[value.configRevision,JSON.stringify(value.state)]);}catch{throw new Error('PostgreSQL kaydı tamamlanamadı');}},
  async health(){const start=performance.now();try{await ready();const r=await pool.query("SELECT NOW() AS checked_at, (SELECT updated_at FROM operations_state WHERE id='singleton') AS updated_at");return {mode:'postgres',persistent:true,message:'PostgreSQL bağlı',latencyMs:Math.round(performance.now()-start),lastUpdated:r.rows[0]?.updated_at?new Date(r.rows[0].updated_at).toISOString():null};}catch{return {mode:'postgres',persistent:false,message:'PostgreSQL bağlantısı kurulamadı',latencyMs:Math.round(performance.now()-start),lastUpdated:null};}},
  async close(){await pool.end();}
 };
}
module.exports={postgresStorage,makePool,schema};
