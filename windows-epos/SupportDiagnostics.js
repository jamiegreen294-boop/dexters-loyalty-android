'use strict';

const fs=require('fs');
const path=require('path');
const os=require('os');

function snapshot(root,extra={}){
  function exists(p){try{return fs.existsSync(p)}catch{return false}}
  return {
    generatedAt:new Date().toISOString(),
    host:os.hostname(),
    platform:process.platform,
    node:process.version,
    pid:process.pid,
    memory:process.memoryUsage(),
    files:{
      config:exists(path.join(root,'config.json')),
      integrations:exists(path.join(root,'integrations.json')),
      database:exists(process.env.DEXTERS_EPOS_DB||path.join(root,'dexters-epos-test.sqlite'))
    },
    ...extra
  };
}
function writeBundle(root,data){
  const dir=path.join(root,'support');
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'diagnostics-'+Date.now()+'.json');
  fs.writeFileSync(file,JSON.stringify(data,null,2),'utf8');
  return file;
}
module.exports={snapshot,writeBundle};
