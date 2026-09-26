'use strict';

const fs=require('fs');
const path=require('path');

const ROOT=__dirname;
const CONFIG_PATH=process.env.DEXTERS_INTEGRATIONS_CONFIG||path.join(ROOT,'integrations.json');

function now(){return new Date().toISOString();}
function loadConfig(){
  if(!fs.existsSync(CONFIG_PATH)) throw new Error('Missing integrations.json');
  return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
}
function safeConfig(){
  const c=loadConfig();
  const clean=JSON.parse(JSON.stringify(c));
  for(const v of Object.values(clean.connectors||{})){
    if(v&&typeof v==='object'){
      for(const k of Object.keys(v)) if(/secret|token|password|key/i.test(k)) v[k]=v[k]?'CONFIGURED':'';
    }
  }
  return clean;
}
function normalisePhone(input){
  let p=String(input||'').replace(/[^0-9+]/g,'');
  if(p.startsWith('00'))p='+'+p.slice(2);
  if(p.startsWith('0'))p='+44'+p.slice(1);
  return p;
}
function normaliseOrder(source,payload={}){
  return {
    id:String(payload.id||payload.order_id||payload.orderId||''),
    source:String(source||'unknown'),
    externalId:String(payload.external_id||payload.externalId||payload.id||''),
    customer:{
      name:String(payload.customer?.name||payload.customer_name||''),
      phone:normalisePhone(payload.customer?.phone||payload.phone||''),
      email:String(payload.customer?.email||payload.email||'')
    },
    fulfilment:String(payload.fulfilment||payload.fulfillment_type||payload.type||'collection'),
    address:payload.address||null,
    items:Array.isArray(payload.items)?payload.items:[],
    totals:payload.totals||{},
    notes:String(payload.notes||''),
    requestedFor:payload.requestedFor||payload.requested_for||null,
    receivedAt:now(),
    raw:payload
  };
}
function connectorState(name){
  const c=loadConfig().connectors?.[name];
  return {name,configured:!!c,enabled:!!c?.enabled,mode:c?.mode||'disabled',environment:c?.environment||'test'};
}
function allStates(){
  const cfg=loadConfig();
  return Object.keys(cfg.connectors||{}).map(connectorState);
}
function requireEnabled(name){
  const cfg=loadConfig().connectors?.[name];
  if(!cfg?.enabled) throw new Error(name+' connector is disabled');
  if((cfg.environment||'test')==='live' && process.env.DEXTERS_ALLOW_LIVE_CONNECTORS!=='YES'){
    throw new Error(name+' live connector blocked by test safety lock');
  }
  return cfg;
}
function phoneLookupPlan(number){
  const cfg=loadConfig().connectors?.caller_intelligence||{};
  return {
    phone:normalisePhone(number),
    localPhonebook:!!cfg.local_phonebook,
    businessDirectory:!!cfg.business_directory,
    spamReputation:!!cfg.spam_reputation,
    reverseLookupProvider:cfg.provider||null,
    warning:'Caller ID can be spoofed; reputation/name matches are indicators, not proof of identity.'
  };
}
module.exports={loadConfig,safeConfig,normalisePhone,normaliseOrder,connectorState,allStates,requireEnabled,phoneLookupPlan};
