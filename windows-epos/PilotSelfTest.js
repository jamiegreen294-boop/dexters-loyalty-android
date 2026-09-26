'use strict';

const fs=require('fs');
const path=require('path');
const BackupRestore=require('./BackupRestore');
const AlcoholCompliance=require('./AlcoholCompliance');
const PaymentGateway=require('./PaymentGateway');
const Permissions=require('./Permissions');

function writableDir(dir){
  try{
    fs.mkdirSync(dir,{recursive:true});
    const p=path.join(dir,'.selftest-'+process.pid);
    fs.writeFileSync(p,'ok');fs.rmSync(p,{force:true});
    return true;
  }catch{return false}
}
function run(root,localStore,integrationGateway){
  const checks=[];
  function add(name,ok,detail=''){checks.push({name,ok:!!ok,detail:String(detail||'')})}
  try{
    const stats=localStore.stats();
    add('database-open',true,JSON.stringify(stats));
    if(fs.existsSync(localStore.DB_PATH))BackupRestore.validateDatabase(localStore.DB_PATH);
    add('database-integrity',true);
  }catch(e){add('database-integrity',false,e.message)}
  try{
    const catalog=localStore.catalogProducts('',5);
    add('catalogue-query',Array.isArray(catalog),'rows '+catalog.length);
  }catch(e){add('catalogue-query',false,e.message)}
  try{
    const a=AlcoholCompliance.validateAlcoholProduct({alcohol:true,abv:4,volumeMl:440,pricePence:200},{mupPencePerUnit:65});
    add('alcohol-rules',a.ok===true,'minimum '+a.minimumPricePence+'p');
  }catch(e){add('alcohol-rules',false,e.message)}
  add('app-ui',fs.existsSync(path.join(root,'app','index.html')));
  add('customer-display',fs.existsSync(path.join(root,'customer-display','index.html')));
  add('config',fs.existsSync(process.env.DEXTERS_EPOS_CONFIG||path.join(root,'config.json')));
  add('integrations-config',fs.existsSync(process.env.DEXTERS_INTEGRATIONS_CONFIG||path.join(root,'integrations.json')));
  add('data-dir-writeable',writableDir(path.dirname(localStore.DB_PATH)));
  try{
    const p=PaymentGateway.state();
    add('payment-live-lock',p.square?.liveAllowed!==true,'Square live allowed='+String(p.square?.liveAllowed===true));
  }catch(e){add('payment-live-lock',false,e.message)}
  try{
    const manager=Permissions.permissionsFor('manager',[]);
    add('manager-permissions',manager.includes('refund')&&manager.includes('stock_adjust')&&manager.includes('integration_admin'),'count '+manager.length);
  }catch(e){add('manager-permissions',false,e.message)}
  try{
    const states=integrationGateway.allStates();
    const liveEnabled=states.filter(x=>x.enabled&&x.environment==='live');
    add('no-live-connectors-in-pilot',liveEnabled.length===0,liveEnabled.map(x=>x.name).join(','));
  }catch(e){add('no-live-connectors-in-pilot',false,e.message)}
  return {
    ok:checks.every(x=>x.ok),
    checkedAt:new Date().toISOString(),
    checks,
    failed:checks.filter(x=>!x.ok).map(x=>x.name)
  };
}
module.exports={run};
