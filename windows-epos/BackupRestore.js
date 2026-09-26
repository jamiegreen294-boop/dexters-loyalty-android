'use strict';

const fs=require('fs');
const path=require('path');

function backupDatabase(dbPath,targetDir){
  if(!fs.existsSync(dbPath))throw new Error('Database file not found');
  fs.mkdirSync(targetDir,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const target=path.join(targetDir,'dexters-epos-'+stamp+'.sqlite');
  fs.copyFileSync(dbPath,target);
  return target;
}
function listBackups(targetDir){
  if(!fs.existsSync(targetDir))return [];
  return fs.readdirSync(targetDir).filter(x=>x.endsWith('.sqlite')).sort().reverse();
}
module.exports={backupDatabase,listBackups};
