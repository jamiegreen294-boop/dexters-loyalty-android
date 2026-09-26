'use strict';

const IntegrationGateway=require('./IntegrationGateway');

function inbound(source,payload){
  if(!['just_eat','deliveroo','uber_eats','loyalty','whatsapp','telephone','pos'].includes(String(source||''))){
    throw new Error('Unsupported order source');
  }
  return IntegrationGateway.normaliseOrder(source,payload||{});
}
function statusMap(source,status){
  const s=String(status||'').toLowerCase();
  const maps={
    just_eat:{accepted:'accepted',cooking:'preparing',ready:'ready_for_collection',completed:'completed',cancelled:'cancelled'},
    deliveroo:{accepted:'accepted',cooking:'preparing',ready:'ready',completed:'completed',cancelled:'cancelled'}
  };
  return maps[source]?.[s]||s;
}
function sandboxDispatch(source,action,payload={}){
  const state=IntegrationGateway.connectorState(source);
  if(!state.configured)throw new Error(source+' connector is not configured');
  if(state.environment!=='sandbox'&&state.environment!=='test')throw new Error('Only sandbox/test dispatch is allowed here');
  return {
    ok:true,
    dryRun:true,
    source,
    action,
    mappedStatus:payload.status?statusMap(source,payload.status):null,
    payload,
    message:'Sandbox adapter dry-run only; no external marketplace was changed.'
  };
}
module.exports={inbound,statusMap,sandboxDispatch};
