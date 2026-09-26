'use strict';

const IntegrationGateway=require('./IntegrationGateway');
const DexterAI=require('./DexterAI');

function connectorCards(){
  const states=IntegrationGateway.allStates();
  return states.map(s=>({
    id:s.name,
    name:s.name.replace(/_/g,' ').replace(/w/g,c=>c.toUpperCase()),
    configured:s.configured,
    enabled:s.enabled,
    environment:s.environment,
    mode:s.mode,
    state:!s.enabled?'disabled':'configured',
    lastSync:null,
    error:null
  }));
}
function overview(localStats={}){
  return {
    generatedAt:new Date().toISOString(),
    testOnly:true,
    local:localStats,
    connectors:connectorCards(),
    ai:DexterAI.state()
  };
}
module.exports={connectorCards,overview};
