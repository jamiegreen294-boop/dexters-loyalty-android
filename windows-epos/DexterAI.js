'use strict';

const fs=require('fs');
const path=require('path');

const ROOT=__dirname;
const CONFIG_PATH=process.env.DEXTERS_INTEGRATIONS_CONFIG||path.join(ROOT,'integrations.json');

function cfg(){
  const all=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
  return all.connectors?.dexter_ai||{};
}
function state(){
  const c=cfg();
  return {
    enabled:!!c.enabled,
    environment:c.environment||'test',
    mode:c.mode||'command-centre',
    endpointConfigured:!!c.endpoint,
    tokenConfigured:!!c.token
  };
}
function safeContext(input={}){
  return {
    screen:String(input.screen||'epos'),
    staff:{id:input.staff?.id||null,name:String(input.staff?.name||''),role:String(input.staff?.role||'')},
    order:input.order?{
      id:input.order.id||null,
      source:String(input.order.source||''),
      status:String(input.order.status||''),
      total:input.order.total||null,
      customerName:String(input.order.customerName||'')
    }:null,
    integrationStatus:Array.isArray(input.integrationStatus)?input.integrationStatus:[],
    hardware:input.hardware||null,
    diagnostics:input.diagnostics||null
  };
}
async function chat(message,context={}){
  const c=cfg();
  if(!c.enabled)throw new Error('Dexter AI connector is disabled in this test build');
  if((c.environment||'test')==='live'&&process.env.DEXTERS_ALLOW_LIVE_CONNECTORS!=='YES')throw new Error('Live Dexter AI connector blocked by test safety lock');
  if(!c.endpoint||!c.token)throw new Error('Dexter AI test endpoint/token is not configured');
  const sessionId=String(context.sessionId||('epos-'+Date.now()));
  const r=await fetch(c.endpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json','x-dexter-token':String(c.token)},
    body:JSON.stringify({message:String(message||''),sessionId,context:safeContext(context)})
  });
  const data=await r.json().catch(()=>({error:'Bad Dexter AI response'}));
  if(!r.ok)throw new Error(data.error||'Dexter AI unavailable');
  return {...data,sessionId};
}
module.exports={state,safeContext,chat};
