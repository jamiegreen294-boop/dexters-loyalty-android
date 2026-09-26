'use strict';

const fs=require('fs');
const path=require('path');
const {DatabaseSync}=require('node:sqlite');

function validateDatabase(dbPath){
  if(!fs.existsSync(dbPath))throw new Error('Database file not found');
  const d=new DatabaseSync(dbPath,{readOnly:true});
  const row=d.prepare('PRAGMA integrity_check').get();
  d.close();
  const result=String(Object.values(row||{})[0]||'');
  if(result.toLowerCase()!=='ok')throw new Error('Database integrity check failed: '+result);
  return true;
}
function backupDatabase(dbPath,targetDir){
  validateDatabase(dbPath);
  fs.mkdirSync(targetDir,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const target=path.join(targetDir,'dexters-epos-'+stamp+'.sqlite');
  fs.copyFileSync(dbPath,target);
  validateDatabase(target);
  return target;
}
function listBackups(targetDir){
  if(!fs.existsSync(targetDir))return [];
  return fs.readdirSync(targetDir).filter(x=>x.endsWith('.sqlite')).sort().reverse();
}
function restoreDatabase(dbPath,targetDir,fileName){
  const safe=path.basename(String(fileName||''));
  if(!safe.endsWith('.sqlite'))throw new Error('Invalid backup file');
  const source=path.join(targetDir,safe);
  validateDatabase(source);
  if(fs.existsSync(dbPath))backupDatabase(dbPath,path.join(targetDir,'pre-restore'));
  for(const suffix of ['-wal','-shm']){try{fs.rmSync(dbPath+suffix,{force:true})}catch{}}
  fs.copyFileSync(source,dbPath);
  validateDatabase(dbPath);
  return true;
}
module.exports={validateDatabase,backupDatabase,listBackups,restoreDatabase};
