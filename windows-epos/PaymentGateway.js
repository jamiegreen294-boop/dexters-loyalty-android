'use strict';

const fs=require('fs');
const path=require('path');

const ROOT=__dirname;
const CONFIG_PATH=process.env.DEXTERS_EPOS_CONFIG||path.join(ROOT,'config.json');

function config(){
  try{return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'))}catch{return {}}
}
function state(){
  const c=config(),sq=c.apps?.square||{};
  return {
    cash:{enabled:true},
    square:{
      enabled:!!sq.enabled,
      mode:sq.mode||'disabled',
      bridgeUrl:sq.bridgeUrl||null,
      liveAllowed:process.env.DEXTERS_ALLOW_LIVE_PAYMENTS==='YES'
    }
  };
}
async function squareCharge(amountPence,reference){
  const s=state().square;
  if(!s.enabled)throw new Error('Square is not enabled');
  if(!s.liveAllowed)throw new Error('Live Square payments are locked until DEXTERS_ALLOW_LIVE_PAYMENTS=YES');
  if(!s.bridgeUrl)throw new Error('Square bridge URL is not configured');
  const r=await fetch(s.bridgeUrl,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({amountPence:Number(amountPence||0),reference:String(reference||''),source:'dexters-windows-epos'})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error||'Square bridge payment failed');
  return data;
}
module.exports={state,squareCharge};
