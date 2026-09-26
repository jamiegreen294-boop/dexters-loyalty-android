'use strict';

const fs=require('fs');
const path=require('path');

function journalPath(root){return path.join(root,'crash-journal.json')}
function load(root){
  const p=journalPath(root);
  if(!fs.existsSync(p))return {crashes:[],lastStableAt:null};
  try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return {crashes:[],lastStableAt:null}}
}
function save(root,s){fs.mkdirSync(root,{recursive:true});fs.writeFileSync(journalPath(root),JSON.stringify(s,null,2),'utf8')}
function recordCrash(root,component,error=''){
  const s=load(root);
  s.crashes.unshift({component:String(component),error:String(error),at:new Date().toISOString()});
  s.crashes=s.crashes.slice(0,50);save(root,s);return s;
}
function markStable(root){
  const s=load(root);s.lastStableAt=new Date().toISOString();save(root,s);return s;
}
function shouldRollback(root,windowMinutes=10,maxCrashes=3){
  const s=load(root),cut=Date.now()-windowMinutes*60000;
  const recent=s.crashes.filter(x=>new Date(x.at).getTime()>=cut);
  return {rollback:recent.length>=maxCrashes,recentCrashes:recent.length};
}
module.exports={load,recordCrash,markStable,shouldRollback};
